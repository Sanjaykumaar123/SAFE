import { AI_MODE } from '@/constants/config';
import { MockAIInferenceService } from './MockAIInferenceService';
import { OnDeviceYOLOInferenceService } from './OnDeviceYOLOInferenceService';
import { ServerYOLOInferenceService } from './ServerYOLOInferenceService';
import type { IAIInferenceService } from './IAIInferenceService';

let instance: IAIInferenceService | null = null;

/** The one place `EXPO_PUBLIC_AI_MODE` is read to pick an implementation
 * (§07). Everything else just calls `getAIInferenceService().analyze()`. */
export function getAIInferenceService(): IAIInferenceService {
  if (instance) return instance;
  switch (AI_MODE) {
    case 'server':
      instance = new ServerYOLOInferenceService();
      break;
    case 'ondevice':
      instance = new OnDeviceYOLOInferenceService();
      break;
    case 'mock':
    default:
      instance = new MockAIInferenceService();
      break;
  }
  return instance;
}

export type { IAIInferenceService };
