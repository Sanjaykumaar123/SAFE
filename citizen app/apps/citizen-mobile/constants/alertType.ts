export const AlertType = {
  NEARBY_HAZARD: 'NEARBY_HAZARD',
  REPORT_UPDATE: 'REPORT_UPDATE',
  ROAD_RESOLVED: 'ROAD_RESOLVED',
  CRITICAL_HAZARD: 'CRITICAL_HAZARD',
  SYSTEM: 'SYSTEM',
} as const;

export type AlertTypeType = (typeof AlertType)[keyof typeof AlertType];

export const ALERT_TYPE_LABELS: Record<AlertTypeType, string> = {
  NEARBY_HAZARD: 'Nearby Hazard',
  REPORT_UPDATE: 'Report Update',
  ROAD_RESOLVED: 'Road Resolved',
  CRITICAL_HAZARD: 'Critical Hazard',
  SYSTEM: 'System',
};
