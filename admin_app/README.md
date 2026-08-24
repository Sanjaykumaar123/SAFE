# SafePath Admin

**Verified Road Intelligence — One platform. One source of truth.**

The Central Admin app for the SafePath AI ecosystem: the control layer
that lets authorized platform staff observe, validate, configure, and
audit everything happening across Citizen, Municipality, and Fleet.

```
OBSERVE → CONTROL → VALIDATE → CONFIGURE → AUDIT → RESPOND
```

## The core concept: search a place, not a database

SafePath covers all of India. No admin can browse every hazard, vehicle,
or report one city at a time — so this app is built around **place
search**, not table browsing:

1. Search a city, area, road, PIN code, or raw coordinates
   (`app/location-search.tsx`).
2. Every screen — Dashboard, Hazards, Fleet, Analytics — re-scopes itself
   to a radius around that point (5/10/20/30/50 km, default 20 km; see
   `store/locationStore.ts` and `components/location/RadiusSelector.tsx`).
3. Nothing renders an unbounded nationwide list. Until a place is
   searched, list screens show only the highest-severity items nationwide
   (a bounded "what needs attention right now" view), never the full
   table (see `services/api/hazardsApi.ts::demoList`).

This mirrors the Stitch "SafePath AI — Location Intelligence Control"
design reference this app was built against.

## This is a separate app on purpose

Same architecture as its sibling SafePath apps (`../citizen app`,
`../municipality`, `../fleetoperator`): its own codebase/repo, talking to
the one shared SafePath backend over HTTPS/JSON only.

```
Admin App (this repo)
        │  HTTPS / JSON only — never a database connection,
        │  never a direct call to another SafePath mobile app
        ▼
The shared SafePath backend (FastAPI + PostgreSQL/PostGIS)
        │
        ▼
Common database (hazards, reports, fleet, cities, municipalities, AI
config, feature flags, audit log, …)
```

Every admin action — verify a hazard, change an AI threshold, activate a
city, suspend an operator — is a named API call, never a client-side
mutation: `Admin App → API → Authorization → Business Logic → DB
Transaction → Audit Log → Event → Connected Systems` (§51/§77). See
`DEFERRED.md` — no such backend exists in this workspace yet, so every API
wrapper falls back to a realistic in-app dataset (`services/demo/mockData.ts`)
spanning 12 Indian cities.

## Run it

```bash
cd "admin app"
npm install
cp .env.example .env      # already present with sane defaults
npx expo start
```

Point `EXPO_PUBLIC_API_URL` at a real SafePath backend and set
`EXPO_PUBLIC_DEMO_MODE=false` once one exists; until then the app runs
fully offline against the bundled dataset, including login.

**Demo login:** tap any role chip on the sign-in screen (SUPER_ADMIN,
PLATFORM_ADMIN, DATA_ADMIN, CITY_ADMIN, FLEET_ADMIN, AI_ADMIN,
SUPPORT_ADMIN, ANALYST) to fill a seeded account — any password is
accepted in demo mode. Each role has a different `permissions` array
(`constants/permissions.ts`), so the same UI renders differently: an
ANALYST never sees the Verify/Merge/Reject buttons on a hazard, only a
SUPER_ADMIN or AI_ADMIN can reach AI Configuration, etc.

## Repository layout

```
app/                     Expo Router screens
  index.tsx               Splash → auth check → login/dashboard redirect
  (auth)/login.tsx        Admin ID/email + password + demo role chips
  (auth)/mfa.tsx           MFA-ready verification step (§03/§08)
  (tabs)/                 Dashboard(+search home) · Hazards · Fleet · Gov · Analytics · More
  location-search.tsx      The place-search modal every "search a place" entry opens
  hazard/[id].tsx           Evidence timeline + verify/reject/reopen/flag
  hazard/merge.tsx          Duplicate hazard merge flow
  fleet/, cities/, municipality/, users/, ai/, system/, data-quality/,
  notifications/, feature-flags/, app-versions/, audit-logs/, search/
                            One route group per admin domain (§21–§59)
components/common/        Design-system primitives (Button, Card, Badge, ConfirmDialog, states)
components/location/      RadiusSelector, LocationHeader — the place/radius UI
components/admin/         Domain cards (HazardCard, VehicleCard, ActionRequiredCard, TabPills)
constants/                theme.ts (design tokens, from the Stitch reference) · enums.ts · permissions.ts
features/                 TanStack Query hooks, one per domain
services/api/             Axios client + per-domain API wrappers (each with a demo-mode fallback)
services/demo/            Nationwide mock dataset + Indian places gazetteer
services/geo/             Place search (geocoding) service
store/                    Zustand: auth/session + permissions, location/radius context
types/                    Hand-maintained mirror of the backend's admin schemas (§60)
```

## Permission model

Eight roles (`constants/enums.ts::AdminRole`), each mapped to a granular
permission set (`constants/permissions.ts::ROLE_PERMISSIONS`). Screens
never check `admin.role` directly — every gated action is wrapped in
`<PermissionGate permission={Permission.X}>` (`components/common/
PermissionGate.tsx`), backed by `useAuthStore().hasPermission()`. The
client-side gate only decides what renders; a real backend re-checks every
mutating call server-side (§05).

See `DEFERRED.md` for what's simplified or not yet built in this pass.
