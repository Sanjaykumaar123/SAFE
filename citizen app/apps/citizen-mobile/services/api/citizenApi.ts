import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import { DEMO_HOME } from '@/constants/demoData';
import type { HomeResponse } from '@/types';

export const citizenApi = {
  async home(latitude: number, longitude: number, radius?: number): Promise<HomeResponse> {
    if (DEMO_MODE) return DEMO_HOME;
    const { data } = await apiClient.get<HomeResponse>('/citizen/home', { params: { latitude, longitude, radius } });
    return data;
  },
};
