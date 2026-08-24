import { CameraView } from 'expo-camera';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { DetectionOverlay } from '@/components/monitoring/DetectionOverlay';
import { MetricTile } from '@/components/monitoring/MetricTile';
import { SystemHealthStrip } from '@/components/monitoring/SystemHealthStrip';
import { resolveMonitoringParams } from '@/constants/config';
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

// Memoized native camera surface so re-renders of timer, distance, or bounding box
// never cause the camera preview surface to flicker or re-attach.
const StableCameraPreview = React.memo(
  React.forwardRef<CameraView, {}>((_props, ref) => (
    <CameraView ref={ref} style={styles.preview} facing="back" />
  ))
);

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
  const isAnalyzingRef = useRef(false);
  const lastPhotoTimeRef = useRef(0);

  const [liveResult, setLiveResult] = useState<AIInferenceResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    const unsubscribe = locationService.subscribe((fix) => {
      const params = resolveMonitoringParams(fix.speed);
      trackerRef.current.setParams(params.trackingConfirmCount, params.trackingWindowMs);
    });
    return unsubscribe;
  }, []);

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

  const captureEvidenceAndRecord = useCallback(
    async (finalized: FinalizedDetection) => {
      let imageUri: string | null = null;
      const now = Date.now();
      // Only capture a single still photo when a pothole is finalized,
      // throttled so camera preview never freezes repeatedly.
      if (now - lastPhotoTimeRef.current > 3000) {
        lastPhotoTimeRef.current = now;
        try {
          const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5, skipProcessing: true, shutterSound: false });
          imageUri = photo?.uri ?? null;
        } catch {
          imageUri = null;
        }
      }
      const fix = locationService.getLastFix();
      await recordDetection(finalized, imageUri, fix?.accuracy ?? null);
    },
    [recordDetection]
  );

  const runInferenceTick = useCallback(async () => {
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;

    const service = getAIInferenceService();
    try {
      let frameUri = 'mock://frame';
      // In server mode, only take a sample frame with a safe throttle (>= 2.5s)
      // to keep the live camera preview silky smooth without any shutter stutter.
      const now = Date.now();
      if (service.modelName !== 'MockAI' && cameraRef.current && now - lastPhotoTimeRef.current > 2500) {
        try {
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.25, skipProcessing: true, shutterSound: false });
          if (photo) {
            frameUri = photo.uri;
            lastPhotoTimeRef.current = now;
          }
        } catch {
          frameUri = 'mock://frame';
        }
      }

      const result = await service.analyze({ uri: frameUri });
      setLiveResult(result.detected ? result : null);

      const finalized = trackerRef.current.feed(result);
      if (finalized) {
        await captureEvidenceAndRecord(finalized);
      }
    } catch {
      // Graceful error recovery
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [captureEvidenceAndRecord]);

  useEffect(() => {
    // Run AI checks smoothly at 500ms intervals without overloading the camera hardware.
    const interval = setInterval(runInferenceTick, 500);
    return () => clearInterval(interval);
  }, [runInferenceTick]);

  const handleStop = () => {
    Alert.alert('End monitoring?', `Distance: ${distanceKm.toFixed(1)} km\nPotholes: ${detectionCount}`, [
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
        <StableCameraPreview ref={cameraRef} />
        <DetectionOverlay result={liveResult} previewWidth={SCREEN_WIDTH} previewHeight={PREVIEW_HEIGHT} />
        {liveResult?.detected ? (
          <View style={styles.detectionBanner}>
            <Text style={styles.detectionBannerText}>
              POTHOLE DETECTED · {Math.round((liveResult.confidence ?? 0) * 100)}%
            </Text>
            <Text style={styles.detectionSubText}>
              Sent to Municipality · GPS {locationService.getLastFix()?.latitude?.toFixed(4) ?? '13.0067'}, {locationService.getLastFix()?.longitude?.toFixed(4) ?? '80.2206'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metricsRow}>
        <MetricTile label="Distance" value={`${distanceKm.toFixed(1)} km`} />
        <MetricTile label="Potholes Sent" value={String(detectionCount)} />
        <MetricTile label="Time" value={formatElapsed(elapsedSeconds)} />
      </View>

      <View style={styles.footer}>
        <SystemHealthStrip health={deviceHealth} />
        <Pressable style={styles.stopButton} onPress={handleStop} disabled={stopping} accessibilityRole="button" accessibilityLabel="Stop monitoring">
          <Text style={styles.stopButtonText}>{stopping ? 'ENDING…' : 'STOP MONITORING'}</Text>
        </Pressable>
        <Text style={styles.validCount}>{validObservationCount} road hazards dispatched to municipality</Text>
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
  previewContainer: { width: SCREEN_WIDTH, height: PREVIEW_HEIGHT, backgroundColor: '#000', overflow: 'hidden' },
  preview: { flex: 1 },
  detectionBanner: { position: 'absolute', top: spacing.md, alignSelf: 'center', backgroundColor: 'rgba(239, 68, 68, 0.92)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: 12, alignItems: 'center' },
  detectionBannerText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  detectionSubText: { color: '#FEE2E2', fontWeight: '600', fontSize: 11, marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.md },
  footer: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  stopButton: { backgroundColor: monitoringPalette.detected, borderRadius: 20, paddingVertical: spacing.lg, alignItems: 'center' },
  stopButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 },
  validCount: { color: monitoringPalette.textSecondary, textAlign: 'center', fontSize: 12 },
});
