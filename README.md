# SubSentry — Subscription Tracker Pro

A full-stack subscription tracker for auditing recurring spend. SubSentry records subscriptions,
tracks how often each one is actually used, warns before upcoming renewals, and surfaces "leak"
candidates so unused plans can be cancelled.

## Overview

SubSentry is a CIA-2 style analysis app: it does not just list subscriptions, it evaluates them.
Every subscription carries a cost, a billing cycle, a billing anchor date and a usage log. From
that data the dashboard derives monthly expenditure, current/previous year spend, renewals due in
the next 7 days, and plans that are paid for but barely used.

## Architecture

```
Browser (React 18 + Vite)
   │  fetch /api/*  ── Vite dev proxy ──▶  Express REST API (Node)  ──▶  MongoDB
```

- **Frontend** — React 18 SPA built with Vite. Feature components (commitment panel, renewal
  tracker, low-usage panel, metrics row, category breakdown, leak suggestions, subscription table/form,
  usage history modal, calendar and insights screens) render a warm, light dashboard. `src/api.js`
  is the single API client.
- **Backend** — Express 4 REST API with a layered layout: `routes/` → `middleware/` (validation,
  error handling) → `controllers/` → `models/` (Mongoose). Derived values live in
  `utils/metrics.js` and `utils/renewal.js`, so renewal/low-usage logic is computed server-side.
- **Database** — MongoDB via Mongoose. Subscription documents embed a `usageLogs` array; derived
  flags (`monthlyCost`, `yearlyCost`, `daysUntilRenewal`, `isRenewingSoon`, `isLowUsage`,
  `isEnded`) are exposed as virtuals.
- **Dev orchestration** — `scripts/dev.mjs` (zero-dependency) starts a persistent local `mongod`,
  waits for it, starts Express with nodemon, polls `/api/health` until the database reports
  `connected`, then starts Vite. `Ctrl+C` shuts the whole tree down.

## Features

| Area | Behaviour |
| --- | --- |
| Subscription CRUD | Create, edit, read and delete subscriptions (name, service, category, cost, billing cycle, billing date, optional end date) |
| Billing cycles | Monthly / quarterly / yearly, with renewal dates anchored to the original billing date (month-end and leap-year safe) |
| Upcoming renewals | `daysUntilRenewal` plus an `isRenewingSoon` flag for renewals inside the configurable window (default 7 days) |
| Usage tracking | Record a use (`POST /usage`), set an absolute count (`PUT /usage`) or reset it, with a timestamped note log |
| Usage history | Per-subscription log retrieval and single-entry deletion |
| Low-usage detection | Plans with fewer uses than `LOW_USAGE_THRESHOLD` (default 3) in the last 30 days are flagged |
| Dashboard metrics | Total subscriptions, monthly expenditure, current/previous year spend, renewals in 7 days, low-usage count |
| Suggestions | Rule-based leak detection (upcoming renewals, low-usage plans, category spend concentration) |
| Validation & errors | `express-validator` rules, `422` field-level errors, JSON `400`/`404`/`500` responses via one central error handler |
| Responsive UI | Single-column mobile, tablet and desktop layouts with no horizontal overflow |

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Status plus database connection state |
| GET / POST | `/api/subscriptions` | List all / create one |
| GET / PUT / DELETE | `/api/subscriptions/:id` | Read / update / delete one |
| GET | `/api/subscriptions/stats` | Dashboard aggregates |
| POST | `/api/subscriptions/:id/cancel` | Mark a subscription as ended |
| POST / PUT / DELETE | `/api/subscriptions/:id/usage` | Log a use / set count / reset |
| GET | `/api/subscriptions/:id/usage/history` | Usage log entries |
| DELETE | `/api/subscriptions/:id/usage/:logId` | Remove one usage entry |

## Environment setup

Requirements: **Node.js >= 18** and **MongoDB** — either a local `mongod` binary or a MongoDB
Atlas cluster. Atlas is the primary mode: when `MONGODB_URI` is a `mongodb+srv://` string, the dev
orchestrator connects straight to the cluster and never starts a local `mongod`.

```bash
npm install                          # installs root, client and server workspaces
cp server/.env.example server/.env   # then edit values (never commit .env)
```

For Atlas, copy the SRV string from *Atlas → Connect* into `MONGODB_URI` and percent-encode any
special characters in the password (`p@ss` → `p%40ss`). Allow your machine's IP under
*Atlas → Network Access*.

`server/.env` keys:

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `5000` | API port; invalid values fall back to `5000` |
| `NODE_ENV` | `development` | |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/subsentry` | Primary connection string (`MONGO_URI` is a legacy alias and never overrides it). `mongodb+srv://` selects Atlas; a local host selects the bundled on-disk `mongod` |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated list of allowed browser origins |
| `LOW_USAGE_THRESHOLD` | `3` | Uses per 30 days below which a plan counts as low usage |
| `RENEWAL_WINDOW_DAYS` | `7` | Days ahead that count as an upcoming renewal |

In local mode data lives in `.data/mongodb` with logs in `.data/mongod.log`; both are git-ignored.
The dev orchestrator reuses a cached `mongod` binary when one is available and prints a clear setup
error if none can be found. In Atlas mode nothing is written to disk locally.

Transient public-network failures (TLS alerts, resets) during the Atlas handshake are retried with
backoff, and credentials are never written to logs — only a `scheme://host/database` target is
printed.

## Deployment & security

SubSentry has no user accounts: it is an owner-only app. The shipped code has no authentication
by default, so anyone who can reach the host can read and change subscriptions. For any internet-
facing deployment, set these variables in `server/.env` to add an HTTP Basic authentication gate
that protects both the dashboard and the API:

| Variable | Default | Notes |
| --- | --- | --- |
| `AUTH_USER` | (empty) | Username for the optional access gate; with it unset the gate is a no-op |
| `AUTH_PASSWORD` | (empty) | Password for the optional access gate; both values must be set for the gate to activate |
| `TRUST_PROXY` | `false` | Set to `1`/`true`/`yes`/`on` when behind a reverse proxy or platform load balancer so rate limiting sees the real client IP |
| `WRITE_RATE_LIMIT_MAX` | `120` | Maximum mutating `/api` requests per client IP per window; `0` disables |
| `WRITE_RATE_LIMIT_WINDOW_MS` | `300000` | Window in milliseconds for the write rate limit (default 5 minutes) |

When the gate is active, `GET /api/health` stays open (platform/orchestrator probes cannot send
credentials, and it exposes no user data), while every other route returns `401` with a
`WWW-Authenticate: Basic` header until valid credentials are supplied. Reads are never rate-limited;
only `POST`/`PUT`/`PATCH`/`DELETE` to `/api/*` are throttled. Set `WRITE_RATE_LIMIT_MAX=0` to
disable the limiter, for example when an edge platform already enforces its own limits.

The server also sends these response headers on every request:

- `Content-Security-Policy`: scripts from `'self'` only, styles from `'self'` plus Google Fonts
  (inline `style` attributes are allowed for bar widths; inline scripts are not),
  fonts from `'self'` and `fonts.gstatic.com`, images from `'self'` and `data:`, connections
  to `'self'` only, `frame-ancestors 'none'`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:`
  `strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`,
  `Cross-Origin-Opener-Policy: same-origin`.
- `Strict-Transport-Security` only when `NODE_ENV=production` or the request is already HTTPS.
- `X-Powered-By` is disabled.

Server error responses for status `>= 500` return a generic message; diagnostic details stay in the
server logs only. The request body is capped at 100 kB and Mongoose `ObjectId`/`cast`/`validation`/
duplicate-key errors are mapped to `400`/`422`/`400` JSON responses.

### Recommended production architecture

SubSentry's backend is a single long-running Node.js process (`node src/server.js`) that keeps a
persistent Mongoose connection to MongoDB Atlas, serves the built React SPA from `client/dist/`,
and enforces the security headers, optional Basic gate, and write rate limiter in-process. That model
is a strong fit for a platform that runs a persistent server, such as **Render (Web Service)**, which
is the recommended target here. The app reads `PORT` from the environment (default `5000`) and,
when no host is given, Node binds to all interfaces — so on Render it binds to `0.0.0.0:$PORT` and
Render forwards inbound traffic to it.

**Vercel is not a good fit for this app as-is.** Vercel runs stateless serverless/edge functions that
start and stop per request; a Mongoose connection would be opened and closed on every invocation,
the in-process write-rate-limit buckets would be lost between calls, and there is no long-running
process to serve the SPA and the API together. If Vercel is required later, the backend would need to
be rewritten as a stateless API (connection pooling/HTTP-based persistence, external rate limiting, and
a separate static host for the SPA) — out of scope for this deployment.

### Render deployment (recommended)

1. **Push the verified source** to GitHub (`main`). The repo's `npm start` runs the server only
   (`node src/server.js`); Render runs that as the start command after its own build step.
2. **Create a MongoDB Atlas cluster** (or reuse the existing one) and a database user, copy the
   `mongodb+srv://` connection string, and percent-encode any special characters in the password.
3. **Create a Render Web Service** from this repository:
   - **Name**: `subsentry` (or any name you like).
   - **Region**: pick the region closest to you and to the Atlas cluster.
   - **Branch**: `main`.
   - **Language**: `Node`.
   - **Build Command**: `npm run build`.
   - **Start Command**: `npm start`.
   - **Environment**: set `NODE_ENV=production`.
   - **Environment Variables / Secrets** (set these in the Render dashboard, **not** in the repo):
     - `MONGODB_URI` — your Atlas `mongodb+srv://` string. Mark it as a secret.
     - `CLIENT_ORIGIN` — the deployed origin, e.g. `https://subsentry.onrender.com` (the Express
       process serves the SPA from the same origin, so same-origin requests do not need CORS; set
       this to the actual origin in case of any cross-origin use, and include any custom domain).
     - `AUTH_USER` and `AUTH_PASSWORD` — set both to enable the HTTP Basic gate (strongly
       recommended for any internet-facing instance).
     - `TRUST_PROXY=1` — Render terminates TLS at its load balancer and forwards requests over
       HTTP, so set this so rate limiting sees the real client IP.
     - `LOW_USAGE_THRESHOLD` and `RENEWAL_WINDOW_DAYS` — optional; defaults are `3` and `7`.
   - **Health Check Path**: set to `/api/health` (it returns `{"status":"ok","database":"connected"}`
     and is intentionally left open so Render's own health probe can reach it without credentials).
   - Render provides free, managed TLS certificates and redirects HTTP to HTTPS automatically.
4.  **Allowlist Render's outbound IP in Atlas → Network Access.** Render does not publish a single
   static egress IP in its public docs. After the first deploy, find the Render service's outbound IP
   in the Render dashboard / deploy logs and add it under Atlas → Network Access (or use a VPC/
   private connection). Until the outbound IP is allowlisted, the deploy will fail to connect to Atlas
   and the health check will report `database: "disconnected"`.
5.  **Verify** after the first deploy: `GET https://<your-service>.onrender.com/api/health` should
   return `database: "connected"`, and the dashboard should load over HTTPS with the security headers
   present (use the security smoke `server/scripts/security.mjs` locally with
   `AUTH_USER=... AUTH_PASSWORD=... WRITE_RATE_LIMIT_MAX=3` to confirm the gate, headers and 429
   behaviour before exposing it).

### Environment setup

Requirements: **Node.js >= 18** and **MongoDB** — either a local `mongod` binary or a MongoDB
Atlas cluster. Atlas is the primary mode: when `MONGODB_URI` is a `mongodb+srv://` string, the dev
orchestrator connects straight to the cluster and never starts a local `mongod`.

```bash
npm install                          # installs root, client and server workspaces
cp server/.env.example server/.env   # then edit values (never commit .env)
```

For Atlas, copy the SRV string from *Atlas → Connect* into `MONGODB_URI` and percent-encode any
special characters in the password (`p@ss` → `p%40ss`). Allow your machine's IP under
*Atlas → Network Access*.

`server/.env` keys:

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `5000` | API port; invalid values fall back to `5000`. On Render this is set to `10000` by default. |
| `NODE_ENV` | `development` | Set to `production` in production; enables HSTS |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/subsentry` | Primary connection string (`MONGO_URI` is a legacy alias and never overrides it). `mongodb+srv://` selects Atlas; a local host selects the bundled on-disk `mongod` |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated list of allowed browser origins |
| `LOW_USAGE_THRESHOLD` | `3` | Uses per 30 days below which a plan counts as low usage |
| `RENEWAL_WINDOW_DAYS` | `7` | Days ahead that count as an upcoming renewal |

In local mode data lives in `.data/mongodb` with logs in `.data/mongod.log`; both are git-ignored.
The dev orchestrator reuses a cached `mongod` binary when one is available and prints a clear setup
error if none can be found. In Atlas mode nothing is written to disk locally.

Transient public-network failures (TLS alerts, resets) during the Atlas handshake are retried with
backoff, and credentials are never written to logs — only a `scheme://host/database` target is
printed.

### Deploy checklist

1. Build the client: `npm run build`.
2. Set `MONGODB_URI` to your Atlas SRV string (or a local `mongod`) in `server/.env`.
3. Set `CLIENT_ORIGIN` to your deployed frontend origin (same-origin when Express also serves
   `client/dist`, so this is mainly for cross-origin deployments).
4. Set `AUTH_USER` and `AUTH_PASSWORD` for any internet-facing instance.
5. Set `TRUST_PROXY` if a reverse proxy or platform load balancer fronts the app.
6. Allow the deployment's outbound IP under **Atlas → Network Access** (or use a private/VPC
   connection) and ensure the cluster allows TLS from this platform.
7. Serve over HTTPS. The CSP, HSTS (in production) and `frame-ancestors 'none'` assume a secure,
   same-origin deployment.

`npm run verify` runs a 56-check end-to-end suite against an in-memory MongoDB and does **not**
need Atlas or any network access. A separate security smoke test,
`server/scripts/security.mjs`, exercises the access gate, security headers, open health probe and
write rate limiter against the same in-memory database (run with
`AUTH_USER=owner AUTH_PASSWORD=<pw> WRITE_RATE_LIMIT_MAX=3 node server/scripts/security.mjs`).
That file is a local helper and is **not** shipped in the repo.

## Commands

Run from the repository root:

```bash
npm run dev      # start mongod → Express API → Vite (http://localhost:5173)
npm run build    # production build of the React client into client/dist
npm run verify   # 56-check end-to-end API test suite (uses an in-memory MongoDB)
npm start        # run the API only; serves client/dist if it has been built
```

`npm run dev:client` and `npm run dev:server` start the two halves separately if you already have a
MongoDB instance running.

## Project structure

```
Subsentry/
├── client/                 React + Vite frontend
│   ├── src/
│   │   ├── App.jsx         Dashboard composition and data loading
│   │   ├── api.js          API client
│   │   ├── components/     Hero, SummaryCards, SubscriptionForm, SubscriptionTable,
│   │   │                   RenewalTracker, LowUsagePanel, LeakSuggestions,
│   │   │                   UsageHistoryModal, Modal, Toast, DateField, animations
│   │   ├── constants.js    Categories, billing cycles, thresholds
│   │   └── format.js       Currency and date formatting
│   ├── index.html
│   └── vite.config.js      Dev proxy /api → API with JSON error fallback
├── server/                 Express + MongoDB backend
│   ├── src/
│   │   ├── app.js          Express app, CORS, static client serving
│   │   ├── server.js       Bootstrap: connect DB, listen, graceful shutdown
│   │   ├── config/         env parsing, Mongoose connection
│   │   ├── models/         Subscription schema with embedded usage logs
│   │   ├── routes/         REST routes
│   │   ├── controllers/    Request handlers and stats aggregation
│   │   ├── middleware/     Validation rules, error handler, 404
│   │   └── utils/          Metrics, renewal maths, async wrapper, constants
│   ├── scripts/verify.mjs  56-check API test suite
│   ├── .env.example
│   └── package.json
├── scripts/dev.mjs         Dev orchestrator (MongoDB → API → Vite)
├── package.json            npm workspaces and root scripts
└── .gitignore
```

## Notes

- The root-level `index.html`, `script.js` and `style.css` are the original static prototype,
  kept for reference. They are not part of the build or served by the app — the React client in
  `client/` is the real entry point.
- `mongodb-memory-server` is a dev dependency used **only** by `npm run verify`; normal
  development always uses the persistent on-disk database.
- Secrets belong in `server/.env`, which is git-ignored. Only `server/.env.example` with
  placeholder values is committed.
