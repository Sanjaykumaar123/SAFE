# SafePath Municipality

**Verified Road Intelligence — Safer roads. Smarter cities.**

A standalone Expo/React Native app for authorized municipal officers:
prioritize, repair, and resolve road hazards surfaced by the SafePath AI
ecosystem.

```
VIEW → FILTER → INVESTIGATE → PRIORITIZE → ASSIGN → REPAIR → INSPECT → RESOLVE
```

## This is a separate app on purpose

This is its own codebase/repo, independent of `../citizen app` (the Citizen
app + shared backend). That's deliberate — it's the cleanest possible proof
that the Municipality app is *only* a client of the shared SafePath API:

```
Municipality App (this repo)
        │  HTTPS / JSON only
        ▼
../citizen app/backend/api   ← the ONE shared FastAPI + PostgreSQL/PostGIS
        │                       backend every SafePath app talks to
        ▼
Common database (hazards, citizen_reports, fleet_observations, repairs, …)
```

- This app never opens a database connection.
- This app never hardcodes another city's data or trusts itself to filter
  by city — every `/api/municipality/*` call is re-authorized server-side
  against the officer's `municipality_id` (see
  `../citizen app/backend/api/app/services/municipality/authorization.py`).
- Citizen-app code and this app share **no** npm package or import — only
  the API contract. `types/municipality.ts` is a hand-maintained mirror of
  `../citizen app/backend/api/app/schemas/municipality.py`, the same
  pattern the citizen app itself uses against its own backend.

## Run it

```bash
# 1. Start the shared backend (see ../citizen app/README.md for full setup)
cd "../citizen app"
docker compose up -d db
cd backend/api
./.venv/Scripts/python -m alembic upgrade head
./.venv/Scripts/python scripts/seed.py              # citizen demo data
./.venv/Scripts/python scripts/seed_municipality.py # municipality demo data
./.venv/Scripts/python -m uvicorn app.main:app --reload

# 2. Run this app (separate terminal)
cd municipality
npm install
cp .env.example .env
npx expo start
```

Demo login: municipality ID `MUN-CHN`, email `officer@chennai.gov.in`,
password `SafePath@123` (seeded by `scripts/seed_municipality.py`).

## Repository layout

```
app/                Expo Router screens
  index.tsx          Splash → auth check → login/dashboard redirect
  (auth)/login.tsx    Municipality ID + official email + password
  (tabs)/             Dashboard · Map · Hazards · Repairs · Analytics
  hazard/[id].tsx      Hazard detail: evidence, verification, priority, timeline
  hazard/evidence.tsx  Full evidence viewer (citizen / AI / fleet, side by side)
  repair/assign.tsx    Assign Repair form
  repair/[id].tsx      Repair detail: progress log, mark ready for inspection
  inspection/[hazardId].tsx  Inspector review: approve or request rework
  inspection/confirm.tsx     Confirm Resolution
components/common/   Design-system primitives (Button, Card, Badge, states)
constants/           theme.ts (design tokens) + enums.ts (mirrors the backend)
features/            TanStack Query hooks, one per resource
services/api/        Axios client + per-resource API wrappers
store/                Zustand: auth session, city/ward context, map viewport
types/                Hand-maintained mirror of the backend's Pydantic schemas
```

## What's implemented vs. simplified for this pass

Implemented against the real backend (no mocked data once `.env` points at
a running API): login, city-scoped dashboard, live map with viewport
queries, hazard list/detail/evidence, the last-5-fleet-observation
verification view, priority recommendation, assign repair, repair progress
+ mark-ready-for-inspection, the inspect → confirm-resolution → resolved
loop, notifications, analytics (summary/wards/severity/recurring), profile.

Simplified for now, flagged in code comments where relevant: the city
switcher on Dashboard doesn't yet open a picker sheet for municipalities
with more than one authorized city; offline read-only mode (section 56) and
WebSocket real-time (section 49 — TanStack Query polling is wired per
section 73's MVP allowance) aren't wired in yet; Command Center, Settings,
and Help & Support screens aren't built yet.
