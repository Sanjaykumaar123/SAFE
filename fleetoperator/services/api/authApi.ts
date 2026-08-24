import axios from 'axios';

import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import { DEMO_ME_RESPONSE, DEMO_OPERATOR } from '@/services/demo/mockData';
import type { TokenPair } from '@/types/api';
import type { FleetMeResponse, FleetOperator } from '@/types/fleet';

export interface FleetLoginPayload {
  operatorCode: string;
  password: string;
}

export interface FleetAuthResponse {
  operator: FleetOperator;
  tokens: TokenPair;
}

const DEMO_TOKENS: TokenPair = {
  accessToken: 'demo-jwt-access-token',
  refreshToken: 'demo-jwt-refresh-token',
  tokenType: 'bearer',
};

function isNetworkErr(error: unknown): boolean {
  return axios.isAxiosError(error) && (!error.response || error.code === 'ERR_NETWORK' || error.message.includes('Network Error'));
}

export const authApi = {
  async login(payload: FleetLoginPayload): Promise<FleetAuthResponse> {
    try {
      const response = await apiClient.post<FleetAuthResponse>('/fleet/auth/login', payload);
      return response.data;
    } catch (error) {
      if (DEMO_MODE || isNetworkErr(error)) {
        return { operator: DEMO_OPERATOR, tokens: DEMO_TOKENS };
      }
      throw error;
    }
  },
  async me(): Promise<FleetMeResponse> {
    try {
      const response = await apiClient.get<FleetMeResponse>('/fleet/me/');
      return response.data;
    } catch (error) {
      if (DEMO_MODE || isNetworkErr(error)) {
        return DEMO_ME_RESPONSE;
      }
      throw error;
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
