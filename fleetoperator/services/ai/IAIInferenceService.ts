/**
 * §07/08 — the abstraction the rest of the app codes against. Nothing
 * outside `services/ai/` knows or cares whether a result came from
 * `MockAIInferenceService`, `ServerYOLOInferenceService`, or (once built,
 * see DEFERRED.md) `OnDeviceYOLOInferenceService` — they all return the
 * same `AIInferenceResult` shape.
 */
import type { AIInferenceResult, FrameMeta } from '@/types/ai';

export interface IAIInferenceService {
  readonly modelName: string;
  readonly modelVersion: string;
  analyze(frame: FrameMeta): Promise<AIInferenceResult>;
}
