/**
 * Mirrors `citizen app/backend/api/app/schemas/municipality.py` field-for-
 * field (camelCase here, snake_case there — translated automatically at
 * the network boundary, see `services/api/client.ts`/`utils/case.ts`).
 * The backend is the source of truth; this is a hand-maintained mirror.
 */
import type { HazardStatusType, HazardTypeType, InspectionDecisionType, RepairPriorityType, RepairStatusType, SeverityType, VerificationMethodType, VerificationStateType } from '@/constants/enums';

export interface City {
  id: string;
  code: string;
  name: string;
  state: string | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
  wardCount: number;
}

export interface Ward {
  id: string;
  cityId: string;
  code: string;
  name: string;
}

export interface MunicipalityOfficer {
  id: string;
  fullName: string;
  email: string;
  role: string;
  officerRole: string;
  municipalityId: string;
  municipalityCode: string;
  municipalityName: string;
  allowedCityIds: string[];
  defaultCityId: string | null;
  wardIds: string[] | null;
  permissions: string[];
}

export interface MunicipalityMeResponse {
  officer: MunicipalityOfficer;
  authorizedCities: City[];
}

export interface Priority {
  label: SeverityType;
  score: number;
  reasons: string[];
  recommendation: string;
}

export interface MunicipalityHazard {
  id: string;
  hazardCode: string;
  type: HazardTypeType;
  latitude: number;
  longitude: number;
  locationText: string;
  roadName: string | null;
  cityId: string | null;
  wardId: string | null;
  wardName: string | null;
  severity: SeverityType;
  status: HazardStatusType;
  aiConfidence: number | null;
  imageUrl: string | null;
  description: string | null;
  sourceSummary: string;
  repairStatus: RepairStatusType | null;
  repairCode: string | null;
  createdAt: string;
  updatedAt: string;
  lastObservedAt: string;
}

export interface MunicipalityHazardListResponse {
  items: MunicipalityHazard[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CitizenReportEvidence {
  id: string;
  reportCode: string;
  hazardType: HazardTypeType;
  severity: SeverityType;
  description: string | null;
  media: string[];
  createdAt: string;
}

export interface AIAnalysisEvidence {
  id: string;
  detected: boolean;
  confidence: number;
  severity: SeverityType | null;
  modelVersion: string;
  imageUrl: string;
  createdAt: string;
}

export interface FleetObservation {
  id: string;
  vehicleId: string;
  observedAt: string;
  observationState: string | null;
  confidence: number | null;
  severity: SeverityType | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  dataQuality: string | null;
}

export interface MunicipalityAction {
  id: string;
  actionType: string;
  notes: string | null;
  performedBy: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
}

export interface CurrentRepairSummary {
  id: string;
  repairCode: string;
  status: RepairStatusType;
  priority: RepairPriorityType;
  team: string | null;
  targetDate: string | null;
}

export interface MunicipalityHazardDetail extends MunicipalityHazard {
  citizenReports: CitizenReportEvidence[];
  latestAiAnalysis: AIAnalysisEvidence | null;
  latestFleetObservations: FleetObservation[];
  municipalityActions: MunicipalityAction[];
  currentRepair: CurrentRepairSummary | null;
  priority: Priority;
  resolutionState: 'ACTIVE' | 'RESOLVED' | 'REOPENED';
  reopenedFromHazardId: string | null;
}

export interface Verification {
  hazardId: string;
  state: VerificationStateType;
  confidence: number;
  detectedCount: number;
  clearCount: number;
  observations: FleetObservation[];
  summary: string;
  previouslyResolved: boolean;
  reopenSuggested: boolean;
}

export interface TimelineEvent {
  id: string;
  label: string;
  detail: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  actor: string | null;
  createdAt: string;
}

export interface TimelineResponse {
  hazardId: string;
  events: TimelineEvent[];
}

export interface ResolveHazardPayload {
  resolutionNotes: string;
  repairId?: string | null;
  verificationMethod?: VerificationMethodType;
  latitude?: number | null;
  longitude?: number | null;
  evidenceMediaIds?: string[];
}

export interface Resolution {
  id: string;
  hazardId: string;
  repairId: string | null;
  verifiedBy: string;
  verifiedAt: string;
  resolutionNotes: string | null;
  verificationMethod: VerificationMethodType;
  status: string;
}

export interface RepairCreatePayload {
  hazardId: string;
  department: string;
  zone?: string | null;
  team?: string | null;
  assignedOfficerName?: string | null;
  priority?: RepairPriorityType;
  targetDate?: string | null;
  notes?: string | null;
}

export interface Repair {
  id: string;
  repairCode: string;
  hazardId: string;
  hazardRoadName: string | null;
  hazardLocationText: string | null;
  cityId: string;
  department: string;
  zone: string | null;
  team: string | null;
  assignedOfficerName: string | null;
  priority: RepairPriorityType;
  targetDate: string | null;
  status: RepairStatusType;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepairListResponse {
  items: Repair[];
  total: number;
}

export interface RepairProgressPayload {
  note?: string | null;
  photoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RepairProgress {
  id: string;
  note: string | null;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  createdByName: string | null;
  createdAt: string;
}

export interface RepairDetail extends Repair {
  progressEntries: RepairProgress[];
  timeline: TimelineEvent[];
}

export interface InspectionDecisionPayload {
  decision: InspectionDecisionType;
  notes?: string | null;
}

export interface Inspection {
  id: string;
  repairId: string;
  hazardId: string;
  inspectorId: string;
  decision: InspectionDecisionType;
  notes: string | null;
  createdAt: string;
}

export interface PriorityRoad {
  roadName: string;
  priority: SeverityType;
  activeHazardCount: number;
  criticalHazardCount: number;
  reason: string;
}

export interface RecentActivityItem {
  id: string;
  label: string;
  detail: string | null;
  hazardId: string | null;
  createdAt: string;
}

export interface FleetCoverageSummary {
  observedTodayKmEstimate: number;
  coveragePercent: number;
  dataGapSegments: number;
}

export interface Dashboard {
  cityId: string;
  cityName: string;
  activeHazards: number;
  criticalHazards: number;
  underRepair: number;
  resolvedToday: number;
  priorityRoads: PriorityRoad[];
  recentActivity: RecentActivityItem[];
  fleetCoverage: FleetCoverageSummary;
  generatedAt: string;
}

export interface AnalyticsSummary {
  activeHazards: number;
  criticalHazards: number;
  resolvedThisWeek: number;
  avgResolutionTimeHours: number | null;
  recurringHazardRoads: number;
  citizenReportsCount: number;
  fleetObservationCount: number;
  avgRepairTurnaroundHours: number | null;
}

export interface WardAnalyticsItem {
  wardId: string | null;
  wardName: string;
  activeHazards: number;
  criticalHazards: number;
  resolvedHazards: number;
}

export interface SeverityAnalyticsItem {
  severity: SeverityType;
  count: number;
}

export interface ResolutionTrendPoint {
  date: string;
  resolvedCount: number;
}

export interface RecurringHazardItem {
  roadName: string;
  reportCount: number;
  recurringEventCount: number;
  recommendation: string;
}

export interface FleetCoverage {
  observedTodayKmEstimate: number;
  coveragePercent: number;
  dataGapSegments: number;
  roadsObservedToday: number;
  totalRoadsTracked: number;
  staleRoads: string[];
}
