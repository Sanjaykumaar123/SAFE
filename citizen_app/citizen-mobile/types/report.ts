import type { HazardStatusType } from '@/constants/hazardStatus';
import type { HazardTypeType } from '@/constants/hazardType';
import type { SeverityType } from '@/constants/severity';
import type { AIAnalysisResult } from './ai';

export interface ReportStatusHistoryEntry {
  status: HazardStatusType;
  note: string | null;
  createdAt: string;
}

export interface CitizenReport {
  id: string;
  reportCode: string;
  hazardId: string;
  hazardType: HazardTypeType;
  severity: SeverityType;
  status: HazardStatusType;
  description: string | null;
  latitude: number;
  longitude: number;
  locationText: string;
  media: string[];
  aiAnalysis: AIAnalysisResult | null;
  statusHistory: ReportStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportListItem {
  id: string;
  reportCode: string;
  hazardType: HazardTypeType;
  severity: SeverityType;
  status: HazardStatusType;
  locationText: string;
  createdAt: string;
}

export interface CreateReportPayload {
  hazardType: HazardTypeType;
  severity: SeverityType;
  description?: string;
  latitude: number;
  longitude: number;
  locationText: string;
  cityId?: string | null;
  mediaUrls: string[];
  aiAnalysis?: AIAnalysisResult | null;
  clientTimestamp: string;
}
