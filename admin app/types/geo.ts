/** §concept — the place-search / radius-scoping model that drives almost
 * every list screen in this app: instead of browsing every record in India
 * one city at a time, the admin searches a place (city, area, road,
 * pincode, landmark, or raw coordinates) and every screen re-scopes itself
 * to a radius around that point. */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface PlaceResult extends GeoPoint {
  id: string;
  name: string;
  /** e.g. "Chennai, Tamil Nadu" */
  subtitle: string;
  type: 'city' | 'area' | 'road' | 'landmark' | 'pincode' | 'coordinates';
  cityId?: string;
}

export interface LocationContext extends PlaceResult {
  radiusKm: number;
}
