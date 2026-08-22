/**
 * `EXPO_PUBLIC_AI_MODE=ondevice` — §07 "Mode B: final fleet deployment".
 * NOT IMPLEMENTED (see DEFERRED.md): real on-device YOLO26n inference needs
 * an Expo Prebuild / custom development build with a native TFLite or ONNX
 * runtime module, plus an actual trained pothole-detection model file —
 * neither exists in this repo. This class exists so the `IAIInferenceService`
 * abstraction and the `services/ai/index.ts` factory are already shaped
 * for it; wiring in a real model later means implementing `analyze()` here
 * and nothing else in the app needs to change.
 */
import type { IAIInferenceService } from './IAIInferenceService';
import type { AIInferenceResult, FrameMeta } from '@/types/ai';

export class OnDeviceYOLOInferenceService implements IAIInferenceService {
  readonly modelName = 'YOLO26n';
  readonly modelVersion = 'safepath-pothole-ondevice-v1';

  async analyze(_frame: FrameMeta): Promise<AIInferenceResult> {
    throw new Error(
      'On-device YOLO inference is not implemented in this build. It requires an Expo Prebuild / custom development ' +
        'build with a native TFLite or ONNX runtime module and a trained model file — see DEFERRED.md. ' +
        'Set EXPO_PUBLIC_AI_MODE=mock or EXPO_PUBLIC_AI_MODE=server instead.'
    );
  }
}
