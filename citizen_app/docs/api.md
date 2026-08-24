# SafePath AI — API Reference

Live, authoritative reference: **`GET /docs`** (Swagger UI) or **`/redoc`**
on a running backend — generated directly from the Pydantic schemas, always
in sync with the code. This page is a narrative companion, not a
duplicate of the schema.

Base path: `EXPO_PUBLIC_API_URL` (mobile) / `API_V1_PREFIX` (backend,
default `/api`).

## Auth (`/api/auth`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | — | Creates user + citizen profile, returns tokens |
| POST | `/login` | — | `identifier` = email or phone |
| POST | `/refresh` | — | Rotates the refresh token (old one is revoked) |
| GET | `/me` | Bearer | Current user |
| POST | `/logout` | — | Revokes the given refresh token |

JWT access tokens are short-lived (`ACCESS_TOKEN_EXPIRE_MINUTES`); refresh
tokens are tracked server-side in `user_sessions` so they're revocable.

## Hazards (`/api/hazards`) — guest-readable

| Method | Path | Notes |
|---|---|---|
| GET | `/nearby?latitude&longitude&radius&severity&status` | Real PostGIS radius query, distance-sorted |
| GET | `/?city_id&severity&status&limit&offset` | Non-geospatial listing |
| GET | `/{id}` | Full detail incl. media + citizen-safe verification note |

## Reports (`/api/reports`) — auth required

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Creates hazard + report + status-history + media in one transaction |
| GET | `/me?tab=all\|active\|resolved` | The current user's reports |
| GET | `/{id}` | Full detail; 404s if it belongs to another user |

`POST /reports` request body has **no field** for `verified_by_admin`,
`municipality_status`, `resolved_at`, or an arbitrary `status`/`report_code`
— those are computed server-side only. See
`backend/api/tests/test_reports.py::test_client_cannot_set_privileged_fields`.

## AI (`/api/ai`) — auth required

| Method | Path | Notes |
|---|---|---|
| POST | `/analyze` | multipart `image` field; returns the `AIAnalysisResult` contract |

Currently backed by `MockAIAnalysisService` (`AI_PROVIDER=mock`). See
`docs/architecture.md` for the swap-in plan.

## Media (`/api/media`) — auth required

| Method | Path | Notes |
|---|---|---|
| POST | `/upload` | multipart `file`; validates type + 25MB limit; returns a URL |

## Notifications (`/api/notifications`) — auth required

| Method | Path | Notes |
|---|---|---|
| GET | `/` | List + unread count |
| PATCH | `/{id}/read` | Marks one read |
| POST | `/device-tokens` | Registers an Expo push token (infra only — no push sent yet) |

## Locations (`/api/locations`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | required | Saved locations (Home/Work/College/Custom) |
| POST | `/` | required | Create one |
| DELETE | `/{id}` | required | 404s if it belongs to another user |
| GET | `/search?q=` | — | Debounced road/area/city/hazard search |

## Citizen dashboard (`/api/citizen`) — auth required

| Method | Path | Notes |
|---|---|---|
| GET | `/home?latitude&longitude&radius` | One optimized payload: greeting, city, stats, nearby hazards, map markers |

## Error shape

Every error response is `{"detail": "human-readable message"}` — including
validation errors, normalized by a custom exception handler in
`backend/api/app/main.py` so the mobile client's error handling never
special-cases FastAPI's default 422 body shape.
