# Local Setup Walkthrough

End-to-end instructions for running the Donation & Reuse Platform on your own machine.

---

## 1. Prerequisites

| Requirement | Minimum | Notes |
|---|---|---|
| Node.js | 18+ | Developed and tested on Node 25 |
| npm | 10+ | Ships with Node |
| MongoDB | 6.0+ | Local server **or** a MongoDB Atlas free cluster |

Check your versions:

```bash
node -v
npm -v
mongod --version   # only if MongoDB is installed locally
```

---

## 2. Install dependencies

The frontend and backend are separate npm projects (no workspaces):

```bash
<repo-root>/client
npm install

<repo-root>/server
npm install
```

---

## 3. Environment variables

### Backend (`server/.env`)

```bash
cd server
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
```

Edit `server/.env` and set at least `MONGO_URI` and a strong `JWT_SECRET`:

| Variable | Required | Example | Notes |
|---|---|---|---|
| `PORT` | yes | `5000` | API port |
| `MONGO_URI` | yes | `mongodb://127.0.0.1:27017/donation_reuse_platform` | Local or Atlas connection string |
| `JWT_SECRET` | yes | long random string (32+ chars) | Refuses to start in production if missing/weak |
| `JWT_EXPIRES_IN` | no | `7d` | Defaults to the value in `.env.example` |
| `CLIENT_URL` | yes (prod) | `http://localhost:5173` | Exact frontend origin allowed by CORS - **no trailing slash** |
| `MAP_API_KEY` | no | provider key | App runs without it (modular location service) |
| `NODE_ENV` | prod | `production` | Set by most hosts; enables `trust proxy` + the strict JWT check |

`server/.env` is git-ignored. Never commit it and never put real secrets in `.env.example`.

### Frontend (`client/.env`) - optional

Only one variable exists, and it is optional:

| Variable | When to set | Value |
|---|---|---|
| `VITE_API_URL` | production (and any deploy without the dev proxy) | Full API base **including `/api`**, e.g. `https://your-api.example.com/api` |

In development leave it unset/empty: Vite proxies `/api` and `/uploads` to `http://localhost:5000` (see `client/vite.config.js`), so requests stay same-origin and CORS never applies.

> **Common mistake:** setting `VITE_API_URL=https://your-api.example.com` (without `/api`).
> Every service call would then resolve to `https://your-api.example.com/auth/login`
> instead of `https://your-api.example.com/api/auth/login`. Always include the suffix.

---

## 4. MongoDB setup

### Option A - MongoDB running locally

1. Install MongoDB Community Server (or run it in Docker):
   ```bash
   docker run -d -p 27017:27017 --name mongo mongo:7
   ```
2. Keep the default connection string in `server/.env`:
   ```
   MONGO_URI=mongodb://127.0.0.1:27017/donation_reuse_platform
   ```
3. No database or collections need to be created by hand - Mongoose creates them on first write.

### Option B - MongoDB Atlas (recommended for shared/production use)

1. Create a free `M0` cluster at cloud.mongodb.com.
2. **Database Access:** create a user with *Read and write to any database*.
3. **Network Access:** add your machine's IP (or `0.0.0.0/0` for quick local testing).
4. **Connect -> Drivers:** copy the connection string and replace `<password>` and the
   database name:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/donation_reuse_platform?retryWrites=true&w=majority
   ```
5. Put it in `server/.env` as `MONGO_URI`.

---

## 5. Seed demo data (optional but recommended)

```bash
cd server
npm run seed
```

Creates (idempotent - safe to re-run, never deletes existing data):

- The 10 standard item categories (Clothing, Footwear, Books, ...).
- The demo accounts:

| Role | Email | Password |
|---|---|---|
| Donor | `demo.donor@example.com` | `demo123` |
| Organization | `demo.ngo@example.com` | `demo123` |
| Admin | `demo.admin@example.com` | `demo123` |

The organization account comes with an already **APPROVED** organization profile
("Seva Foundation (Demo)"), so donations can be created immediately.

> Demo accounts are development data. **Do not run `npm run seed` against a
> production database.**

---

## 6. Start the application

Two terminals:

```bash
# Terminal 1 - API on http://localhost:5000
cd server
npm run dev        # auto-restart (node --watch); use `npm start` for production

# Terminal 2 - UI on http://localhost:5173
cd client
npm run dev
```

Open http://localhost:5173.

---

## 7. Verify the setup

| Check | Expected result |
|---|---|
| `curl http://localhost:5000/api/health` | `{"success":true,"message":"Donation & Reuse Platform API is running",...}` |
| Open http://localhost:5173 | Home page renders, navbar and footer visible |
| Sign in as `demo.admin@example.com` / `demo123` | Lands on `/admin` dashboard |
| Register a new donor at `/register` | Account created, redirected to login |
| `cd client && npm run lint` | No errors reported (oxlint) |
| `cd client && npm run build` | Production build completes |
| `cd server && npm test` | Model smoke test passes (10 models created/read/cleaned) |

For endpoint-by-endpoint verification with curl, see the "Verification" section of `docs/api.md`.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Could not connect to MongoDB: ... Server start aborted` | MongoDB not running or wrong `MONGO_URI` | Start local mongod, or fix the URI in `server/.env`; for Atlas check IP access + credentials |
| `WARNING: JWT_SECRET is missing or weak` on start | Placeholder/short secret (dev only) | Set a 32+ character random `JWT_SECRET` in `server/.env` |
| Server exits immediately in production with a `JWT_SECRET` message | Strict Phase 13 guard | Set a real `JWT_SECRET` in the host environment |
| `EADDRINUSE: address already in use :::5000` | Another process holds the port | Stop the old process or set `PORT` to something else |
| UI loads but every API call returns a CORS error | `CLIENT_URL` doesn't match the frontend origin | Set `CLIENT_URL` to the exact origin (scheme + host, **no trailing slash**), restart the API |
| API works locally but 404s after deploy | `VITE_API_URL` missing or missing `/api` | Set `VITE_API_URL=https://your-api.example.com/api`, rebuild the frontend |
| `429 Too many requests` / `Too many attempts` | Rate limiter (300 req / 15 min per IP; 50 on login+register) | Wait 15 minutes or restart the API during development |
| Logged out on every refresh or bounced to `/login` | Expired/invalid token | Log in again; the client intentionally drops stale tokens (Phase 13) |
| `Seed failed: ...` | Same as MongoDB connection errors above | Fix `MONGO_URI`, re-run `npm run seed` |
| Blank white page in the browser | A render crash reached the root | The ErrorBoundary recovery screen should appear; check the browser console and the API console |
| `npm run build` fails on a fresh clone | Dependencies not installed in `client/` | Run `npm install` inside `client/` first |
| New notifications/donations don't appear | Stale tab | Refresh - the badge refreshes once a minute, lists load on mount |

---

## 9. Useful commands

| Command | Location | Purpose |
|---|---|---|
| `npm run dev` | `server/` | API with auto-restart |
| `npm start` | `server/` | API (production entry point) |
| `npm test` | `server/` | Model smoke test (creates + verifies + cleans 10 models) |
| `npm run seed` | `server/` | Categories + demo accounts (idempotent) |
| `npm run dev` | `client/` | Vite dev server with `/api` proxy |
| `npm run build` | `client/` | Production bundle in `client/dist/` |
| `npm run lint` | `client/` | oxlint static analysis |
| `npm run preview` | `client/` | Serve the production build locally |

Next: `docs/api.md` (endpoints), `docs/architecture.md` (design), `docs/database.md` (schemas),
`docs/deployment.md` (going live).
