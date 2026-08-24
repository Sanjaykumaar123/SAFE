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
import { apiClient } from '@/services/api/client';
import type { AIAnalysisResult } from '@/types';
import type { IAIAnalysisService } from './IAIAnalysisService';

export class YOLOAIAnalysisService implements IAIAnalysisService {
  async analyzeRoadImage(imageUri: string): Promise<AIAnalysisResult> {
    const formData = new FormData();
    formData.append('image', { uri: imageUri, name: 'capture.jpg', type: 'image/jpeg' } as unknown as Blob);

    const { data } = await apiClient.post<AIAnalysisResult>('/ai/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
}
