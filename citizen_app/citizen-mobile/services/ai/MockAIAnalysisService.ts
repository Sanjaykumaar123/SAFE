/**
 * Deterministic mock AI analysis (section 19/20) — the currently-active
 * implementation of IAIAnalysisService (AI_PROVIDER=mock).
 *
 * Deterministic on purpose: the same photo always produces the same
 * result, so QA/demo runs are repeatable rather than a dice roll. The
 * scenario is chosen from a stable hash of the image URI, never
 * `Math.random()`.
 *
 * Filename markers let a demo build force a specific outcome without
 * needing four different real photos — see FILE markers below. Anything
 * else is bucketed by hash, weighted like a real Chennai pothole dataset
 * would be: mostly detections, some clear roads, occasional low-confidence
 * and failure cases.
 */
import type { AIAnalysisResult, BoundingBox } from '@/types';
import type { IAIAnalysisService } from './IAIAnalysisService';

const MODEL_VERSION = 'mock-v1';
const NO_HAZARD_MESSAGE = 'No confident road hazard detected.';
const LOW_CONFIDENCE_MESSAGE = 'Possible hazard detected — please review the photo before submitting.';
const FAILED_MESSAGE = "We couldn't analyze this image. Please try again with a clearer, well-lit photo.";

/** Small stable string hash (djb2) — deterministic, no crypto needed. */
function stableHash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

function boundingBoxFor(seed: number): BoundingBox {
  const x = Math.min(0.15 + (seed % 40) / 100, 0.7);
  const y = Math.min(0.35 + (seed % 30) / 100, 0.7);
  const width = Math.min(0.2 + (seed % 20) / 100, 1 - x);
  const height = Math.min(0.15 + (seed % 18) / 100, 1 - y);
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  };
}

function severityForConfidence(confidence: number): AIAnalysisResult['severity'] {
  if (confidence >= 0.95) return 'CRITICAL';
  if (confidence >= 0.9) return 'HIGH';
  if (confidence >= 0.75) return 'MEDIUM';
  return 'LOW';
}

const ARTIFICIAL_DELAY_MS = 1400;

export class MockAIAnalysisService implements IAIAnalysisService {
  async analyzeRoadImage(imageUri: string): Promise<AIAnalysisResult> {
    // Simulate real processing latency so the analyze screen's progress
    // states (uploading/checking/analyzing/preparing) feel real — this is
    // still clearly a mock, never pretending a model is actually running.
    await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_DELAY_MS));

    const key = imageUri.toLowerCase();
    const seed = stableHash(imageUri);
    const processingTimeMs = 1200 + (seed % 900);

    if (/(demo-fail|corrupt|fail)/.test(key)) {
      return { detected: false, confidence: 0, processingTimeMs, modelVersion: MODEL_VERSION, message: FAILED_MESSAGE };
    }
    if (/(demo-clear|nohazard|clear)/.test(key)) {
      return {
        detected: false,
        confidence: Math.round((0.1 + (seed % 15) / 100) * 100) / 100,
        processingTimeMs,
        modelVersion: MODEL_VERSION,
        message: NO_HAZARD_MESSAGE,
      };
    }
    if (/(demo-lowconf|lowconf)/.test(key)) {
      const confidence = Math.round((0.45 + (seed % 20) / 100) * 100) / 100;
      return {
        detected: true,
        hazardType: 'POTHOLE',
        confidence,
        severity: 'LOW',
        boundingBox: boundingBoxFor(seed),
        processingTimeMs,
        modelVersion: MODEL_VERSION,
        message: LOW_CONFIDENCE_MESSAGE,
      };
    }
    if (/(demo-pothole|pothole)/.test(key)) {
      const confidence = Math.round((0.9 + (seed % 8) / 100) * 100) / 100;
      return {
        detected: true,
        hazardType: 'POTHOLE',
        confidence,
        severity: severityForConfidence(confidence),
        boundingBox: boundingBoxFor(seed),
        processingTimeMs,
        modelVersion: MODEL_VERSION,
      };
    }

    // No filename hint — deterministic bucket by hash.
    const bucket = seed % 100;
    if (bucket < 55) {
      const confidence = Math.round((0.75 + (seed % 22) / 100) * 100) / 100;
      return {
        detected: true,
        hazardType: 'POTHOLE',
        confidence,
        severity: severityForConfidence(confidence),
        boundingBox: boundingBoxFor(seed),
        processingTimeMs,
        modelVersion: MODEL_VERSION,
      };
    }
    if (bucket < 80) {
      return {
        detected: false,
        confidence: Math.round((0.05 + (seed % 15) / 100) * 100) / 100,
        processingTimeMs,
        modelVersion: MODEL_VERSION,
        message: NO_HAZARD_MESSAGE,
      };
    }
    if (bucket < 94) {
      const confidence = Math.round((0.45 + (seed % 20) / 100) * 100) / 100;
      return {
        detected: true,
        hazardType: 'POTHOLE',
        confidence,
        severity: 'LOW',
        boundingBox: boundingBoxFor(seed),
        processingTimeMs,
        modelVersion: MODEL_VERSION,
        message: LOW_CONFIDENCE_MESSAGE,
      };
    }
    return { detected: false, confidence: 0, processingTimeMs, modelVersion: MODEL_VERSION, message: FAILED_MESSAGE };
  }
}
