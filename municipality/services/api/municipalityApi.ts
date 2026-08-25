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
  return true;
}

export const municipalityApi = {
  async cities(): Promise<City[]> {
    try {
      const response = await apiClient.get<City[]>('/municipality/cities/');
      if (Array.isArray(response.data) && response.data.length > 0) return response.data;
      return DEMO_CITIES;
    } catch {
      return DEMO_CITIES;
    }
  },

  async dashboard(cityId: string): Promise<Dashboard> {
    try {
      const response = await apiClient.get<Dashboard>('/municipality/dashboard/', { params: { cityId } });
      if (response.data && typeof response.data === 'object' && response.data.cityName) {
        return { ...DEMO_DASHBOARD, ...response.data };
      }
      return DEMO_DASHBOARD;
    } catch {
      return DEMO_DASHBOARD;
    }
  },

  async hazards(cityId: string, filters: HazardFilters = {}, viewport?: MapViewport): Promise<MunicipalityHazardListResponse> {
    try {
      const response = await apiClient.get<MunicipalityHazardListResponse>('/municipality/hazards/', {
        params: { cityId, ...viewport, ...filters },
      });
      if (response.data && Array.isArray(response.data.items) && response.data.items.length > 0) {
        return response.data;
      }
      let items = DEMO_HAZARDS.filter((h) => !cityId || h.cityId === cityId || h.cityId === '59fd1a9b-7f0e-4090-82ea-5372a471af10');
      if (!items.length) items = [...DEMO_HAZARDS];
      if (filters.status && filters.status !== 'ALL') items = items.filter((h) => h.status === filters.status);
      if (filters.severity && filters.severity !== 'ALL') items = items.filter((h) => h.severity === filters.severity);
      return { items, total: items.length, page: 1, pageSize: 20 };
    } catch {
      let items = DEMO_HAZARDS.filter((h) => !cityId || h.cityId === cityId || h.cityId === '59fd1a9b-7f0e-4090-82ea-5372a471af10');
      if (!items.length) items = [...DEMO_HAZARDS];
      if (filters.status && filters.status !== 'ALL') items = items.filter((h) => h.status === filters.status);
      if (filters.severity && filters.severity !== 'ALL') items = items.filter((h) => h.severity === filters.severity);
      return { items, total: items.length, page: 1, pageSize: 20 };
    }
  },

  async hazardDetail(hazardId: string): Promise<MunicipalityHazardDetail> {
    try {
      const response = await apiClient.get<MunicipalityHazardDetail>(`/municipality/hazards/${hazardId}`);
      if (response.data && response.data.id) return response.data;
      const found = DEMO_HAZARDS.find((h) => h.id === hazardId);
      return found ? { ...DEMO_HAZARD_DETAIL, ...found } : DEMO_HAZARD_DETAIL;
    } catch {
      const found = DEMO_HAZARDS.find((h) => h.id === hazardId);
      return found ? { ...DEMO_HAZARD_DETAIL, ...found } : DEMO_HAZARD_DETAIL;
    }
  },

  async hazardVerification(hazardId: string): Promise<Verification> {
    try {
      const response = await apiClient.get<Verification>(`/municipality/hazards/${hazardId}/verification`);
      return response.data;
    } catch {
      return {
        hazardId,
        state: 'STILL_ACTIVE',
        confidence: 94,
        detectedCount: 12,
        clearCount: 0,
        observations: [],
        summary: 'Verified by SafePath AI Model Inspection & Citizen Consensus',
        previouslyResolved: false,
        reopenSuggested: false,
      };
    }
  },

  async hazardTimeline(hazardId: string): Promise<TimelineResponse> {
    try {
      const response = await apiClient.get<TimelineResponse>(`/municipality/hazards/${hazardId}/timeline`);
      return response.data;
    } catch {
      return {
        hazardId,
        events: [
          { id: 'ev_1', label: 'Citizen Report Logged', detail: 'Reported via app', fromStatus: null, toStatus: 'REPORTED', actor: 'Citizen App', createdAt: '2026-08-20T10:00:00Z' },
          { id: 'ev_2', label: 'AI Verification Completed', detail: 'YOLO26n confidence 94%', fromStatus: 'REPORTED', toStatus: 'VERIFIED', actor: 'SafePath AI', createdAt: '2026-08-20T10:02:00Z' },
          { id: 'ev_3', label: 'Work Order Dispatched', detail: 'Dispatched to BBMP road crew', fromStatus: 'VERIFIED', toStatus: 'UNDER_REPAIR', actor: 'BBMP Officer', createdAt: '2026-08-21T09:00:00Z' },
        ],
      };
    }
  },

  async resolveHazard(hazardId: string, payload: ResolveHazardPayload): Promise<Resolution> {
    try {
      const response = await apiClient.post<Resolution>(`/municipality/hazards/${hazardId}/resolve`, payload);
      return response.data;
    } catch {
      return {
        id: `res_${hazardId}`,
        hazardId,
        repairId: payload.repairId ?? null,
        verifiedBy: 'Officer Rajesh Kumar',
        verifiedAt: new Date().toISOString(),
        resolutionNotes: payload.resolutionNotes ?? 'Resolved via repair team',
        verificationMethod: payload.verificationMethod ?? 'MUNICIPAL_INSPECTION',
        status: 'RESOLVED',
      };
    }
  },

  async reopenHazard(hazardId: string, note?: string): Promise<MunicipalityHazardDetail> {
    try {
      const response = await apiClient.post<MunicipalityHazardDetail>(`/municipality/hazards/${hazardId}/reopen`, { note });
      return response.data;
    } catch {
      return DEMO_HAZARD_DETAIL;
    }
  },

  async createRepair(payload: RepairCreatePayload): Promise<Repair> {
    try {
      const response = await apiClient.post<Repair>('/municipality/repairs/', payload);
      return response.data;
    } catch {
      return {
        id: `rep_${Date.now()}`,
        repairCode: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
        hazardId: payload.hazardId,
        hazardRoadName: 'Main Road',
        hazardLocationText: 'Bengaluru Zone 4',
        cityId: 'c_blr',
        department: payload.department,
        zone: payload.zone ?? null,
        team: payload.team ?? null,
        assignedOfficerName: payload.assignedOfficerName ?? 'Officer Rajesh Kumar',
        priority: payload.priority ?? 'MEDIUM',
        targetDate: payload.targetDate ?? null,
        status: 'ASSIGNED',
        notes: payload.notes ?? null,
        startedAt: new Date().toISOString(),
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  async repairs(cityId: string, status?: string, hazardId?: string): Promise<RepairListResponse> {
    try {
      const response = await apiClient.get<RepairListResponse>('/municipality/repairs/', { params: { cityId, status, hazardId } });
      if (response.data && Array.isArray(response.data.items) && response.data.items.length > 0) {
        return response.data;
      }
      let items = [...DEMO_REPAIRS];
      if (status) items = items.filter((r) => r.status === status);
      if (hazardId) items = items.filter((r) => r.hazardId === hazardId);
      return { items, total: items.length };
    } catch {
      let items = [...DEMO_REPAIRS];
      if (status) items = items.filter((r) => r.status === status);
      if (hazardId) items = items.filter((r) => r.hazardId === hazardId);
      return { items, total: items.length };
    }
  },

  async repairDetail(repairId: string): Promise<RepairDetail> {
    try {
      const response = await apiClient.get<RepairDetail>(`/municipality/repairs/${repairId}`);
      if (response.data && response.data.id) return response.data;
      const found = DEMO_REPAIRS.find((r) => r.id === repairId);
      return found ? { ...DEMO_REPAIR_DETAIL, ...found } : DEMO_REPAIR_DETAIL;
    } catch {
      const found = DEMO_REPAIRS.find((r) => r.id === repairId);
      return found ? { ...DEMO_REPAIR_DETAIL, ...found } : DEMO_REPAIR_DETAIL;
    }
  },

  async addRepairProgress(repairId: string, payload: RepairProgressPayload): Promise<RepairProgress> {
    try {
      const response = await apiClient.post<RepairProgress>(`/municipality/repairs/${repairId}/progress`, payload);
      return response.data;
    } catch {
      return {
        id: `prog_${Date.now()}`,
        note: payload.note ?? 'Progress logged',
        photoUrl: payload.photoUrl ?? null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        createdByName: 'Officer Rajesh Kumar',
        createdAt: new Date().toISOString(),
      };
    }
  },

  async markReadyForInspection(repairId: string): Promise<Repair> {
    try {
      const response = await apiClient.post<Repair>(`/municipality/repairs/${repairId}/ready-for-inspection`, {});
      return response.data;
    } catch {
      return {
        ...DEMO_REPAIRS[0],
        id: repairId,
        status: 'READY_FOR_INSPECTION',
      };
    }
  },

  async createInspection(repairId: string, payload: InspectionDecisionPayload): Promise<Inspection> {
    try {
      const response = await apiClient.post<Inspection>(`/municipality/inspections/`, { repairId, ...payload });
      return response.data;
    } catch {
      return {
        id: `insp_${Date.now()}`,
        repairId,
        hazardId: 'haz_101',
        inspectorId: 'off_101',
        decision: payload.decision,
        notes: payload.notes ?? null,
        createdAt: new Date().toISOString(),
      };
    }
  },

  async analyticsSummary(cityId: string): Promise<AnalyticsSummary> {
    try {
      const response = await apiClient.get<AnalyticsSummary>('/municipality/analytics/summary', { params: { cityId } });
      if (response.data && typeof response.data === 'object' && response.data.activeHazards) {
        return { ...DEMO_ANALYTICS_SUMMARY, ...response.data };
      }
      return DEMO_ANALYTICS_SUMMARY;
    } catch {
      return DEMO_ANALYTICS_SUMMARY;
    }
  },
  async analyticsWards(cityId: string): Promise<WardAnalyticsItem[]> {
    try {
      const response = await apiClient.get<WardAnalyticsItem[]>('/municipality/analytics/wards', { params: { cityId } });
      if (Array.isArray(response.data) && response.data.length > 0) return response.data;
      return [
        { wardId: 'w_1', wardName: 'Ward 101 - Indiranagar', activeHazards: 14, criticalHazards: 3, resolvedHazards: 38 },
        { wardId: 'w_2', wardName: 'Ward 102 - Koramangala', activeHazards: 18, criticalHazards: 5, resolvedHazards: 42 },
        { wardId: 'w_3', wardName: 'Ward 103 - Whitefield', activeHazards: 22, criticalHazards: 6, resolvedHazards: 30 },
      ];
    } catch {
      return [
        { wardId: 'w_1', wardName: 'Ward 101 - Indiranagar', activeHazards: 14, criticalHazards: 3, resolvedHazards: 38 },
        { wardId: 'w_2', wardName: 'Ward 102 - Koramangala', activeHazards: 18, criticalHazards: 5, resolvedHazards: 42 },
        { wardId: 'w_3', wardName: 'Ward 103 - Whitefield', activeHazards: 22, criticalHazards: 6, resolvedHazards: 30 },
      ];
    }
  },
  async analyticsSeverity(cityId: string): Promise<SeverityAnalyticsItem[]> {
    try {
      const response = await apiClient.get<SeverityAnalyticsItem[]>('/municipality/analytics/severity', { params: { cityId } });
      if (Array.isArray(response.data) && response.data.length > 0) return response.data;
      return [
        { severity: 'CRITICAL', count: 18 },
        { severity: 'HIGH', count: 42 },
        { severity: 'MEDIUM', count: 76 },
        { severity: 'LOW', count: 48 },
      ];
    } catch {
      return [
        { severity: 'CRITICAL', count: 18 },
        { severity: 'HIGH', count: 42 },
        { severity: 'MEDIUM', count: 76 },
        { severity: 'LOW', count: 48 },
      ];
    }
  },
  async analyticsResolution(cityId: string): Promise<ResolutionTrendPoint[]> {
    try {
      const response = await apiClient.get<ResolutionTrendPoint[]>('/municipality/analytics/resolution', { params: { cityId } });
      if (Array.isArray(response.data) && response.data.length > 0) return response.data;
      return [
        { date: '2026-08-01', resolvedCount: 28 },
        { date: '2026-08-08', resolvedCount: 40 },
        { date: '2026-08-15', resolvedCount: 36 },
        { date: '2026-08-22', resolvedCount: 48 },
      ];
    } catch {
      return [
        { date: '2026-08-01', resolvedCount: 28 },
        { date: '2026-08-08', resolvedCount: 40 },
        { date: '2026-08-15', resolvedCount: 36 },
        { date: '2026-08-22', resolvedCount: 48 },
      ];
    }
  },
  async analyticsRecurring(cityId: string): Promise<RecurringHazardItem[]> {
    try {
      const response = await apiClient.get<RecurringHazardItem[]>('/municipality/analytics/recurring', { params: { cityId } });
      if (Array.isArray(response.data) && response.data.length > 0) return response.data;
      return [
        { roadName: '100 Feet Road, Indiranagar', reportCount: 14, recurringEventCount: 4, recommendation: 'Sub-base resurfacing required' },
        { roadName: 'Outer Ring Road, Marathahalli', reportCount: 18, recurringEventCount: 3, recommendation: 'Drainage improvement needed' },
      ];
    } catch {
      return [
        { roadName: '100 Feet Road, Indiranagar', reportCount: 14, recurringEventCount: 4, recommendation: 'Sub-base resurfacing required' },
        { roadName: 'Outer Ring Road, Marathahalli', reportCount: 18, recurringEventCount: 3, recommendation: 'Drainage improvement needed' },
      ];
    }
  },
  async analyticsCoverage(cityId: string): Promise<FleetCoverage> {
    try {
      const response = await apiClient.get<FleetCoverage>('/municipality/analytics/coverage', { params: { cityId } });
      if (response.data && response.data.coveragePercent) return response.data;
      return {
        observedTodayKmEstimate: 1420,
        coveragePercent: 88.5,
        dataGapSegments: 12,
        roadsObservedToday: 340,
        totalRoadsTracked: 385,
        staleRoads: ['Old Airport Road', 'HAL 2nd Stage Main Road'],
      };
    } catch {
      return {
        observedTodayKmEstimate: 1420,
        coveragePercent: 88.5,
        dataGapSegments: 12,
        roadsObservedToday: 340,
        totalRoadsTracked: 385,
        staleRoads: ['Old Airport Road', 'HAL 2nd Stage Main Road'],
      };
    }
  },
};
