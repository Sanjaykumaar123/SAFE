/**
 * `EXPO_PUBLIC_AI_MODE=server` — real inference, no on-device model needed.
 * Posts the captured frame to the shared backend's existing
 * `POST /api/ai/analyze` (§07 "Mode A: development/server inference") and
 * adapts its `AIAnalysisResult` response into this app's stable
 * `AIInferenceResult` contract (§08). Useful during development or on a
 * device that can't run on-device inference yet — not the final fleet
 * deployment target (that's on-device, see DEFERRED.md), but fully
 * functional today.
 */
import { apiClient } from '@/services/api/client';
import type { IAIInferenceService } from './IAIInferenceService';
import type { AIInferenceResult, FrameMeta } from '@/types/ai';

interface AIAnalyzeResponse {
  detected: boolean;
  hazardType: string | null;
  confidence: number;
  severity: string | null;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  processingTimeMs: number;
  modelVersion: string;
  message: string | null;
}

export class ServerYOLOInferenceService implements IAIInferenceService {
  readonly modelName = 'YOLO26n';
  readonly modelVersion: string;

  constructor(modelVersion = 'safepath-pothole-server-v1') {
    this.modelVersion = modelVersion;
  }

  async analyze(frame: FrameMeta): Promise<AIInferenceResult> {
    const frameTimestamp = new Date().toISOString();
    const formData = new FormData();
    formData.append('image', { uri: frame.uri, name: 'frame.jpg', type: 'image/jpeg' } as unknown as Blob);

    const { data } = await apiClient.post<AIAnalyzeResponse>('/ai/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return {
      detected: data.detected,
      hazardType: (data.hazardType as AIInferenceResult['hazardType']) ?? null,
      confidence: data.confidence,
      severity: (data.severity as AIInferenceResult['severity']) ?? null,
      boundingBox: data.boundingBox,
      frameTimestamp,
      modelName: this.modelName,
      modelVersion: data.modelVersion || this.modelVersion,
    };
  }
}
