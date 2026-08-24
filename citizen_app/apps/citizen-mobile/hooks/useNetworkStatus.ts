import { useNetworkState } from 'expo-network';

/** Thin wrapper so the rest of the app depends on `useNetworkStatus`, not
 * directly on which Expo module provides it (section 34). */
export function useNetworkStatus() {
  const state = useNetworkState();
  const isOffline = state.isConnected === false || state.isInternetReachable === false;
  return { isOffline, isConnected: state.isConnected ?? true };
}
