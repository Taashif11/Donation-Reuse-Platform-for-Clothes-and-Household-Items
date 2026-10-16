# Database

MongoDB with Mongoose (`mongoose@9`). The database name comes from `MONGO_URI`
(default local: `donation_reuse_platform`). Mongoose creates collections on first write -
there are no manual migration steps.

Schemas live in `server/models/`, shared enums in `server/utils/constants.js`.

---

## 1. Collections

| Collection | Model | Purpose |
|---|---|---|
| `users` | `User.js` | Every account: donor, organization staff, admin |
| `organizations` | `Organization.js` | NGO / orphanage / beneficiary profiles + verification state |
| `donorprofiles` | `DonorProfile.js` | Extra donor details (default pickup point, about text) |
| `donations` | `Donation.js` | A donor's gift request, tracked to completion |
| `donationitems` | `DonationItem.js` | Line items inside a donation (category, qty, condition, photo) |
| `collectionrequests` | `CollectionRequest.js` | Doorstep pickup for one accepted donation |
| `categories` | `Category.js` | Admin-managed item categories |
| `notifications` | `Notification.js` | In-app messages per user |
| `complaints` | `Complaint.js` | Donor/organization complaints and admin responses |
| `locations` | `Location.js` | Geocoded addresses (pickup points, org address) with GeoJSON |

---

## 2. Field summaries

### `users`
`name`, `email` (unique, lowercased), `password` (bcrypt hash, `select: false`, also
deleted by `toJSON`), `phone`, `role` (`donor | organization | admin`), `isVerified`,
`isActive` (deactivated accounts cannot log in), timestamps.
Index: `{ role: 1 }`.

### `organizations`
`user` (ObjectId -> `users`, unique), `organizationName`,
`organizationType` (`ngo | orphanage | beneficiary | shelter | other`), `description`,
`contactPerson`, `email`, `phone`, `address`, `city`, `state`, `pincode`,
`location` (ObjectId -> `locations`, geocoded copy of the address),
verification block: `verificationStatus` (`PENDING | APPROVED | REJECTED | NEEDS_MORE_INFO`),
`verificationDetails` (registration number, website, established year),
`verificationDocuments[]` (name + url), `verificationNotes`, `verifiedBy`, `verifiedAt`.
Indexes: `{ verificationStatus: 1, city: 1 }`, `{ organizationType: 1 }`.

### `donorprofiles`
`user` (unique), `defaultLocation` (ObjectId -> `locations`), `about`.

### `donations`
`donor` (-> `users`), `organization` (-> `organizations`), `items[]` (-> `donationitems`),
`pickupAddress`, `pickupLocation` (-> `locations`, optional), `scheduledDate`,
`scheduledTime`, `status` (see enums), `notes`, `cancellationReason`, `rejectionReason`,
`statusHistory[]` (append-only `{ status, changedAt }`), timestamps.
`pre('save')` appends to `statusHistory` whenever `status` changes.
Indexes: `{ donor: 1, createdAt: -1 }`, `{ organization: 1, status: 1 }`,
`{ status: 1, createdAt: -1 }`.

### `donationitems`
`donation` (-> `donations`), `category` (-> `categories`), `itemType`, `quantity` (1-1000),
`condition` (`New | Like New | Good | Usable`), `description`, `image` (relative upload
path - reserved, no upload endpoint exists yet), timestamps.
Indexes: `{ donation: 1 }`, `{ category: 1 }`.

### `collectionrequests`
`donation` (unique - one collection per donation), `donor`, `organization`, `address`
(snapshotted), `scheduledDate`, `scheduledTime`, `status` (see enums), `notes`, timestamps.
Indexes: `{ organization: 1, status: 1 }`, `{ donor: 1, status: 1 }`, `{ scheduledDate: 1 }`.

### `categories`
`name` (unique), `slug` (unique, auto-synced from `name` by a `pre('save')` hook),
`description`, `isActive`, timestamps. Index: `{ isActive: 1 }`.

### `notifications`
`user` (-> `users`), `type` (`donation | collection | verification | complaint | general`),
`title`, `message`, `relatedDonation` (optional), `isRead`, timestamps.
Indexes: `{ user: 1, isRead: 1 }`, `{ user: 1, createdAt: -1 }`.

### `complaints`
`user` (author), `donation` (optional link), `subject`, `description`,
`status` (`OPEN | IN_REVIEW | RESOLVED | CLOSED`), `adminResponse`, `respondedBy`,
timestamps. Indexes: `{ status: 1, createdAt: -1 }`, `{ user: 1, createdAt: -1 }`.

### `locations`
`addressLine`, `city`, `state`, `pincode`, `latitude`, `longitude`,
`geo` (GeoJSON Point `[lng, lat]`, kept in sync by a `pre('validate')` hook; removed when
coordinates are missing), timestamps.
Indexes: `{ city: 1 }`, `{ pincode: 1 }`, `{ geo: '2dsphere' }` (powers `$geoNear`
"near me" searches; documents without coordinates are simply skipped).

---

## 3. Relationships

```
users 1 ──── 1 donorprofiles
users 1 ──── 1 organizations ──┬── 1 locations (geocoded address)
                               │
users (donor) 1 ──── * donations * ── 1 organizations (receives)
                         │
                         ├── * donationitems * ── 1 categories
                         ├── 1 collectionrequests (one per donation)
                         ├── 0..1 locations (pickup point)
                         └── 0..* complaints (optional link)

users 1 ──── * notifications
users 1 ──── * complaints
```

Reading a donation populates `donor`, `organization` and `items` so the UI can render the
timeline in one round trip.

---

## 4. Enumerations (single source: `server/utils/constants.js`)

| Enum | Values |
|---|---|
| Donation status | `PENDING, ACCEPTED, SCHEDULED, PICKED_UP, RECEIVED, DISTRIBUTED, CANCELLED, REJECTED` |
| Happy-path stages | `PENDING → ACCEPTED → SCHEDULED → PICKED_UP → RECEIVED → DISTRIBUTED` |
| Cancellable by donor | `PENDING, ACCEPTED, SCHEDULED` |
| Collection status | `SCHEDULED, PICKED_UP, RECEIVED, DISTRIBUTED, CANCELLED` |
| Collection transitions | `SCHEDULED→PICKED_UP→RECEIVED→DISTRIBUTED` (terminal); every transition also moves the donation |
| Organization verification | `PENDING, APPROVED, REJECTED, NEEDS_MORE_INFO` (admin sets all but `PENDING`) |
| Complaint status | `OPEN → IN_REVIEW → RESOLVED → CLOSED` (admin-driven; `CLOSED` is terminal) |
| Notification types | `donation, collection, verification, complaint, general` |
| User roles | `donor, organization, admin` |
| Item conditions | `New, Like New, Good, Usable` |

---

## 5. Validation layers

1. **Mongoose schema** - required fields, enums, lengths, ranges (last line of defence).
2. **express-validator** (`server/validators/`) - returns friendly `errors[]` before the
   controller runs.
3. **`middleware/sanitize.js`** - removes `$`-prefixed and dotted keys so no request can
   smuggle operators (`$gt`, `a.b`) into a query.

Failures from (1) surface as `400 Validation failed` through the central error handler.

---

## 6. Seed data

`npm run seed` (from `server/`) upserts:

- 10 categories (Clothing, Footwear, Books, Kitchen Items, Furniture, Household Items,
  Toys, Blankets, Bags, Other).
- Three demo accounts + one APPROVED demo organization.

It never deletes or resets existing documents, so it is safe to re-run during development.
`server/utils/modelSmokeTest.js` (`npm test`) creates one document of every model,
verifies populate/password/validation behaviour and deletes them again.
