import { useReportStore } from '../reportStore';

describe('reportStore', () => {
  beforeEach(() => {
    useReportStore.getState().reset();
  });

  it('starts with sensible defaults', () => {
    const state = useReportStore.getState();
    expect(state.media).toBeNull();
    expect(state.hazardType).toBe('POTHOLE');
    expect(state.severity).toBe('MEDIUM');
  });

  it('pre-fills hazardType/severity from a detected AI result (section 21/22 — one-tap confirm path)', () => {
    useReportStore.getState().setAiResult({
      detected: true,
      hazardType: 'FLOODING',
      confidence: 0.92,
      severity: 'CRITICAL',
      processingTimeMs: 1500,
      modelVersion: 'mock-v1',
    });
    const state = useReportStore.getState();
    expect(state.hazardType).toBe('FLOODING');
    expect(state.severity).toBe('CRITICAL');
    expect(state.aiResult?.confidence).toBe(0.92);
  });

  it('does not override hazardType/severity when the AI result has no detection', () => {
    useReportStore.getState().setHazardType('DEBRIS');
    useReportStore.getState().setAiResult({ detected: false, confidence: 0.1, processingTimeMs: 1200, modelVersion: 'mock-v1' });
    expect(useReportStore.getState().hazardType).toBe('DEBRIS');
  });

  it('reset() clears the draft back to defaults', () => {
    useReportStore.getState().setDescription('Deep pothole');
    useReportStore.getState().setMedia({ uri: 'file:///a.jpg', type: 'image' });
    useReportStore.getState().reset();
    const state = useReportStore.getState();
    expect(state.description).toBe('');
    expect(state.media).toBeNull();
  });
});
