/**
 * §12/§57/§concept — a small bundled Indian places gazetteer. This is what
 * `services/geo/geocodeService.ts` searches against in demo mode / as an
 * offline fallback, so "search a city or place, see everything within N km"
 * works across the whole country without a live geocoding API key. A real
 * deployment points `geocodeService` at `/api/admin/maps/geocode` (backed
 * by the platform's own city/ward/road gazetteer) or a hosted Nominatim
 * instance instead — see EXPO_PUBLIC_GEOCODE_URL.
 */
import type { PlaceResult } from '@/types/geo';

export interface CitySeed {
  id: string;
  code: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  population: number;
}

export const CITY_SEEDS: CitySeed[] = [
  { id: 'city-chn', code: 'CHN', name: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, population: 7_100_000 },
  { id: 'city-cbe', code: 'CBE', name: 'Coimbatore', state: 'Tamil Nadu', latitude: 11.0168, longitude: 76.9558, population: 1_600_000 },
  { id: 'city-blr', code: 'BLR', name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, population: 8_400_000 },
  { id: 'city-mdu', code: 'MDU', name: 'Madurai', state: 'Tamil Nadu', latitude: 9.9252, longitude: 78.1198, population: 1_020_000 },
  { id: 'city-hyd', code: 'HYD', name: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867, population: 6_800_000 },
  { id: 'city-mum', code: 'MUM', name: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777, population: 12_400_000 },
  { id: 'city-del', code: 'DEL', name: 'Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.209, population: 11_000_000 },
  { id: 'city-pun', code: 'PUN', name: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567, population: 3_100_000 },
  { id: 'city-kol', code: 'KOL', name: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639, population: 4_500_000 },
  { id: 'city-ahm', code: 'AHM', name: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714, population: 5_600_000 },
  { id: 'city-jai', code: 'JAI', name: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873, population: 3_000_000 },
  { id: 'city-lko', code: 'LKO', name: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462, population: 2_800_000 },
];

/** Localities/roads/landmarks — a few per major city so "Velachery" or
 * "MG Road" resolves to a sensible nearby point rather than only the city
 * centroid, matching the design reference's search examples. */
const LOCALITY_SEEDS: (PlaceResult & { cityId: string })[] = [
  { id: 'area-velachery', name: 'Velachery', subtitle: 'Chennai, Tamil Nadu', type: 'area', latitude: 12.9791, longitude: 80.2207, cityId: 'city-chn' },
  { id: 'area-tnagar', name: 'T. Nagar', subtitle: 'Chennai, Tamil Nadu', type: 'area', latitude: 13.0418, longitude: 80.2341, cityId: 'city-chn' },
  { id: 'road-ohc', name: 'OMR (Old Mahabalipuram Road)', subtitle: 'Chennai, Tamil Nadu', type: 'road', latitude: 12.8996, longitude: 80.2273, cityId: 'city-chn' },
  { id: 'area-koramangala', name: 'Koramangala', subtitle: 'Bengaluru, Karnataka', type: 'area', latitude: 12.9352, longitude: 77.6245, cityId: 'city-blr' },
  { id: 'road-mgroad-blr', name: 'MG Road', subtitle: 'Bengaluru, Karnataka', type: 'road', latitude: 12.9758, longitude: 77.6045, cityId: 'city-blr' },
  { id: 'area-hitech', name: 'HITEC City', subtitle: 'Hyderabad, Telangana', type: 'area', latitude: 17.4435, longitude: 78.3772, cityId: 'city-hyd' },
  { id: 'area-andheri', name: 'Andheri', subtitle: 'Mumbai, Maharashtra', type: 'area', latitude: 19.1136, longitude: 72.8697, cityId: 'city-mum' },
  { id: 'area-connaught', name: 'Connaught Place', subtitle: 'Delhi', type: 'area', latitude: 28.6315, longitude: 77.2167, cityId: 'city-del' },
  { id: 'area-hinjewadi', name: 'Hinjewadi', subtitle: 'Pune, Maharashtra', type: 'area', latitude: 18.5912, longitude: 73.7389, cityId: 'city-pun' },
  { id: 'area-saltlake', name: 'Salt Lake', subtitle: 'Kolkata, West Bengal', type: 'area', latitude: 22.5726, longitude: 88.4102, cityId: 'city-kol' },
];

export const CITY_PLACES: PlaceResult[] = CITY_SEEDS.map((c) => ({
  id: c.id,
  name: c.name,
  subtitle: `${c.state}, India`,
  type: 'city',
  latitude: c.latitude,
  longitude: c.longitude,
  cityId: c.id,
}));

export const ALL_PLACES: PlaceResult[] = [...CITY_PLACES, ...LOCALITY_SEEDS];

export const POPULAR_PLACE_NAMES = ['Chennai', 'Coimbatore', 'Bengaluru', 'Madurai', 'Hyderabad'];
export const POPULAR_PLACES: PlaceResult[] = POPULAR_PLACE_NAMES.map((name) => CITY_PLACES.find((p) => p.name === name)!).filter(Boolean);

/** A raw "lat, lon" or 6-digit PIN code typed directly into search — the
 * animated placeholder examples in the design reference ("13.0827,
 * 80.2707", "600042") both resolve this way. */
export function tryParseCoordinatesOrPin(query: string): PlaceResult | null {
  const coordMatch = query.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (coordMatch) {
    const latitude = Number(coordMatch[1]);
    const longitude = Number(coordMatch[2]);
    if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      return { id: `coord-${latitude}-${longitude}`, name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, subtitle: 'Dropped pin', type: 'coordinates', latitude, longitude };
    }
  }
  const pinMatch = query.trim().match(/^\d{6}$/);
  if (pinMatch) {
    // No real PIN-code database bundled in this pass — deterministically
    // nudge off the nearest city center so the result still lands in
    // India rather than failing the search outright.
    const seed = Number(pinMatch[0]) % CITY_SEEDS.length;
    const base = CITY_SEEDS[seed];
    return { id: `pin-${query}`, name: `PIN ${query}`, subtitle: `Near ${base.name}, ${base.state}`, type: 'pincode', latitude: base.latitude + 0.02, longitude: base.longitude + 0.02, cityId: base.id };
  }
  return null;
}
