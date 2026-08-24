# SafePath AI — Local Setup

## Prerequisites

- Node.js 20+, npm
- Python 3.10–3.12 (3.10 verified; **not 3.14** — several backend
  dependencies don't ship prebuilt wheels for it yet)
- Docker Desktop (for Postgres+PostGIS)
- An Android device/emulator or Expo Go for running the mobile app

## 1. Backend

```bash
cd backend/api

# Postgres + PostGIS
docker compose -f ../../docker-compose.yml up -d db

# Python env
python -m venv .venv
./.venv/Scripts/python -m pip install -r requirements.txt   # Windows
# ./.venv/bin/pip install -r requirements.txt                # macOS/Linux

cp .env.example .env   # defaults already point at the docker-compose db

# Schema
./.venv/Scripts/python -m alembic upgrade head

# Seed realistic Chennai demo data + a demo login
./.venv/Scripts/python scripts/seed.py
# -> demo.citizen@safepath.ai / SafePath@123

# Run
./.venv/Scripts/python -m uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs
Health check: http://localhost:8000/health

### Run the backend test suite

```bash
# uses a separate `safepath_test` database on the same docker container
./.venv/Scripts/python -m pytest -q
```

## 2. Mobile app

```bash
cd apps/citizen-mobile
npm install
cp .env.example .env
```

Edit `.env`:
- `EXPO_PUBLIC_API_URL` — `http://10.0.2.2:8000/api` for the Android
  emulator (its alias for the host machine), or your machine's LAN IP for a
  physical device (`http://192.168.x.x:8000/api`).
- `EXPO_PUBLIC_DEMO_MODE=true` runs the entire app off seeded local data
  with **no backend required** — useful for a quick demo or when the
  backend isn't running. Set to `false` to hit the real API.
- `EXPO_PUBLIC_MAP_KEY` — a Google Maps SDK key, needed for the map to
  render real tiles on Android. This is native config (`app.config.js`), so
  it requires a rebuild (`npx expo prebuild --clean` or a fresh dev-client
  build) to take effect, not just a JS reload.

```bash
npx expo start
```

Press `a` for Android, scan the QR code with Expo Go, or run
`npx expo start --android` with an emulator already running.

### Type-check, test, bundle-check

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest
npx expo export --platform android   # verifies the whole app bundles through Metro
```

## Demo walkthrough (no backend needed)

1. Set `EXPO_PUBLIC_DEMO_MODE=true`.
2. `npx expo start`, open on a device/emulator.
3. Splash → onboarding → permissions → Login (any email/password works in
   demo mode) → Home shows seeded Chennai hazards.
4. Report tab → capture or pick a photo. Name a picked photo containing
   `pothole`, `clear`, `lowconf`, or `fail` to force a specific mock AI
   outcome (see `services/ai/MockAIAnalysisService.ts`); any other photo
   gets a deterministic result based on its content.
5. Submit → success screen → My Reports.

## Common issues

- **`ModuleNotFoundError` / wheel build failures on Python 3.14**: use
  Python 3.10–3.12 for the backend venv instead.
- **`npm install` peer-dependency errors** mentioning `@radix-ui`/`vaul`:
  `expo-router`'s optional web UI pulls in packages that conflict with
  strict npm resolution. Use `npm install --legacy-peer-deps`.
- **Android emulator can't reach the backend**: use `10.0.2.2`, not
  `localhost`, in `EXPO_PUBLIC_API_URL`.
- **Blank map on Android**: `EXPO_PUBLIC_MAP_KEY` is unset or the native
  app wasn't rebuilt after setting it.
