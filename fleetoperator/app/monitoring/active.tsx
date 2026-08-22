import { CameraView } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { DetectionOverlay } from '@/components/monitoring/DetectionOverlay';
import { MetricTile } from '@/components/monitoring/MetricTile';
import { SystemHealthStrip } from '@/components/monitoring/SystemHealthStrip';
import { DEMO_MODE, resolveMonitoringParams } from '@/constants/config';
import { monitoringPalette, spacing } from '@/constants/theme';
import { useDeviceHealth } from '@/features/deviceHealth/useDeviceHealth';
import { useInvalidateAfterSessionChange } from '@/features/session/useSession';
import { getAIInferenceService } from '@/services/ai';
import { locationService } from '@/services/location/locationService';
import { DetectionTracker, type FinalizedDetection } from '@/services/tracking/detectionTracker';
import { useAuthStore } from '@/store/authStore';
import { useMonitoringStore } from '@/store/monitoringStore';
import type { AIInferenceResult } from '@/types/ai';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_WIDTH * (4 / 3);

/**
 * §22 — THE most important screen. Dark, minimal, driving-oriented: large
 * camera preview, automatic AI overlay, three glanceable metrics, a
 * system-health strip, and exactly one interactive control (STOP). No
 * typing, no manual confirmation of a detection, no distracting chrome
 * (§04).
 */
export default function ActiveMonitoringScreen() {
  const operator = useAuthStore((s) => s.operator);
  const phase = useMonitoringStore((s) => s.phase);
  const distanceKm = useMonitoringStore((s) => s.distanceKm);
  const detectionCount = useMonitoringStore((s) => s.detectionCount);
  const validObservationCount = useMonitoringStore((s) => s.validObservationCount);
  const startedAt = useMonitoringStore((s) => s.startedAt);
  const deviceHealth = useMonitoringStore((s) => s.deviceHealth);
  const tickDistance = useMonitoringStore((s) => s.tickDistance);
  const recordDetection = useMonitoringStore((s) => s.recordDetection);
  const stop = useMonitoringStore((s) => s.stop);
  const reset = useMonitoringStore((s) => s.reset);
  const invalidateAfterSessionChange = useInvalidateAfterSessionChange();
  useDeviceHealth();

  const cameraRef = useRef<CameraView>(null);
  const initialParams = resolveMonitoringParams(null);
  const trackerRef = useRef(new DetectionTracker(initialParams.trackingConfirmCount, initialParams.trackingWindowMs));
  const [liveResult, setLiveResult] = useState<AIInferenceResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stopping, setStopping] = useState(false);
  // §speed-adaptive-detection — inference rate scales with GPS speed so a
  // pothole at highway speed still gets enough frames inside its brief
  // visibility window to confirm (see constants/config.ts's
  // `resolveMonitoringParams`). Only frameRateFps needs to be state (it
  // drives the tick interval below); confirmCount/windowMs are pushed into
  // the tracker directly since changing those doesn't require rebuilding
  // the interval.
  const [frameRateFps, setFrameRateFps] = useState(initialParams.frameRateFps);

  useEffect(() => {
    const unsubscribe = locationService.subscribe((fix) => {
      const params = resolveMonitoringParams(fix.speed);
      trackerRef.current.setParams(params.trackingConfirmCount, params.trackingWindowMs);
      setFrameRateFps((current) => (current === params.frameRateFps ? current : params.frameRateFps));
    });
    return unsubscribe;
  }, []);

  // §64 — never start monitoring on mount implicitly; this screen is only
  // ever pushed after `monitoringStore.start()` already succeeded from the
  // start-confirm screen, so by the time it renders the session is already
  // active. If somehow reached without an active session, bail to Home.
  useEffect(() => {
    if (phase !== 'active') {
      router.replace('/(tabs)/home');
    }
  }, [phase]);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    const interval = setInterval(() => tickDistance(), 1000);
    return () => clearInterval(interval);
  }, [tickDistance]);

  const runInferenceTick = useCallback(async () => {
    const service = getAIInferenceService();
    try {
      let frameUri = 'mock://frame';
      // Server inference needs a real frame; mock inference (the default
      // for this demo) doesn't read the file at all, so skip the camera
      // hardware hit entirely in that mode (§81 — don't do unnecessary
      // camera work).
      if (service.modelName !== 'MockAI' && cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.3, skipProcessing: true });
        if (photo) frameUri = photo.uri;
      }
      const result = await service.analyze({ uri: frameUri });
      setLiveResult(result.detected ? result : null);

      const finalized = trackerRef.current.feed(result);
      if (finalized) {
        await captureEvidenceAndRecord(finalized);
      }
    } catch {
      // A single failed inference tick is never fatal — the next tick
      // tries again (§47: AI degrades gracefully, evidence still queues).
    }
  }, []);

  const captureEvidenceAndRecord = useCallback(
    async (finalized: FinalizedDetection) => {
      let imageUri: string | null = null;
      try {
        const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5 });
        imageUri = photo?.uri ?? null;
      } catch {
        imageUri = null;
      }
      const fix = locationService.getLastFix();
      await recordDetection(finalized, imageUri, fix?.accuracy ?? null);
    },
    [recordDetection]
  );

  useEffect(() => {
    const tickMs = Math.max(66, Math.round(1000 / frameRateFps));
    const interval = setInterval(runInferenceTick, tickMs);
    return () => clearInterval(interval);
  }, [runInferenceTick, frameRateFps]);

  const handleStop = () => {
    Alert.alert('End monitoring?', `Distance: ${distanceKm.toFixed(1)} km\nDetections: ${detectionCount}`, [
      { text: 'Continue', style: 'cancel' },
      {
        text: 'End Monitoring',
        style: 'destructive',
        onPress: async () => {
          setStopping(true);
          try {
            const summary = await stop();
            invalidateAfterSessionChange();
            const sessionId = summary?.session.id;
            reset();
            if (sessionId) {
              router.replace(`/trip/${sessionId}`);
            } else {
              router.replace('/(tabs)/home');
            }
          } catch {
            setStopping(false);
          }
        },
      },
    ]);
  };

  if (phase !== 'active') return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE MONITORING</Text>
        <Text style={styles.vehicleText}>{operator?.vehicle?.registrationNumber}</Text>
      </View>

      <View style={styles.previewContainer}>
        <CameraView ref={cameraRef} style={styles.preview} facing="back" />
        <DetectionOverlay result={liveResult} previewWidth={SCREEN_WIDTH} previewHeight={PREVIEW_HEIGHT} />
        {DEMO_MODE && liveResult?.detected ? (
          <View style={styles.detectionBanner}>
            <Text style={styles.detectionBannerText}>
              POTHOLE DETECTED · {Math.round((liveResult.confidence ?? 0) * 100)}%
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metricsRow}>
        <MetricTile label="Distance" value={`${distanceKm.toFixed(1)} km`} />
        <MetricTile label="Detections" value={String(detectionCount)} />
        <MetricTile label="Time" value={formatElapsed(elapsedSeconds)} />
      </View>

      <View style={styles.footer}>
        <SystemHealthStrip health={deviceHealth} />
        <Pressable style={styles.stopButton} onPress={handleStop} disabled={stopping} accessibilityRole="button" accessibilityLabel="Stop monitoring">
          <Text style={styles.stopButtonText}>{stopping ? 'ENDING…' : 'STOP MONITORING'}</Text>
        </Pressable>
        <Text style={styles.validCount}>{validObservationCount} valid observations queued for sync</Text>
      </View>
    </View>
  );
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: monitoringPalette.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: monitoringPalette.detected },
  liveText: { color: monitoringPalette.text, fontWeight: '700', letterSpacing: 1, fontSize: 13 },
  vehicleText: { marginLeft: 'auto', color: monitoringPalette.textSecondary, fontWeight: '600' },
  previewContainer: { width: SCREEN_WIDTH, height: PREVIEW_HEIGHT, backgroundColor: '#000' },
  preview: { flex: 1 },
  detectionBanner: { position: 'absolute', top: spacing.md, alignSelf: 'center', backgroundColor: monitoringPalette.detected, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999 },
  detectionBannerText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  metricsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.md },
  footer: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  stopButton: { backgroundColor: monitoringPalette.detected, borderRadius: 20, paddingVertical: spacing.lg, alignItems: 'center' },
  stopButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 },
  validCount: { color: monitoringPalette.textSecondary, textAlign: 'center', fontSize: 12 },
});
