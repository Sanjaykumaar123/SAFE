import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import { DEMO_REPORTS } from '@/constants/demoData';
import type { CitizenReport, CreateReportPayload, ReportListItem } from '@/types';

const demoReports: CitizenReport[] = [];
let demoReportSequence = 1042;

export const reportsApi = {
  async create(payload: CreateReportPayload): Promise<CitizenReport> {
    if (DEMO_MODE) {
      demoReportSequence += 1;
      const report: CitizenReport = {
        id: `demo-report-${demoReportSequence}`,
        reportCode: `PTH-${demoReportSequence}`,
        hazardId: `demo-hazard-${demoReportSequence}`,
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
