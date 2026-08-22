# SafePath Fleet — Fleet Operator App

The Fleet Operator / Data Collector app of the SafePath AI ecosystem (see
`../citizen app/docs/architecture.md` for the full picture). A separate
Expo codebase/repo, like `../municipality`, talking to the **same shared
FastAPI + PostgreSQL/PostGIS backend** at `../citizen app/backend/api` over
plain HTTP — never its own database.

## Setup

```bash
npm install
cp .env.example .env   # point EXPO_PUBLIC_API_URL at your running backend
npx expo start
```

The backend must be running (`cd "../citizen app/backend/api" && uvicorn
app.main:app --reload`) with Postgres/PostGIS up (`docker compose up -d db`
from `../citizen app`) and seeded:

```bash
cd "../citizen app/backend/api"
python scripts/seed.py                # base citizen data
python scripts/seed_municipality.py   # PTH-1029 demo hazard
python scripts/seed_fleet.py          # OP-0042 / SafePath@123, TN 38 AB 1234
```

Demo login: **Operator ID `OP-0042`**, password `SafePath@123`.

## What's here

Layered exactly like `../municipality`: `services/api/*Api.ts` (raw calls)
→ `features/*/useX.ts` (TanStack Query hooks) → `app/*.tsx` (screens). See
`store/authStore.ts` for session identity, `store/monitoringStore.ts` for
the active-drive state machine, and `services/ai/` for the swappable
mock/server/on-device inference abstraction (§07 of the product spec).

`DEFERRED.md` lists what this pass deliberately left out (on-device YOLO,
push notifications, map screens, issue reporting) and why.

## Demo mode

`EXPO_PUBLIC_DEMO_MODE=true` (the default) makes API calls fall back to
fixtures in `services/demo/mockData.ts` **only on a genuine network
error** — never on a real 4xx/5xx from a reachable backend. Useful for
running the app with no backend at all, but the intended path is running
against the real one above.
