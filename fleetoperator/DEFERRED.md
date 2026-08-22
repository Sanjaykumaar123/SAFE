# Deferred scope

This app covers the product spec's core demo loop (§90) end-to-end against
the real shared SafePath backend. The following were deliberately left out
of this pass — not dropped, just not yet built:

- **On-device YOLO** (`services/ai/OnDeviceYOLOInferenceService.ts`) — needs
  an Expo Prebuild / custom development build with a native TFLite or ONNX
  runtime module. The `IAIInferenceService` abstraction this app uses is
  already shaped for it (§07); only the native implementation is missing.
  `MockAIInferenceService` (default) and `ServerYOLOInferenceService`
  (`EXPO_PUBLIC_AI_MODE=server`, hits the shared backend's
  `/api/ai/analyze`) are both fully working today — and as of 2026-08-22
  that backend endpoint can run a real fine-tuned YOLO26n checkpoint
  (`AI_PROVIDER=yolov8` in the backend's `.env`) instead of the
  deterministic mock. **Read the accuracy caveat before relying on it**:
  measured mAP50 is 8.3%/recall 19.0% on a held-out test set — real
  inference, correctly wired, but not yet production-accurate. See
  `../citizen app/backend/api/app/services/ai/yolo_service.py`'s module
  docstring for the full numbers and what it'd take to improve.
- **Speed-adaptive inference/tracking is implemented** (see
  `constants/config.ts::resolveMonitoringParams` and
  `app/monitoring/active.tsx`) — inference FPS and the tracker's
  confirmation count/window scale up as GPS speed increases (up to 15fps
  above ~90km/h) so a pothole briefly in frame at highway speed still gets
  enough consecutive detections to confirm before it's behind the vehicle.
  The 8m "visibility window" the schedule is built around is a documented
  assumption, not something measured against a real road test — worth
  validating (and retuning the bucket table) against actual dashcam
  footage at speed once available.
- **Real push notifications** — `expo-notifications` token registration.
  The shared backend already has the infrastructure for this
  (`POST /api/notifications/device-tokens`), unused by every app in this
  ecosystem so far (citizen-mobile and municipality included); the
  Notifications screen here uses the same polling pattern they do.
- **Route/Coverage map screens** (§51/52) — `react-native-maps` is a
  dependency and the pattern to follow (`municipality/app/(tabs)/map.tsx`)
  is established, but no map screen is built yet.
- **Vehicle issue reporting** (§56) — both the app screen and
  `POST /api/fleet/issues` on the backend.
- **Performance charts/leaderboards** (§43).
- **Local storage-pressure UI** (§80) — the offline queue itself already
  never deletes unsynced evidence; there's no dedicated storage-management
  screen surfacing usage/cleanup controls.
- **Video-clip capture around a detection** — only the still frame that
  triggered the detection is kept as evidence.
