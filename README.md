# Donation & Reuse Platform

A full-stack web platform that connects people who want to donate unused clothes and household items with verified NGOs, orphanages and beneficiaries. It handles donation listings, NGO verification, doorstep collection scheduling, tracking, notifications, complaints and admin reporting.

This is **not** a fundraising platform: there is no payment gateway, no cash donations, no auctions and no resale.

---

## Problem Statement

Many people have unused clothes and household items but struggle to donate them because of:

- Lack of verified NGOs or distribution channels
- Difficulty coordinating collection logistics
- Limited awareness about donation opportunities
- Lack of transparency in donation fulfilment
- Manual tracking and documentation

The platform solves this with one centralized web application covering the full donation flow: donor creates a donation → NGO accepts → pickup is scheduled → NGO collects the items → NGO marks them received and distributed.

---

## Technology Stack

| Layer | Technology | Why it was chosen |
|---|---|---|
| Frontend | React 19 + Vite | Component-based UI, fast development server, easy deployment to Vercel/Netlify |
| UI | Bootstrap 5 + custom CSS | Responsive grid, accessible ready-made components |
| Routing | React Router | Standard client-side routing for a multi-page SPA |
| HTTP | Axios | Centralized API calls with interceptors for JWT |
| Backend | Node.js + Express | JavaScript end-to-end, huge ecosystem, simple REST APIs |
| Database | MongoDB + Mongoose | Flexible document model fits donations with embedded items; Mongoose gives schemas and validation |
| Auth | JWT + bcryptjs | Stateless authentication, passwords stored only as hashes |
| Maps | Modular location service | Runs without an API key; key added later via `.env` |

---

## Architecture

```
Browser (React SPA)
   │  fetch/axios  -  REST + JSON
   ▼
Express REST API  (/api/...)
   │  Mongoose
   ▼
MongoDB
```

- The frontend and backend are separate projects (`client/` and `server/`) so each can be deployed independently.
- In development, the Vite dev server proxies `/api` and `/uploads` to the Express server (see `client/vite.config.js`), so no CORS issues locally.
- In production, set `CLIENT_URL` on the server (exact frontend origin, no trailing slash) and `VITE_API_URL` on the client **including the `/api` suffix** (e.g. `https://api.example.com/api`).

---

## Folder Structure

```
donation-reuse-platform/
│
├── client/                  # React frontend (Vite)
│   ├── public/
│   └── src/
│       ├── assets/          # images and static files
│       ├── components/      # reusable UI components (Navbar, Cards, ...)
│       ├── context/         # React Context (auth/user state)
│       ├── hooks/           # custom React hooks
│       ├── layouts/         # page layouts (public, dashboard with sidebar)
│       ├── pages/           # route-level pages (public, donor, org, admin)
│       ├── services/        # api.js + feature services (axios calls live here)
│       ├── utils/           # small helpers (formatters, constants)
│       ├── App.jsx
│       └── main.jsx
│
├── server/                  # Express REST API
│   ├── config/              # db.js (MongoDB connection)
│   ├── controllers/         # request handlers
│   ├── middleware/          # auth, roles, validation, error handling
│   ├── models/              # Mongoose schemas
│   ├── routes/              # route definitions
│   ├── services/            # business logic used by controllers
│   ├── utils/               # helpers + seed script
│   ├── validators/          # input validation rules
│   ├── uploads/             # uploaded item images (git-ignored)
│   ├── app.js               # express app: middleware + routes
│   └── server.js            # entry point: env + db connection + listen
│
├── docs/                    # architecture, API, database, setup, deployment docs
├── .env.example             # environment variable documentation
└── README.md
```

---

## Prerequisites

- Node.js 18+ (tested on Node 25)
- npm 10+
- MongoDB running locally, **or** a MongoDB Atlas connection string

---

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd donation-reuse-platform

# 2. Backend
cd server
npm install
copy .env.example .env      # Windows (use cp .env.example .env on macOS/Linux)
# edit .env: set MONGO_URI and a strong JWT_SECRET
npm run dev                 # starts API on http://localhost:5000

# 3. Frontend (new terminal)
cd client
npm install
npm run dev                 # starts UI on http://localhost:5173
```

---

## Environment Variables

`server/.env` (never commit this file):

| Variable | Description | Example |
|---|---|---|
| `PORT` | API port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/donation_reuse_platform` |
| `JWT_SECRET` | Secret for signing JWTs | long random string (32+ chars) |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_URL` | Allowed frontend origin (CORS) - exact, no trailing slash | `http://localhost:5173` |
| `MAP_API_KEY` | Map/location provider key (optional) | key from provider |
| `NODE_ENV` | Runtime mode; set `production` on the host | `production` (unset locally) |

`client/.env` (optional):

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | API base URL **including `/api`**; leave empty in development (dev proxy handles it) | `https://api.example.com/api` |

---

## Running the Application

| Command | Where | What it does |
|---|---|---|
| `npm run dev` | `server/` | Starts Express with automatic restart |
| `npm start` | `server/` | Starts Express (production) |
| `npm run seed` | `server/` | Loads development seed data (added with the models phase) |
| `npm run dev` | `client/` | Starts Vite dev server |
| `npm run build` | `client/` | Production build of the frontend |
| `npm run lint` | `client/` | Lints the frontend code |

Health check: `GET http://localhost:5000/api/health`

### Demo accounts (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Donor | `demo.donor@example.com` | `demo123` |
| Organization | `demo.ngo@example.com` | `demo123` |
| Admin | `demo.admin@example.com` | `demo123` |

The donor account signs in and lands on the donor dashboard (`/donor`); the
organization account lands on the organization dashboard (`/organization`); the admin
account lands on the admin dashboard (`/admin`), where new organizations are verified,
users are managed and donations are monitored. Admin accounts cannot self-register.

---

## Testing & Quality Checks

No unit-test framework (Jest/Vitest) is configured. Quality is verified with static
analysis, a production build, a database smoke test and the documented curl regression
checks:

| Command | Where | What it does |
|---|---|---|
| `npm run lint` | `client/` | oxlint static analysis over the React code |
| `npm run build` | `client/` | Production bundle (Vite) - catches import/syntax errors |
| `npm run preview` | `client/` | Serves the production build locally |
| `npm test` | `server/` | Runs `utils/modelSmokeTest.js`: creates one document per model, checks populate/password-hiding/validation, then cleans up |
| `npm run seed` | `server/` | Idempotent upsert of categories + demo accounts (development only) |
| curl suites in `docs/api.md` | any shell | Manual API regression checks for Phases 4-13 (validation, auth, RBAC, rate limiting, reports, maps) |

---

## Troubleshooting (quick list)

Full table with fixes: `docs/setup.md` -> Troubleshooting.

| Symptom | Fix |
|---|---|
| API exits with `Could not connect to MongoDB` | Start MongoDB or correct `MONGO_URI` in `server/.env` |
| `WARNING: JWT_SECRET is missing or weak` | Set a 32+ character random `JWT_SECRET` (production refuses to start without it) |
| `EADDRINUSE :::5000` | Stop the old process or change `PORT` |
| CORS error from the UI | `CLIENT_URL` must equal the frontend origin exactly (no trailing slash) |
| Every API call 404s after deploy | `VITE_API_URL` is missing or lacks the `/api` suffix |
| `429 Too many requests` | Rate limiter (300/15 min per IP, 50 on login+register) - wait 15 min or restart the API in development |
| Logged out immediately / redirected to `/login` | Token expired - sign in again (stale tokens are dropped by design) |
| Blank page in the browser | Check the console: the ErrorBoundary recovery screen should show instead |

---

## API Overview

All endpoints are prefixed with `/api`. Example response format:

```json
{ "success": true, "message": "Donation created successfully", "data": {} }
```

```json
{ "success": false, "message": "Unable to create donation" }
```

Main endpoint groups (added phase by phase):

- `/api/auth` - register, login, current user
- `/api/users` - profile
- `/api/donations` - create/list/update donation status
- `/api/organizations` - organization profiles and verification
- `/api/collections` - pickup scheduling and tracking
- `/api/categories` - item categories
- `/api/notifications` - in-app notifications (list, unread count, mark read)
- `/api/complaints` - complaints/disputes (create, list, admin workflow)
- `/api/locations` - geocoding and nearby-organization search (Phase 12)
- `/api/admin` - users, organizations, donations, complaints, statistics

Full reference: `docs/api.md`

### Security & validation (Phase 13)

- Every mutating route and every `:id` param is validated with `express-validator`; failures return `400` with `errors: [{ field, message }]`.
- `server/middleware/sanitize.js` strips `$`-prefixed and dotted keys from body, query and params so NoSQL operators can never reach a query.
- Rate limits: 300 requests / 15 min / IP on `/api` (`/api/health` exempt) and 50 attempts / 15 min / IP on `register` + `login` (`429` once spent).
- `helmet` security headers, CORS locked to `CLIENT_URL`, 2 MB JSON body limit, `X-Powered-By` removed.
- One central error handler shapes every failure (404, validation, cast, duplicate key, malformed JSON, oversized body); a 500 never leaks stack traces.
- The server refuses to start in production when `JWT_SECRET` is missing, still the `.env.example` placeholder, or shorter than 16 characters.
- On the client, an expired token is dropped and redirects to `/login`; a render crash is caught by `components/ErrorBoundary.jsx` instead of showing a blank page.

Implementation notes and the verified Phase 13 test results: `docs/api.md`.

### Responsive UI & polish (Phase 14)

- Audited every page at phone (~320-425 px), tablet (~768 px) and desktop widths: all tables already sit in `.table-responsive`, and forms/grids consistently use `col-12 col-sm-*` / `col-md-*` wrappers.
- Dashboards gained a slim top bar (`components/DashboardHeader.jsx`) with the brand link, "Back to site" and a **Logout** button - previously a signed-in user had no way to sign out or return to the public site from any dashboard.
- The dashboard menu becomes a horizontally scrollable pill row below the `lg` breakpoint (`.sidebar-nav` in `client/src/index.css`) instead of a tall column that buries the page content on phones.
- The notification dropdown width moved from an inline `20rem` to `.notification-menu` (`width: 20rem; max-width: calc(100vw - 2rem)`) so it can never run past the right edge of a small screen.
- `components/ScrollToTop.jsx` resets scroll on every route change; long user-entered strings wrap instead of widening the page (`overflow-wrap: break-word` on card/list/table text); images keep their aspect ratio; the hero headline shrinks below `sm`.
- Collection detail labels stack below `sm` (`CollectionSection.jsx`) and the button rows that could overflow now wrap.

Verified with `npm run lint` (clean) and `npm run build`, then rendered in headless Chrome: the home page plus the donor, organization and admin dashboards all mount with no console errors and show the new top bar (temporary login-seed page used for the check, then deleted).

### Documentation & deployment preparation (Phase 15)

- Completed the documentation set: `docs/setup.md`, `docs/architecture.md`, `docs/database.md` and `docs/deployment.md` were linked from this README but missing; all four now exist. `docs/api.md` (endpoints + curl verification suites) is unchanged.
- README fixes: the `VITE_API_URL` example now includes the required `/api` suffix, `NODE_ENV` is documented, and new **Testing & Quality Checks** and **Troubleshooting** sections were added.
- `.env.example` (repository root, `server/`, `client/`) documents every variable the code actually reads (`PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `MAP_API_KEY`, `NODE_ENV`, `VITE_API_URL`) using placeholders only. `server/.env` was not touched and remains git-ignored.
- `server/package.json` gained `npm test`, wiring the existing model smoke test (`utils/modelSmokeTest.js`).
- Deployment preparation: `render.yaml` (Render Blueprint) and `client/vercel.json` (Vite build settings) are committed as configuration only; nothing has been deployed. Checklist, hosting architecture, post-deploy verification, first-admin bootstrap and rollback notes: `docs/deployment.md`.
- Removed leftover Phase 13 dev logs (`p13-*.log` / `p13-*.err`); `.gitignore` verified (covers `.env`, `node_modules/`, `client/dist/`, `server/uploads/*`, `*.log`, `*.err`).
- Security review: no real secrets, JWTs or credentialed connection strings anywhere in the repository; demo credentials exist only in the seed script and documentation (development data only).

**All checks executed on 16 October 2026 (none assumed):**

| Check | Result |
|---|---|
| `cd server && npm test` (model smoke test) | passed - 10 models created, populated, validated, cleaned |
| `cd client && npm run lint` | passed - no findings |
| `cd client && npm run build` | passed - 144 modules, production bundle |
| `GET /api/health` | HTTP 200 success envelope |
| Frontend page + `/api` proxy on `:5173` | HTTP 200 |
| Auth/RBAC + proxy integration suite (curl) | **61 / 61 passed** |
| Full API regression suite, Phases 4-13 (harness) | **81 / 81 passed** |

**Remaining deployment blockers** (require accounts/authorization only the project owner can give): no Git repository yet (Vercel/Render need a pushed repo), hosting accounts with the production `CLIENT_URL` / `VITE_API_URL` values, Atlas network access for the API host, and the first-admin bootstrap (one Atlas update - steps in `docs/deployment.md`). Never run `npm run seed` in production. Full list: `docs/deployment.md` -> Known limitations.

---

## Development Status

Built incrementally, phase by phase:

- [x] Phase 1 - project structure, React + Vite frontend, Express backend
- [x] Phase 2 - frontend layout and public pages
- [x] Phase 3 - MongoDB models
- [x] Phase 4 - Express REST API structure
- [x] Phase 5 - authentication (JWT, roles)
- [x] Phase 6 - donor functionality (donor dashboard, create donation, history, profile)
- [x] Phase 7 - organization/beneficiary functionality (profile, request inbox, accept/reject)
- [x] Phase 8 - collection scheduling and tracking
- [x] Phase 9 - admin dashboard
- [x] Phase 10 - notifications and complaints
- [x] Phase 11 - reports
- [x] Phase 12 - maps/location functionality
- [x] Phase 13 - validation, security, error handling
- [x] Phase 14 - responsive UI testing and polish
- [x] Phase 15 - documentation and deployment preparation

---

## Deployment

**Recommended architecture (see `docs/deployment.md` for the full checklist):**

```
Vercel/Netlify (SPA)  ──►  VITE_API_URL = https://<api>/api
Render/Railway (API)  ──►  npm start in server/, health check /api/health
MongoDB Atlas (M0)    ──►  MONGO_URI (mongodb+srv)
```

**Frontend (Vercel / Netlify)**

1. Root directory `client`, build command `npm run build`, output directory `dist`
2. Set `VITE_API_URL` to the deployed API **including `/api`** (e.g. `https://api.example.com/api`), then rebuild

**Backend (Render / Railway / AWS EC2 / Beanstalk)**

1. Root directory `server`, start command `npm start`
2. Set all variables from `.env.example` in the hosting platform's environment settings
   (`NODE_ENV=production`, fresh `JWT_SECRET`, `MONGO_URI`, `JWT_EXPIRES_IN`, optional `MAP_API_KEY`)
3. Set `CLIENT_URL` to the deployed frontend origin exactly (no trailing slash) so CORS allows it
4. Use MongoDB Atlas and allow the API host in Atlas Network Access
5. Health check path: `/api/health`
6. Do **not** run `npm run seed` in production (demo credentials); create the first admin
   by registering a normal account and promoting its `role` in Atlas (steps in `docs/deployment.md`)

Pre-deploy checklist, post-deploy verification steps, limitations and rollback notes:
`docs/deployment.md`.

---

## Documentation

- `docs/architecture.md` - system design, request lifecycle, auth/RBAC, domain flow
- `docs/api.md` - REST API reference + curl verification suites
- `docs/database.md` - MongoDB collections, relationships, enums, indexes
- `docs/setup.md` - local setup walkthrough + full troubleshooting table
- `docs/deployment.md` - deployment checklist, hosting steps, post-deploy verification

---

## Future Enhancements

- Email/SMS alerts in addition to in-app notifications
- Image storage on cloud storage (Cloudinary/S3) instead of local disk
- Route optimization for collection pickups
- Mobile app (React Native) sharing the same REST API
