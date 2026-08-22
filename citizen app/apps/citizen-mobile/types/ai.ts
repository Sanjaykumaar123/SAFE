import type { HazardTypeType } from '@/constants/hazardType';
import type { SeverityType } from '@/constants/severity';

/**
 * THE AI result contract (section 18/51). Mock and future YOLOv8 services
 * both return exactly this shape — see services/ai/IAIAnalysisService.ts.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIAnalysisResult {
  detected: boolean;
  hazardType?: HazardTypeType;
  confidence: number;
  severity?: SeverityType;
  boundingBox?: BoundingBox;
  processingTimeMs: number;
  modelVersion: string;
  message?: string;
}
