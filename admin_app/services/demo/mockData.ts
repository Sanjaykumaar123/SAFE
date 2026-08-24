/**
 * §demo — a realistic, nationwide in-app dataset used whenever the shared
 * backend is unreachable (DEMO_MODE, see constants/config.ts) so every
 * screen in this app — and the §87 end-to-end walkthrough — works without
 * a running server. Every `services/api/*Api.ts` wrapper falls back to a
 * slice of this module on network failure, the same pattern the Citizen/
 * Municipality/Fleet apps use. Generated once at module load (not on every
 * call) with a seeded PRNG so results stay stable within a session.
 */
import { AdminRole, type AdminRoleType, HazardStatus, type HazardStatusType, HazardType, Severity, type SeverityType } from '@/constants/enums';
import { ROLE_PERMISSIONS } from '@/constants/permissions';
import type {
  ActionRequiredItem,
  ActivityEvent,
  AdminHazard,
  AdminHazardDetail,
  AdminManagedUser,
  AdminNotification,
  AdminUser,
  AiConfig,
  AiModelStatus,
  AiModelVersion,
  AiPerformance,
  AnalyticsSummary,
  ApiMonitoring,
  AppVersionInfo,
  AuditLogEntry,
  CitizenReport,
  City,
  CityConfig,
  CityPerformanceRow,
  DatabaseHealth,
  DataAnomaly,
  DataQualitySummary,
  FeatureFlag,
  FleetOperator,
  FleetPayment,
  FleetQualitySummary,
  FleetVehicle,
  FleetVehicleDetail,
  GlobalKpis,
  MaintenanceModeConfig,
  Municipality,
  StorageHealth,
  SystemService,
  SystemStatusSummary,
  TrendPoint,
} from '@/types/admin';
import type { TokenPair } from '@/types/api';
import type { GeoPoint } from '@/types/geo';
import { distanceKm } from '@/utils/geo';
import { CITY_SEEDS, type CitySeed } from './geoGazetteer';

// ------------------------------------------------------------- PRNG helper

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260822);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const isoMinutesAgo = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

function jitterAround(center: GeoPoint, maxKm: number): GeoPoint {
  const r = maxKm * Math.sqrt(rand());
  const theta = rand() * 2 * Math.PI;
  const dLat = (r / 111) * Math.cos(theta);
  const dLon = (r / (111 * Math.cos((center.latitude * Math.PI) / 180))) * Math.sin(theta);
  return { latitude: center.latitude + dLat, longitude: center.longitude + dLon };
}

const ROAD_NAMES = ['Main Road', 'Ring Road', 'Bypass Road', 'Link Road', 'Anna Salai', 'Station Road', 'MG Road', 'Industrial Estate Road', 'Airport Road', 'Outer Ring Road', 'Hospital Road', 'Market Street'];
const SEVERITIES: SeverityType[] = [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL];
const HAZARD_STATUS_POOL: HazardStatusType[] = [
  HazardStatus.NEW,
  HazardStatus.UNDER_REVIEW,
  HazardStatus.ACTIVE,
  HazardStatus.ACTIVE,
  HazardStatus.UNDER_REPAIR,
  HazardStatus.RESOLVED,
  HazardStatus.REOPENED,
  HazardStatus.DUPLICATE,
  HazardStatus.VERIFIED,
];
const SOURCES = ['Citizen', 'Fleet', 'Citizen + Fleet', 'Fleet', 'Citizen'];
const HAZARD_TYPES = Object.values(HazardType);

// ---------------------------------------------------------------- Cities

export const DEMO_CITIES: City[] = CITY_SEEDS.map((c, i) => buildCity(c, i));

function buildCity(seed: CitySeed, index: number): City {
  return {
    id: seed.id,
    code: seed.code,
    name: seed.name,
    state: seed.state,
    status: index < 10 ? 'ACTIVE' : 'ONBOARDING',
    municipalityName: `Greater ${seed.name} Corporation`,
    latitude: seed.latitude,
    longitude: seed.longitude,
    activeHazards: Math.round(between(80, 420)),
    criticalHazards: Math.round(between(8, 60)),
    fleetCoveragePct: Math.round(between(58, 96)),
    wardsCount: Math.round(between(30, 200)),
    population: seed.population,
    version: 1,
    updatedAt: isoMinutesAgo(Math.round(between(60, 20000))),
  };
}

export const DEMO_CITY_CONFIGS: Record<string, CityConfig> = Object.fromEntries(
  DEMO_CITIES.map((c) => [
    c.id,
    {
      cityId: c.id,
      hazardCriticalThreshold: 'HIGH' as SeverityType,
      notificationThresholdHazards: 25,
      fleetCoverageTargetPct: 85,
      dataRetentionDays: 365,
      autoVerifyAiConfidence: 0.9,
    },
  ])
);

// --------------------------------------------------------------- Hazards

function generateHazardsForCity(city: City, count: number): AdminHazard[] {
  const out: AdminHazard[] = [];
  for (let i = 0; i < count; i++) {
    const point = jitterAround(city, 45);
    const status = pick(HAZARD_STATUS_POOL);
    const severity = pick(SEVERITIES);
    const createdMinAgo = Math.round(between(10, 60 * 24 * 21));
    const code = `PTH-${city.code}-${1000 + i}`;
    out.push({
      id: `hz-${city.id}-${i}`,
      code,
      type: pick(HAZARD_TYPES),
      title: `${pick(['Pothole', 'Road subsidence', 'Waterlogging', 'Debris on carriageway', 'Broken pavement'])} on ${pick(ROAD_NAMES)}`,
      roadName: pick(ROAD_NAMES),
      locationText: `${pick(ROAD_NAMES)}, ${city.name}`,
      latitude: point.latitude,
      longitude: point.longitude,
      cityId: city.id,
      cityName: city.name,
      wardName: `Ward ${Math.round(between(1, city.wardsCount))}`,
      severity,
      status,
      aiConfidence: Math.round(between(52, 99)) / 100,
      source: pick(SOURCES),
      citizenReportCount: Math.round(between(0, 60)),
      fleetObservationCount: Math.round(between(0, 12)),
      municipalityActionTaken: status === 'UNDER_REPAIR' || status === 'RESOLVED',
      linkedHazardIds: status === 'DUPLICATE' && i > 0 ? [`hz-${city.id}-${i - 1}`] : [],
      createdAt: isoMinutesAgo(createdMinAgo),
      lastUpdateAt: isoMinutesAgo(Math.round(between(2, createdMinAgo))),
      version: 1,
      updatedAt: isoMinutesAgo(Math.round(between(2, createdMinAgo))),
    });
  }
  return out;
}

export const DEMO_HAZARDS: AdminHazard[] = DEMO_CITIES.flatMap((city) => generateHazardsForCity(city, city.name === 'Chennai' ? 60 : 34));

export function buildHazardDetail(hazard: AdminHazard): AdminHazardDetail {
  const evidence = [
    {
      id: `${hazard.id}-ev-1`,
      kind: 'CITIZEN' as const,
      title: 'Citizen report submitted',
      detail: `Reported via mobile app near ${hazard.locationText}.`,
      imageUrl: `https://picsum.photos/seed/${hazard.id}a/400/300`,
      timestamp: hazard.createdAt,
      actorLabel: 'Citizen reporter',
    },
    {
      id: `${hazard.id}-ev-2`,
      kind: 'AI' as const,
      title: 'AI detection (YOLO26n v1.0)',
      detail: `Confidence ${Math.round(hazard.aiConfidence * 100)}% · bounding box logged.`,
      confidence: hazard.aiConfidence,
      timestamp: hazard.createdAt,
      actorLabel: 'SafePath AI',
    },
    ...(hazard.fleetObservationCount > 0
      ? [
          {
            id: `${hazard.id}-ev-3`,
            kind: 'FLEET' as const,
            title: `${hazard.fleetObservationCount} fleet observation(s)`,
            detail: 'Confirmed by fleet dash-cam pass(es) within the tracking window.',
            imageUrl: `https://picsum.photos/seed/${hazard.id}b/400/300`,
            gpsQuality: 'GOOD' as const,
            timestamp: hazard.lastUpdateAt,
            actorLabel: 'Fleet vehicle',
          },
        ]
      : []),
    ...(hazard.municipalityActionTaken
      ? [
          {
            id: `${hazard.id}-ev-4`,
            kind: 'MUNICIPALITY' as const,
            title: 'Repair action logged',
            detail: `${hazard.cityName} municipality crew dispatched.`,
            timestamp: hazard.lastUpdateAt,
            actorLabel: `${hazard.cityName} Municipality`,
          },
        ]
      : []),
  ];

  const timeline = [
    { id: 't1', label: 'Citizen Report', actorLabel: 'Citizen', timestamp: hazard.createdAt, done: true },
    { id: 't2', label: 'AI Analysis', actorLabel: 'SafePath AI', timestamp: hazard.createdAt, done: true },
    { id: 't3', label: 'Admin Verification', actorLabel: 'Pending review', timestamp: hazard.lastUpdateAt, done: hazard.status !== 'NEW' },
    { id: 't4', label: 'Fleet Observation', actorLabel: 'Fleet', timestamp: hazard.lastUpdateAt, done: hazard.fleetObservationCount > 0 },
    { id: 't5', label: 'Municipality Assignment', actorLabel: hazard.cityName, timestamp: hazard.lastUpdateAt, done: hazard.municipalityActionTaken },
    { id: 't6', label: 'Repair', actorLabel: hazard.cityName, timestamp: hazard.lastUpdateAt, done: hazard.status === 'UNDER_REPAIR' || hazard.status === 'RESOLVED' },
    { id: 't7', label: 'Resolution', actorLabel: hazard.cityName, timestamp: hazard.lastUpdateAt, done: hazard.status === 'RESOLVED' },
  ];

  return { ...hazard, evidence, timeline };
}

// -------------------------------------------------------- Citizen reports

export const DEMO_CITIZEN_REPORTS: CitizenReport[] = DEMO_HAZARDS.slice(0, 220).map((h, i) => ({
  id: `rpt-${i}`,
  reportCode: `RPT-${h.code.split('-')[1]}-${2000 + i}`,
  citizenName: pick(['A. Kumar', 'S. Priya', 'R. Iyer', 'M. Fernandes', 'V. Nair', 'K. Sharma', 'D. Rao']),
  citizenId: `cit-${1000 + i}`,
  locationText: h.locationText,
  cityName: h.cityName,
  hazardId: h.id,
  hazardCode: h.code,
  severity: h.severity,
  status: h.status === 'RESOLVED' ? 'RESOLVED' : h.status === 'DUPLICATE' ? 'DUPLICATE' : h.status === 'REJECTED' ? 'REJECTED' : h.status === 'NEW' ? 'NEW' : 'VERIFIED',
  aiStatus: 'ANALYZED',
  createdAt: h.createdAt,
}));

// -------------------------------------------------------------- Fleet

const OPERATOR_NAMES = ['R. Suresh', 'P. Anitha', 'M. Vignesh', 'S. Kavya', 'T. Arjun', 'L. Divya', 'N. Karthik', 'B. Meena', 'G. Praveen', 'H. Shalini'];

export const DEMO_OPERATORS: FleetOperator[] = DEMO_CITIES.flatMap((city, ci) =>
  Array.from({ length: 6 }, (_, i) => {
    const idx = ci * 6 + i;
    return {
      id: `op-${idx}`,
      operatorCode: `OP-${String(1000 + idx)}`,
      name: pick(OPERATOR_NAMES),
      vehiclePlate: `${city.code.slice(0, 2)} ${String(Math.round(between(1, 60))).padStart(2, '0')} ${pick(['AB', 'CD', 'EF', 'GH'])} ${Math.round(between(1000, 9999))}`,
      cityName: city.name,
      status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'SUSPENDED', 'PENDING']) as FleetOperator['status'],
      coveragePct: Math.round(between(55, 98)),
      dataQualityPct: Math.round(between(60, 99)),
      tripsCompleted: Math.round(between(20, 900)),
      pendingEarnings: Math.round(between(500, 18000)),
    };
  })
);

export const DEMO_VEHICLES: FleetVehicle[] = DEMO_OPERATORS.map((op, i) => {
  const city = DEMO_CITIES.find((c) => c.name === op.cityName)!;
  const point = jitterAround(city, 30);
  return {
    id: `veh-${i}`,
    plateNumber: op.vehiclePlate ?? `VH-${1000 + i}`,
    operatorId: op.id,
    operatorName: op.name,
    cityName: city.name,
    zoneName: `${city.name} ${pick(['North', 'South', 'East', 'West', 'Central'])}`,
    status: pick(['LIVE', 'LIVE', 'IDLE', 'OFFLINE']) as FleetVehicle['status'],
    kmToday: Math.round(between(0, 120)),
    dataQualityPct: op.dataQualityPct,
    latitude: point.latitude,
    longitude: point.longitude,
    lastPingAt: isoMinutesAgo(Math.round(between(1, 240))),
  };
});

export function buildVehicleDetail(v: FleetVehicle): FleetVehicleDetail {
  return {
    ...v,
    gps: v.dataQualityPct > 85 ? 'GOOD' : v.dataQualityPct > 65 ? 'FAIR' : 'POOR',
    camera: v.status === 'OFFLINE' ? 'OFFLINE' : 'OK',
    ai: v.status === 'OFFLINE' ? 'OFFLINE' : 'OK',
    network: v.status === 'LIVE' ? 'OK' : v.status === 'IDLE' ? 'WEAK' : 'OFFLINE',
    storageUsedPct: Math.round(between(20, 92)),
    currentSessionKm: v.status === 'LIVE' ? Math.round(between(2, 40)) : undefined,
    currentSessionStartedAt: v.status === 'LIVE' ? isoMinutesAgo(Math.round(between(5, 180))) : undefined,
  };
}

export const DEMO_PAYMENTS: FleetPayment[] = DEMO_OPERATORS.slice(0, 30).map((op, i) => ({
  id: `pay-${i}`,
  operatorId: op.id,
  operatorName: op.name,
  amount: op.pendingEarnings,
  validatedTrips: Math.round(between(5, 60)),
  status: pick(['PENDING', 'PENDING', 'APPROVED', 'PAID', 'HELD', 'FAILED']) as FleetPayment['status'],
  periodLabel: pick(['1–15 Aug 2026', '16–31 Jul 2026', '1–15 Jul 2026']),
  createdAt: isoMinutesAgo(Math.round(between(60, 20000))),
}));

export const DEMO_FLEET_QUALITY: FleetQualitySummary = {
  gpsAccuracyPct: 91,
  imageQualityPct: 87,
  avgAiConfidencePct: 84,
  uploadCompletionPct: 96,
  duplicateRatePct: 4,
  invalidObservationsPct: 3,
  coveragePct: 82,
};

// --------------------------------------------------------------- Municipalities

export const DEMO_MUNICIPALITIES: Municipality[] = DEMO_CITIES.map((c) => ({
  id: `muni-${c.id}`,
  name: c.municipalityName,
  cityId: c.id,
  cityName: c.name,
  officerCount: Math.round(between(4, 40)),
  activeHazards: c.activeHazards,
  criticalHazards: c.criticalHazards,
  openRepairs: Math.round(between(10, 120)),
  avgResolutionDays: Math.round(between(3, 21)),
  resolutionRatePct: Math.round(between(55, 95)),
  status: c.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
}));

// --------------------------------------------------------------------- Users

export const DEMO_MANAGED_USERS: AdminManagedUser[] = [
  ...Array.from({ length: 40 }, (_, i) => {
    const city = pick(DEMO_CITIES);
    return {
      id: `user-citizen-${i}`,
      displayName: pick(['A. Kumar', 'S. Priya', 'R. Iyer', 'M. Fernandes', 'V. Nair', 'K. Sharma']),
      email: `citizen${i}@example.com`,
      role: 'CITIZEN' as const,
      status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'LOCKED', 'DEACTIVATED']) as AdminManagedUser['status'],
      cityName: city.name,
      createdAt: isoMinutesAgo(Math.round(between(1000, 400000))),
      lastActiveAt: isoMinutesAgo(Math.round(between(5, 40000))),
      reportCount: Math.round(between(0, 40)),
    };
  }),
  ...DEMO_MUNICIPALITIES.flatMap((m, mi) =>
    Array.from({ length: 3 }, (_, i) => ({
      id: `user-officer-${mi}-${i}`,
      displayName: pick(['Officer Rajan', 'Officer Devi', 'Officer Mahesh', 'Officer Latha']),
      email: `officer${mi}${i}@${m.cityName.toLowerCase()}.gov.in`,
      role: 'MUNICIPALITY_OFFICER' as const,
      status: 'ACTIVE' as const,
      cityName: m.cityName,
      createdAt: isoMinutesAgo(Math.round(between(5000, 300000))),
      lastActiveAt: isoMinutesAgo(Math.round(between(5, 4000))),
    }))
  ),
  ...DEMO_OPERATORS.map((op) => ({
    id: `user-op-${op.id}`,
    displayName: op.name,
    email: `${op.operatorCode.toLowerCase()}@fleet.safepath.ai`,
    role: 'FLEET_OPERATOR' as const,
    status: (op.status === 'SUSPENDED' ? 'LOCKED' : 'ACTIVE') as AdminManagedUser['status'],
    cityName: op.cityName,
    createdAt: isoMinutesAgo(Math.round(between(5000, 300000))),
    lastActiveAt: isoMinutesAgo(Math.round(between(5, 4000))),
  })),
];

// ------------------------------------------------------------------ Admins

const ROLE_NAMES: Record<AdminRoleType, string> = {
  SUPER_ADMIN: 'Aarav Mehta',
  PLATFORM_ADMIN: 'Ishita Rao',
  DATA_ADMIN: 'Rohan Das',
  CITY_ADMIN: 'Sneha Pillai',
  FLEET_ADMIN: 'Vikram Shetty',
  AI_ADMIN: 'Nisha Verma',
  SUPPORT_ADMIN: 'Farhan Ali',
  ANALYST: 'Priya Menon',
};

export const DEMO_ADMINS: Record<string, AdminUser> = Object.fromEntries(
  Object.values(AdminRole).map((role) => {
    const adminId = `ADM-${role.slice(0, 3)}`;
    const admin: AdminUser = {
      id: `admin-${role}`,
      adminId,
      name: ROLE_NAMES[role],
      email: `${role.toLowerCase().replace(/_/g, '.')}@safepath.ai`,
      role,
      permissions: ROLE_PERMISSIONS[role],
      accessibleCityIds: 'ALL',
      accessibleMunicipalityIds: 'ALL',
      lastLoginAt: isoMinutesAgo(Math.round(between(1, 500))),
    };
    return [admin.email, admin];
  })
);

export const DEMO_TOKENS: TokenPair = {
  accessToken: 'demo-admin-jwt-access-token',
  refreshToken: 'demo-admin-jwt-refresh-token',
  tokenType: 'bearer',
};

// --------------------------------------------------------------- Dashboard

export function buildGlobalKpis(hazardsInScope: AdminHazard[], vehiclesInScope: FleetVehicle[]): GlobalKpis {
  const active = hazardsInScope.filter((h) => ['NEW', 'UNDER_REVIEW', 'ACTIVE', 'REOPENED', 'VERIFIED'].includes(h.status));
  const critical = hazardsInScope.filter((h) => h.severity === 'CRITICAL' || h.severity === 'HIGH');
  const underRepair = hazardsInScope.filter((h) => h.status === 'UNDER_REPAIR');
  const resolved = hazardsInScope.filter((h) => h.status === 'RESOLVED');
  return {
    activeHazards: active.length,
    activeHazardsTrendPct: 12,
    criticalHazards: critical.length,
    citizenReportsToday: Math.round(hazardsInScope.length * 0.35),
    fleetObservationsToday: Math.round(hazardsInScope.reduce((s, h) => s + h.fleetObservationCount, 0) * 2.1),
    activeVehicles: vehiclesInScope.filter((v) => v.status === 'LIVE').length,
    citiesActive: DEMO_CITIES.filter((c) => c.status === 'ACTIVE').length,
    municipalities: DEMO_MUNICIPALITIES.length,
    dataCoveragePct: 87,
    underRepair: underRepair.length,
    resolved: resolved.length,
  };
}

export const DEMO_SYSTEM_STATUS: SystemStatusSummary = {
  overall: 'HEALTHY',
  services: [
    { name: 'API', status: 'HEALTHY', latencyMs: 82 },
    { name: 'Database', status: 'HEALTHY', latencyMs: 14 },
    { name: 'AI Service', status: 'HEALTHY', latencyMs: 210 },
    { name: 'Storage', status: 'HEALTHY', latencyMs: 65 },
  ],
};

export const DEMO_ACTIVITY: ActivityEvent[] = [
  { id: 'act-1', kind: 'HAZARD', message: 'New critical hazard reported on OMR', cityName: 'Chennai', severity: 'CRITICAL', createdAt: isoMinutesAgo(4) },
  { id: 'act-2', kind: 'FLEET', message: 'Fleet observation spike detected (+38%)', cityName: 'Bengaluru', severity: 'HIGH', createdAt: isoMinutesAgo(18) },
  { id: 'act-3', kind: 'MUNICIPALITY', message: 'Road resolved: MG Road pothole cluster', cityName: 'Bengaluru', severity: 'INFO', createdAt: isoMinutesAgo(42) },
  { id: 'act-4', kind: 'FLEET', message: 'Operator OP-1042 disconnected mid-trip', cityName: 'Hyderabad', severity: 'MEDIUM', createdAt: isoMinutesAgo(65) },
  { id: 'act-5', kind: 'AI', message: 'AI service latency warning (312ms avg)', severity: 'MEDIUM', createdAt: isoMinutesAgo(90) },
  { id: 'act-6', kind: 'PAYMENT', message: '3 fleet payments approved', cityName: 'Chennai', severity: 'INFO', createdAt: isoMinutesAgo(120) },
];

export function buildActionRequired(center: GeoPoint | null, hazards: AdminHazard[]): ActionRequiredItem[] {
  const critical = hazards.filter((h) => h.severity === 'CRITICAL' || (h.severity === 'HIGH' && h.status !== 'RESOLVED')).slice(0, 8);
  return critical.map((h) => ({
    id: h.id,
    entityType: 'HAZARD',
    entityId: h.id,
    title: h.code,
    description: `${h.title}. ${h.fleetObservationCount > 0 ? `${h.fleetObservationCount} fleet observation(s) in the last hour.` : `${h.citizenReportCount} citizen report(s).`}`,
    distanceKm: center ? distanceKm(center, h) : undefined,
    cityName: h.cityName,
    severity: h.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
  }));
}

// --------------------------------------------------------------------- AI

export const DEMO_AI_STATUS: AiModelStatus = {
  modelName: 'YOLO26n',
  version: 'safepath-pothole-v1',
  status: 'ONLINE',
  inferenceRequestsToday: 18420,
  successfulDetectionsToday: 6210,
  avgConfidencePct: 88,
  avgLatencyMs: 214,
  errorRatePct: 0.6,
  falsePositiveReviewRatePct: 3.2,
};

export const DEMO_AI_CONFIG: AiConfig = {
  confidenceThreshold: 0.5,
  minDetectionSizePx: 24,
  inferenceFps: 5,
  deploymentMode: 'FULL',
  fallbackMode: 'MOCK',
  version: 1,
  updatedAt: isoMinutesAgo(2000),
};

export const DEMO_AI_MODELS: AiModelVersion[] = [
  { id: 'model-v1', name: 'YOLO26n', version: 'v1.0', status: 'PRODUCTION', mAP50: 0.81, mAP5095: 0.54, precisionPct: 87, recallPct: 82, avgLatencyMs: 214, falsePositivesPerKm: 0.8, createdAt: isoMinutesAgo(60000) },
  { id: 'model-v1-1', name: 'YOLO26n', version: 'v1.1', status: 'STAGING', mAP50: 0.85, mAP5095: 0.58, precisionPct: 90, recallPct: 85, avgLatencyMs: 198, falsePositivesPerKm: 0.6, createdAt: isoMinutesAgo(10000) },
  { id: 'model-v2', name: 'YOLO26n', version: 'v2.0', status: 'TRAINING', mAP50: 0.0, mAP5095: 0.0, precisionPct: 0, recallPct: 0, avgLatencyMs: 0, falsePositivesPerKm: 0, createdAt: isoMinutesAgo(500) },
  { id: 'model-v0-9', name: 'YOLO26n', version: 'v0.9', status: 'DEPRECATED', mAP50: 0.74, mAP5095: 0.46, precisionPct: 79, recallPct: 75, avgLatencyMs: 240, falsePositivesPerKm: 1.4, createdAt: isoMinutesAgo(200000) },
];

export const DEMO_AI_PERFORMANCE: AiPerformance = {
  precisionPct: 87,
  recallPct: 82,
  mAP50: 0.81,
  mAP5095: 0.54,
  avgLatencyMs: 214,
  fps: 4.8,
  falsePositivesPerKm: 0.8,
  missedDetectionsPerKm: 0.3,
  confidenceDistribution: [
    { bucket: '0.5–0.6', count: 420 },
    { bucket: '0.6–0.7', count: 810 },
    { bucket: '0.7–0.8', count: 1540 },
    { bucket: '0.8–0.9', count: 2260 },
    { bucket: '0.9–1.0', count: 1180 },
  ],
};

// ------------------------------------------------------------------ System

export const DEMO_SYSTEM_SERVICES: SystemService[] = [
  { name: 'API', status: 'HEALTHY', latencyMs: 82, uptimePct: 99.98 },
  { name: 'Database', status: 'HEALTHY', latencyMs: 14, uptimePct: 99.99 },
  { name: 'PostGIS', status: 'HEALTHY', latencyMs: 22, uptimePct: 99.97 },
  { name: 'Object Storage', status: 'HEALTHY', latencyMs: 65, uptimePct: 99.95 },
  { name: 'AI Service', status: 'WARNING', latencyMs: 312, uptimePct: 99.4 },
  { name: 'Notification Service', status: 'HEALTHY', latencyMs: 40, uptimePct: 99.9 },
  { name: 'Realtime Service', status: 'HEALTHY', latencyMs: 55, uptimePct: 99.8 },
  { name: 'Map Service', status: 'HEALTHY', latencyMs: 90, uptimePct: 99.9 },
];

export const DEMO_API_MONITORING: ApiMonitoring = {
  requestsPerMinute: 1420,
  errorRatePct: 0.8,
  avgResponseMs: 118,
  errors5xxPerHour: 3,
  errors4xxPerHour: 41,
  slowEndpoints: [
    { path: '/api/admin/hazards', avgMs: 340 },
    { path: '/api/admin/analytics/summary', avgMs: 290 },
    { path: '/api/fleet/observations', avgMs: 210 },
  ],
  requestSeries: Array.from({ length: 12 }, (_, i): TrendPoint => ({ label: `${i * 2}:00`, value: Math.round(between(800, 1800)) })),
};

export const DEMO_DB_HEALTH: DatabaseHealth = {
  status: 'HEALTHY',
  connectionCount: 64,
  storageUsedPct: 58,
  queryLatencyMs: 14,
  postgisStatus: 'HEALTHY',
  lastBackupAt: isoMinutesAgo(320),
};

export const DEMO_STORAGE_HEALTH: StorageHealth = {
  imageStorageUsedGb: 842,
  videoStorageUsedGb: 210,
  totalCapacityGb: 2000,
  uploadFailuresToday: 6,
  orphanedMediaCount: 132,
};

// ----------------------------------------------------------- Notifications

export const DEMO_NOTIFICATIONS: AdminNotification[] = [
  { id: 'ntf-1', title: 'Critical hazard spike', message: 'Critical road hazards increased 31% in Chennai within 2 hours.', priority: 'CRITICAL', target: 'Chennai', createdAt: isoMinutesAgo(10), read: false },
  { id: 'ntf-2', title: 'AI quality alert', message: 'False positives/km rose to 1.8 (normal 0.8) on YOLO26n v1.0.', priority: 'HIGH', target: 'Platform', createdAt: isoMinutesAgo(55), read: false },
  { id: 'ntf-3', title: 'Fleet data-quality warning', message: 'Operator OP-0042 GPS accuracy dropped to 62%.', priority: 'MEDIUM', target: 'Hyderabad', createdAt: isoMinutesAgo(140), read: true },
  { id: 'ntf-4', title: 'Municipality backlog', message: '7 unresolved municipal escalations pending review.', priority: 'MEDIUM', target: 'Platform', createdAt: isoMinutesAgo(300), read: true },
  { id: 'ntf-5', title: 'Payment failure', message: '2 fleet payments failed processing this cycle.', priority: 'INFO', target: 'Platform', createdAt: isoMinutesAgo(600), read: true },
];

export const DEMO_FEATURE_FLAGS: FeatureFlag[] = [
  { key: 'citizen_reporting', label: 'Citizen Reporting', description: 'Allow citizens to submit new hazard reports.', enabled: true, target: 'GLOBAL', version: 3, updatedAt: isoMinutesAgo(4000) },
  { key: 'ai_detection', label: 'AI Detection', description: 'Run YOLO26n inference on fleet dash-cam frames.', enabled: true, target: 'GLOBAL', version: 5, updatedAt: isoMinutesAgo(1200) },
  { key: 'fleet_monitoring', label: 'Fleet Monitoring', description: 'Enable live fleet vehicle monitoring.', enabled: true, target: 'GLOBAL', version: 2, updatedAt: isoMinutesAgo(8000) },
  { key: 'municipality_analytics', label: 'Municipality Analytics', description: 'Expose analytics dashboards to municipality officers.', enabled: true, target: 'GLOBAL', version: 1, updatedAt: isoMinutesAgo(20000) },
  { key: 'payment_system', label: 'Payment System', description: 'Enable fleet operator payment processing.', enabled: true, target: 'GLOBAL', version: 4, updatedAt: isoMinutesAgo(9000) },
  { key: 'realtime_updates', label: 'Real-time Updates', description: 'Push live updates to connected apps.', enabled: false, target: 'GLOBAL', version: 1, updatedAt: isoMinutesAgo(15000) },
  { key: 'experimental_ai_model', label: 'Experimental AI Model (v2.0)', description: 'Route a sample of traffic to the v2.0 model under evaluation.', enabled: false, target: 'CITY', targetValue: 'Chennai', version: 1, updatedAt: isoMinutesAgo(500) },
];

export const DEMO_APP_VERSIONS: AppVersionInfo[] = [
  { app: 'CITIZEN', currentVersion: '2.4.1', minSupportedVersion: '2.2.0', updateMode: 'NONE' },
  { app: 'MUNICIPALITY', currentVersion: '1.8.0', minSupportedVersion: '1.6.0', updateMode: 'OPTIONAL' },
  { app: 'FLEET', currentVersion: '1.5.2', minSupportedVersion: '1.5.0', updateMode: 'NONE' },
  { app: 'ADMIN', currentVersion: '1.0.0', minSupportedVersion: '1.0.0', updateMode: 'NONE' },
];

export const DEMO_MAINTENANCE_MODE: MaintenanceModeConfig = {
  active: false,
  message: 'SafePath is undergoing scheduled maintenance.',
  target: 'ALL',
  version: 1,
  updatedAt: isoMinutesAgo(50000),
};

// --------------------------------------------------------------- Data quality

export const DEMO_DATA_QUALITY: DataQualitySummary = {
  citizenDataQualityPct: 82,
  fleetDataQualityPct: 88,
  aiQualityPct: 90,
  duplicateRatePct: 5,
  gpsQualityPct: 91,
  mediaQualityPct: 85,
  unresolvedAnomalies: 14,
};

export const DEMO_ANOMALIES: DataAnomaly[] = [
  { id: 'anm-1', code: 'ANM-0231', kind: 'GPS_JUMP', severity: 'HIGH', source: 'Fleet', entityLabel: 'Vehicle TN 38 AB 1234', recommendedAction: 'Review trip trace, flag device.', detectedAt: isoMinutesAgo(30) },
  { id: 'anm-2', code: 'ANM-0232', kind: 'DUPLICATE_OBSERVATION', severity: 'MEDIUM', source: 'Fleet', entityLabel: 'Operator OP-0042', recommendedAction: 'Merge duplicate observations.', detectedAt: isoMinutesAgo(90) },
  { id: 'anm-3', code: 'ANM-0233', kind: 'LOW_CONFIDENCE', severity: 'LOW', source: 'AI', entityLabel: 'Model YOLO26n v1.0', recommendedAction: 'Sample for manual review.', detectedAt: isoMinutesAgo(150) },
  { id: 'anm-4', code: 'ANM-0234', kind: 'GPS_ACCURACY', severity: 'MEDIUM', source: 'Fleet', entityLabel: 'Vehicle KA 05 CD 9821', recommendedAction: 'Notify operator, check device mount.', detectedAt: isoMinutesAgo(200) },
  { id: 'anm-5', code: 'ANM-0235', kind: 'OPERATOR_ABUSE', severity: 'HIGH', source: 'Fleet', entityLabel: 'Operator OP-0091', recommendedAction: 'Suspend data ingestion pending review.', detectedAt: isoMinutesAgo(260) },
  { id: 'anm-6', code: 'ANM-0236', kind: 'MISSING_MEDIA', severity: 'LOW', source: 'Citizen', entityLabel: 'Report RPT-CHN-2041', recommendedAction: 'Request re-submission.', detectedAt: isoMinutesAgo(340) },
];

// --------------------------------------------------------------- Analytics

export function buildAnalyticsSummary(hazardsInScope: AdminHazard[], vehiclesInScope: FleetVehicle[]): AnalyticsSummary {
  const resolved = hazardsInScope.filter((h) => h.status === 'RESOLVED').length;
  return {
    totalHazards: hazardsInScope.length,
    criticalHazards: hazardsInScope.filter((h) => h.severity === 'CRITICAL').length,
    citizenReports: Math.round(hazardsInScope.length * 0.6),
    fleetObservations: hazardsInScope.reduce((s, h) => s + h.fleetObservationCount, 0),
    activeVehicles: vehiclesInScope.filter((v) => v.status === 'LIVE').length,
    cities: DEMO_CITIES.length,
    municipalities: DEMO_MUNICIPALITIES.length,
    resolutionRatePct: hazardsInScope.length ? Math.round((resolved / hazardsInScope.length) * 100) : 0,
    avgResolutionDays: 9,
    aiDetections: hazardsInScope.length * 3,
    aiAvgLatencyMs: DEMO_AI_STATUS.avgLatencyMs,
    fleetCoveragePct: 84,
  };
}

export const DEMO_CITY_PERFORMANCE: CityPerformanceRow[] = DEMO_CITIES.map((c) => ({
  cityId: c.id,
  cityName: c.name,
  activeHazards: c.activeHazards,
  criticalHazards: c.criticalHazards,
  fleetCoveragePct: c.fleetCoveragePct,
  resolutionRatePct: Math.round(between(55, 92)),
  avgResolutionDays: Math.round(between(4, 18)),
  citizenParticipation: Math.round(between(200, 9000)),
}));

export function buildHazardTrend(hazards: AdminHazard[]): TrendPoint[] {
  const days = 14;
  const buckets = Array.from({ length: days }, (_, i) => ({ label: `D-${days - i}`, value: 0 }));
  const now = Date.now();
  for (const h of hazards) {
    const ageDays = Math.floor((now - new Date(h.createdAt).getTime()) / 86_400_000);
    if (ageDays >= 0 && ageDays < days) {
      buckets[days - 1 - ageDays].value += 1;
    }
  }
  return buckets;
}

// ------------------------------------------------------------------- Audit

const AUDIT_ACTIONS = ['VERIFY_HAZARD', 'REJECT_HAZARD', 'MERGE_HAZARD', 'REOPEN_HAZARD', 'ACTIVATE_CITY', 'CHANGE_AI_THRESHOLD', 'SUSPEND_OPERATOR', 'APPROVE_PAYMENT', 'TOGGLE_FEATURE_FLAG', 'DEACTIVATE_USER'];

export const DEMO_AUDIT_LOGS: AuditLogEntry[] = Array.from({ length: 60 }, (_, i) => {
  const admin = pick(Object.values(DEMO_ADMINS));
  const hazard = pick(DEMO_HAZARDS);
  const action = pick(AUDIT_ACTIONS);
  return {
    id: `audit-${i}`,
    actorName: admin.name,
    actorRole: admin.role,
    action,
    entityType: action.includes('HAZARD') ? 'HAZARD' : action.includes('CITY') ? 'CITY' : action.includes('AI') ? 'AI_CONFIG' : action.includes('OPERATOR') ? 'OPERATOR' : action.includes('PAYMENT') ? 'PAYMENT' : action.includes('FLAG') ? 'FEATURE_FLAG' : 'USER',
    entityId: hazard.code,
    before: action === 'VERIFY_HAZARD' ? 'ACTIVE' : action === 'CHANGE_AI_THRESHOLD' ? '0.50' : undefined,
    after: action === 'VERIFY_HAZARD' ? 'VERIFIED' : action === 'CHANGE_AI_THRESHOLD' ? '0.60' : undefined,
    reason: pick(['New evidence reviewed', 'Confirmed by fleet observation', 'Duplicate of nearby hazard', 'Routine review', undefined]),
    cityName: hazard.cityName,
    ipAddress: `10.${Math.round(between(0, 255))}.${Math.round(between(0, 255))}.${Math.round(between(0, 255))}`,
    createdAt: isoMinutesAgo(Math.round(between(1, 20000))),
  };
});
