/**
 * Default inference mode (`EXPO_PUBLIC_AI_MODE=mock`) — exercises the full
 * detection -> tracking -> observation -> queue -> sync pipeline in the
 * emulator without a real model. Deterministic-ish: detections cluster
 * around a small set of fixed "hotspot" offsets so the temporal tracker
 * (§10/26) actually gets repeated hits on the same simulated pothole
 * across consecutive frames instead of one-off noise, the same way a real
 * vehicle approaching a real pothole would.
 */
import type { IAIInferenceService } from './IAIInferenceService';
import type { AIInferenceResult, FrameMeta } from '@/types/ai';

const HOTSPOT_PERIOD_MS = 6000; // one simulated pothole "approach" every ~6s
const HOTSPOT_DURATION_MS = 2500; // how long the pothole stays "in view"

export class MockAIInferenceService implements IAIInferenceService {
  readonly modelName = 'MockAI';
  readonly modelVersion = 'mock-v1';

  async analyze(frame: FrameMeta): Promise<AIInferenceResult> {
    const now = Date.now();
    const phase = now % HOTSPOT_PERIOD_MS;
    const frameTimestamp = new Date(now).toISOString();

    if (phase > HOTSPOT_DURATION_MS) {
      return this.empty(frameTimestamp);
    }

    // Confidence rises then falls as the "vehicle" approaches then passes
    // the simulated pothole — mirrors a real approach's confidence curve
    // (§26's own example: 92% -> 94% -> 95% -> 93%).
    const progress = phase / HOTSPOT_DURATION_MS; // 0..1
    const curve = 1 - Math.abs(progress - 0.5) * 2; // peaks at progress=0.5
    const confidence = Math.round((0.55 + curve * 0.4) * 100) / 100;

    const width = 0.18 + curve * 0.12;
    const height = 0.14 + curve * 0.1;

    return {
      detected: true,
      hazardType: 'POTHOLE',
      confidence,
      severity: confidence > 0.85 ? 'HIGH' : confidence > 0.65 ? 'MEDIUM' : 'LOW',
      boundingBox: {
        x: 0.32 + (Math.sin(now / 900) * 0.02),
        y: 0.46 + (Math.cos(now / 700) * 0.02),
        width,
        height,
      },
      frameTimestamp,
      modelName: this.modelName,
      modelVersion: this.modelVersion,
    };
  }

  private empty(frameTimestamp: string): AIInferenceResult {
    return {
      detected: false,
      hazardType: null,
      confidence: 0,
      severity: null,
      boundingBox: null,
      frameTimestamp,
      modelName: this.modelName,
      modelVersion: this.modelVersion,
    };
  }
}
