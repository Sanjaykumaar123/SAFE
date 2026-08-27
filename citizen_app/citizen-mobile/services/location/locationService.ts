/**
 * The one module that talks to expo-location. Section 57: only obtain
 * location when actually needed (report capture, map "use my location") —
 * never start continuous/background tracking here. Continuous road
 * monitoring is the Fleet Operator app's job, not this one.
 */
import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export const locationService = {
  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status as LocationPermissionStatus;
  },

  async requestPermission(): Promise<LocationPermissionStatus> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status as LocationPermissionStatus;
  },

  /** One-shot current position — never `watchPositionAsync` for continuous
   * tracking (section 57). */
  async getCurrentLocation(): Promise<Coordinates | null> {
    try {
      const status = await this.getPermissionStatus();
      if (status !== 'granted') return null;
      const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
      if (lastKnown) {
        return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }).catch(() => null);
      if (position) {
        return { latitude: position.coords.latitude, longitude: position.coords.longitude };
      }
      return null;
    } catch {
      return null;
    }
  },

  async reverseGeocode(coords: Coordinates): Promise<string | null> {
    try {
      const [result] = await Location.reverseGeocodeAsync(coords);
      if (!result) return null;
      return [result.name, result.street, result.district ?? result.city].filter(Boolean).join(', ');
    } catch {
      return null;
    }
  },
};
