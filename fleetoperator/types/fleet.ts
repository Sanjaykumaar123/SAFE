/**
 * Mirrors `citizen app/backend/api/app/schemas/fleet.py` field-for-field
 * (camelCase here, snake_case there — translated automatically at the
 * network boundary, see `services/api/client.ts`/`utils/case.ts`). The
 * backend is the source of truth; this is a hand-maintained mirror.
 */
import type { CollectionSessionStatusType, EarningStatusType, HazardTypeType, SeverityType } from '@/constants/enums';
import type { BoundingBox } from '@/types/ai';

export interface Vehicle {
  id: string;
  registrationNumber: string;
  status: string;
  vehicleType: string | null;
}

export interface FleetOperator {
  id: string;
  fullName: string;
  email: string;
  role: string;
  operatorCode: string;
  operatorRole: string;
  cityId: string | null;
  cityName: string | null;
  zoneName: string | null;
  vehicle: Vehicle | null;
  permissions: string[];
}

export interface TodayTarget {
  targetKm: number;
  completedKm: number;
  priorityZone: string | null;
  recommendedRoads: string[];
}

export interface FleetMeResponse {
  operator: FleetOperator;
  todayTarget: TodayTarget;
}

export interface TodayRoute {
  routeName: string;
  zoneName: string | null;
  targetKm: number;
  priority: SeverityType;
  roadSegments: string[];
}

export interface SessionStartPayload {
  vehicleId?: string | null;
  cityId?: string | null;
  startLatitude?: number | null;
  startLongitude?: number | null;
  deviceMetadata?: Record<string, unknown> | null;
  clientSessionId?: string | null;
}

export interface CollectionSession {
  id: string;
  status: CollectionSessionStatusType;
  vehicleId: string;
  cityId: string | null;
  zoneName: string | null;
  startTime: string;
  endTime: string | null;
  reportedDistanceKm: number;
  validatedDistanceKm: number | null;
  observationCount: number;
  validObservationCount: number;
  dataQualityScore: number | null;
}

export interface SessionStopPayload {
  endLatitude?: number | null;
  endLongitude?: number | null;
  reportedDistanceKm: number;
}

export interface SessionStopResponse {
  session: CollectionSession;
  durationMinutes: number;
  estimatedEarnings: number;
}

export interface SessionListResponse {
  items: CollectionSession[];
  total: number;
}

export interface ObservationCreatePayload {
  clientObservationId: string;
  sessionId: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  hazardType: HazardTypeType;
  confidence: number;
  severity?: SeverityType | null;
  boundingBox?: BoundingBox | null;
  imageUrl?: string | null;
  modelName?: string | null;
  modelVersion?: string | null;
  gpsAccuracy?: number | null;
  dataQuality?: string | null;
}

export interface RoadObservation {
  id: string;
  clientObservationId: string | null;
  sessionId: string | null;
  hazardId: string | null;
  latitude: number;
  longitude: number;
  observedAt: string;
  hazardType: string | null;
  confidence: number | null;
  severity: string | null;
  imageUrl: string | null;
  boundingBox: BoundingBox | null;
  dataQuality: string | null;
  observationState: string | null;
}

export interface ObservationBatchResultItem {
  clientObservationId: string;
  status: 'ACCEPTED' | 'DUPLICATE' | 'FAILED';
  observationId: string | null;
  hazardId: string | null;
  message: string | null;
}

export interface ObservationBatchResponse {
  results: ObservationBatchResultItem[];
}

export interface ObservationListResponse {
  items: RoadObservation[];
  total: number;
}

export interface EarningsBreakdown {
  coverageAmount: number;
  observationAmount: number;
  qualityBonusAmount: number;
  totalAmount: number;
}

export interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  breakdownToday: EarningsBreakdown;
}

export interface Payment {
  id: string;
  sessionId: string;
  status: EarningStatusType;
  totalAmount: number;
  computedAt: string | null;
  paidAt: string | null;
}

export interface PaymentListResponse {
  items: Payment[];
  total: number;
}
