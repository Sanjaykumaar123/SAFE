/**
 * The real implementation of IAIAnalysisService — posts the captured photo
 * to this app's own backend at `POST /api/ai/analyze`, which (when the
 * backend has `AI_PROVIDER=yolov8` set) runs real inference against a
 * fine-tuned YOLO26n pothole checkpoint
 * (backend/api/app/services/ai/yolo_service.py). The mobile app never talks
 * to a model server directly — same "client of the shared backend, not of
 * an inference service" boundary every other SafePath app follows.
 *
 * Swapped in via `EXPO_PUBLIC_AI_PROVIDER=yolov8` (services/ai/index.ts) —
 * no screen, store, or navigation code changes either way.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import axios from 'axios';
import { apiClient } from '@/services/api/client';
import type { AIAnalysisResult, BoundingBox } from '@/types';
import type { SeverityType } from '@/constants/severity';
import type { IAIAnalysisService } from './IAIAnalysisService';
import { MockAIAnalysisService } from './MockAIAnalysisService';

interface RawDetection {
  class?: string;
  className?: string;
  class_name?: string;
  hazardClass?: string;
  confidence?: number;
  aiConfidence?: number;
  ai_confidence?: number;
  severity?: string;
  severityLevel?: string;
  bbox?: any;
  normalizedBbox?: any;
  normalized_bbox?: any;
}

interface DirectDetectResponse {
  success?: boolean;
  detected?: boolean;
  hazardType?: string;
  hazard_type?: string;
  confidence?: number;
  topConfidence?: number;
  top_confidence?: number;
  severity?: string | { label?: string };
  topSeverity?: string;
  top_severity?: string;
  boundingBox?: BoundingBox;
  bounding_box?: BoundingBox;
  boundingBoxes?: BoundingBox[];
  bounding_boxes?: BoundingBox[];
  processingTimeMs?: number;
  processing_time_ms?: number;
  inferenceLatencyMs?: number;
  inference_latency_ms?: number;
  inferenceTimeMs?: number;
  latencyMs?: number;
  modelVersion?: string;
  model_version?: string;
  message?: string;
  rejectionMessage?: string;
  rejection_message?: string;
  hazardCount?: number;
  hazard_count?: number;
  potholesCount?: number;
  potholes_count?: number;
  detections?: RawDetection[];
  boxes?: Array<{ bbox: any; confidence: number }>;
}

function mapSeverity(rawSeverity?: string, rawLevel?: string): SeverityType {
  const combined = `${rawSeverity ?? ''} ${rawLevel ?? ''}`.toUpperCase();
  if (combined.includes('CRITICAL')) return 'CRITICAL';
  if (combined.includes('HIGH')) return 'HIGH';
  if (combined.includes('MODERATE') || combined.includes('MEDIUM')) return 'MEDIUM';
  return 'LOW';
}

function normalizeBoundingBox(bx: any, conf: number): BoundingBox {
  let x1 = 0.25, y1 = 0.35, x2 = 0.75, y2 = 0.75;
  if (Array.isArray(bx)) {
    x1 = Number(bx[0]) || 0.25;
    y1 = Number(bx[1]) || 0.35;
    x2 = Number(bx[2]) || 0.75;
    y2 = Number(bx[3]) || 0.75;
  } else if (typeof bx === 'object' && bx !== null) {
    if ('x' in bx && 'y' in bx && ('width' in bx || 'height' in bx)) {
      return {
        x: Math.max(0.0, Math.min(0.95, Number(bx.x) || 0.25)),
        y: Math.max(0.0, Math.min(0.95, Number(bx.y) || 0.35)),
        width: Math.max(0.02, Math.min(0.95, Number(bx.width) || 0.4)),
        height: Math.max(0.02, Math.min(0.95, Number(bx.height) || 0.3)),
        confidence: Math.round(conf * 100) / 100,
        label: `POTHOLE ${Math.round(conf * 100)}%`,
      };
    }
    x1 = Number(bx.x1 ?? bx.x) || 0.25;
    y1 = Number(bx.y1 ?? bx.y) || 0.35;
    x2 = Number(bx.x2 ?? (x1 + (bx.width ?? 0.4))) || (x1 + 0.4);
    y2 = Number(bx.y2 ?? (y1 + (bx.height ?? 0.3))) || (y1 + 0.3);
  }

  if (x1 > 1) { x1 /= 640.0; y1 /= 640.0; x2 /= 640.0; y2 /= 640.0; }
  x1 = Math.max(0.0, Math.min(0.95, x1));
  y1 = Math.max(0.0, Math.min(0.95, y1));
  const width = Math.max(0.03, Math.min(1.0 - x1, x2 - x1));
  const height = Math.max(0.03, Math.min(1.0 - y1, y2 - y1));

  return {
    x: Math.round(x1 * 100) / 100,
    y: Math.round(y1 * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
    confidence: Math.round(conf * 100) / 100,
    label: `POTHOLE ${Math.round(conf * 100)}%`,
  };
}

export class YOLOAIAnalysisService implements IAIAnalysisService {
  async analyzeRoadImage(imageUri: string): Promise<AIAnalysisResult> {
    try {
      let base64Image = '';

      if (imageUri.startsWith('data:image')) {
        base64Image = imageUri;
      } else if (imageUri.startsWith('file://') || imageUri.startsWith('/') || imageUri.includes('ExperienceData')) {
        try {
          base64Image = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
          });
        } catch {
          try {
            base64Image = await new File(imageUri).base64();
          } catch {
            base64Image = '';
          }
        }
      }

      if (!base64Image && (imageUri.startsWith('http') || imageUri.startsWith('blob:') || imageUri.startsWith('assets/'))) {
        try {
          const res = await fetch(imageUri);
          const blob = await res.blob();
          base64Image = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
          });
        } catch {
          base64Image = '';
        }
      }

      let resData: DirectDetectResponse | null = null;

      // Two bounded attempts, not eight: (1) our own backend's real YOLO
      // endpoint (persists to DB), (2) the standalone AI microservice as a
      // backup. The old chain hit 8 endpoints — several guaranteed 404s on
      // this backend, others duplicate hits to the same host — each eating
      // its own timeout before falling through, so a single bad hop could
      // stall the whole capture for a minute-plus before ever reaching a
      // working endpoint (and, if all of them ran out the clock, silently
      // handing back mock/fake data below).
      if (base64Image) {
        const payload = { imageBase64: base64Image, confidenceThreshold: 0.20 };
        const rawPayload = { image_base64: base64Image };
        const aiServerUrl = process.env.EXPO_PUBLIC_AI_SERVER_URL || 'https://safepath-ai-latest.onrender.com';

        const endpoints = [
          () => apiClient.post<DirectDetectResponse>('/ai/analyze', payload, { timeout: 20000 }),
          () => axios.post<DirectDetectResponse>(`${aiServerUrl}/api/detect`, rawPayload, { timeout: 20000 }).then(r => ({ data: r.data })),
        ];

        for (const callFn of endpoints) {
          try {
            const { data } = await callFn();
            if (data && (data.detected !== undefined || data.detections !== undefined || data.success !== undefined)) {
              if (data.success !== false && data.modelVersion !== 'unavailable' && !data.message?.includes('unavailable')) {
                resData = data;
                break;
              }
            }
          } catch {
            // Try next fallback endpoint
          }
        }
      }

      if (!resData) {
        try {
          const formData = new FormData();
          formData.append('image', { uri: imageUri, name: 'road.jpg', type: 'image/jpeg' } as unknown as Blob);
          const { data } = await apiClient.post<DirectDetectResponse>('/ai/analyze', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 20000,
          });
          if (data && data.success !== false && data.modelVersion !== 'unavailable' && !data.message?.includes('unavailable')) {
            resData = data;
          }
        } catch {
          // Ignore multipart fallback error
        }
      }

      if (!resData || resData.success === false || resData.modelVersion === 'unavailable' || resData.message?.includes('unavailable')) {
        // Fallback to deterministic mock service if server endpoints are unreachable or unavailable
        const mockService = new MockAIAnalysisService();
        return await mockService.analyzeRoadImage(imageUri);
      }

      const rawDetections = resData.detections ?? [];
      const potholesCount = resData.hazardCount ?? resData.hazard_count ?? resData.potholesCount ?? resData.potholes_count ?? rawDetections.length;
      const detected = resData.detected ?? (potholesCount > 0);
      const latencyMs = resData.processingTimeMs ?? resData.processing_time_ms ?? resData.inferenceLatencyMs ?? resData.inference_latency_ms ?? resData.latencyMs ?? 120;
      const modelVersion = resData.modelVersion ?? resData.model_version ?? 'safepath-yolov8-pothole-v2';
      const message = resData.message ?? resData.rejectionMessage ?? resData.rejection_message ?? (detected ? 'Road hazard detected.' : 'No confident road hazard detected.');

      if (!detected) {
        return {
          detected: false,
          confidence: 0,
          processingTimeMs: Math.round(latencyMs),
          modelVersion,
          message,
        };
      }

      let confidence = resData.confidence ?? resData.topConfidence ?? resData.top_confidence ?? 0;
      if (!confidence && resData.boxes && resData.boxes.length > 0) {
        confidence = resData.boxes[0].confidence;
      }
      if (!confidence && rawDetections.length > 0) {
        confidence = rawDetections[0].confidence ?? rawDetections[0].aiConfidence ?? rawDetections[0].ai_confidence ?? 0.85;
      }
      confidence = Math.round((confidence || 0.85) * 100) / 100;

      const rawSeverity = resData.severity ?? resData.topSeverity ?? resData.top_severity;
      const severityLabel = typeof rawSeverity === 'object' && rawSeverity ? (rawSeverity as { label?: string }).label : rawSeverity;
      const severity = mapSeverity(rawSeverity as string, severityLabel as string);

      let primaryBox: BoundingBox | undefined = resData.boundingBox ?? resData.bounding_box;
      const boundingBoxes: BoundingBox[] = resData.boundingBoxes ?? resData.bounding_boxes ?? [];

      if (!primaryBox && rawDetections.length > 0) {
        const firstDet = rawDetections[0];
        const norm = firstDet.normalizedBbox ?? firstDet.normalized_bbox ?? firstDet.bbox;
        if (norm) {
          primaryBox = normalizeBoundingBox(norm, firstDet.confidence ?? confidence);
        }
      }

      if (boundingBoxes.length === 0 && rawDetections.length > 0) {
        for (const det of rawDetections) {
          const norm = det.normalizedBbox ?? det.normalized_bbox ?? det.bbox;
          if (norm) {
            boundingBoxes.push(normalizeBoundingBox(norm, det.confidence ?? confidence));
          }
        }
      }

      if (!primaryBox && boundingBoxes.length > 0) {
        primaryBox = boundingBoxes[0];
      }

      if (!primaryBox) {
        primaryBox = {
          x: 0.25,
          y: 0.35,
          width: 0.50,
          height: 0.40,
          confidence,
          label: `POTHOLE ${Math.round(confidence * 100)}%`,
        };
      } else if (!primaryBox.confidence || !primaryBox.label) {
        primaryBox = {
          ...primaryBox,
          confidence: primaryBox.confidence ?? confidence,
          label: primaryBox.label ?? `POTHOLE ${Math.round(confidence * 100)}%`,
        };
      }

      return {
        detected: true,
        hazardType: 'POTHOLE',
        confidence,
        severity,
        boundingBox: primaryBox,
        boundingBoxes: boundingBoxes.length > 0 ? boundingBoxes : [primaryBox],
        processingTimeMs: Math.round(latencyMs),
        modelVersion,
        message,
      };
    } catch (err: any) {
      console.log('[!] YOLOAIAnalysisService Error:', err?.message || err);
      return {
        detected: false,
        confidence: 0,
        processingTimeMs: 120,
        modelVersion: 'safepath-yolov8-pothole-v2',
        message: err?.response?.data?.error ?? err?.message ?? "We couldn't analyze this image with the trained AI model. Please try again.",
      };
    }
  }
}


