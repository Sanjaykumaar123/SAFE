/**
 * Seeded Chennai demo dataset (section 41/59) — shape-identical to real API
 * responses so DEMO_MODE=true can drive the whole app with zero backend.
 * Mirrors backend/api/scripts/seed.py's Chennai hazards for consistency
 * between a live-backend demo and an offline one.
 */
import type { AppNotification, Hazard, HomeResponse, ReportListItem } from '@/types';

export const DEMO_CITY = 'Chennai';
export const DEMO_USER_NAME = 'Arun';

const now = () => new Date().toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const DEMO_HAZARDS: Hazard[] = [
  {
    id: 'demo-pth-1029',
    type: 'POTHOLE',
    latitude: 12.9784,
    longitude: 80.2205,
    locationText: 'Velachery Main Road, near MRTS Station',
    roadName: 'Velachery Main Road',
    severity: 'HIGH',
    status: 'ACTIVE',
    aiConfidence: 0.94,
    imageUrl: null,
    description: 'Pothole cluster reported on Velachery Main Road.',
    distanceMeters: 800,
    verificationNote: 'Recently verified by SafePath road observations.',
    createdAt: minutesAgo(120),
    updatedAt: minutesAgo(15),
    lastObservedAt: minutesAgo(15),
  },
  {
    id: 'demo-pth-1030',
    type: 'FLOODING',
    latitude: 12.901,
    longitude: 80.2279,
    locationText: 'OMR Toll Plaza, Sholinganallur',
    roadName: 'OMR',
    severity: 'MEDIUM',
    status: 'VERIFIED',
    aiConfidence: 0.87,
    imageUrl: null,
    description: 'Waterlogging near the toll plaza.',
    distanceMeters: 2100,
    verificationNote: 'Confirmed by multiple recent road observations.',
    createdAt: minutesAgo(200),
    updatedAt: minutesAgo(40),
    lastObservedAt: minutesAgo(40),
  },
  {
    id: 'demo-pth-1031',
    type: 'POTHOLE',
    latitude: 13.01,
    longitude: 80.2121,
    locationText: 'GST Road, near Guindy Industrial Estate',
    roadName: 'GST Road',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    aiConfidence: 0.96,
    imageUrl: null,
    description: 'Deep pothole cluster reported on GST Road.',
    distanceMeters: 3400,
    verificationNote: 'Recently verified by SafePath road observations.',
    createdAt: minutesAgo(60),
    updatedAt: minutesAgo(5),
    lastObservedAt: minutesAgo(5),
  },
  {
    id: 'demo-pth-1032',
    type: 'ROAD_DAMAGE',
    latitude: 13.0604,
    longitude: 80.2496,
    locationText: 'Anna Salai, near Gemini Flyover',
    roadName: 'Anna Salai',
    severity: 'HIGH',
    status: 'UNDER_REVIEW',
    aiConfidence: 0.91,
    imageUrl: null,
    description: 'Road surface damage near Gemini Flyover.',
    distanceMeters: 5200,
    verificationNote: null,
    createdAt: minutesAgo(30),
    updatedAt: minutesAgo(30),
    lastObservedAt: minutesAgo(30),
  },
];

export const DEMO_HOME: HomeResponse = {
  greeting: 'Good Morning',
  userName: DEMO_USER_NAME,
  cityName: DEMO_CITY,
  stats: { nearbyCount: 12, criticalCount: 4, warningCount: 8 },
  nearbyHazards: DEMO_HAZARDS,
  mapMarkers: DEMO_HAZARDS,
};

export const DEMO_REPORTS: ReportListItem[] = [
  {
    id: 'demo-report-1',
    reportCode: 'PTH-1042',
    hazardType: 'POTHOLE',
    severity: 'HIGH',
    status: 'UNDER_REVIEW',
    locationText: 'Velachery Main Road, Chennai',
    createdAt: minutesAgo(600),
  },
];

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'demo-notif-1',
    type: 'CRITICAL_HAZARD',
    title: 'Critical hazard nearby',
    body: 'A critical pothole was detected 300m ahead on GST Road.',
    isRead: false,
    relatedHazardId: 'demo-pth-1031',
    relatedReportId: null,
    createdAt: minutesAgo(10),
  },
  {
    id: 'demo-notif-2',
    type: 'REPORT_UPDATE',
    title: 'Your report has been verified',
    body: 'Report PTH-1042 has been verified by SafePath.',
    isRead: false,
    relatedHazardId: null,
    relatedReportId: 'demo-report-1',
    createdAt: minutesAgo(180),
  },
  {
    id: 'demo-notif-3',
    type: 'SYSTEM',
    title: 'Welcome to SafePath AI',
    body: 'Thanks for helping make Chennai roads safer.',
    isRead: true,
    relatedHazardId: null,
    relatedReportId: null,
    createdAt: minutesAgo(1440),
  },
];

export { now as demoNow };
