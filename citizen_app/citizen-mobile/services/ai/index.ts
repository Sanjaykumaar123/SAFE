/**
 * AI provider factory — the ONLY place code branches on AI_PROVIDER.
 * Screens/hooks import `getAIAnalysisService()`, never a concrete class.
 */
import { AI_PROVIDER } from '@/constants/config';
import type { IAIAnalysisService } from './IAIAnalysisService';
import { MockAIAnalysisService } from './MockAIAnalysisService';
import { YOLOAIAnalysisService } from './YOLOAIAnalysisService';

let instance: IAIAnalysisService | null = null;

export function getAIAnalysisService(): IAIAnalysisService {
  if (!instance) {
    instance = AI_PROVIDER === 'yolov8' ? new YOLOAIAnalysisService() : new MockAIAnalysisService();
  }
  return instance;
}

export type { IAIAnalysisService };
