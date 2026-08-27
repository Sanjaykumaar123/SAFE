/**
 * Push notification registration infrastructure (section 33/50). Obtains
 * an Expo push token and registers it with the backend. No production
 * push is actually sent yet — the backend `device_tokens` table exists but
 * nothing fans out to the Expo Push Service until that's explicitly wired
 * up server-side. Safe to call in DEMO_MODE (fails soft).
 *
 * IMPORTANT: Expo Go removed remote-push support from `expo-notifications`
 * starting SDK 53 — the native module throws on init when running inside
 * the Expo Go client (not in a dev/production build). A static top-level
 * `import * as Notifications from 'expo-notifications'` would crash the
 * whole app on launch in Expo Go, so it's required lazily and only outside
 * Expo Go; every method below no-ops gracefully when unavailable.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { notificationsApi } from '@/services/api/notificationsApi';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

type NotificationsModule = typeof import('expo-notifications');
let cachedModule: NotificationsModule | null | undefined;

function getNotificationsModule(): NotificationsModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (isExpoGo) {
    cachedModule = null;
    return cachedModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-notifications') as NotificationsModule;
    cachedModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export const notificationService = {
  async getPermissionStatus() {
    const Notifications = getNotificationsModule();
    if (!Notifications) return 'undetermined' as const;
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  },

  async requestPermission() {
    const Notifications = getNotificationsModule();
    if (!Notifications) return 'undetermined' as const;
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  },

  /** Registers this device's Expo push token with the backend. Silently
   * no-ops in Expo Go, on a simulator/emulator (no push capability), or if
   * permission was never granted — registration failing must never block
   * the rest of the app. */
  async registerForPushNotifications(): Promise<void> {
    try {
      const Notifications = getNotificationsModule();
      if (!Notifications || !Device.isDevice) return;
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      await notificationsApi.registerDeviceToken(tokenResponse.data, Platform.OS === 'ios' ? 'ios' : 'android');
    } catch {
      // Non-fatal: push registration is best-effort infrastructure.
    }
  },
};
