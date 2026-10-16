# Deployment Preparation

Checklist, hosting recommendation and post-deployment verification for the stack as it
exists today (React/Vite SPA + Express API + MongoDB). Nothing here has been deployed by
the project team yet - this document is the preparation.

---

## 1. Recommended hosting architecture

```
                         ┌────────────────────────────┐
  https://<app>.vercel.app ──► Static SPA (client/dist)│  Frontend: Vercel or Netlify (free tier)
                         └────────────┬───────────────┘
                                      │ fetch  VITE_API_URL = https://<api>.onrender.com/api
                         ┌────────────▼───────────────┐
  https://<api>.onrender.com ──► Node web service       │  Backend: Render / Railway (free/starter)
                         │  root=server, start=npm start│
                         └────────────┬───────────────┘
                                      │ MONGO_URI (mongodb+srv)
                         ┌────────────▼───────────────┐
                         │ MongoDB Atlas M0 (free)     │  Database
                         └────────────────────────────┘
```

| Piece | Recommended host | Why |
|---|---|---|
| Frontend | **Vercel** or **Netlify** | Detects Vite, free TLS, instant rollbacks |
| Backend | **Render** (or Railway/Fly.io) | Native Node services, free/starter tiers, sets `NODE_ENV=production`, `trust proxy` already handled |
| Database | **MongoDB Atlas M0** | Managed backups, `mongodb+srv` works out of the box |
| Alternative (all-in-one) | A small VPS (Docker Compose: nginx + api + mongo) | Full control; more to maintain |

---

## 2. Production environment variables

Set these in the backend host's environment UI (**never** commit real values):

| Name | Where | Production value guidance |
|---|---|---|
| `NODE_ENV` | API | `production` (Render/Vercel set this automatically) |
| `PORT` | API | Usually injected by the host (Render uses the port it assigns) |
| `MONGO_URI` | API | Atlas `mongodb+srv://USER:PASS@.../donation_reuse_platform?retryWrites=true&w=majority` |
| `JWT_SECRET` | API | A new random string per environment, 32+ chars (server refuses to start if missing/weak/placeholder in production) |
| `JWT_EXPIRES_IN` | API | `7d` (or shorter, e.g. `1d`) |
| `CLIENT_URL` | API | Exact frontend origin, e.g. `https://donation-app.vercel.app` - **no trailing slash, no `/` path** |
| `MAP_API_KEY` | API | Optional - leave unset unless the map provider is configured |
| `VITE_API_URL` | Frontend | `https://<api-host>/api` - **must include the `/api` suffix**, rebuild after changing |

Local values (`server/.env`, `client/.env`) are git-ignored; `.env.example` files hold
placeholders only.

---

## 3. Pre-deploy checklist

- [ ] `git init` + push the project to a repository (this project currently has **no Git
      repository** - every hosting platform below expects one).
- [ ] Confirm `.gitignore` still covers `.env`, `server/.env`, `node_modules/`, `client/dist/`,
      `server/uploads/*`, `*.log`, `*.err` (it does today).
- [ ] `cd client && npm run lint && npm run build` completes with no errors.
- [ ] `cd server && npm test` (model smoke test) passes against a database.
- [ ] Set every API variable from section 2 in the backend host - especially a **fresh**
      `JWT_SECRET` and the correct `CLIENT_URL`.
- [ ] Set `VITE_API_URL` (with `/api`) on the frontend host.
- [ ] Atlas **Network Access** allows the backend host (add the host IP, or `0.0.0.0/0`
      only if you accept the wider exposure).
- [ ] Do **not** run `npm run seed` in production - it creates public demo credentials
      (`demo.*@example.com` / `demo123`).
- [ ] Plan the first admin account (see section 5) - admins cannot self-register.
- [ ] Remove local-only artifacts (`server/.env` stays local; no logs committed).

---

## 4. Deployment steps (Vercel + Render + Atlas)

Ready-made configuration is committed (nothing is deployed by these files alone):

- `render.yaml` (repository root) - Render Blueprint: `rootDir: server`, `npm install` /
  `npm start`, health check `/api/health`, `JWT_SECRET` auto-generated, `MONGO_URI` and
  `CLIENT_URL` filled in the dashboard.
- `client/vercel.json` - Vite build settings for the frontend (link the Vercel project
  with root directory `client`).

### 4.1 Database (Atlas)

1. Create an M0 cluster, a database user, and a network-access entry for the API host.
2. Copy the `mongodb+srv` connection string (database name `donation_reuse_platform`).

### 4.2 Backend (Render example)

1. New **Web Service** -> point at the repository, root directory `server`.
2. Build command `npm install`, start command `npm start`.
3. Add the API variables from section 2.
4. Health check path: `/api/health` (it is exempt from the rate limiter, so monitors
   stay green).
5. Deploy, then `curl https://<api>/api/health` from your machine.

### 4.3 Frontend (Vercel example)

1. Import the repository, framework **Vite**, root directory `client`.
2. Build command `npm run build`, output directory `dist`.
3. Add `VITE_API_URL=https://<api>/api`.
4. Deploy. (Netlify: base `client`, publish `dist`.)

### 4.4 Post-deployment verification

Run these against the live URLs:

| # | Check | Expected |
|---|---|---|
| 1 | `GET /api/health` | `200` JSON envelope |
| 2 | `GET /api/does-not-exist` | `404` JSON envelope (never an HTML error page) |
| 3 | `POST /api/auth/register` with a missing field | `400` with `errors[]` |
| 4 | Response headers | `X-Powered-By` absent; helmet security headers present; `RateLimit-*` headers on `/api/*` |
| 5 | Browser call from the frontend origin | No CORS error (proves `CLIENT_URL` matches exactly) |
| 6 | Call from a different origin (e.g. curl without Origin) | Allowed only for public GETs; browser flows still governed by `CLIENT_URL` |
| 7 | Sign up a fresh donor in the UI, create a donation | Donation appears on the donor dashboard |
| 8 | Login / logout / token expiry | 401 mid-session drops the token and redirects to `/login` |
| 9 | Wrong `VITE_API_URL` sanity | If every UI request 404s at `<api>/auth/...`, the `/api` suffix is missing |
| 10 | Demo accounts | `db.users.find({ email: { $regex: "example\\.com$" } })` returns nothing |
| 11 | HTTPS | Frontend and API reachable over HTTPS only |
| 12 | Rate limiting | Repeated rapid calls return `429` with `RateLimit-*` headers |

---

## 5. Creating the first admin in production

Admin accounts are intentionally excluded from self-registration (`registerRules` only
accepts `donor`/`organization`), and the seed script must not run in production.

Recommended bootstrap:

1. Register the intended admin as a normal **donor** through the UI.
2. In Atlas (Compass or the `mongosh` shell), promote that account:
   ```js
   db.users.updateOne(
     { email: "you@yourdomain.com" },
     { $set: { role: "admin", isVerified: true } }
   )
   ```
3. Log out and log back in - the admin dashboard (`/admin`) and its menu appear.
4. Verify a second admin the same way if needed.

---

## 6. Known limitations / remaining blockers

| Item | Impact | Status |
|---|---|---|
| No Git repository | Cannot connect the project to Vercel/Render/any host yet | **Action required before deploying** |
| Admin bootstrap is manual | One Atlas update after the first deploy | Documented in section 5 |
| Rate limiter stores counters in memory | Correct per IP on a single instance; with several instances each instance keeps its own bucket (weaker limits) | Acceptable for 1 instance; use a shared store (e.g. `rate-limit-redis`) if scaling out |
| CORS allows exactly one origin | Adding a second domain (www/apex, preview URLs) needs a code change in `server/app.js` | Set `CLIENT_URL` carefully |
| `/uploads` is local disk | Files would vanish on redeploy on ephemeral hosts | Not blocking today: no upload endpoint exists (multer is installed but unused) |
| No automated test suite / CI | Only `npm run lint`, `npm run build`, `npm test` (DB smoke test) and the manual curl checks in `docs/api.md` | Add CI after the repo exists |
| `morgan 'dev'` in production | Colored, verbose access logs | Cosmetic; switch to `combined` later if log volume matters |
| In-app notifications only | No email/SMS delivery | Listed under future enhancements |
| Map search quality depends on geocoding | Optional `MAP_API_KEY`; works in a limited mode without it | Optional |

---

## 7. Rollback / recovery notes

- Frontend: Vercel/Netlify keep build history - redeploy the previous commit.
- Backend: redeploy the previous commit; `JWT_SECRET` and `MONGO_URI` live in host
  settings, not in the repo, so they survive rollbacks.
- Database: Atlas continuous backup (M0 includes a small oplog/PIT window) - restore to
  a point in time from the Atlas UI.
- Never rotate `JWT_SECRET` casually: every deployed user is logged out the moment it
  changes.
