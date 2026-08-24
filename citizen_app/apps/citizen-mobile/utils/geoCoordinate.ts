/** §map-provider — `[longitude, latitude]`, the coordinate order every
 * MapLibre component expects, the opposite of react-native-maps'
 * `{latitude, longitude}`. Named (rather than an inline
 * `[p.longitude, p.latitude]` at every call site) so a lat/lng swap bug is
 * a one-place fix, not a hunt. */
export function toMapLibreCoordinate(point: { latitude: number; longitude: number }): [number, number] {
  return [point.longitude, point.latitude];
}
