# API Reference

Base URL (development): `http://localhost:5000/api`

All responses use the same JSON envelope:

```json
{ "success": true, "message": "Human readable message", "data": { } }
```

```json
{ "success": false, "message": "What went wrong", "errors": [ { "field": "limit", "message": "..." } ] }
```

`errors` is only present on validation failures (HTTP 400).

## Conventions

| Item | Convention |
|---|---|
| Methods | GET/POST now; PUT/PATCH/DELETE added with their phases |
| Authentication | `Authorization: Bearer <token>` on protected endpoints (see below) |
| Validation | `express-validator` rules in `server/validators/`, executed by `server/middleware/validate.js` |
| Errors | Central handler in `server/middleware/errorHandler.js` (404, validation, cast, duplicate key, JSON parse, body too large, 500) |
| Sanitising | `server/middleware/sanitize.js` strips `$`-prefixed and dotted keys from body/query/params before any handler runs |
| Rate limiting | Global 300 req/15 min/IP on `/api` (health exempt) + 50 req/15 min/IP on `/api/auth/register` and `/auth/login`; standard `RateLimit-*` headers |
| Pagination | `?page=` (default 1) and `?limit=` (default 12, max 50), returns `data.pagination` |

---

## Endpoints implemented (Phases 4-12)

### Authentication

All three routes are rate limited (50 requests / 15 min / IP) except `/me`.

#### `POST /api/auth/register`

Creates a donor or organization account. **Admin cannot be self-registered.**

| Field | Rules |
|---|---|
| `name` | required, 2-80 chars |
| `email` | required, valid format, unique (409 on duplicate) |
| `password` | required, min 6 chars (stored only as a bcrypt hash) |
| `phone` | optional, 7-15 chars from `0-9+() ` and `-` |
| `role` | required, `donor` or `organization` |

**201** - `data.user`: safe profile `{ _id, name, email, phone, role, isVerified, createdAt, updatedAt }` (never the password)
**400** - validation `errors[]` - **409** - email already exists

#### `POST /api/auth/login`

| Field | Rules |
|---|---|
| `email` | required, valid format |
| `password` | required |

**200** - `data: { token, user }` where `token` is a JWT (payload: `id`, `role`, `iat`, `exp`; lifetime `JWT_EXPIRES_IN`)
**400** - validation - **401** - wrong email or password (identical message for both, no account enumeration)
**403** - the account was deactivated by an admin (`isActive: false`): *"Your account has been deactivated. Please contact the platform admin."*

#### `GET /api/auth/me` - requires `Authorization: Bearer <token>`

**200** - `data.user`: the authenticated user's safe profile
**401** - missing token, missing `Bearer` prefix, malformed/invalid token, expired token, or deleted account

---

### Authorization middleware

- `protect` (`server/middleware/auth.js`) - verifies the JWT and loads `req.user`
- `authorize(...roles)` - returns 403 unless `req.user.role` is allowed; e.g. `authorize('admin')`
- Used by `/api/auth/me` (all roles), `/api/users` + `/api/donations` (donor only), `/api/organizations/me*` (organization only), `/api/collections` (donor + organization + admin), `/api/notifications` (every signed-in role, always scoped to the caller), `/api/complaints` (read: donor + organization + admin, create: donor + organization only), `/api/admin/*` (admin only) and the admin category routes (`POST`/`PATCH`/`DELETE`/`GET /manage`)

---

### Health

#### `GET /api/health`

Server liveness check.

**200**
```json
{ "success": true, "message": "Donation & Reuse Platform API is running", "data": { "timestamp": "..." } }
```

---

### Categories

#### `GET /api/categories`

Public list of active categories, sorted by name.

**200** - `data.categories`: array of `{ _id, name, slug, description, isActive, createdAt, updatedAt }`

#### `GET /api/categories/:id`

Single category. `:id` accepts an ObjectId **or** a slug (e.g. `/api/categories/clothing`).

| Status | When |
|---|---|
| 200 | Found - `data.category` |
| 400 | `id` empty or longer than 100 characters |
| 404 | No matching category |

#### Admin category management (Phase 9)

All four routes require `protect` + `authorize('admin')`; donors and organizations get **403**.

| Method | Route | Rules / behaviour |
|---|---|---|
| `GET` | `/api/categories/manage` | every category (active **and** hidden), sorted by name |
| `POST` | `/api/categories` | `name` 2-60 chars (409 on duplicate), `description` optional <= 300 chars -> **201** |
| `PATCH` | `/api/categories/:id` | any of `name` / `description` / `isActive` -> **200**; duplicate name -> **409** |
| `DELETE` | `/api/categories/:id` | soft delete: sets `isActive: false` -> **200**; already hidden -> **400** |

The public `GET /api/categories` only returns `isActive: true` documents, so a hidden
category disappears from the donor item forms immediately. `PATCH` with `{ "isActive": true }`
restores it.

---

### Organizations

#### `GET /api/organizations`

Public directory of verified organizations. Only documents with `verificationStatus: "APPROVED"` are ever returned.

| Query param | Type | Notes |
|---|---|---|
| `city` | string, max 60 | Exact match on `city` |
| `search` | string, max 100 | Case-insensitive match on `organizationName` |
| `page` | integer >= 1 | Default 1 |
| `limit` | integer 1-50 | Default 12 |

**200**
```json
{
  "success": true,
  "message": "Organizations fetched successfully",
  "data": {
    "organizations": [ { "_id": "...", "organizationName": "...", "city": "..." } ],
    "pagination": { "page": 1, "limit": 12, "total": 0, "totalPages": 0 }
  }
}
```

**400** - invalid `page`/`limit`/`city`/`search`

#### `GET /api/organizations/:id`

Public detail of one verified organization.

| Status | When |
|---|---|
| 200 | Found - `data.organization` |
| 400 | `:id` is not a valid ObjectId |
| 404 | Not found or not approved |

---

### Organization profile and requests (organization)

All routes below `/api/organizations/me` use `protect` + `authorize('organization')`:
donors and admins get **403**, a missing/expired token gets **401**.

The organization profile document is **created automatically** (with
`verificationStatus: "PENDING"`) the first time an organization user calls any
`/me` route, so new accounts always have a profile to complete.

#### `GET /api/organizations/me`

**200** - `data.organization`: the caller's full profile document
(`organizationName`, `organizationType`, `description`, `contactPerson`, `email`,
`phone`, `address`, `city`, `state`, `pincode`, `verificationStatus`,
`verificationDetails`, `verificationNotes`, `verificationDocuments`, ...)

#### `PATCH /api/organizations/me`

Partial update of the caller's own profile. `verificationStatus` is **admin only**
and is ignored if sent.

| Field | Rules |
|---|---|
| `organizationName` | optional, 2-120 chars |
| `organizationType` | optional, `ngo, orphanage, beneficiary, shelter, other` |
| `description` | optional, max 1000 chars |
| `contactPerson` | optional, max 80 chars |
| `email` | optional, valid format |
| `phone` | optional, max 15 chars |
| `address` | optional, max 200 chars |
| `city` / `state` | optional, max 60 chars |
| `pincode` | optional, 3-10 chars from `0-9A-Za-z ` and `-` |
| `registrationNumber` | optional, max 80 chars (stored in `verificationDetails`) |
| `website` | optional, max 200 chars (stored in `verificationDetails`) |
| `establishedYear` | optional, 1800-2100 or `null` |
| (at least one of the above) | otherwise **400** |

**200** - `data.organization` - **400** - validation errors

#### `GET /api/organizations/me/stats`

**200** - `data.stats`:

```json
{
  "total": 2,
  "totalItems": 4,
  "byStatus": { "PENDING": 0, "ACCEPTED": 1, "REJECTED": 1 },
  "pending": 0,
  "active": 1,
  "completed": 0,
  "recent": [ ]
}
```

`totalItems` is the sum of item quantities across donations that are neither
`CANCELLED` nor `REJECTED`; `active` is `ACCEPTED + SCHEDULED + PICKED_UP` and
`completed` is `DISTRIBUTED`.

#### `GET /api/organizations/me/donations`

Donation requests addressed to the caller's organization, newest first.

| Query param | Type | Notes |
|---|---|---|
| `status` | one of the donation statuses | optional filter |
| `page` | integer >= 1 | default 1 |
| `limit` | integer 1-50 | default 10 |

**200** - `data.donations` (each with `donor` populated: `_id, name, email, phone`) +
`data.pagination`

#### `GET /api/organizations/me/donations/:id`

Own requests only - another organization's donation returns **404** (no existence leak).
Populates `donor`, `items.category` (name) and `pickupLocation`.

**200** - `data.donation` - **400** malformed `:id` - **404** not found / not yours

#### `PATCH /api/organizations/me/donations/:id/status`

| Field | Rules |
|---|---|
| `status` | required, only `ACCEPTED` or `REJECTED` |
| `rejectionReason` | optional, max 300 chars (default "Rejected by the organization") |

Transitions are enforced server-side (`ORGANIZATION_TRANSITIONS` in
`server/utils/constants.js`): only a `PENDING` request can be accepted or rejected,
so a second attempt returns **400**. The pickup steps (`SCHEDULED` -> `PICKED_UP` ->
`RECEIVED` -> `DISTRIBUTED`) are driven by `/api/collections`.

**200** - `data.donation` - **400** validation / illegal transition - **404** not found / not yours

---

### Current user profile

Both routes require `Authorization: Bearer <token>` (any role).

#### `GET /api/users/me`

**200** - `data: { user, donorProfile }` where `user` is the safe profile and `donorProfile` is the donor's profile document (`{ _id, user, about, ... }`) or `null` for roles that have none.

#### `PATCH /api/users/me`

Partial update of the caller's own profile. Email, password and role can never be changed.

| Field | Rules |
|---|---|
| `name` | optional, 2-80 chars after trim |
| `phone` | optional, `0-9+() ` and `-`, 7-15 chars |
| `about` | optional, max 300 chars; stored on the donor profile (donors only - **400** for other roles) |
| (at least one of the above) | otherwise **400** |

**200** - `data: { user, donorProfile }` - **400** - validation errors

---

### Donations (donor)

All five routes use `protect` + `authorize('donor')`: donors get **403**, other roles get **403**, and a donation that belongs to someone else returns **404** (no existence leak).

#### `POST /api/donations`

| Field | Rules |
|---|---|
| `organization` | required, valid ObjectId of a verified organization (unknown/unapproved -> **404**) |
| `pickupAddress` | required, 5-300 chars |
| `scheduledDate` | optional, ISO date, not in the past |
| `scheduledTime` | optional, max 40 chars |
| `notes` | optional, max 500 chars |
| `items` | required array, 1-20 items |
| `items.*.category` | required, valid ObjectId of an active category |
| `items.*.quantity` | required integer 1-1000 |
| `items.*.condition` | required, one of `New, Like New, Good, Usable` |
| `items.*.itemType` | optional, max 80 chars |
| `items.*.description` | optional, max 500 chars |

**201** - `data.donation`: the donation with `organization` populated (`organizationName city organizationType`) and `items` populated, status `PENDING`
**400** validation - **403** non-donor - **404** organization not found/approved

#### `GET /api/donations`

Own donations only, newest first.

| Query param | Type | Notes |
|---|---|---|
| `status` | one of the donation statuses | optional filter |
| `page` | integer >= 1 | default 1 |
| `limit` | integer 1-50 | default 10 |

**200**
```json
{
  "success": true,
  "message": "Donations fetched successfully",
  "data": {
    "donations": [ { "_id": "...", "status": "PENDING", "items": [], "organization": {} } ],
    "pagination": { "page": 1, "limit": 10, "total": 2, "totalPages": 1 }
  }
}
```

#### `GET /api/donations/stats`

**200** - `data.stats`: `{ total, byStatus: { PENDING: n, ... }, recent: [ 5 most recent donations ] }`

#### `GET /api/donations/:id`

Own donation only (others -> **404**). Populates `organization` (with contact fields), `items.category` (name) and `pickupLocation`.

**200** - `data.donation` - **400** malformed `:id` - **404** not found / not yours

#### `PATCH /api/donations/:id/status`

| Field | Rules |
|---|---|
| `status` | must be `CANCELLED` (donors may only cancel) |
| `cancellationReason` | optional, max 300 chars |

Eligible only while `PENDING`, `ACCEPTED` or `SCHEDULED` - already cancelled/rejected -> **400**.

**200** - `data.donation` with `status: "CANCELLED"` - **400** validation / ineligible status - **404** not found / not yours

---

### Donation lifecycle (Phase 8)

| Status | Meaning | Who moves it |
|---|---|---|
| `PENDING` | request created, waiting for the organization | donor (on create) |
| `ACCEPTED` | organization accepted it | organization |
| `SCHEDULED` | pickup date + time slot agreed (a `CollectionRequest` exists) | donor or organization |
| `PICKED_UP` | volunteer collected the items | organization |
| `RECEIVED` | organization confirmed it has the items | organization |
| `DISTRIBUTED` | items handed over, donation finished | organization |
| `CANCELLED` | donor cancelled while `PENDING` / `ACCEPTED` / `SCHEDULED` | donor |
| `REJECTED` | organization could not accept it | organization |

`REJECTED` and `CANCELLED` are terminal: no collection may be scheduled for them and no
further status change is possible. Every change appends
`{ status, changedAt, note }` to `Donation.statusHistory`, which drives the
`GET /api/collections/:id/tracking` timeline.

---

### Collections (donor + organization)

Collection endpoints are mounted after `protect` and `authorize('donor','organization','admin')`.
Scope rules: a donor only sees collections for **own** donations, an organization only for
**its own** (the donation's `organization`), admin sees all. Out-of-scope ids return **404**.

#### `POST /api/collections`

Schedules (or re-schedules) the pickup for a donation.

| Field | Rules |
|---|---|
| `donation` | required, valid ObjectId, must belong to caller |
| `scheduledDate` | required ISO date, today or later |
| `scheduledTime` | required, 1-40 chars (UI offers `10:00 - 12:00`, `12:00 - 14:00`, `14:00 - 16:00`, `16:00 - 18:00`, `Any time`) |
| `address` | required, 5-300 chars (defaults to the donation's `pickupAddress`) |
| `notes` | optional, max 500 chars |

The donation must be `ACCEPTED` - `PENDING`, `REJECTED` or `CANCELLED` -> **400**
("A rejected donation cannot be scheduled"), already `SCHEDULED` -> **400** (reschedule instead).

**201** - `data.collection` + `data.donation` (now `SCHEDULED`, with `statusHistory`)
**400** - validation / past date / ineligible donation status
**403** - not the owner of the donation - **404** donation not found

#### `GET /api/collections`

List with `?status=` (one of `COLLECTION_STATUSES`), `?donation=` (valid ObjectId),
`?page=`, `?limit=` (default 10, max 50).
Scoped to the caller as above. **200** - `data.collections` + `data.pagination`.

#### `GET /api/collections/:id` / `GET /api/donations/:id` collection lookups

**200** - `data.collection` (donation populated) - **400** malformed id - **404** out of scope

#### `PATCH /api/collections/:id`

Reschedules an existing collection (date / time / address / notes). Allowed while the
collection is `SCHEDULED`; a terminal collection (`PICKED_UP` onwards) returns **400**.
**200** - `data.collection` + `data.donation` (history re-appends `SCHEDULED` with the new slot)

#### `GET /api/collections/:id/tracking`

Timeline used by the donor and organization detail pages.

```json
{
  "success": true,
  "message": "Collection tracking fetched successfully",
  "data": {
    "tracking": {
      "collection": { "_id": "...", "status": "PICKED_UP" },
      "donation":   { "_id": "...", "status": "PICKED_UP" },
      "stages": ["PENDING","ACCEPTED","SCHEDULED","PICKED_UP","RECEIVED","DISTRIBUTED"],
      "currentStageIndex": 3,
      "currentStatus": "PICKED_UP",
      "history": [ { "status": "PENDING", "changedAt": "..." }, ... ]
    }
  }
}
```

**400** malformed id - **404** out of scope

#### `PATCH /api/collections/:id/status`

Advances the pickup: `SCHEDULED -> PICKED_UP -> RECEIVED -> DISTRIBUTED`.
Organization and admin only (donor -> **403**); skipping a step or advancing a terminal
collection -> **400**. Mirrors the change onto `Donation.status`.
`{ "status": "PICKED_UP", "note": "optional, max 300 chars" }` - **200** - `data.collection` + `data.donation`

Example:

```bash
curl -X POST http://localhost:5000/api/collections \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"donation":"<id>","scheduledDate":"2026-10-20","scheduledTime":"12:00 - 14:00"}'
```

---

### Admin (Phase 9)

Everything below is mounted on `/api/admin` after `protect` + `authorize('admin')`:

| Result | When |
|---|---|
| **401** | no token / invalid token |
| **403** | caller is a donor or an organization |
| **400** | validation error (bad id, bad status value, missing field) |
| **404** | resource does not exist |

Admin accounts cannot self-register (`POST /api/auth/register` rejects `role: "admin"`);
they are created by the platform team and seeded for development as
`demo.admin@example.com` / `demo123`.

#### `GET /api/admin/stats`

Dashboard counters.

```json
{ "stats": {
  "users":         { "total": 3, "active": 3, "inactive": 0, "byRole": { "donor": 1, "organization": 1, "admin": 1 } },
  "organizations": { "total": 1, "pending": 0, "byStatus": { "APPROVED": 1 } },
  "donations":     { "total": 2, "active": 1, "distributed": 0, "byStatus": { "PENDING": 1, "ACCEPTED": 1 } },
  "collections":   { "total": 0 },
  "recentDonations": [ ],
  "recentUsers":     [ ]
} }
```

`donations.active` = `ACCEPTED + SCHEDULED + PICKED_UP` (same rule as the organization stats).

#### `GET /api/admin/users`

| Query param | Type | Notes |
|---|---|---|
| `role` | `donor` / `organization` / `admin` | optional filter |
| `status` | `active` / `inactive` | optional filter on `isActive` |
| `q` | string <= 100 | case-insensitive search on name or email |
| `page`, `limit` | integer, `limit` 1-50 | defaults 1 / 10 |

**200** - `data.users` (safe profiles incl. `isActive`) + `data.pagination`

#### `PATCH /api/admin/users/:id/status`

`{ "isActive": true }` or `{ "isActive": false }` - **200** - `data.user`
**400** - `isActive` missing/not a boolean, malformed `:id`, or an admin deactivating their **own** account
**404** - unknown user

A deactivated user cannot log in (**403**) but existing sessions keep working until the token expires.

#### `GET /api/admin/organizations`

Verification queue. Filters: `verificationStatus` (one of `PENDING`, `APPROVED`, `REJECTED`,
`NEEDS_MORE_INFO`), `q` (name/city search), `page`, `limit`.
**200** - `data.organizations` (with the `user` account populated) + `data.pagination`

#### `GET /api/admin/organizations/:id`

Full profile: verification details/documents, the owning account and `verifiedBy`.
**200** - **400** malformed id - **404** unknown organization

#### `PATCH /api/admin/organizations/:id/verify`

The only endpoint that changes `verificationStatus`.

| Field | Rules |
|---|---|
| `verificationStatus` | required, one of `APPROVED`, `REJECTED`, `NEEDS_MORE_INFO` |
| `verificationNotes` | optional, max 500 chars |

On success it also stamps `verifiedBy` (the admin) and `verifiedAt` (now) and returns
`data.organization`.

| Status | When |
|---|---|
| 200 | decision stored (`PENDING` or `NEEDS_MORE_INFO` org) |
| 400 | invalid status value, malformed id, verifying your **own** organization, or re-verifying an already `APPROVED` / `REJECTED` organization |
| 403 | caller is not an admin |
| 404 | organization not found |

`APPROVED` organizations immediately become selectable in the donor donation form and appear
in the public directory; `REJECTED` / `PENDING` / `NEEDS_MORE_INFO` ones do not.

#### `GET /api/admin/donations` - read-only

Same shape as the donor list but **across every donor**: filter `status`, `page`, `limit`.
**200** - `data.donations` (donor + organization + items populated) + `data.pagination`
No write/report endpoints are exposed in Phase 9.

Example:

```bash
curl http://localhost:5000/api/admin/stats -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X PATCH http://localhost:5000/api/admin/organizations/<orgId>/verify \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"verificationStatus":"APPROVED","verificationNotes":"Documents verified."}'
```

---

### Notifications (Phase 10)

In-app notifications for a single user. Every route sits behind `protect` and the
controller always filters by `req.user._id`, so **donor, organization and admin** use the
same endpoints and can only ever read or update their own notifications.

Types: `donation`, `collection`, `verification`, `complaint`, `general`.

#### `GET /api/notifications`

| Query param | Type | Notes |
|---|---|---|
| `unread` | `true` / `false` | optional filter |
| `page`, `limit` | integer, `limit` 1-50 | defaults 1 / 10 |

**200** - `data.notifications` (newest first: `{ _id, type, title, message, relatedDonation, isRead, createdAt, updatedAt }`) + `data.pagination`
**400** - bad `page` / `limit` / `unread`

#### `GET /api/notifications/unread-count`

**200** - `data.unreadCount` (drives the bell badge)

#### `PATCH /api/notifications/:id/read`

**200** - `data.notification`
**400** - malformed `:id`, or the notification is **already read**
**404** - unknown id **or a notification that belongs to another user** (no existence leak)

#### `PATCH /api/notifications/read-all`

Marks every unread notification of the caller as read.
**200** - `data.modifiedCount`

All four routes return **401** without a valid token.

#### Events that create notifications

| Event | Recipient(s) | Title |
|---|---|---|
| Donation created | organization user | New donation request |
| Donation accepted / rejected | donor | Donation accepted / Donation rejected |
| Donation cancelled | organization user | Donation cancelled |
| Collection scheduled / rescheduled | donor + organization user | Pickup scheduled / Pickup rescheduled |
| Collection `PICKED_UP` / `RECEIVED` / `DISTRIBUTED` | donor | Donation picked up / received / distributed |
| Organization verification decision | organization user | Verification approved / rejected / needs more info |
| Complaint created | every admin | New complaint received |
| Complaint status/response changed | complainant | Complaint in review / resolved / closed |

Creation goes through `server/services/notificationService.js`, which never throws: a
failed notification is logged with `console.warn` and **does not change** the status code
or payload of the request that triggered it.

---

### Complaints (Phase 10)

Statuses: `OPEN`, `IN_REVIEW`, `RESOLVED`, `CLOSED`.

#### `POST /api/complaints` - donor **or** organization only

| Field | Rules |
|---|---|
| `subject` | required, 5-150 chars |
| `description` | required, 20-2000 chars |
| `donation` | optional ObjectId, must be **your own** donation |

**201** - `data.complaint` (user + donation populated); every admin receives a notification
**400** - validation, or an admin attaching a donation - **401** - no token
**403** - admin caller - **404** - the linked donation is not yours

#### `GET /api/complaints`

`?status=&page=&limit=` - donors and organizations see **only their own** complaints;
admins see every complaint here too. **200** - `data.complaints` + `data.pagination`
**400** - invalid `status` filter

#### `GET /api/complaints/:id`

Owner or admin. **200** - **400** malformed id - **404** unknown id **or someone else's complaint**

#### Admin queue - mounted under `/api/admin`, so 401/403 apply first

| Method | Route | Notes |
|---|---|---|
| `GET` | `/api/admin/complaints` | `?status=&q=&page=&limit=`; `q` searches subject + description |
| `GET` | `/api/admin/complaints/:id` | full detail, `user` populated with `phone` |
| `PATCH` | `/api/admin/complaints/:id/status` | `{ "status": "...", "adminResponse": "..." }` |

Status workflow (enforced by `COMPLAINT_TRANSITIONS` in `server/utils/constants.js`):

```
OPEN       -> IN_REVIEW | RESOLVED | CLOSED
IN_REVIEW  -> RESOLVED | CLOSED
RESOLVED   -> CLOSED
CLOSED     -> (terminal, no further transition)
```

| Status | When |
|---|---|
| 200 | legal transition stored, `data.complaint` returned, complainant notified |
| 400 | illegal transition (e.g. `CLOSED -> IN_REVIEW`), a `status` outside `IN_REVIEW`/`RESOLVED`/`CLOSED`, malformed id, or **`RESOLVED` without an `adminResponse` of at least 5 characters** |
| 401 / 403 | no token / caller is not an admin |
| 404 | unknown complaint id |

`adminResponse` is optional for `IN_REVIEW` and `CLOSED` and is stored together with
`respondedBy` (the admin who acted).

Example:

```bash
curl http://localhost:5000/api/notifications -H "Authorization: Bearer $TOKEN"
curl http://localhost:5000/api/notifications/unread-count -H "Authorization: Bearer $TOKEN"
curl -X PATCH http://localhost:5000/api/notifications/<notificationId>/read -H "Authorization: Bearer $TOKEN"
curl -X PATCH http://localhost:5000/api/notifications/read-all -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:5000/api/complaints -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Pickup never arrived","description":"The scheduled pickup did not happen and nobody contacted me."}'
curl "http://localhost:5000/api/admin/complaints?status=OPEN" -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X PATCH http://localhost:5000/api/admin/complaints/<complaintId>/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"RESOLVED","adminResponse":"Pickup was rescheduled with the donor."}'
```

---

### Reports & exports (Phase 11)

All mounted under `/api/admin`, so `protect` + `authorize('admin')` run first:
**401** without a token, **403** for donor / organization accounts.

Every filter is optional and whitelisted - only the documented query parameters
are ever read, so a client can never pass a raw MongoDB filter. `startDate` /
`endDate` must be ISO dates (`YYYY-MM-DD` or full ISO); `startDate` after
`endDate` is a **400**. A date-only `endDate` includes the whole day.

#### `GET /api/admin/reports/overview`

One call with every platform counter. No filters (always all-time).

**200** - `data`:

| Block | Fields |
|---|---|
| `donations` | `total`, `totalItems`, `byStatus` (every `DONATION_STATUSES` key, zero-filled) |
| `collections` | `total`, `completed`, `pending`, `byStatus` |
| `complaints` | `total`, `open`, `inReview`, `resolved`, `closed`, `byStatus` |
| `organizations` | `total`, `approved`, `pending`, `rejected`, `needsMoreInfo`, `byStatus` |
| `users` | `total`, `active`, `inactive`, `byRole` (`donor` / `organization` / `admin`) |

#### `GET /api/admin/reports/donations`

| Query | Rules |
|---|---|
| `status` | optional, one of `DONATION_STATUSES` |
| `organization` | optional, valid ObjectId |
| `startDate`, `endDate` | optional ISO dates |
| `page` | optional, integer >= 1 |
| `limit` | optional, 1-50 (default 10) |

**200** - `data.summary` (`totalDonations`, `totalItems`, `totalItemRows`, `byStatus`),
`data.donations` (donor, organization and items populated, newest first) and
`data.pagination` - **400** - invalid `status`, malformed `organization` id, bad dates or page/limit

#### `GET /api/admin/reports/collections`

`?status=` (one of `COLLECTION_STATUSES`), `startDate`, `endDate`.

**200** - `data.summary` (`total`, `completed`, `pending`, `cancelled`, `byStatus`) and
`data.activity` (`[{ period: 'YYYY-MM', count }]`, ascending) - **400** - invalid filter

#### `GET /api/admin/reports/complaints`

`?status=` (one of `COMPLAINT_STATUSES`), `startDate`, `endDate`.

**200** - `data.summary` (`total`, `open`, `inReview`, `resolved`, `closed`, `byStatus`) and
`data.activity` - **400** - invalid filter

#### CSV exports

Same filters as the reports (donations also accepts `organization`), no pagination.
Responses are `text/csv; charset=utf-8` with
`Content-Disposition: attachment; filename="<kind>-report-YYYY-MM-DD.csv"`.

| Route | Columns |
|---|---|
| `GET /api/admin/reports/export/donations` | id, createdAt, status, donor name/email, organization, city, item rows, total quantity, pickup address, scheduled date/time |
| `GET /api/admin/reports/export/collections` | id, createdAt, status, donation id, donor name/email, organization, city, address, scheduled date/time, notes |
| `GET /api/admin/reports/export/complaints` | id, createdAt, status, subject, raiser name/email/role, donation id, responded by, admin response, updatedAt |

---

### Maps & locations (Phase 12)

The platform geocodes addresses through a modular service
(`server/services/locationService.js`):

- **live mode** - when `MAP_API_KEY` is set, coordinates come from the Google
  Geocoding API
- **offline mode** - with no key (the default, including the
  `.env.example` placeholder) a deterministic geocoder pins every address to a
  stable point near its city centre, so the whole flow works with zero external
  dependencies

Geocoding is wired into three flows automatically:

| Flow | When |
|---|---|
| Donation create | Optional `pickupCity` / `pickupState` / `pickupPincode` fields, or the donor's saved default location, are combined with `pickupAddress` into a `Location` document (`donation.pickupLocation`) |
| Donor profile | `PATCH /api/users/me` with `defaultLocation` saves and geocodes the reusable pickup point |
| Organization profile | Saving a complete address (`address` + `city` + `state` + `pincode`) geocodes and syncs `organization.location` |

Locations carry a GeoJSON `geo` point (mirrored from `latitude`/`longitude`
with a 2dsphere index) so radius searches use `$geoNear`.

#### `GET /api/locations/geocode?addressLine=&city=&state=&pincode=`

Dry-run geocoding - **requires a signed-in account**, saves nothing.

| Query | Rules |
|---|---|
| `addressLine` | required, 5-200 chars |
| `city` | required, 2-60 chars |
| `state` | optional, max 60 chars |
| `pincode` | optional, 3-10 alphanumeric/space/dash chars |

**200** - `data: { latitude, longitude, source, live }` where `source` is
`live` (provider) or `offline` (built-in geocoder)
**400** - validation - **401** - no token

#### `GET /api/locations/nearby?lat=&lng=&radiusKm=&limit=`

**Public** (no token). Returns APPROVED organizations that have a geocoded
address within `radiusKm` of the point, nearest first. Same records the
public directory exposes - only sorted and filtered by distance.

| Query | Rules |
|---|---|
| `lat` | required, -90..90 |
| `lng` | required, -180..180 |
| `radiusKm` | optional, 1-100 (default 25) |
| `limit` | optional, 1-50 (default 20) |

**200** - `data: { origin, radiusKm, organizations }` where each organization
includes `location` (address + coordinates) and `distanceKm`
**400** - validation

Persisted locations also surface as:

- `donation.pickupLocation` (populated on donation detail reads) - rendered
  as an OpenStreetMap embed on the donor and organization detail pages
- `donorProfile.defaultLocation` (populated on `/api/users/me`)
- `organization.location` (populated on `/api/organizations/me`)

---

## Phase 13 - validation, security and error handling

Phase 13 adds no new endpoints. It hardens everything built in Phases 4-12.

### Server (`server/app.js`, `server/server.js`, `server/middleware/`)

| Measure | Where | Behaviour |
|---|---|---|
| Security headers | `helmet` in `app.js` | CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, ... ; `x-powered-by` disabled |
| CORS | `cors` in `app.js` | Only `CLIENT_URL` (default `http://localhost:5173`), credentials allowed |
| Body limits | `express.json({ limit: '2mb' })` | Oversized body -> **413** `Request body too large` |
| NoSQL-injection guard | `middleware/sanitize.js` | Deletes `$`-prefixed and dotted keys from `req.body` / `req.query` / `req.params` before any route handler |
| Global throttle | `middleware/rateLimit.js` (`apiLimiter`) | 300 requests / 15 min / IP on `/api`; `/api/health` is exempt; standard `RateLimit-*` headers |
| Auth throttle | `routes/authRoutes.js` (`authLimiter`) | 50 attempts / 15 min / IP on `register` + `login` -> **429** `Too many attempts` |
| Input validation | `middleware/validate.js` + `validators/` | Every mutating route and every `:id` param is validated; failures return **400** with `errors[]` |
| Central errors | `middleware/errorHandler.js` | 404, Mongoose validation, cast errors, duplicate key, malformed JSON, oversized body, and a non-leaking 500 |
| Startup safety | `server.js` | Refuses to start in production when `JWT_SECRET` is missing, still the placeholder, or < 16 chars |
| Proxy awareness | `app.js` | `trust proxy` enabled in production so per-IP limits count the real client |

`GET /api/organizations/:id` is the only route that gained a new rule in this
phase (`organizationIdRules` - `param('id').isMongoId()`), so a malformed id
now returns a standard **400** `errors[]` envelope instead of relying on the
controller.

### Client (`client/src/`)

| Measure | Where | Behaviour |
|---|---|---|
| 401 interceptor | `services/api.js` | Drops the stale token and redirects to `/login` when a token expires mid-session (the login/register pages are skipped so their own 401 message still shows) |
| Error messages | `utils/validation.js` (`getApiErrorMessage`) | Turns any Axios error into a readable message; status-specific fallbacks for 400/401/403/404/409/413/429/5xx |
| Field errors | pages under `src/pages/**` | Renders the server's `errors[{ field, message }]` next to the offending input |
| Error boundary | `components/ErrorBoundary.jsx` (mounted in `main.jsx`) | A render crash shows a recovery screen instead of a blank page; details go to the console only |

---

## Verification (Phases 4-13 checks performed)

Run the server (`npm run dev` from `server/`) and check:

```bash
curl http://localhost:5000/api/health                 # 200 success envelope
curl http://localhost:5000/api/categories             # 200, 10 seeded categories
curl http://localhost:5000/api/categories/clothing    # 200 by slug
curl http://localhost:5000/api/categories/nope        # 404
curl http://localhost:5000/api/organizations          # 200, empty + pagination
curl "http://localhost:5000/api/organizations?limit=999"  # 400 validation
curl -X POST http://localhost:5000/api/unknown        # 404 not-found handler

# Authentication
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Donor","email":"t@example.com","password":"secret123","role":"donor"}'   # 201, no password in response
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"t@example.com","password":"secret123"}'                                      # 200 { token, user }
curl http://localhost:5000/api/auth/me              # 401 without token
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer <token>"                    # 200, no password

# Phase 6 - donor profile + donations (use a donor token)
curl http://localhost:5000/api/users/me -H "Authorization: Bearer <donorToken>"              # 200 { user, donorProfile }
curl -X PATCH http://localhost:5000/api/users/me -H "Authorization: Bearer <donorToken>" \
  -H "Content-Type: application/json" -d '{"name":"Demo Donor","about":"Hello"}'             # 200
curl http://localhost:5000/api/donations -H "Authorization: Bearer <donorToken>"             # 200, own donations only
curl http://localhost:5000/api/donations/stats -H "Authorization: Bearer <donorToken>"       # 200, totals + recent
curl -X POST http://localhost:5000/api/donations -H "Authorization: Bearer <donorToken>" \
  -H "Content-Type: application/json" \
  -d '{"organization":"<orgId>","pickupAddress":"22 Green Street, Chennai","items":[{"category":"<catId>","quantity":3,"condition":"Good"}]}'   # 201, status PENDING
curl http://localhost:5000/api/donations -H "Authorization: Bearer <orgToken>"               # 403 (donor only)

# Phase 7 - organization profile + request inbox (use an organization token)
curl http://localhost:5000/api/organizations/me -H "Authorization: Bearer <orgToken>"        # 200 profile (created on first call)
curl http://localhost:5000/api/organizations/me -H "Authorization: Bearer <donorToken>"      # 403 (organization only)
curl -X PATCH http://localhost:5000/api/organizations/me -H "Authorization: Bearer <orgToken>" \
  -H "Content-Type: application/json" -d '{"city":"Chennai","website":"https://example.org"}'  # 200; verificationStatus ignored
curl http://localhost:5000/api/organizations/me/stats -H "Authorization: Bearer <orgToken>"  # 200 totals + recent
curl http://localhost:5000/api/organizations/me/donations -H "Authorization: Bearer <orgToken>"   # 200, donor populated
curl http://localhost:5000/api/organizations/me/donations/<donationId> -H "Authorization: Bearer <orgToken>"   # 200
curl -X PATCH http://localhost:5000/api/organizations/me/donations/<donationId>/status \
  -H "Authorization: Bearer <orgToken>" -H "Content-Type: application/json" \
  -d '{"status":"ACCEPTED"}'                                                                 # 200; repeat -> 400
curl -X PATCH http://localhost:5000/api/organizations/me/donations/<otherDonationId>/status \
  -H "Authorization: Bearer <otherOrgToken>" -H "Content-Type: application/json" \
  -d '{"status":"ACCEPTED"}'                                                                 # 404 (not your request)

# Phase 8 - collection scheduling + tracking (donation must be ACCEPTED)
curl -X POST http://localhost:5000/api/collections -H "Authorization: Bearer <donorToken>" \
  -H "Content-Type: application/json" \
  -d '{"donation":"<donationId>","scheduledDate":"2026-10-20","scheduledTime":"12:00 - 14:00"}'   # 201, donation -> SCHEDULED
curl -X POST http://localhost:5000/api/collections -H "Authorization: Bearer <donorToken>" \
  -H "Content-Type: application/json" \
  -d '{"donation":"<donationId>","scheduledDate":"2026-10-21","scheduledTime":"10:00 - 12:00"}'   # 400 (already scheduled)
curl -X PATCH http://localhost:5000/api/collections/<collectionId> -H "Authorization: Bearer <donorToken>" \
  -H "Content-Type: application/json" \
  -d '{"scheduledDate":"2026-10-22","scheduledTime":"14:00 - 16:00"}'                            # 200 reschedule
curl http://localhost:5000/api/collections/<collectionId>/tracking -H "Authorization: Bearer <donorToken>"  # 200, stages + history
curl -X PATCH http://localhost:5000/api/collections/<collectionId>/status -H "Authorization: Bearer <orgToken>" \
  -H "Content-Type: application/json" -d '{"status":"PICKED_UP"}'                                # 200
curl -X PATCH http://localhost:5000/api/collections/<collectionId>/status -H "Authorization: Bearer <orgToken>" \
  -H "Content-Type: application/json" -d '{"status":"RECEIVED"}'                                 # 200
curl -X PATCH http://localhost:5000/api/collections/<collectionId>/status -H "Authorization: Bearer <orgToken>" \
  -H "Content-Type: application/json" -d '{"status":"DISTRIBUTED"}'                              # 200; repeat -> 400
curl -X PATCH http://localhost:5000/api/collections/<collectionId>/status -H "Authorization: Bearer <donorToken>" \
  -H "Content-Type: application/json" -d '{"status":"PICKED_UP"}'                                # 403 (organization only)
curl http://localhost:5000/api/collections/<collectionId> -H "Authorization: Bearer <otherDonorToken>"   # 404 (scope)

# Phase 9 - admin dashboard (admin account comes from `npm run seed`)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.admin@example.com","password":"demo123"}'                                # 200 token
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"X","email":"x@example.com","password":"secret123","role":"admin"}'             # 400 (no admin self-registration)
curl http://localhost:5000/api/admin/stats                                                   # 401 without token
curl http://localhost:5000/api/admin/stats -H "Authorization: Bearer <donorToken>"           # 403 (donor)
curl http://localhost:5000/api/admin/stats -H "Authorization: Bearer <orgToken>"             # 403 (organization)
curl http://localhost:5000/api/admin/stats -H "Authorization: Bearer <adminToken>"           # 200 counters + recent
curl "http://localhost:5000/api/admin/users?role=admin" -H "Authorization: Bearer <adminToken>"        # 200 filtered
curl "http://localhost:5000/api/admin/users?q=demo&limit=1" -H "Authorization: Bearer <adminToken>"   # 200 search + pagination
curl "http://localhost:5000/api/admin/users?role=nope" -H "Authorization: Bearer <adminToken>"        # 400
curl -X PATCH http://localhost:5000/api/admin/users/<userId>/status -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" -d '{"isActive":false}'                                # 200; own account -> 400
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"<deactivated>","password":"secret123"}'   # 403 deactivated
curl "http://localhost:5000/api/admin/organizations?verificationStatus=PENDING" -H "Authorization: Bearer <adminToken>"  # 200 queue
curl -X PATCH http://localhost:5000/api/admin/organizations/<orgId>/verify -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"verificationStatus":"APPROVED","verificationNotes":"OK"}'                             # 200; repeat -> 400 (finalized)
curl -X PATCH http://localhost:5000/api/admin/organizations/<orgId>/verify -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" -d '{"verificationStatus":"MAYBE"}'                    # 400
curl http://localhost:5000/api/organizations                                                 # 200, now includes the approved org
curl "http://localhost:5000/api/admin/donations?status=PENDING" -H "Authorization: Bearer <adminToken>"   # 200 across donors
curl -X POST http://localhost:5000/api/categories -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" -d '{"name":"Test Category"}'                          # 201; donor token -> 403
curl -X DELETE http://localhost:5000/api/categories/<categoryId> -H "Authorization: Bearer <adminToken>"  # 200 soft delete
curl http://localhost:5000/api/categories                                                     # 200, hides it again

# Phase 10 - notifications (any signed-in role; token = donor / org / admin)
curl http://localhost:5000/api/notifications                                          # 401 without token
curl "http://localhost:5000/api/notifications?unread=true&limit=5" -H "Authorization: Bearer <token>"   # 200 only unread
curl "http://localhost:5000/api/notifications?limit=0" -H "Authorization: Bearer <token>"               # 400 validation
curl http://localhost:5000/api/notifications/unread-count -H "Authorization: Bearer <token>"            # 200 unreadCount
curl -X PATCH http://localhost:5000/api/notifications/<notificationId>/read -H "Authorization: Bearer <token>"   # 200
curl -X PATCH http://localhost:5000/api/notifications/<notificationId>/read -H "Authorization: Bearer <token>"   # 400 already read
curl -X PATCH http://localhost:5000/api/notifications/<otherUserNotificationId>/read \
  -H "Authorization: Bearer <token>"                                                       # 404 (not yours)
curl -X PATCH http://localhost:5000/api/notifications/000000000000000000000000/read \
  -H "Authorization: Bearer <token>"                                                       # 404 unknown id
curl -X PATCH http://localhost:5000/api/notifications/not-an-id/read -H "Authorization: Bearer <token>"   # 400
curl -X PATCH http://localhost:5000/api/notifications/read-all -H "Authorization: Bearer <token>"         # 200

# Phase 10 - complaints (donor / organization)
curl http://localhost:5000/api/complaints                                                 # 401 without token
curl -X POST http://localhost:5000/api/complaints -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Admin complaint attempt","description":"Admins cannot raise complaints."}'   # 403
curl -X POST http://localhost:5000/api/complaints -H "Authorization: Bearer <donorToken>" \
  -H "Content-Type: application/json" -d '{"subject":"Hi","description":"Valid length description text."}'  # 400 (subject)
curl -X POST http://localhost:5000/api/complaints -H "Authorization: Bearer <orgToken>" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Wrong donation link","description":"Linking a donation we do not own.","donation":"<otherDonationId>"}'  # 404
curl -X POST http://localhost:5000/api/complaints -H "Authorization: Bearer <donorToken>" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Pickup never arrived","description":"The scheduled pickup did not happen.","donation":"<ownDonationId>"}' # 201, admins notified
curl http://localhost:5000/api/complaints -H "Authorization: Bearer <donorToken>"         # 200 own complaints only
curl http://localhost:5000/api/complaints/<otherUsersComplaintId> -H "Authorization: Bearer <donorToken>"   # 404 (scope)
curl "http://localhost:5000/api/complaints?status=BOGUS" -H "Authorization: Bearer <donorToken>"            # 400

# Phase 10 - admin complaint queue
curl http://localhost:5000/api/admin/complaints                                         # 401 without token
curl http://localhost:5000/api/admin/complaints -H "Authorization: Bearer <donorToken>" # 403 (donor)
curl http://localhost:5000/api/admin/complaints -H "Authorization: Bearer <adminToken>"  # 200 queue
curl "http://localhost:5000/api/admin/complaints?q=pickup" -H "Authorization: Bearer <adminToken>"          # 200 search
curl "http://localhost:5000/api/admin/complaints?status=BOGUS" -H "Authorization: Bearer <adminToken>"      # 400
curl http://localhost:5000/api/admin/complaints/<complaintId> -H "Authorization: Bearer <donorToken>"       # 403
curl -X PATCH http://localhost:5000/api/admin/complaints/<complaintId>/status -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" -d '{"status":"OPEN"}'                               # 400 (not settable)
curl -X PATCH http://localhost:5000/api/admin/complaints/<complaintId>/status -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" -d '{"status":"RESOLVED"}'                           # 400 (response required)
curl -X PATCH http://localhost:5000/api/admin/complaints/<complaintId>/status -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" -d '{"status":"IN_REVIEW"}'                          # 200 OPEN -> IN_REVIEW
curl -X PATCH http://localhost:5000/api/admin/complaints/<complaintId>/status -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" -d '{"status":"IN_REVIEW"}'                          # 400 (invalid transition)
curl -X PATCH http://localhost:5000/api/admin/complaints/<complaintId>/status -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" -d '{"status":"RESOLVED","adminResponse":"Pickup rescheduled."}'      # 200
curl -X PATCH http://localhost:5000/api/admin/complaints/<complaintId>/status -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" -d '{"status":"IN_REVIEW"}'                          # 400 (CLOSED is terminal)

# Phase 11 - reports + CSV exports (admin only)
curl http://localhost:5000/api/admin/reports/overview                                       # 401 without token
curl http://localhost:5000/api/admin/reports/overview -H "Authorization: Bearer <donorToken>"      # 403 (donor)
curl http://localhost:5000/api/admin/reports/overview -H "Authorization: Bearer <adminToken>"      # 200 all counters
curl "http://localhost:5000/api/admin/reports/donations?status=PENDING&limit=5" -H "Authorization: Bearer <adminToken>"   # 200 summary + rows
curl "http://localhost:5000/api/admin/reports/donations?status=BOGUS" -H "Authorization: Bearer <adminToken>"             # 400
curl "http://localhost:5000/api/admin/reports/donations?startDate=2026-10-10&endDate=2026-10-01" -H "Authorization: Bearer <adminToken>"  # 400 (start after end)
curl "http://localhost:5000/api/admin/reports/donations?organization=not-an-id" -H "Authorization: Bearer <adminToken>"   # 400
curl "http://localhost:5000/api/admin/reports/collections?status=SCHEDULED" -H "Authorization: Bearer <adminToken>"      # 200 summary + activity
curl "http://localhost:5000/api/admin/reports/complaints?status=OPEN" -H "Authorization: Bearer <adminToken>"            # 200 summary + activity
curl "http://localhost:5000/api/admin/reports/export/donations" -H "Authorization: Bearer <adminToken>"                  # 200 text/csv attachment
curl "http://localhost:5000/api/admin/reports/export/collections" -H "Authorization: Bearer <adminToken>"                # 200 text/csv attachment
curl "http://localhost:5000/api/admin/reports/export/complaints" -H "Authorization: Bearer <adminToken>"                 # 200 text/csv attachment
curl "http://localhost:5000/api/admin/reports/export/donations" -H "Authorization: Bearer <donorToken>"                  # 403

# Phase 12 - maps & locations
curl "http://localhost:5000/api/locations/geocode?addressLine=22%20Green%20Street&city=Chennai"                          # 401 without token
curl "http://localhost:5000/api/locations/geocode?addressLine=22%20Green%20Street&city=Chennai&state=Tamil%20Nadu&pincode=600001" \
  -H "Authorization: Bearer <donorToken>"                                                                                # 200 { latitude, longitude, source: offline }
curl "http://localhost:5000/api/locations/geocode?addressLine=short&city=C" -H "Authorization: Bearer <donorToken>"      # 400
curl "http://localhost:5000/api/locations/nearby?lat=13.08&lng=80.27"                                                     # 200 approved orgs + distanceKm (public)
curl "http://localhost:5000/api/locations/nearby?lat=999&lng=80"                                                          # 400
curl -X PATCH http://localhost:5000/api/users/me -H "Authorization: Bearer <donorToken>" -H "Content-Type: application/json" \
  -d '{"defaultLocation":{"addressLine":"22 Green Street","city":"Chennai","state":"Tamil Nadu","pincode":"600001"}}'     # 200, geocoded defaultLocation
curl -X PATCH http://localhost:5000/api/users/me -H "Authorization: Bearer <donorToken>" -H "Content-Type: application/json" \
  -d '{"defaultLocation":{"addressLine":"22 Green Street"}}'                                                             # 400 (incomplete)
curl -X PATCH http://localhost:5000/api/organizations/me -H "Authorization: Bearer <orgToken>" -H "Content-Type: application/json" \
  -d '{"address":"5 Anna Salai","city":"Chennai","state":"Tamil Nadu","pincode":"600002"}'                               # 200, location geocoded
curl http://localhost:5000/api/organizations/me -H "Authorization: Bearer <orgToken>"                                    # 200, populated location
curl -X POST http://localhost:5000/api/donations -H "Authorization: Bearer <donorToken>" -H "Content-Type: application/json" \
  -d '{"organization":"<orgId>","pickupAddress":"22 Green Street, Chennai","items":[{"category":"<catId>","quantity":2,"condition":"Good"}]}'  # 201, pickupLocation filled from the donor default location

# Phase 13 - validation, security and error handling

# Hardening / headers (no token needed)
curl -sD - -o /dev/null http://localhost:5000/api/health          # 200, no X-Powered-By and no RateLimit-* (health is exempt)
curl -sD - -o /dev/null http://localhost:5000/api/categories     # CSP + X-Content-Type-Options + RateLimit-Limit: 300
curl -X POST http://localhost:5000/api/unknown                   # 404 { "success": false } from the not-found handler

# Validation
curl "http://localhost:5000/api/organizations/not-an-id"         # 400 errors[{ field: "id" }] - new organizationIdRules (Phase 13)
curl "http://localhost:5000/api/organizations?limit=999"         # 400 errors[{ field: "limit" }]
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"a","email":"nope","password":"x","role":"donor"}'  # 400 errors[]
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email": "broken"'                                         # 400 Invalid JSON in request body
# POST with a body larger than 2MB                                # 413 Request body too large

# NoSQL injection
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":{"$gt":""},"password":{"$gt":""}}'                  # 400 - operators stripped, no wildcard login
curl "http://localhost:5000/api/organizations?city[$ne]=X"        # 200 - Express 5 keeps query values as strings, so it is an unknown key

# Rate limiting - run LAST: it spends the auth budget for 15 minutes
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"demo.donor@example.com","password":"nope"}'       # repeat until the 50th attempt -> 429 Too many attempts
# restart the server (or wait 15 min) to clear the in-memory counters before signing in from the UI

# Client side (no curl - check in the browser / dev tools)
#   expired token on any /api/... call -> token dropped, redirected to /login (services/api.js)
#   render crash anywhere -> recovery screen (components/ErrorBoundary.jsx), details only in the console
```

### Phase 13 results (verified 16 October 2026)

Both servers were running (`node server.js` on :5000, `npm run dev` on :5173,
MongoDB on 127.0.0.1) and every check below was executed against them.

| Suite | Result |
|---|---|
| Full Phase 13 + Phases 5-12 regression harness (live HTTP) | **81 / 81 passed** |
| Focused authentication, RBAC and integration pass | **61 / 61 passed** |
| `cd client && npm run lint` (oxlint) | clean, 0 warnings |
| `cd client && npm run build` (Vite) | built in 1.9 s, 142 modules, `dist/assets/index-*.js` 491.8 kB (133.7 kB gzip) |
| Backend / frontend logs | no errors (`server/*.err`, `client/*.err`) |

Re-run during Phase 15 (16 October 2026) against the same stack: both suites again
**81 / 81** and **61 / 61**, plus `npm test` (model smoke test), `npm run lint` and
`npm run build` - all passing. No API changes were made in Phase 15.

What the two suites covered:

- **Security headers**: helmet CSP / HSTS / `X-Content-Type-Options` present, `X-Powered-By` removed, `RateLimit-*` headers on normal endpoints, `/api/health` exempt.
- **Validation**: 400 + `errors[]` for bad `:id`, bad `page`/`limit`, bad register payload, malformed JSON; 413 for an oversized body.
- **Sanitising**: `{"email":{"$gt":""}}` login -> 400; `$`-prefixed query keys ignored.
- **Auth / RBAC**: valid login, wrong password, unknown account (same message), missing credentials, no token -> 401, donor vs NGO vs admin on `/api/admin/*`, `/api/donations`, `/api/organizations/me`, `/api/complaints`, `/api/admin/reports/*`.
- **Error handling**: unknown route -> 404 envelope, unknown id -> 404, bad id -> 400, no stack traces in any response.
- **Rate limiting**: 429 after the 50-attempt auth budget is spent.
- **Regression**: donation create -> accept -> schedule -> reschedule -> PICKED_UP -> RECEIVED -> DISTRIBUTED, notifications, complaint create + admin IN_REVIEW -> RESOLVED, admin stats/users/organizations/donations, all four report endpoints + CSV export (200 `text/csv`, 403 for a donor), maps geocode/nearby, and the Vite proxy (`http://localhost:5173/api/health` and `/api/auth/login` -> 200).

Test data written by the regression run (development database only): one
donation taken to `DISTRIBUTED` and one complaint taken to `RESOLVED`, both
labelled "Phase 13 regression ...".
