import type { HazardStatusType } from '../../config/src/enums';
import type { HazardTypeType } from '../../config/src/enums';
import type { SeverityType } from '../../config/src/enums';

/** Mirrors backend `app/schemas/hazard.py::HazardOut` exactly — this is the
 * shared data contract documented in `docs/architecture.md`. */
export interface Hazard {
  id: string;
  type: HazardTypeType;
  latitude: number;
  longitude: number;
  locationText: string;
  roadName: string | null;
  severity: SeverityType;
  status: HazardStatusType;
  aiConfidence: number | null;
  imageUrl: string | null;
  description: string | null;
  distanceMeters: number | null;
  verificationNote: string | null;
  createdAt: string;
  updatedAt: string;
  lastObservedAt: string;
}

export interface HazardDetail extends Hazard {
  media: string[];
}

export interface HazardListResponse {
  items: Hazard[];
  total: number;
}
