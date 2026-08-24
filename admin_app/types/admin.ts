import type {
  AdminRoleType,
  AnomalySeverityType,
  CitizenReportStatusType,
  CityStatusType,
  HazardStatusType,
  HazardTypeType,
  ModelStatusType,
  NotificationPriorityType,
  OperatorStatusType,
  PaymentStatusType,
  ServiceHealthType,
  SeverityType,
  UserAccountStatusType,
  UserRoleType,
  VehicleStatusType,
} from '@/constants/enums';
import type { PermissionType } from '@/constants/permissions';
import type { Versioned } from './api';

// ---------------------------------------------------------------- Session

export interface AdminUser {
  id: string;
  adminId: string;
  name: string;
  email: string;
  role: AdminRoleType;
  permissions: PermissionType[];
  accessibleCityIds: string[] | 'ALL';
  accessibleMunicipalityIds: string[] | 'ALL';
  avatarUrl?: string;
  lastLoginAt?: string;
}

export interface AdminSession {
  admin: AdminUser;
  deviceId: string;
  mfaEnabled: boolean;
}

// -------------------------------------------------------------- Dashboard

export interface GlobalKpis {
  activeHazards: number;
  activeHazardsTrendPct: number;
  criticalHazards: number;
  citizenReportsToday: number;
  fleetObservationsToday: number;
  activeVehicles: number;
  citiesActive: number;
  municipalities: number;
  dataCoveragePct: number;
  underRepair: number;
  resolved: number;
}

export interface SystemStatusSummary {
  overall: ServiceHealthType;
  services: { name: string; status: ServiceHealthType; latencyMs: number }[];
}

export interface ActivityEvent {
  id: string;
  kind: 'HAZARD' | 'FLEET' | 'MUNICIPALITY' | 'AI' | 'SYSTEM' | 'PAYMENT';
  message: string;
  cityName?: string;
  severity: NotificationPriorityType;
  createdAt: string;
}

export interface ActionRequiredItem {
  id: string;
  entityType: 'HAZARD' | 'DATA_QUALITY' | 'INSPECTION' | 'AI';
  entityId: string;
  title: string;
  description: string;
  distanceKm?: number;
  cityName: string;
  severity: NotificationPriorityType;
}

// ---------------------------------------------------------------- Hazards

export interface EvidenceItem {
  id: string;
  kind: 'CITIZEN' | 'AI' | 'FLEET' | 'MUNICIPALITY';
  title: string;
  detail: string;
  imageUrl?: string;
  confidence?: number;
  gpsQuality?: 'GOOD' | 'FAIR' | 'POOR';
  timestamp: string;
  actorLabel: string;
}

export interface HazardTimelineStep {
  id: string;
  label: string;
  actorLabel: string;
  timestamp: string;
  done: boolean;
}

export interface AdminHazard extends Versioned {
  id: string;
  code: string;
  type: HazardTypeType;
  title: string;
  roadName: string;
  locationText: string;
  latitude: number;
  longitude: number;
  cityId: string;
  cityName: string;
  wardName?: string;
  severity: SeverityType;
  status: HazardStatusType;
  aiConfidence: number;
  source: string;
  citizenReportCount: number;
  fleetObservationCount: number;
  distanceKm?: number;
  municipalityActionTaken: boolean;
  duplicateOfId?: string;
  linkedHazardIds: string[];
  createdAt: string;
  lastUpdateAt: string;
}

export interface AdminHazardDetail extends AdminHazard {
  evidence: EvidenceItem[];
  timeline: HazardTimelineStep[];
}

export interface CitizenReport {
  id: string;
  reportCode: string;
  citizenName: string;
  citizenId: string;
  locationText: string;
  cityName: string;
  hazardId?: string;
  hazardCode?: string;
  severity: SeverityType;
  status: CitizenReportStatusType;
  aiStatus: 'PENDING' | 'ANALYZED' | 'FAILED';
  createdAt: string;
  distanceKm?: number;
}

export interface DuplicateCandidate {
  hazardA: AdminHazard;
  hazardB: AdminHazard;
  distanceMeters: number;
  sameRoad: boolean;
}

// ------------------------------------------------------------------ Users

export interface AdminManagedUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRoleType;
  status: UserAccountStatusType;
  cityName?: string;
  createdAt: string;
  lastActiveAt?: string;
  reportCount?: number;
}

// -------------------------------------------------------------- Cities/Muni

export interface City extends Versioned {
  id: string;
  code: string;
  name: string;
  state: string;
  status: CityStatusType;
  municipalityName: string;
  latitude: number;
  longitude: number;
  activeHazards: number;
  criticalHazards: number;
  fleetCoveragePct: number;
  wardsCount: number;
  population?: number;
}

export interface CityConfig {
  cityId: string;
  hazardCriticalThreshold: SeverityType;
  notificationThresholdHazards: number;
  fleetCoverageTargetPct: number;
  dataRetentionDays: number;
  autoVerifyAiConfidence: number;
}

export interface Municipality {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
  officerCount: number;
  activeHazards: number;
  criticalHazards: number;
  openRepairs: number;
  avgResolutionDays: number;
  resolutionRatePct: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface MunicipalityOfficerSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserAccountStatusType;
}

// -------------------------------------------------------------------- Fleet

export interface FleetVehicle {
  id: string;
  plateNumber: string;
  operatorId: string;
  operatorName: string;
  cityName: string;
  zoneName: string;
  status: VehicleStatusType;
  kmToday: number;
  dataQualityPct: number;
  latitude: number;
  longitude: number;
  lastPingAt: string;
  distanceKm?: number;
}

export interface FleetVehicleDetail extends FleetVehicle {
  gps: 'GOOD' | 'FAIR' | 'POOR';
  camera: 'OK' | 'DEGRADED' | 'OFFLINE';
  ai: 'OK' | 'DEGRADED' | 'OFFLINE';
  network: 'OK' | 'WEAK' | 'OFFLINE';
  storageUsedPct: number;
  currentSessionKm?: number;
  currentSessionStartedAt?: string;
}

export interface FleetOperator {
  id: string;
  operatorCode: string;
  name: string;
  vehiclePlate?: string;
  cityName: string;
  status: OperatorStatusType;
  coveragePct: number;
  dataQualityPct: number;
  tripsCompleted: number;
  pendingEarnings: number;
}

export interface FleetPayment {
  id: string;
  operatorId: string;
  operatorName: string;
  amount: number;
  validatedTrips: number;
  status: PaymentStatusType;
  periodLabel: string;
  createdAt: string;
}

export interface FleetQualitySummary {
  gpsAccuracyPct: number;
  imageQualityPct: number;
  avgAiConfidencePct: number;
  uploadCompletionPct: number;
  duplicateRatePct: number;
  invalidObservationsPct: number;
  coveragePct: number;
}

// --------------------------------------------------------------------- AI

export interface AiModelStatus {
  modelName: string;
  version: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  inferenceRequestsToday: number;
  successfulDetectionsToday: number;
  avgConfidencePct: number;
  avgLatencyMs: number;
  errorRatePct: number;
  falsePositiveReviewRatePct: number;
}

export interface AiConfig extends Versioned {
  confidenceThreshold: number;
  minDetectionSizePx: number;
  inferenceFps: number;
  deploymentMode: 'SHADOW' | 'CANARY' | 'FULL';
  fallbackMode: 'MOCK' | 'DISABLED';
}

export interface AiModelVersion {
  id: string;
  name: string;
  version: string;
  status: ModelStatusType;
  mAP50: number;
  mAP5095: number;
  precisionPct: number;
  recallPct: number;
  avgLatencyMs: number;
  falsePositivesPerKm: number;
  createdAt: string;
}

export interface AiPerformance {
  precisionPct: number;
  recallPct: number;
  mAP50: number;
  mAP5095: number;
  avgLatencyMs: number;
  fps: number;
  falsePositivesPerKm: number;
  missedDetectionsPerKm: number;
  confidenceDistribution: { bucket: string; count: number }[];
}

// --------------------------------------------------------------- Analytics

export interface AnalyticsSummary {
  totalHazards: number;
  criticalHazards: number;
  citizenReports: number;
  fleetObservations: number;
  activeVehicles: number;
  cities: number;
  municipalities: number;
  resolutionRatePct: number;
  avgResolutionDays: number;
  aiDetections: number;
  aiAvgLatencyMs: number;
  fleetCoveragePct: number;
}

export interface CityPerformanceRow {
  cityId: string;
  cityName: string;
  activeHazards: number;
  criticalHazards: number;
  fleetCoveragePct: number;
  resolutionRatePct: number;
  avgResolutionDays: number;
  citizenParticipation: number;
}

export interface TrendPoint {
  label: string;
  value: number;
}

// ------------------------------------------------------------- Data Quality

export interface DataQualitySummary {
  citizenDataQualityPct: number;
  fleetDataQualityPct: number;
  aiQualityPct: number;
  duplicateRatePct: number;
  gpsQualityPct: number;
  mediaQualityPct: number;
  unresolvedAnomalies: number;
}

export interface DataAnomaly {
  id: string;
  code: string;
  kind: 'GPS_JUMP' | 'DUPLICATE_OBSERVATION' | 'INVALID_TIMESTAMP' | 'MISSING_MEDIA' | 'LOW_CONFIDENCE' | 'GPS_ACCURACY' | 'OPERATOR_ABUSE';
  severity: AnomalySeverityType;
  source: string;
  entityLabel: string;
  recommendedAction: string;
  detectedAt: string;
}

// ---------------------------------------------------------------- System

export interface SystemService {
  name: string;
  status: ServiceHealthType;
  latencyMs: number;
  uptimePct: number;
}

export interface ApiMonitoring {
  requestsPerMinute: number;
  errorRatePct: number;
  avgResponseMs: number;
  errors5xxPerHour: number;
  errors4xxPerHour: number;
  slowEndpoints: { path: string; avgMs: number }[];
  requestSeries: TrendPoint[];
}

export interface DatabaseHealth {
  status: ServiceHealthType;
  connectionCount: number;
  storageUsedPct: number;
  queryLatencyMs: number;
  postgisStatus: ServiceHealthType;
  lastBackupAt: string;
}

export interface StorageHealth {
  imageStorageUsedGb: number;
  videoStorageUsedGb: number;
  totalCapacityGb: number;
  uploadFailuresToday: number;
  orphanedMediaCount: number;
}

// ------------------------------------------------------------ Notifications

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriorityType;
  target: string;
  createdAt: string;
  read: boolean;
}

export interface FeatureFlag extends Versioned {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  target: 'GLOBAL' | 'CITY' | 'ROLE';
  targetValue?: string;
}

export interface AppVersionInfo {
  app: 'CITIZEN' | 'MUNICIPALITY' | 'FLEET' | 'ADMIN';
  currentVersion: string;
  minSupportedVersion: string;
  updateMode: 'NONE' | 'OPTIONAL' | 'FORCE';
}

export interface MaintenanceModeConfig extends Versioned {
  active: boolean;
  message: string;
  target: 'ALL' | 'CITIZEN' | 'MUNICIPALITY' | 'FLEET';
}

// ---------------------------------------------------------------- Audit

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: AdminRoleType;
  action: string;
  entityType: string;
  entityId: string;
  before?: string;
  after?: string;
  reason?: string;
  cityName?: string;
  ipAddress?: string;
  createdAt: string;
}

// --------------------------------------------------------------- Search

export interface GlobalSearchResult {
  id: string;
  kind: 'HAZARD' | 'REPORT' | 'REPAIR' | 'VEHICLE' | 'OPERATOR' | 'MUNICIPALITY' | 'CITY' | 'USER';
  title: string;
  subtitle: string;
}
