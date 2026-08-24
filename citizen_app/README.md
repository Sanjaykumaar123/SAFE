# SafePath AI

**Verified Road Intelligence — Safer roads. Smarter cities.**

Citizen mobile app + backend for a road-hazard civic-tech platform. Citizens
see verified road hazards on a live map, report new ones with a photo + auto
GPS + a (currently mock) AI severity check, and track their report through
to resolution.

```
SEE  →  REPORT  →  VERIFY  →  TRACK  →  RESOLVE
```

This repository holds the **Citizen App** — the first of four planned apps
(Admin, Municipality, Fleet Operator follow later) that will all share this
same backend and database.

## Repository layout

```
apps/citizen-mobile/   Expo Router React Native app (TypeScript)
backend/api/            FastAPI + PostgreSQL/PostGIS backend
packages/types/         Shared TS data-contract reference (for future apps)
packages/config/        Shared status/type/severity enum reference
docs/                   Architecture, API reference, setup guide
docker-compose.yml       Postgres+PostGIS for local dev
```

## Quick start

See **[docs/setup.md](docs/setup.md)** for full instructions. Short version:

```bash
# Backend
docker compose up -d db
cd backend/api && python -m venv .venv && ./.venv/Scripts/pip install -r requirements.txt
cp .env.example .env
./.venv/Scripts/python -m alembic upgrade head
./.venv/Scripts/python scripts/seed.py
./.venv/Scripts/python -m uvicorn app.main:app --reload

# Mobile (separate terminal)
cd apps/citizen-mobile
npm install
cp .env.example .env
npx expo start
```

Or set `EXPO_PUBLIC_DEMO_MODE=true` in the mobile `.env` to run the whole
app off seeded Chennai data with **no backend required**.

## The AI model is real, but not yet accurate — read this before demoing it

The pothole detector is a clean, swappable interface
(`IAIAnalysisService` / `AIAnalysisService`); as of 2026-08-22 a real
fine-tuned YOLO26n checkpoint is wired in behind it (`AI_PROVIDER=yolov8`),
alongside the deterministic mock (`AI_PROVIDER=mock`, still the default —
better for demos where the *pipeline* matters more than detection quality).
Measured on a held-out test set: mAP50 8.3%, recall 19.0% — genuinely
running real inference end-to-end, but it currently misses most real
potholes. See **[docs/architecture.md](docs/architecture.md#the-ai-integration-boundary-read-this-before-touching-ai-code)**
for the full numbers, how the checkpoint was chosen, and what it'd take to
improve it (re-tuning the fine-tune run, not just more epochs).

## Status

- Mobile: Expo SDK 57 / React Native 0.86, TypeScript strict, Expo Router.
  Full flow (splash → onboarding → auth → home/map → hazard detail →
  report → mock AI → submit → my reports → alerts → profile/settings)
  implemented; `npx tsc --noEmit`, `npm test`, and
  `npx expo export --platform android` all pass clean.
- Backend: FastAPI + SQLAlchemy 2.0 (async) + PostGIS, running against a
  real dockerized database; `pytest` suite exercises the full
  register→login→nearby-hazards→report→mock-AI loop against it.
- Android build: `eas.json` configured; no compiled APK in this
  environment (no Android SDK/EAS auth available here) — see
  `docs/setup.md`.
