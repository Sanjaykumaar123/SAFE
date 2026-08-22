/**
 * Foreground live-location tracking for the map screen — requests
 * permission once, then keeps a `watchPositionAsync` subscription open for
 * the lifetime of the hook so the map's "you are here" puck and Safe
 * Route's origin point stay current without polling.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type LiveLocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export interface LiveCoords {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
}

export interface LiveLocationState {
  coords: LiveCoords | null;
  status: LiveLocationStatus;
  errorMessage: string | null;
}

function toLiveCoords(coords: Location.LocationObjectCoords): LiveCoords {
  return { latitude: coords.latitude, longitude: coords.longitude, heading: coords.heading, accuracy: coords.accuracy };
}

export function useLiveLocation() {
  const [state, setState] = useState<LiveLocationState>({ coords: null, status: 'idle', errorMessage: null });
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const start = useCallback(async () => {
    setState((previous) => ({ ...previous, status: 'requesting', errorMessage: null }));

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState({
        coords: null,
        status: 'denied',
        errorMessage: 'Location access is needed to show your position and calculate safe routes.',
      });
      return;
    }

    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setState({ coords: toLiveCoords(last.coords), status: 'granted', errorMessage: null });
      }

      subscriptionRef.current?.remove();
      subscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.LocationAccuracy.High, timeInterval: 4000, distanceInterval: 8 },
        (update) => setState({ coords: toLiveCoords(update.coords), status: 'granted', errorMessage: null })
      );
    } catch {
      setState({ coords: null, status: 'error', errorMessage: 'Could not access your live location right now.' });
    }
  }, []);

  useEffect(() => {
    start();
    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [start]);

  return { ...state, retry: start };
}
