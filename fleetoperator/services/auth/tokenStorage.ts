/**
 * The ONLY module that touches expo-secure-store for tokens. Tokens must
 * never land in AsyncStorage. Namespaced separately from the other
 * SafePath apps' keys — this is a different installed app with its own
 * secure-store sandbox anyway, but the prefix keeps intent obvious if that
 * ever changes.
 */
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'safepath.fleet.accessToken';
const REFRESH_TOKEN_KEY = 'safepath.fleet.refreshToken';

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },
  async clear(): Promise<void> {
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
  },
};
