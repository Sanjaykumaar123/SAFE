jest.mock('@/services/api/authApi', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(async () => undefined),
  },
}));
jest.mock('@/services/auth/tokenStorage', () => ({
  tokenStorage: {
    getAccessToken: jest.fn(async () => null),
    getRefreshToken: jest.fn(async () => 'refresh-token'),
    setTokens: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
  },
}));
jest.mock('@/services/api/client', () => ({
  registerSessionExpiredHandler: jest.fn(),
}));

import { authApi } from '@/services/api/authApi';
import { tokenStorage } from '@/services/auth/tokenStorage';

import { useAuthStore } from '../authStore';

const mockUser = { id: 'u1', fullName: 'Arun Kumar', email: 'arun@example.com', phone: null, city: 'Chennai', profilePhotoUrl: null, role: 'CITIZEN' };
const mockTokens = { accessToken: 'access-1', refreshToken: 'refresh-1', tokenType: 'bearer' };

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'checking', user: null, error: null, isSubmitting: false });
  });

  it('bootstrap() goes to guest when no access token is stored', async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue(null);
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().status).toBe('guest');
  });

  it('bootstrap() goes to authenticated and loads the user when a token exists', async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue('token');
    (authApi.me as jest.Mock).mockResolvedValue(mockUser);
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('bootstrap() falls back to guest and clears tokens if /me fails (expired session)', async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue('stale-token');
    (authApi.me as jest.Mock).mockRejectedValue(new Error('401'));
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().status).toBe('guest');
    expect(tokenStorage.clear).toHaveBeenCalled();
  });

  it('login() stores tokens and marks the user authenticated', async () => {
    (authApi.login as jest.Mock).mockResolvedValue({ user: mockUser, tokens: mockTokens });
    await useAuthStore.getState().login({ identifier: 'arun@example.com', password: 'secret123' });
    expect(tokenStorage.setTokens).toHaveBeenCalledWith(mockTokens.accessToken, mockTokens.refreshToken);
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('login() surfaces an error message and stays unauthenticated on failure', async () => {
    (authApi.login as jest.Mock).mockRejectedValue({ response: { data: { detail: 'Incorrect email/mobile or password.' } } });
    await expect(useAuthStore.getState().login({ identifier: 'arun@example.com', password: 'wrong' })).rejects.toBeTruthy();
    expect(useAuthStore.getState().error).toBe('Incorrect email/mobile or password.');
    expect(useAuthStore.getState().status).not.toBe('authenticated');
  });

  it('logout() clears tokens and resets to guest', async () => {
    useAuthStore.setState({ status: 'authenticated', user: mockUser });
    await useAuthStore.getState().logout();
    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('guest');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('continueAsGuest() sets guest status without calling the API', () => {
    useAuthStore.getState().continueAsGuest();
    expect(useAuthStore.getState().status).toBe('guest');
    expect(authApi.login).not.toHaveBeenCalled();
  });
});
