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
    const status = await this.getPermissionStatus();
    if (status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
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
