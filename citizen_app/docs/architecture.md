# SafePath AI — Architecture

## System overview

SafePath AI is a road-intelligence platform. This repository contains the
**Citizen App** and the shared backend — built so more apps could be added
later **against the same backend and database**, not a citizen-only one.
That's no longer hypothetical: the **Municipality App**
(`../municipality`, sibling directory, separate repo) is built and talks to
this backend over plain HTTP, adding nothing to this repo except the
`backend/api/app/api/v1/municipality/` route package,
`app/services/municipality/`, and a handful of new/extended models — see
that package's docstrings, and `../municipality/README.md` for the other
side of the integration. Admin and Fleet Operator remain future work.

```
citizen app/                       (repo root)
  apps/
    citizen-mobile/                 Expo Router React Native app (this app)
  backend/
    api/                            FastAPI service
      app/api/v1/municipality/       Municipality app's route package
      app/services/municipality/     Municipality app's business logic
      scripts/seed_municipality.py   Municipality demo data
  packages/
    types/                          Reference copy of shared TS data contracts
    config/                         Reference copy of shared status/type/severity enums
  docs/                             You are here
  docker-compose.yml                Postgres+PostGIS for local dev — shared
                                     by this app AND ../municipality

../municipality/                    Municipality App — separate repo, see
                                     its own README.md
```

## Product loop

```
SEE  →  REPORT  →  VERIFY  →  TRACK  →  RESOLVE
```

- **SEE**: Home/Map screens show live hazards near the citizen, sourced from
  a real PostGIS radius query (`GET /api/hazards/nearby`).
- **REPORT**: Camera → Preview → Mock AI Analysis → Review → Submit
  (`apps/citizen-mobile/app/report/*`).
- **VERIFY**: Backend/admin workflows (future) move a hazard through
  `REPORTED → UNDER_REVIEW → VERIFIED`. The citizen sees this as a friendly
  timeline, never as backend jargon (see "Citizen-safe language" below).
- **TRACK**: My Reports (`apps/citizen-mobile/app/reports/`) shows every
  report a citizen submitted and its current status.
- **RESOLVE**: When a hazard's status becomes `RESOLVED`, it drops out of
  "nearby/active" results but its historical report data is preserved.

## The AI integration boundary (read this before touching AI code)

**A real pothole model is wired in as of 2026-08-22** — a YOLO26n
checkpoint fine-tuned on the BharatPotHole dashcam dataset, running
in-process on the backend via `ultralytics`. Every layer of the app was
already built around a single swappable interface for exactly this, so
plugging it in touched only the AI service layer — no UI, navigation,
state management, or API contract changed.

**Read the accuracy caveat before treating this as "solved":** measured on
a 1049-image held-out test split, the current checkpoint scores mAP50 8.3%
/ recall 19.0% — real inference, correctly integrated end-to-end, but not
yet production-accurate (it misses most real potholes and many of its
detections are weak matches). See the "MEASURED ACCURACY" note at the top
of `backend/api/app/services/ai/yolo_service.py` for the full numbers, how
it was chosen among four candidate checkpoints, and a diagnosis of why
(the fine-tuning run shows signs of diverging after some epoch — needs
re-tuning, not just more training, to meaningfully improve). Keep
`AI_PROVIDER=mock` for demos where "does the pipeline work end-to-end"
matters more than "is this detection actually right"; use `yolov8` when
you specifically want to exercise the real model.

### Mobile side

```
apps/citizen-mobile/services/ai/
  IAIAnalysisService.ts     the interface every AI provider implements
  MockAIAnalysisService.ts  deterministic mock (AI_PROVIDER=mock, default)
  YOLOAIAnalysisService.ts  real — posts to this app's own POST /api/ai/analyze
  index.ts                  factory: getAIAnalysisService() reads
                             EXPO_PUBLIC_AI_PROVIDER (mock | yolov8)
```

Screens (`app/report/analyze.tsx`, `app/report/result.tsx`) only ever call
`getAIAnalysisService().analyzeRoadImage(uri)`. They do not know or care
which implementation is active.

### Backend side

```
backend/api/app/services/ai/
  base.py           the interface (AIAnalysisService ABC)
  mock.py           deterministic mock (AI_PROVIDER=mock, default)
  yolo_service.py   real — loads app/ml_models/pothole_yolo26n_finetune_v1.pt
                    via ultralytics and runs real inference in-process
  __init__.py       factory: get_ai_service() reads AI_PROVIDER (mock | yolov8)
```

`POST /api/ai/analyze` is the contract both implementations satisfy — see
section 51 of the product spec for the exact JSON shape. Swapping which
one is active is a one-line `.env` change (`AI_PROVIDER`), same on the
mobile side (`EXPO_PUBLIC_AI_PROVIDER`) — no screen, store, or route is
aware of the switch either way.

### Swapping in a better checkpoint later

`AI_MODEL_PATH` in the backend `.env` points at the `.pt` file
`yolo_service.py` loads — retrain or fine-tune a better one (see
`C:\...\aimodelsafe`'s `finetune_model.py`/`train_model.py` for the
pipeline this checkpoint came from) and repoint that one setting; nothing
else in this codebase needs to change.

## Data contracts

The backend is the source of truth (SQLAlchemy models +
Pydantic schemas). The mobile app's `types/` directory is a hand-maintained
camelCase mirror (translated automatically at the network boundary — see
`apps/citizen-mobile/services/api/client.ts` and `utils/case.ts`).
`packages/types` and `packages/config` hold a documented reference copy of
the same shapes for when Admin/Municipality/Fleet apps are scaffolded —
copy from there, don't re-derive the contract from scratch.

Key entities (see `backend/api/app/models/`): `User`, `CitizenProfile`,
`City`, `Road`, `Hazard`, `HazardMedia`, `CitizenReport`, `ReportMedia`,
`ReportStatusHistory`, `Notification`, `SavedLocation`, `AIAnalysis`,
`DeviceToken`, `UserSession`, plus future-ready placeholders
`FleetObservation`, `MunicipalityAction`, `HazardVerification` — present in
the schema now, unused by this app, so the other three apps don't require a
breaking migration to show up.

## Geospatial design

PostGIS `Geography(Point, 4326)` columns are the source of truth for
location; plain `latitude`/`longitude` floats are kept in sync for cheap
reads. All "nearby" queries go through
`backend/api/app/services/geo.py::query_nearby_hazards`, which uses a real
`ST_DWithin` radius filter — the mobile app never fetches "everything in the
city" and filters client-side (see spec sections 27/43).

## Status model

A single enum module is the only place hazard/report status strings are
defined: `backend/api/app/models/enums.py::HazardStatus` on the backend,
`apps/citizen-mobile/constants/hazardStatus.ts` on the mobile app. Nothing
else should hardcode `"VERIFIED"` etc. as a string literal.

## Citizen-safe language

Citizens never see backend/internal language. The one place this
translation happens is `backend/api/app/schemas/hazard.py::build_verification_note`
— internal state (`verified_by_admin`, corroboration count) becomes
"Recently verified by SafePath road observations." Never "fleet
consensus," "PostGIS query," "server reconciliation," etc. (product spec
section 46).

## Real-time

No WebSocket requirement for v1. `apps/citizen-mobile/services/realtime/RealtimeService.ts`
defines the interface a future WebSocket-based implementation would satisfy;
today `PollingRealtimeService` (via TanStack Query `refetchInterval` +
pull-to-refresh) is what's wired in.

## Storage

`backend/api/app/services/storage/` — `StorageService` interface,
`LocalDiskStorageService` (active by default, serves `/media/*` statically
from the FastAPI process) and `S3CompatibleStorageService` (fully
implemented, unused until real bucket credentials are supplied via
`STORAGE_PROVIDER=s3` in `.env`).

## Offline behavior

`apps/citizen-mobile/services/offline/reportQueue.ts` persists a report
draft to `AsyncStorage` if submission fails due to a network error (rather
than losing it); `hooks/useNetworkSync.ts`, mounted at the app root, flushes
the queue automatically once connectivity returns.
