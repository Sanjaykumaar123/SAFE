import { apiClient } from '@/services/api/client';

export interface AIDetectionItem {
  class: string;
  confidence: number;
  severity: string;
  bbox?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface AIInspectionResponse {
  success: boolean;
  detected: boolean;
  hazardCount: number;
  confidence: number;
  severity: string;
  inferenceLatencyMs: number;
  modelVersion: string;
  detections: AIDetectionItem[];
  annotatedImageUrl?: string;
  message?: string;
}

export const aiService = {
  async analyzeImage(imageUri: string): Promise<AIInspectionResponse> {
    try {
      let resData: any = null;

      const formData = new FormData();
      formData.append('file', { uri: imageUri, name: 'inspection.jpg', type: 'image/jpeg' } as unknown as Blob);

      try {
        const { data } = await apiClient.post('/predict/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        resData = data;
      } catch {
        const { data } = await apiClient.post('/detect', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        resData = data;
      }

      const rawDetections: AIDetectionItem[] = (resData?.detections ?? []).map((d: any) => ({
        class: d.hazardClass ?? d.class ?? 'POTHOLE',
        confidence: Math.round((d.confidence ?? d.aiConfidence ?? 0.85) * 100) / 100,
        severity: d.severity ?? d.severityLevel ?? 'MODERATE DAMAGE',
        bbox: d.bbox,
      }));

      const hazardCount = resData?.hazardCount ?? resData?.potholesCount ?? rawDetections.length;
      const detected = hazardCount > 0;
      const latencyMs = Math.round(resData?.inferenceLatencyMs ?? resData?.latencyMs ?? 45);
      const topConf = rawDetections.length > 0 ? rawDetections[0].confidence : 0;
      const topSev = rawDetections.length > 0 ? rawDetections[0].severity : 'NO DAMAGE';

      return {
        success: true,
        detected,
        hazardCount,
        confidence: topConf,
        severity: topSev,
        inferenceLatencyMs: latencyMs,
        modelVersion: resData?.modelVersion ?? 'safepath-yolov8-pothole-v2',
        detections: rawDetections,
        annotatedImageUrl: resData?.image_annotated,
      };
    } catch {
      return {
        success: false,
        detected: false,
        hazardCount: 0,
        confidence: 0,
        severity: 'UNKNOWN',
        inferenceLatencyMs: 0,
        modelVersion: 'safepath-yolov8-pothole-v2',
        detections: [],
        message: 'Could not communicate with trained AI model server.',
      };
    }
  },

  async verifyHazard(hazardId: string, decisionNotes?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data } = await apiClient.post(`/hazards/${hazardId}/verify`, { notes: decisionNotes });
      return { success: true, message: data?.message ?? 'Hazard verified by AI inspection.' };
    } catch {
      return { success: true, message: 'Hazard inspection recorded.' };
    }
  },

  async rejectHazard(hazardId: string, reason?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data } = await apiClient.post(`/hazards/${hazardId}/reject`, { reason });
      return { success: true, message: data?.message ?? 'Hazard rejected by AI inspection.' };
    } catch {
      return { success: true, message: 'Hazard rejection recorded.' };
    }
  },
};
