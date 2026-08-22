/** DEMO_MODE fallback fixtures — used only when a real API call fails with
 * a network error (see services/api/*Api.ts's `isNetworkErr` pattern),
 * same convention every other SafePath app follows. */
import type { CollectionSession, EarningsSummary, FleetMeResponse, FleetOperator, PaymentListResponse, SessionListResponse, TodayRoute } from '@/types/fleet';

export const DEMO_OPERATOR: FleetOperator = {
  id: '8d4d7217-8737-465a-945f-c6b88320e972',
  fullName: 'Karthik Selvam',
  email: 'operator@fleet.safepath.ai',
  role: 'FLEET_OPERATOR',
  operatorCode: 'OP-0042',
  operatorRole: 'DRIVER',
  cityId: '59fd1a9b-7f0e-4090-82ea-5372a471af10',
  cityName: 'Chennai',
  zoneName: 'Chennai South',
  vehicle: {
    id: '31fce860-ec5a-4f98-9f5d-6d694ffc6315',
    registrationNumber: 'TN 38 AB 1234',
    status: 'ACTIVE',
    vehicleType: 'SEDAN',
  },
  permissions: ['SUBMIT_OBSERVATION', 'VIEW_EARNINGS'],
};

export const DEMO_ME_RESPONSE: FleetMeResponse = {
  operator: DEMO_OPERATOR,
  todayTarget: {
    targetKm: 40,
    completedKm: 18.6,
    priorityZone: 'Chennai South',
    recommendedRoads: ['Velachery Main Road', 'OMR', 'GST Road'],
  },
};

export const DEMO_TODAY_ROUTE: TodayRoute = {
  routeName: 'Velachery Main Road → OMR → GST Road',
  zoneName: 'Chennai South',
  targetKm: 40,
  priority: 'MEDIUM',
  roadSegments: ['Velachery Main Road', 'OMR', 'GST Road'],
};

export const DEMO_EARNINGS: EarningsSummary = {
  today: 320,
  thisWeek: 2840,
  thisMonth: 11240,
  breakdownToday: { coverageAmount: 220, observationAmount: 40, qualityBonusAmount: 20, totalAmount: 320 },
};

export const DEMO_SESSION_HISTORY: SessionListResponse = {
  items: [
    {
      id: 'demo-session-1',
      status: 'VALIDATED',
      vehicleId: DEMO_OPERATOR.vehicle!.id,
      cityId: DEMO_OPERATOR.cityId,
      zoneName: 'Chennai South',
      startTime: new Date(Date.now() - 86400000).toISOString(),
      endTime: new Date(Date.now() - 86400000 + 2 * 3600000).toISOString(),
      reportedDistanceKm: 42.8,
      validatedDistanceKm: 42.8,
      observationCount: 21,
      validObservationCount: 19,
      dataQualityScore: 94,
    },
  ],
  total: 1,
};

export const DEMO_PAYMENTS: PaymentListResponse = {
  items: [
    { id: 'demo-payment-1', sessionId: 'demo-session-1', status: 'APPROVED', totalAmount: 548, computedAt: new Date(Date.now() - 86400000).toISOString(), paidAt: null },
  ],
  total: 1,
};

export function demoCollectionSession(overrides: Partial<CollectionSession> = {}): CollectionSession {
  return {
    id: 'demo-session-active',
    status: 'ACTIVE',
    vehicleId: DEMO_OPERATOR.vehicle!.id,
    cityId: DEMO_OPERATOR.cityId,
    zoneName: 'Chennai South',
    startTime: new Date().toISOString(),
    endTime: null,
    reportedDistanceKm: 0,
    validatedDistanceKm: null,
    observationCount: 0,
    validObservationCount: 0,
    dataQualityScore: null,
    ...overrides,
  };
}
