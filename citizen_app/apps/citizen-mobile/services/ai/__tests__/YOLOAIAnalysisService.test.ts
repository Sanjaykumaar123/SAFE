/**
 * Regression coverage for the bugs that made on-device detection always
 * report "no hazard" (see YOLOAIAnalysisService.ts):
 *  1. expo-file-system's SDK 54+ main export dropped the old
 *     `readAsStringAsync`/`EncodingType` free functions from its default
 *     import — reading a captured photo as base64 must go through
 *     `expo-file-system/legacy` (or the class-based `File` API) instead.
 *  2. The `/api/predict/image` fallback response has no `detections[]`
 *     field, so gating "detected" on `detections.length` made every
 *     fallback-path result look like a miss even when the model found a
 *     pothole.
 *  3. The raw-axios fallback endpoints sent `image_base_64` (extra
 *     underscore) instead of the `image_base64` key the backend reads.
 */
const mockReadAsStringAsync = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...args),
}));

const mockFileBase64 = jest.fn();
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({ uri, base64: mockFileBase64 })),
}));

const mockPost = jest.fn();
jest.mock('@/services/api/client', () => ({
  apiClient: { post: (...args: unknown[]) => mockPost(...args) },
}));

const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({ post: (...args: unknown[]) => mockAxiosPost(...args) }));

import { YOLOAIAnalysisService } from '../YOLOAIAnalysisService';

describe('YOLOAIAnalysisService', () => {
  const service = new YOLOAIAnalysisService();

  beforeEach(() => {
    mockReadAsStringAsync.mockReset();
    mockFileBase64.mockReset();
    mockPost.mockReset();
    mockAxiosPost.mockReset();
  });

  it('reads the captured photo via expo-file-system/legacy and reports a real detection', async () => {
    mockReadAsStringAsync.mockResolvedValue('BASE64DATA');
    mockPost.mockResolvedValueOnce({
      data: { detections: [{ confidence: 0.91, bbox: { x1: 0.2, y1: 0.3, x2: 0.6, y2: 0.7 } }], hazardCount: 1 },
    });

    const result = await service.analyzeRoadImage('file:///captured/road.jpg');

    expect(mockReadAsStringAsync).toHaveBeenCalledWith('file:///captured/road.jpg', { encoding: 'base64' });
    expect(mockPost).toHaveBeenCalledWith('/detect', expect.objectContaining({ imageBase64: 'BASE64DATA' }));
    expect(result.detected).toBe(true);
    expect(result.confidence).toBe(0.91);
  });

  it('falls back to the multipart endpoint and still reports a detection when boxes/potholesCount are present but detections[] is absent', async () => {
    mockReadAsStringAsync.mockRejectedValue(new Error('not readable'));
    mockFileBase64.mockRejectedValue(new Error('not readable either'));
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        potholesCount: 2,
        severity: { label: 'CRITICAL DAMAGE' },
        boxes: [{ bbox: [10, 20, 30, 40], confidence: 0.87 }],
      },
    });

    const result = await service.analyzeRoadImage('file:///captured/road.jpg');

    expect(mockPost).toHaveBeenCalledWith('/api/predict/image', expect.any(FormData), expect.anything());
    expect(result.detected).toBe(true);
    expect(result.confidence).toBe(0.87);
    expect(result.severity).toBe('CRITICAL');
  });

  it('reports no hazard when the model genuinely finds nothing', async () => {
    mockReadAsStringAsync.mockResolvedValue('BASE64DATA');
    mockPost.mockResolvedValueOnce({ data: { detections: [], hazardCount: 0, rejectionMessage: 'No confident road pothole detected.' } });

    const result = await service.analyzeRoadImage('file:///captured/clear-road.jpg');

    expect(result.detected).toBe(false);
    expect(result.message).toBe('No confident road pothole detected.');
  });

  it('sends the snake_case image_base64 key (not image_base_64) on the raw-axios fallback endpoints', async () => {
    mockReadAsStringAsync.mockResolvedValue('BASE64DATA');
    mockPost.mockRejectedValue(new Error('network down'));
    mockAxiosPost.mockResolvedValueOnce({ data: { detections: [{ confidence: 0.8, bbox: { x1: 0.1, y1: 0.1, x2: 0.5, y2: 0.5 } }], hazardCount: 1 } });

    const result = await service.analyzeRoadImage('file:///captured/road.jpg');

    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/api/detect'),
      { image_base64: 'BASE64DATA' },
      expect.anything()
    );
    expect(result.detected).toBe(true);
  });
});
