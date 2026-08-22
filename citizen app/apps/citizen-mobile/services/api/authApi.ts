import { apiClient } from './client';
import { DEMO_CITY } from '@/constants/demoData';
import { DEMO_MODE } from '@/constants/config';
import type { AuthResponse, LoginPayload, RegisterPayload, TokenPair, User } from '@/types';

const DEMO_TOKENS: TokenPair = { accessToken: 'demo-access-token', refreshToken: 'demo-refresh-token', tokenType: 'bearer' };

function demoUserFrom(fullName: string, email: string, phone: string): User {
  return { id: 'demo-user', fullName, email, phone, city: DEMO_CITY, profilePhotoUrl: null, role: 'CITIZEN' };
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    if (DEMO_MODE) {
      return { user: demoUserFrom(payload.fullName, payload.email, payload.phone), tokens: DEMO_TOKENS };
    }
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },
  async login(payload: LoginPayload): Promise<AuthResponse> {
    if (DEMO_MODE) {
      return { user: demoUserFrom('Arun Kumar', payload.identifier, '+919840000000'), tokens: DEMO_TOKENS };
    }
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },
  async refresh(refreshToken: string): Promise<TokenPair> {
    if (DEMO_MODE) return DEMO_TOKENS;
    const { data } = await apiClient.post<TokenPair>('/auth/refresh', { refreshToken });
    return data;
  },
  async me(): Promise<User> {
    if (DEMO_MODE) return demoUserFrom('Arun Kumar', 'demo.citizen@safepath.ai', '+919840000000');
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
  async logout(refreshToken: string): Promise<void> {
    if (DEMO_MODE) return;
    await apiClient.post('/auth/logout', { refreshToken });
  },
};
