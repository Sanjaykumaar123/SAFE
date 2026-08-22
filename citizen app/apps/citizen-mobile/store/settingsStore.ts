/**
 * Non-sensitive user preferences — safe for AsyncStorage (never tokens;
 * see services/auth/tokenStorage.ts for those). Persisted via zustand's
 * `persist` middleware so settings survive an app restart.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface NotificationSettings {
  nearbyHazards: boolean;
  reportUpdates: boolean;
  roadResolved: boolean;
  criticalHazards: boolean;
  system: boolean;
}

interface SettingsState {
  notifications: NotificationSettings;
  locationSharingEnabled: boolean;
  darkModeEnabled: boolean;
  language: 'en';
  hasCompletedOnboarding: boolean;
  guestModeEnabled: boolean;
  setNotificationSetting: (key: keyof NotificationSettings, value: boolean) => void;
  setLocationSharingEnabled: (value: boolean) => void;
  setDarkModeEnabled: (value: boolean) => void;
  completeOnboarding: () => void;
  enableGuestMode: () => void;
  disableGuestMode: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notifications: {
        nearbyHazards: true,
        reportUpdates: true,
        roadResolved: true,
        criticalHazards: true,
        system: true,
      },
      locationSharingEnabled: true,
      darkModeEnabled: false,
      language: 'en',
      hasCompletedOnboarding: false,
      guestModeEnabled: false,
      setNotificationSetting: (key, value) =>
        set((state) => ({ notifications: { ...state.notifications, [key]: value } })),
      setLocationSharingEnabled: (value) => set({ locationSharingEnabled: value }),
      setDarkModeEnabled: (value) => set({ darkModeEnabled: value }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      enableGuestMode: () => set({ guestModeEnabled: true }),
      disableGuestMode: () => set({ guestModeEnabled: false }),
    }),
    {
      name: 'safepath.settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
