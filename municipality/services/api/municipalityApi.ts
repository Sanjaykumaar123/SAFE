import axios from 'axios';
import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import {
  DEMO_ANALYTICS_SUMMARY,
  DEMO_CITIES,
  DEMO_DASHBOARD,
  DEMO_HAZARDS,
  DEMO_HAZARD_DETAIL,
  DEMO_REPAIRS,
  DEMO_REPAIR_DETAIL,
} from '@/services/demo/mockData';
import type {
  AnalyticsSummary,
  City,
  Dashboard,
  FleetCoverage,
  Inspection,
  InspectionDecisionPayload,
  MunicipalityHazardDetail,
  MunicipalityHazardListResponse,
  RecurringHazardItem,
  Repair,
  RepairCreatePayload,
  RepairDetail,
  RepairListResponse,
  RepairProgress,
  RepairProgressPayload,
  ResolutionTrendPoint,
  ResolveHazardPayload,
  Resolution,
  SeverityAnalyticsItem,
  TimelineResponse,
  Verification,
  WardAnalyticsItem,
} from '@/types/municipality';

export interface HazardFilters {
  status?: string;
  severity?: string;
  wardId?: string;
  road?: string;
  search?: string;
  dateFrom?: string;
  page?: number;
  pageSize?: number;
}

export interface MapViewport {
  north: number;
  south: number;
  east: number;
  west: number;
}

function isNetworkErr(error: unknown): boolean {
  return DEMO_MODE && axios.isAxiosError(error) && (!error.response || error.code === 'ERR_NETWORK' || error.message.includes('Network Error'));
}

export const municipalityApi = {
  async cities(): Promise<City[]> {
    try {
      const response = await apiClient.get<City[]>('/municipality/cities/');
      return response.data;
    } catch (error) {
      if (isNetworkErr(error)) return DEMO_CITIES;
      throw error;
    }
  },

  async dashboard(cityId: string): Promise<Dashboard> {
    try {
      const response = await apiClient.get<Dashboard>('/municipality/dashboard/', { params: { cityId } });
      return response.data;
    } catch (error) {
      if (isNetworkErr(error)) return DEMO_DASHBOARD;
      throw error;
    }
  },

  async hazards(cityId: string, filters: HazardFilters = {}, viewport?: MapViewport): Promise<MunicipalityHazardListResponse> {
    try {
      const response = await apiClient.get<MunicipalityHazardListResponse>('/municipality/hazards/', {
        params: { cityId, ...viewport, ...filters },
      });
      return response.data;
    } catch (error) {
      if (isNetworkErr(error)) {
        let items = [...DEMO_HAZARDS];
        if (filters.status) items = items.filter((h) => h.status === filters.status);
        if (filters.severity) items = items.filter((h) => h.severity === filters.severity);
        return { items, total: items.length, page: 1, pageSize: 20 };
      }
      throw error;
    }
  },

  async hazardDetail(hazardId: string): Promise<MunicipalityHazardDetail> {
    try {
      const response = await apiClient.get<MunicipalityHazardDetail>(`/municipality/hazards/${hazardId}`);
      return response.data;
    } catch (error) {
      if (isNetworkErr(error)) {
        return DEMO_HAZARD_DETAIL;
      }
      throw error;
    }
  },

  async hazardVerification(hazardId: string): Promise<Verification> {
    const response = await apiClient.get<Verification>(`/municipality/hazards/${hazardId}/verification`);
    return response.data;
  },

  async hazardTimeline(hazardId: string): Promise<TimelineResponse> {
    const response = await apiClient.get<TimelineResponse>(`/municipality/hazards/${hazardId}/timeline`);
    return response.data;
  },

  async resolveHazard(hazardId: string, payload: ResolveHazardPayload): Promise<Resolution> {
    const response = await apiClient.post<Resolution>(`/municipality/hazards/${hazardId}/resolve`, payload);
    return response.data;
  },

  async reopenHazard(hazardId: string, note?: string): Promise<MunicipalityHazardDetail> {
    const response = await apiClient.post<MunicipalityHazardDetail>(`/municipality/hazards/${hazardId}/reopen`, { note });
    return response.data;
  },

  async createRepair(payload: RepairCreatePayload): Promise<Repair> {
    const response = await apiClient.post<Repair>('/municipality/repairs/', payload);
    return response.data;
  },

  async repairs(cityId: string, status?: string, hazardId?: string): Promise<RepairListResponse> {
    try {
      const response = await apiClient.get<RepairListResponse>('/municipality/repairs/', { params: { cityId, status, hazardId } });
      return response.data;
    } catch (error) {
      if (isNetworkErr(error)) {
        let items = [...DEMO_REPAIRS];
        if (status) items = items.filter((r) => r.status === status);
        if (hazardId) items = items.filter((r) => r.hazardId === hazardId);
        return { items, total: items.length };
      }
      throw error;
    }
  },

  async repairDetail(repairId: string): Promise<RepairDetail> {
    try {
      const response = await apiClient.get<RepairDetail>(`/municipality/repairs/${repairId}`);
      return response.data;
    } catch (error) {
      if (isNetworkErr(error)) {
        return DEMO_REPAIR_DETAIL;
      }
      throw error;
    }
  },

  async addRepairProgress(repairId: string, payload: RepairProgressPayload): Promise<RepairProgress> {
    const response = await apiClient.post<RepairProgress>(`/municipality/repairs/${repairId}/progress`, payload);
    return response.data;
  },

  async markReadyForInspection(repairId: string): Promise<Repair> {
    const response = await apiClient.post<Repair>(`/municipality/repairs/${repairId}/ready-for-inspection`, {});
    return response.data;
  },

  async createInspection(repairId: string, payload: InspectionDecisionPayload): Promise<Inspection> {
    const response = await apiClient.post<Inspection>(`/municipality/inspections/`, { repairId, ...payload });
    return response.data;
  },

  async analyticsSummary(cityId: string): Promise<AnalyticsSummary> {
    try {
      const response = await apiClient.get<AnalyticsSummary>('/municipality/analytics/summary', { params: { cityId } });
      return response.data;
    } catch (error) {
      if (isNetworkErr(error)) {
        return DEMO_ANALYTICS_SUMMARY;
      }
      throw error;
    }
  },
  async analyticsWards(cityId: string): Promise<WardAnalyticsItem[]> {
    const response = await apiClient.get<WardAnalyticsItem[]>('/municipality/analytics/wards', { params: { cityId } });
    return response.data;
  },
  async analyticsSeverity(cityId: string): Promise<SeverityAnalyticsItem[]> {
    const response = await apiClient.get<SeverityAnalyticsItem[]>('/municipality/analytics/severity', { params: { cityId } });
    return response.data;
  },
  async analyticsResolution(cityId: string): Promise<ResolutionTrendPoint[]> {
    const response = await apiClient.get<ResolutionTrendPoint[]>('/municipality/analytics/resolution', { params: { cityId } });
    return response.data;
  },
  async analyticsRecurring(cityId: string): Promise<RecurringHazardItem[]> {
    const response = await apiClient.get<RecurringHazardItem[]>('/municipality/analytics/recurring', { params: { cityId } });
    return response.data;
  },
  async analyticsCoverage(cityId: string): Promise<FleetCoverage> {
    const response = await apiClient.get<FleetCoverage>('/municipality/analytics/coverage', { params: { cityId } });
    return response.data;
  },
};
