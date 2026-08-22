/**
 * THE AI INTEGRATION BOUNDARY.
 *
 * Every screen in the report flow (report/analyze.tsx, report/result.tsx)
 * talks to AI analysis ONLY through this interface, obtained from
 * `getAIAnalysisService()` in ./index.ts. Swapping MockAIAnalysisService
 * for FutureYOLOAIAnalysisService later is a one-line change in that
 * factory — no screen, store, or navigation code changes (section 17/50).
 */
import type { AIAnalysisResult } from '@/types';

export interface IAIAnalysisService {
  /**
   * @param imageUri Local file URI of the captured/selected photo.
   * @returns The same `AIAnalysisResult` shape regardless of which
   *   implementation is active — see types/ai.ts for the full contract.
   */
  analyzeRoadImage(imageUri: string): Promise<AIAnalysisResult>;
}
