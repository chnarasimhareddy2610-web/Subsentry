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

- **Frontend** — React 18 SPA built with Vite. Feature components (summary cards, renewal
  tracker, low-usage panel, leak suggestions, subscription table/form, usage history modal) render
  a dark-themed dashboard. `src/api.js` is the single API client.
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
