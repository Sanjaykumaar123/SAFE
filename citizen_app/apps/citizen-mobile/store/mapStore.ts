/** `MapRegion` is the only thing still consumed from this module (by
 * `utils/mapViewport.ts`). A Zustand `useMapStore` (region/filters/
 * selectedHazard, including a `status` filter) used to live here, but no
 * screen ever read it — `components/map/MapScreen.tsx` keeps its own local
 * `useState` for severity filtering and the selected hazard instead, so the
 * store was dead code that looked like a working status-filter mechanism.
 * It's been removed rather than wired up: wiring it would mean deciding a
 * filtering UX (MapScreen's multi-select severity `Set` doesn't map onto
 * this store's single optional `severity`/`status` fields) rather than a
 * mechanical fix. */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
