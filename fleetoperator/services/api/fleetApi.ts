/** Every `/api/fleet/*` call, one object — same aggregate pattern
 * `municipality/services/api/municipalityApi.ts` uses. DEMO_MODE falls
 * back to fixtures only on a genuine network error, never on a real 4xx/5xx
 * from a reachable backend. */
import axios from 'axios';

import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import { DEMO_EARNINGS, DEMO_PAYMENTS, DEMO_SESSION_HISTORY, DEMO_TODAY_ROUTE, demoCollectionSession } from '@/services/demo/mockData';
import type {
  CollectionSession,
  EarningsSummary,
  ObservationBatchResponse,
  ObservationCreatePayload,
  ObservationListResponse,
  PaymentListResponse,
  RoadObservation,
  SessionListResponse,
  SessionStartPayload,
  SessionStopPayload,
  SessionStopResponse,
  TodayRoute,
} from '@/types/fleet';

function isNetworkErr(error: unknown): boolean {
  return axios.isAxiosError(error) && (!error.response || error.code === 'ERR_NETWORK' || error.message.includes('Network Error'));
}

export const fleetApi = {
  async todayRoute(): Promise<TodayRoute> {
    try {
      const response = await apiClient.get<TodayRoute>('/fleet/routes/today');
      return response.data;
    } catch (error) {
      if (DEMO_MODE && isNetworkErr(error)) return DEMO_TODAY_ROUTE;
      throw error;
    }
  },

  async startSession(payload: SessionStartPayload): Promise<CollectionSession> {
    try {
      const response = await apiClient.post<CollectionSession>('/fleet/sessions', payload);
      return response.data;
    } catch (error) {
      if (DEMO_MODE && isNetworkErr(error)) return demoCollectionSession();
      throw error;
    }
  },

  async currentSession(): Promise<CollectionSession | null> {
    try {
      const response = await apiClient.get<CollectionSession>('/fleet/sessions/current');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      if (DEMO_MODE && isNetworkErr(error)) return null;
      throw error;
    }
  },

  async getSession(id: string): Promise<CollectionSession> {
    const response = await apiClient.get<CollectionSession>(`/fleet/sessions/${id}`);
    return response.data;
  },

  async stopSession(id: string, payload: SessionStopPayload): Promise<SessionStopResponse> {
    const response = await apiClient.post<SessionStopResponse>(`/fleet/sessions/${id}/stop`, payload);
    return response.data;
  },

  async sessionHistory(): Promise<SessionListResponse> {
    try {
      const response = await apiClient.get<SessionListResponse>('/fleet/sessions/history');
      return response.data;
    } catch (error) {
      if (DEMO_MODE && isNetworkErr(error)) return DEMO_SESSION_HISTORY;
      throw error;
    }
  },

  async createObservation(payload: ObservationCreatePayload): Promise<RoadObservation> {
    const response = await apiClient.post<RoadObservation>('/fleet/observations', payload);
    return response.data;
  },

  async createObservationsBatch(items: ObservationCreatePayload[]): Promise<ObservationBatchResponse> {
    const response = await apiClient.post<ObservationBatchResponse>('/fleet/observations/batch', { items });
    return response.data;
  },

  async myObservations(): Promise<ObservationListResponse> {
    const response = await apiClient.get<ObservationListResponse>('/fleet/observations/me');
    return response.data;
  },

  async getObservation(id: string): Promise<RoadObservation> {
    const response = await apiClient.get<RoadObservation>(`/fleet/observations/${id}`);
    return response.data;
  },

  async earnings(): Promise<EarningsSummary> {
    try {
      const response = await apiClient.get<EarningsSummary>('/fleet/earnings');
      return response.data;
    } catch (error) {
      if (DEMO_MODE && isNetworkErr(error)) return DEMO_EARNINGS;
      throw error;
    }
  },

  async payments(): Promise<PaymentListResponse> {
    try {
      const response = await apiClient.get<PaymentListResponse>('/fleet/payments');
      return response.data;
    } catch (error) {
      if (DEMO_MODE && isNetworkErr(error)) return DEMO_PAYMENTS;
      throw error;
    }
  },
};
