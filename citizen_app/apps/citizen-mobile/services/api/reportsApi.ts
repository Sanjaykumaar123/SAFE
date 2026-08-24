import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import { DEMO_HAZARDS, DEMO_HOME, DEMO_REPORTS } from '@/constants/demoData';
import type { CitizenReport, CreateReportPayload, Hazard, ReportListItem } from '@/types';

const demoReports: CitizenReport[] = [];
let demoReportSequence = 1042;

export const reportsApi = {
  async create(payload: CreateReportPayload): Promise<CitizenReport> {
    if (DEMO_MODE) {
      demoReportSequence += 1;
      const newHazardId = `demo-hazard-${demoReportSequence}`;
      const newHazard: Hazard = {
        id: newHazardId,
        type: payload.hazardType,
        severity: payload.severity,
        status: 'REPORTED',
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationText: payload.locationText,
        roadName: payload.locationText,
        imageUrl: payload.mediaUrls[0] ?? null,
        aiConfidence: payload.aiAnalysis?.confidence ?? 0.88,
        description: payload.description ?? null,
        distanceMeters: 50,
        verificationNote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastObservedAt: new Date().toISOString(),
      };
      DEMO_HAZARDS.unshift(newHazard);
      DEMO_HOME.nearbyHazards.unshift(newHazard);
      DEMO_HOME.mapMarkers.unshift(newHazard);
      DEMO_HOME.stats.nearbyCount += 1;
      if (payload.severity === 'CRITICAL') DEMO_HOME.stats.criticalCount += 1;
      else DEMO_HOME.stats.warningCount += 1;

      const report: CitizenReport = {
        id: `demo-report-${demoReportSequence}`,
        reportCode: `PTH-${demoReportSequence}`,
        hazardId: newHazardId,
        hazardType: payload.hazardType,
        severity: payload.severity,
        status: 'REPORTED',
        description: payload.description ?? null,
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationText: payload.locationText,
        media: payload.mediaUrls,
        aiAnalysis: payload.aiAnalysis ?? null,
        statusHistory: [{ status: 'REPORTED', note: 'Report submitted by citizen.', createdAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      demoReports.unshift(report);
      return report;
    }
    const { data } = await apiClient.post<CitizenReport>('/reports/', payload);
    return data;
  },
  async mine(tab: 'all' | 'active' | 'resolved' = 'all'): Promise<{ items: ReportListItem[]; total: number }> {
    if (DEMO_MODE) {
      const items: ReportListItem[] = [
        ...demoReports.map((r) => ({ id: r.id, reportCode: r.reportCode, hazardType: r.hazardType, severity: r.severity, status: r.status, locationText: r.locationText, createdAt: r.createdAt })),
        ...DEMO_REPORTS,
      ].filter((r) => (tab === 'active' ? r.status !== 'RESOLVED' : tab === 'resolved' ? r.status === 'RESOLVED' : true));
      return { items, total: items.length };
    }
    const { data } = await apiClient.get<{ items: ReportListItem[]; total: number }>('/reports/me', { params: { tab } });
    return data;
  },
  async detail(id: string): Promise<CitizenReport> {
    if (DEMO_MODE) {
      const found = demoReports.find((r) => r.id === id);
      if (found) return found;
      return demoReports[0];
    }
    const { data } = await apiClient.get<CitizenReport>(`/reports/${id}`);
    return data;
  },
};
