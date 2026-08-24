/* eslint-disable no-undef */
// Silences the expo-secure-store native-module warning under jest-expo,
// and stubs modules that only exist on-device.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));
