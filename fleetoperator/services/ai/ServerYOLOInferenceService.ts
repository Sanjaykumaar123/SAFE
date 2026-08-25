import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from '@/services/api/client';
import type { IAIInferenceService } from './IAIInferenceService';
import type { AIInferenceResult, BoundingBox, FrameMeta } from '@/types/ai';

interface RawDetection {
  confidence?: number;
  aiConfidence?: number;
  bbox?: { x1: number; y1: number; x2: number; y2: number } | [number, number, number, number];
  normalized_bbox?: BoundingBox;
}

interface DirectDetectResponse {
  detected?: boolean;
  confidence?: number;
  severity?: string;
  bounding_box?: BoundingBox;
  detections?: RawDetection[];
  inferenceLatencyMs?: number;
  inferenceTimeMs?: number;
  roadScene?: boolean;
  modelVersion?: string;
  hazardCount?: number;
  boxes?: Array<{ bbox: [number, number, number, number]; confidence: number }>;
}

export class ServerYOLOInferenceService implements IAIInferenceService {
  readonly modelName = 'YOLOv8-Final';
  readonly modelVersion: string;

  constructor(modelVersion = 'pothole_v2_final.pt') {
    this.modelVersion = modelVersion;
  }

  async analyze(frame: FrameMeta): Promise<AIInferenceResult> {
    const frameTimestamp = new Date().toISOString();

    try {
      let base64Image = '';

      if (frame.uri.startsWith('data:image')) {
        base64Image = frame.uri;
      } else if (frame.uri && !frame.uri.startsWith('camera-frame')) {
        try {
          base64Image = await FileSystem.readAsStringAsync(frame.uri, { encoding: 'base64' });
        } catch {
          base64Image = '';
        }
      }

      let resData: DirectDetectResponse | null = null;

      if (base64Image) {
        const aiServerUrl = process.env.EXPO_PUBLIC_AI_SERVER_URL || 'https://safepath-ai-latest.onrender.com';
        const endpoints = [
          () => apiClient.post<DirectDetectResponse>('/detect', { imageBase64: base64Image, confidenceThreshold: 0.20 }, { timeout: 3500 }),
          () => apiClient.post<DirectDetectResponse>('/ai/detect', { imageBase64: base64Image, confidenceThreshold: 0.20 }, { timeout: 3500 }),
          () => axios.post<DirectDetectResponse>(`${aiServerUrl}/detect`, { imageBase64: base64Image, confidenceThreshold: 0.20 }, { timeout: 3500 }),
          () => axios.post<DirectDetectResponse>(`${aiServerUrl}/predict`, { imageBase64: base64Image, confidenceThreshold: 0.20 }, { timeout: 3500 }),
          () => apiClient.post<DirectDetectResponse>('/v1/ai/detect', { imageBase64: base64Image, confidenceThreshold: 0.20 }, { timeout: 3500 }),
          () => apiClient.post<DirectDetectResponse>('/v1/ai/analyze', { imageBase64: base64Image }, { timeout: 3500 }),
        ];

        for (const callFn of endpoints) {
          try {
            const response = await callFn();
            if (response?.data) {
              resData = response.data;
              break;
            }
          } catch {
            // Try next endpoint
          }
        }
      }

      if (resData) {
        const rawDetections = resData.detections ?? [];
        const potholesCount = resData.hazardCount ?? rawDetections.length;
        const detected = resData.detected === true || potholesCount > 0;

        if (detected) {
          const topDet = rawDetections[0];
          const rawConf = resData.confidence ?? topDet?.confidence ?? topDet?.aiConfidence ?? 0.88;
          const confidence = Math.round(rawConf * 100) / 100;
          const rawSev = resData.severity ?? (rawConf > 0.75 ? 'CRITICAL' : 'MEDIUM');
          const sev = rawSev === 'HIGH' ? 'CRITICAL' : rawSev;

          const boundingBoxes: BoundingBox[] = [];
          if (resData.bounding_box) {
            boundingBoxes.push(resData.bounding_box);
          }
          for (const det of rawDetections) {
            if (det.normalized_bbox) {
              boundingBoxes.push(det.normalized_bbox);
              continue;
            }
            const bx: any = det.bbox;
            if (bx) {
              let x1 = 0.25, y1 = 0.35, x2 = 0.75, y2 = 0.80;
              if (Array.isArray(bx)) {
                x1 = Number(bx[0]) || 0.25;
                y1 = Number(bx[1]) || 0.35;
                x2 = Number(bx[2]) || 0.75;
                y2 = Number(bx[3]) || 0.80;
              } else if (typeof bx === 'object') {
                x1 = Number(bx.x1) || 0.25;
                y1 = Number(bx.y1) || 0.35;
                x2 = Number(bx.x2) || 0.75;
                y2 = Number(bx.y2) || 0.80;
              }
              if (x1 > 1) { x1 /= 640.0; y1 /= 640.0; x2 /= 640.0; y2 /= 640.0; }
              x1 = Math.max(0.02, Math.min(0.82, x1));
              y1 = Math.max(0.02, Math.min(0.82, y1));
              const width = Math.max(0.18, Math.min(1.0 - x1, x2 - x1));
              const height = Math.max(0.12, Math.min(1.0 - y1, y2 - y1));

              boundingBoxes.push({ x: x1, y: y1, width, height });
            }
          }

          const topBox = boundingBoxes[0] ?? { x: 0.28, y: 0.38, width: 0.44, height: 0.32 };

          return {
            detected: true,
            hazardType: 'POTHOLE',
            confidence,
            severity: sev as any,
            boundingBox: topBox,
            frameTimestamp,
            modelName: this.modelName,
            modelVersion: this.modelVersion,
          };
        }
      }

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
    } catch {
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
}
