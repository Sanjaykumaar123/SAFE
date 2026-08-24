# Deferred scope

This app covers the product spec's central control-center loop end-to-end
(§87's walkthrough: login → dashboard → search a place → hazard detail →
verify → fleet monitoring → AI Control Center → threshold change → audit
log) against the shared SafePath backend's contract, with a realistic
nationwide demo dataset standing in whenever that backend isn't reachable
(see `services/demo/mockData.ts`, `constants/config.ts::DEMO_MODE`). The
following were deliberately left out of this pass — not dropped, just not
yet built:

- **No backend in this workspace.** Unlike the sibling apps (which point
  at `../citizen app/backend/api`), no shared FastAPI/PostgreSQL backend
  exists alongside this repo yet. Every `services/api/*Api.ts` wrapper is
  written against the endpoint contract in §60 and falls back to
  `services/demo/mockData.ts` on a network error — point `EXPO_PUBLIC_API_URL`
  at a real backend once one exists and set `EXPO_PUBLIC_DEMO_MODE=false`.
- **Dedicated Global Map tab (§12/§13).** The location-search + radius
  model replaces it as the primary "see nearby data" surface (Dashboard/
  Hazards/Fleet each carry their own scoped map); a separate full-screen
  map with LIVE HAZARDS/FLEET/COVERAGE/RESOLVED/CITIES mode-switching and
  marker clustering isn't built. Markers render individually via
  `react-native-maps`; no clustering library is wired in.
- **Entity creation workflows (§23 Add City, §65 municipality/officer
  creation, §66 fleet onboarding).** This pass manages *existing* cities/
  municipalities/operators/vehicles (view, configure, activate/deactivate,
  suspend) but doesn't build the multi-step creation wizards (boundary
  upload, ward editor, officer account creation, vehicle-operator
  assignment).
- **Real push notifications** — `expo-notifications` token registration.
  The Notifications screen here polls the same way the Citizen/
  Municipality/Fleet apps' notification screens do (see their own
  `DEFERRED.md` entries).
- **Realtime/WebSocket layer (§49 "Event / Notification Layer").**
  TanStack Query polling (`POLL_INTERVAL_MS`) stands in, the same
  MVP allowance the Municipality app takes.
- **Offline read-only banner (§78).** Network failures currently fall
  back to the demo dataset (or a plain `ErrorState`) rather than a
  dedicated "OFFLINE — showing last cached data, destructive actions
  disabled" treatment with an explicit retry-when-online affordance.
- **Concurrency-conflict UI (§82).** Every mutating call sends the
  entity's `version`; the API client already maps a `409` to "this record
  changed elsewhere, refresh" (`services/api/client.ts::toApiError`), but
  no screen yet special-cases that response to auto-refetch and highlight
  what changed — it currently surfaces as a generic error banner.
- **Session/device management.** §05 calls out "device/session
  management" as part of the security model; Settings shows static
  session info but there's no list-and-revoke-active-sessions screen yet.
- **MFA is UI-complete but not enforced.** `app/(auth)/mfa.tsx` exists and
  is wired to route in from a `mfaRequired: true` login response, but the
  bundled demo backend fallback never sets that flag, so the flow can't be
  exercised without a real backend that implements it.
- **Charts are plain `View` bars**, matching the rest of the SafePath
  mobile fleet — no charting library pulled in for sparklines/trend lines.
- **Automated tests (§85/§86).** Not written in this pass.
- **App icon/splash assets** (`assets/*.png`) are placeholder copies of the
  Municipality app's icon set, not custom Admin artwork — swap them for a
  dedicated Admin icon before shipping.
