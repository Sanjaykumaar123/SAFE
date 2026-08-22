/**
 * §17/46 — probes GPS/camera/network before monitoring starts and keeps
 * watching network afterward. Writes straight into `monitoringStore`
 * (device health is monitoring-screen state, not server-cache state).
 */
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect } from 'react';

import { AI_MODE } from '@/constants/config';
import { HealthState } from '@/constants/enums';
import { useMonitoringStore } from '@/store/monitoringStore';

export function useDeviceHealth() {
  const setDeviceHealth = useMonitoringStore((s) => s.setDeviceHealth);
  const [cameraPermission] = useCameraPermissions();

  const refresh = useCallback(async () => {
    // GPS
    try {
      const locationPermission = await Location.getForegroundPermissionsAsync();
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      setDeviceHealth({ gps: locationPermission.granted && servicesEnabled ? HealthState.READY : HealthState.ERROR });
    } catch {
      setDeviceHealth({ gps: HealthState.WARNING });
    }

    // Camera
    setDeviceHealth({ camera: cameraPermission?.granted ? HealthState.READY : HealthState.ERROR });

    // Network
    try {
      const network = await Network.getNetworkStateAsync();
      setDeviceHealth({ network: network.isConnected && network.isInternetReachable !== false ? HealthState.READY : HealthState.WARNING });
    } catch {
      setDeviceHealth({ network: HealthState.WARNING });
    }

    // AI — mock/on-device inference has no external dependency; server
    // mode's actual reachability is implicitly proven the first time a
    // frame round-trips successfully, so this is optimistic rather than a
    // separate health probe.
    setDeviceHealth({ ai: AI_MODE === 'ondevice' ? HealthState.WARNING : HealthState.READY });
  }, [cameraPermission?.granted, setDeviceHealth]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { refresh };
}
