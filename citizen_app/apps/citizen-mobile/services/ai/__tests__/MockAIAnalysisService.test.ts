import { MockAIAnalysisService } from '../MockAIAnalysisService';

describe('MockAIAnalysisService', () => {
  const service = new MockAIAnalysisService();

  it('is deterministic for the same image URI (section 19: not random every time)', async () => {
    const first = await service.analyzeRoadImage('file:///photo-123.jpg');
    const second = await service.analyzeRoadImage('file:///photo-123.jpg');
    expect(first).toEqual(second);
  });

  it('returns a confident pothole detection for a demo-pothole filename', async () => {
    const result = await service.analyzeRoadImage('file:///demo-pothole.jpg');
    expect(result.detected).toBe(true);
    expect(result.hazardType).toBe('POTHOLE');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.boundingBox).toBeDefined();
    expect(result.modelVersion).toBe('mock-v1');
  });

  it('returns "no hazard" for a demo-clear filename', async () => {
    const result = await service.analyzeRoadImage('file:///demo-clear.jpg');
    expect(result.detected).toBe(false);
    expect(result.message).toBe('No confident road hazard detected.');
  });

  it('returns a low-confidence result for a demo-lowconf filename', async () => {
    const result = await service.analyzeRoadImage('file:///demo-lowconf.jpg');
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeLessThan(0.7);
  });

  it('returns a failed analysis for a demo-fail filename', async () => {
    const result = await service.analyzeRoadImage('file:///demo-fail.jpg');
    expect(result.detected).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.message).toMatch(/couldn't analyze/i);
  });

  it('always returns a bounding box within the normalized 0..1 range when detected', async () => {
    const result = await service.analyzeRoadImage('file:///demo-pothole-2.jpg');
    if (result.detected && result.boundingBox) {
      const { x, y, width, height } = result.boundingBox;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(1.01);
      expect(y + height).toBeLessThanOrEqual(1.01);
    }
  });
});
