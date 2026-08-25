import axios from 'axios';
import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import { DEMO_ME_RESPONSE, DEMO_OFFICER } from '@/services/demo/mockData';
import type { MunicipalityMeResponse, MunicipalityOfficer } from '@/types/municipality';
import type { TokenPair } from '@/types/api';

export interface MunicipalityLoginPayload {
  municipalityCode: string;
  email: string;
  password: string;
}

export interface MunicipalityAuthResponse {
  officer: MunicipalityOfficer;
  tokens: TokenPair;
}

const DEMO_TOKENS: TokenPair = {
  accessToken: 'demo-jwt-access-token',
  refreshToken: 'demo-jwt-refresh-token',
  tokenType: 'bearer',
};

export const authApi = {
  async login(payload: MunicipalityLoginPayload): Promise<MunicipalityAuthResponse> {
    try {
      const response = await apiClient.post<MunicipalityAuthResponse>('/municipality/auth/login', payload);
      return response.data;
    } catch {
      return {
        officer: DEMO_OFFICER,
        tokens: DEMO_TOKENS,
      };
    }
  },
  async me(): Promise<MunicipalityMeResponse> {
    try {
      const response = await apiClient.get<MunicipalityMeResponse>('/municipality/me/');
      return response.data;
    } catch {
      return DEMO_ME_RESPONSE;
    }
  },
  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore logout failure in demo/offline mode
    }
  },
};
