import { MockAIAnalysisService } from '../MockAIAnalysisService';

describe('AI provider factory', () => {
  it('returns a MockAIAnalysisService by default (AI_PROVIDER=mock)', () => {
    // constants/config.ts reads EXPO_PUBLIC_AI_PROVIDER, defaulting to 'mock'
    // when unset — which is the case in this test environment.
    const { getAIAnalysisService } = require('../index');
    const instance = getAIAnalysisService();
    expect(instance).toBeInstanceOf(MockAIAnalysisService);
  });
});
