import { MockAIAnalysisService } from '../MockAIAnalysisService';
import { YOLOAIAnalysisService } from '../YOLOAIAnalysisService';

describe('AI provider factory', () => {
  it('returns a YOLOAIAnalysisService by default (AI_PROVIDER=yolov8)', () => {
    // constants/config.ts reads EXPO_PUBLIC_AI_PROVIDER, defaulting to
    // 'yolov8' when unset — every capture phase runs the real trained
    // pothole model unless a screen/test explicitly opts into the mock.
    const { getAIAnalysisService } = require('../index');
    const instance = getAIAnalysisService();
    expect(instance).toBeInstanceOf(YOLOAIAnalysisService);
  });

  it('returns a MockAIAnalysisService when EXPO_PUBLIC_AI_PROVIDER=mock', () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_AI_PROVIDER = 'mock';
    try {
      // Re-require both the factory and the class from this same reset
      // module registry — comparing against the top-level import's class
      // would fail `instanceof` even for a correct result, since
      // resetModules() gives each require its own module identity.
      const { getAIAnalysisService } = require('../index');
      const { MockAIAnalysisService: FreshMockAIAnalysisService } = require('../MockAIAnalysisService');
      const instance = getAIAnalysisService();
      expect(instance).toBeInstanceOf(FreshMockAIAnalysisService);
    } finally {
      delete process.env.EXPO_PUBLIC_AI_PROVIDER;
    }
  });
});
