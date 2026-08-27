/**
 * Geocoding & Reverse Geocoding service using OpenStreetMap / Photon API
 * with local hazard database fallback. Allows searching any place/address
 * (like Google Maps) without requiring paid API keys.
 */
import { DEMO_HAZARDS } from '@/constants/demoData';
import type { LocationSearchResult, RoutePoint } from '@/types';

export async function searchPlaces(query: string, userCoords?: RoutePoint | null): Promise<LocationSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const results: LocationSearchResult[] = [];

  // 1. Search local hazard locations first for quick contextual matching
  const lower = trimmed.toLowerCase();
  const matchedHazards = DEMO_HAZARDS.filter(
    (h) => h.locationText.toLowerCase().includes(lower) || h.roadName?.toLowerCase().includes(lower)
  ).slice(0, 3);

  for (const h of matchedHazards) {
    results.push({
      label: h.locationText,
      subtitle: `${h.roadName ?? 'Hazard spot'} · SafePath Hazard`,
      latitude: h.latitude,
      longitude: h.longitude,
      kind: 'HAZARD',
    });
  }

  // 2. Query Photon geocoding API (powered by OpenStreetMap)
  try {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6`;
    if (userCoords) {
      url += `&lat=${userCoords.latitude}&lon=${userCoords.longitude}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data?.features && Array.isArray(data.features)) {
        for (const feature of data.features) {
          const coords = feature.geometry?.coordinates;
          const props = feature.properties ?? {};
          if (coords && coords.length >= 2) {
            const [longitude, latitude] = coords;
            const name = props.name || props.street || props.city || trimmed;
            const subtitleParts = [
              props.street && props.street !== name ? props.street : null,
              props.district || props.suburb || null,
              props.city || props.town || props.state || null,
              props.country || null,
            ].filter(Boolean);

            const subtitle = subtitleParts.length > 0 ? subtitleParts.join(', ') : 'Address / Place';

            // Avoid duplicate coordinates
            const isDuplicate = results.some(
              (r) => Math.abs(r.latitude - latitude) < 0.0005 && Math.abs(r.longitude - longitude) < 0.0005
            );

            if (!isDuplicate) {
              results.push({
                label: name,
                subtitle,
                latitude,
                longitude,
                kind: props.osm_value === 'city' ? 'CITY' : props.osm_key === 'highway' ? 'ROAD' : 'LANDMARK',
              });
            }
          }
        }
      }
    }
  } catch {
    // If external geocoding fails or device is offline, keep local results
  }

  return results;
}

/** Reverse geocode a coordinate into a human-readable address/place name */
export async function reverseGeocode(point: RoutePoint): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.latitude}&lon=${point.longitude}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SafePath-Citizen-App/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data?.address) {
        const addr = data.address;
        const main = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || addr.amenity || addr.building;
        const secondary = addr.city || addr.town || addr.county || addr.state;
        if (main && secondary) return `${main}, ${secondary}`;
        if (main) return main;
        if (data.display_name) return data.display_name.split(',').slice(0, 2).join(',').trim();
      }
    }
  } catch {
    // fallback
  }
  return `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
}
