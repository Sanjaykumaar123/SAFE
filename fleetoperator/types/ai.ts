/**
 * §08 — the stable AI result contract. Nothing downstream of
 * `IAIInferenceService.analyze()` cares whether this came from mock,
 * on-device, or server inference (§07) — they all return exactly this
 * shape.
 */
import type { HazardTypeType, SeverityType } from '@/constants/enums';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIInferenceResult {
  detected: boolean;
  hazardType: HazardTypeType | null;
  confidence: number;
  severity: SeverityType | null;
  boundingBox: BoundingBox | null;
  frameTimestamp: string;
  modelName: string;
  modelVersion: string;
}

/** Metadata the inference service needs about the frame it's analyzing —
 * not part of the result contract itself, just the call's input. */
export interface FrameMeta {
  uri: string;
  width?: number;
  height?: number;
}
