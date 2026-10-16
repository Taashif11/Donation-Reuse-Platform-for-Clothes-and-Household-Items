# Architecture

How the Donation & Reuse Platform is put together: two independent applications plus a
document database, talking over a JSON REST API.

---

## 1. System overview

```
┌───────────────────────────────┐          ┌──────────────────────────────┐
│  React 19 SPA  (client/)      │  HTTPS   │  Express REST API (server/)  │
│  Vite build -> static files   │ ───────► │  /api/...                    │
│                               │  JSON    │                              │
│  - Bootstrap 5 UI             │ ◄─────── │  - JWT auth + role guards    │
│  - React Router               │          │  - express-validator         │
│  - Axios (Bearer token)       │          │  - helmet / CORS / rate limit│
│  - AuthContext (token+user)   │          │  - central error handler     │
└───────────────────────────────┘          └──────────────┬───────────────┘
                                                          │ Mongoose
                                               ┌──────────▼───────────────┐
                                               │ MongoDB (local / Atlas)  │
                                               │ 10 collections           │
                                               └──────────────────────────┘
```

- **`client/`** and **`server/`** are separate npm projects so each can be deployed
  independently (static host for the SPA, Node host for the API).
- There is **no direct browser-to-database access**: every read/write goes through the API,
  which validates input, enforces roles and shapes responses.

---

## 2. Backend layering (`server/`)

| Layer | Directory | Responsibility |
|---|---|---|
| Entry | `server.js` | loads `.env`, guards `JWT_SECRET`, connects MongoDB, listens on `PORT` |
| App | `app.js` | middleware order, static `/uploads`, mounts `/api`, 404 + error handler |
| Routes | `routes/` | URL -> controller mapping, per-route validation + auth middleware |
| Validators | `validators/` | `express-validator` rule arrays (one file per resource) |
| Middleware | `middleware/` | `auth.js` (protect/authorize), `validate.js`, `sanitize.js`, `rateLimit.js`, `errorHandler.js` |
| Controllers | `controllers/` | request handlers; keep try/catch minimal because errors flow to the central handler |
| Services | `services/` | side-effect helpers (notifications, geocoding/location) |
| Models | `models/` | Mongoose schemas, enums, indexes, `pre` hooks |
| Utils | `utils/` | response envelope, constants, JWT signing, CSV writer, seed, smoke test |

### Request lifecycle (middleware order in `app.js`)

```
request
  -> trust proxy          (production only - real client IP for rate limiting)
  -> helmet               (security headers; COORP cross-origin for uploads)
  -> cors                 (origin = CLIENT_URL)
  -> express.json 2 MB    (body parsing, 413 when oversized)
  -> express.urlencoded
  -> morgan 'dev'         (access log line)
  -> sanitize /api        (strips $-prefixed / dotted keys - NoSQL injection guard)
  -> apiLimiter /api      (300 req / 15 min / IP; /api/health exempt)
  -> /uploads static
  -> routes /api          (protect -> authorize -> validate -> controller)
  -> notFound             (JSON 404 envelope)
  -> errorHandler         (400/403/404/409/413/429/500 envelopes; never leaks stacks)
```

### Response envelope (`utils/apiResponse.js`)

```json
{ "success": true,  "message": "Human readable", "data": { } }
{ "success": false, "message": "What went wrong", "errors": [ { "field": "limit", "message": "..." } ] }
```

`errors[]` only appears on validation failures (400).

---

## 3. Authentication and authorization

```
POST /api/auth/register ─┐
POST /api/auth/login  ───┼─► JWT { id, role } signed with JWT_SECRET, lifetime JWT_EXPIRES_IN
                         │
every protected call ────┘   Authorization: Bearer <token>
                                   │
                     protect() ────┤ verifies signature/exp, loads req.user (401 otherwise)
                     authorize() ──┘ checks req.user.role (403 otherwise)
```

- Passwords: bcrypt (cost 10), `select: false` on the model, stripped again in `toJSON`.
- Roles: `donor`, `organization`, `admin`. Only `donor`/`organization` can self-register
  (`registerRules` rejects `admin`); admins come from `npm run seed` or an existing admin.
- Client side: `services/api.js` attaches the token from `localStorage` on every request;
  a mid-session 401 drops the token and redirects to `/login` (login/register 401s are
  excluded so their own error messages still show).
- Route guards: `ProtectedRoute` in the SPA checks role before rendering a dashboard;
  `Sidebar` shows only the menu for the current role.

### Route protection map

| Area | Who |
|---|---|
| `/api/auth/*` (except `me`), `/api/health`, `GET /api/categories`, `GET /api/organizations` (approved only) | public |
| `/api/auth/me`, `/api/users/me`, `/api/notifications*` | any signed-in role |
| `/api/donations*`, donor profile/donation routes | donor |
| `/api/organizations/me*`, request inbox, collection actions | organization |
| `/api/collections` | donor + organization (+ admin reads) |
| `/api/complaints` (create/read) | donor + organization; admin manages the queue |
| `/api/admin/*`, admin category management, reports/exports | admin |
| `/api/locations/*` | any signed-in role |

---

## 4. Frontend layering (`client/`)

| Piece | Responsibility |
|---|---|
| `main.jsx` | mounts `<ErrorBoundary><App/></ErrorBoundary>` |
| `App.jsx` | `BrowserRouter` + route table + `ScrollToTop`; role-protected dashboard trees |
| `layouts/PublicLayout.jsx` | Navbar + page + Footer for all public pages |
| `layouts/DashboardLayout.jsx` | `DashboardHeader` (brand, back-to-site, logout) + `Sidebar` + page content |
| `context/AuthProvider.jsx` | `user`, `token` restore via `/auth/me`, `login/logout/refreshUser` |
| `components/ProtectedRoute.jsx` | waits for session restore, then enforces role/redirect |
| `services/*.js` | one Axios service per resource; all go through `services/api.js` |
| `utils/validation.js` | shared field rules + `getApiErrorMessage` (maps status codes to friendly text) |
| `utils/constants.js` | mirrors of the status enums for labels/progress UI |

### Route trees

```
/  /about  /how-it-works  /ngos  /impact  /contact  /login  /register  *   -> PublicLayout
/donor          (donor only)          -> DashboardLayout: index, donate, history, donations/:id, notifications, complaints, profile
/organization   (organization only)   -> DashboardLayout: index, requests, donations/:id, notifications, complaints, profile
/admin          (admin only)          -> DashboardLayout: index, organizations(,/:id), users, donations, categories, complaints(,/:id), reports, notifications
```

### Development proxy

`client/vite.config.js` forwards `/api` and `/uploads` to `http://localhost:5000`, so in
development the SPA is same-origin and CORS never comes into play. In production the SPA
calls `VITE_API_URL` (which must include `/api`) cross-origin, and the API allows that
origin through `CLIENT_URL`.

---

## 5. Core domain flow

```
donor                     organization                     admin
  │                            │                             │
  ├─ POST /donations ─────────►│  (PENDING)                  │
  │                            ├─ accept / reject ───────────► notification to donor
  │                            │  (ACCEPTED / REJECTED)      │
  ├─ POST /collections ───────►│  (SCHEDULED)                │
  │      (date + time slot)    │                             │
  │                            ├─ advance status ────────────► notification
  │                            │  PICKED_UP ► RECEIVED ► DISTRIBUTED
  │                            │                             │
  ├─ complaint ──────────────────────────────────────────────► OPEN ► IN_REVIEW ► RESOLVED
                                                              (verify orgs, manage users,
                                                               categories, reports)
```

- The donation `status` and the collection `status` move together (every collection
  transition also updates its donation - see `services/` + `controllers/collectionController.js`).
- `Donation.statusHistory` is append-only (a `pre('save')` hook records each change) and
  drives the tracking timeline in the UI.
- Side effects (in-app notifications) are written by the controllers/services for both
  parties: donor and organization.
- `Location` documents (geocoded addresses with a 2dsphere `geo` index) power the
  "NGOs near me" search and the map previews; they are optional - the app works without a
  map API key.

---

## 6. Key design decisions

| Decision | Why |
|---|---|
| Separate SPA and API projects | Independent deploy targets (static host + Node host), clean CORS boundary |
| JSON envelope on every response | One interceptor and one error mapper on the client |
| Shared status enums in `utils/constants.js` (backend) + `client/src/utils/constants.js` | Prevents model/validator/UI drift |
| Central error handler | Controllers stay thin; clients always get shaped JSON, stacks never leak |
| Rate limiting per IP with `trust proxy` in production | Correct client IPs behind Render/Heroku/nginx; prevents shared-bucket abuse |
| In-memory rate-limit counters | Zero infrastructure for a single-instance deployment (see `docs/deployment.md` for the multi-instance caveat) |
| Local disk for `/uploads` | No cloud account needed during development; no upload endpoint is exposed yet |
| Bootstrap 5 + custom CSS, no Bootstrap JS | React state drives menus/dropdowns; avoids a second source of truth |
