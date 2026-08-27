export const HazardType = {
  POTHOLE: 'POTHOLE',
  ROAD_DAMAGE: 'ROAD_DAMAGE',
  FLOODING: 'FLOODING',
  DEBRIS: 'DEBRIS',
  BROKEN_PAVEMENT: 'BROKEN_PAVEMENT',
  OTHER: 'OTHER',
} as const;

export type HazardTypeType = (typeof HazardType)[keyof typeof HazardType];

export const HAZARD_TYPE_LABELS: Record<HazardTypeType, string> = {
  POTHOLE: 'Pothole',
  ROAD_DAMAGE: 'Road Damage',
  FLOODING: 'Flooding',
  DEBRIS: 'Debris',
  BROKEN_PAVEMENT: 'Broken Pavement',
  OTHER: 'Other',
};

export const HAZARD_TYPE_OPTIONS: { value: HazardTypeType; label: string }[] = Object.entries(HAZARD_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as HazardTypeType, label })
);
