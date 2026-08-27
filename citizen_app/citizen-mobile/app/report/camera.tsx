import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ImageIcon, X, Zap, ZapOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { BoundingBoxOverlay } from '@/components/report/BoundingBoxOverlay';
import { colors, spacing, typography } from '@/constants/theme';
import { getAIAnalysisService } from '@/services/ai';
import { useReportStore } from '@/store/reportStore';
import type { BoundingBox } from '@/types';

/** Pulsing scan-line shown over the frozen captured frame while the AI call
 * is in flight, so the frame itself reads as "being analyzed" instead of a
 * plain photo sitting behind a text banner. */
function ScanningOverlay({ frameHeight }: { frameHeight: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  if (frameHeight <= 0) return null;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, frameHeight] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={scanStyles.frameBorder} />
      <Animated.View style={[scanStyles.line, { transform: [{ translateY }] }]} />
    </View>
  );
}

const scanStyles = StyleSheet.create({
  frameBorder: { position: 'absolute', left: 24, right: 24, top: 90, bottom: 160, borderWidth: 2, borderColor: 'rgba(0,112,235,0.6)', borderRadius: 12 },
  line: { position: 'absolute', left: 24, right: 24, height: 2, backgroundColor: '#0070EB', shadowColor: '#0070EB', shadowOpacity: 0.9, shadowRadius: 6 },
});

/**
 * Clean, stable camera capture screen with zero preview stuttering.
 */
export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  // Frozen captured frame shown in place of the live feed while the AI call
  // is in flight — this is what carries the scan/bounding overlay below.
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [resultBoxes, setResultBoxes] = useState<BoundingBox[] | null>(null);
  const [frameHeight, setFrameHeight] = useState(0);

  const cameraRef = useRef<CameraView>(null);
  const setMedia = useReportStore((s) => s.setMedia);
  const setAiResult = useReportStore((s) => s.setAiResult);

  const onCameraReady = useCallback(() => {
    // Stable callback preventing hardware camera re-initialization
  }, []);

  const onFrameLayout = useCallback((e: LayoutChangeEvent) => {
    setFrameHeight(e.nativeEvent.layout.height);
  }, []);

  async function processImageWithAI(photoUri: string, width?: number, height?: number) {
    setCameraError(null);
    setResultBoxes(null);
    setCapturedUri(photoUri); // freeze the frame — overlay renders on top of this, not the live feed
    setAiStatusMessage('AI Verifying Frame…');
    setMedia({ uri: photoUri, type: 'image', width, height });

    try {
      const aiService = getAIAnalysisService();
      const result = await aiService.analyzeRoadImage(photoUri);
      setAiResult(result);

      if (!result.detected) {
        setCameraError(result.message ?? '❌ SafePath AI Rejected: No road pothole detected in photo. Only verified potholes update the map.');
        setAiStatusMessage(null);
        setCapturedUri(null); // back to live feed so the user can retry immediately
        return false;
      }

      const boxes = result.boundingBoxes && result.boundingBoxes.length > 0 ? result.boundingBoxes : result.boundingBox ? [result.boundingBox] : null;
      setResultBoxes(boxes);
      setAiStatusMessage(`✅ SafePath AI Verified (${Math.round(result.confidence * 100)}% Conf) · Updating Admin & Municipality Maps`);
      setTimeout(() => {
        router.push('/report/preview');
      }, 550);
      return true;
    } catch {
      setCameraError('AI Analysis connection failed. Please try again.');
      setAiStatusMessage(null);
      setCapturedUri(null);
      return false;
    }
  }

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      // base64: false — the AI service reads the file itself (services/ai/YOLOAIAnalysisService.ts);
      // asking the native camera module to *also* base64-encode the JPEG here was pure wasted
      // capture-time latency since that output was never read.
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false });
      if (!photo) throw new Error('No photo returned');
      await processImageWithAI(photo.uri, photo.width, photo.height);
    } catch {
      setCameraError("Couldn't capture a photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  }

  async function handlePickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await processImageWithAI(asset.uri, asset.width, asset.height);
  }

  if (!permission) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, styles.permissionContainer]}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>Camera access lets you capture road evidence.</Text>
        <Button label="Allow Camera" onPress={requestPermission} />
        <Button label="Choose from Gallery Instead" onPress={handlePickFromGallery} variant="ghost" />
        <Button label="Cancel" onPress={() => router.back()} variant="ghost" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {capturedUri ? (
        <View style={StyleSheet.absoluteFill} onLayout={onFrameLayout}>
          <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {resultBoxes ? <BoundingBoxOverlay boxes={resultBoxes} /> : <ScanningOverlay frameHeight={frameHeight} />}
        </View>
      ) : (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" flash={flash} onCameraReady={onCameraReady} />
      )}

      {/* Absolute overlay container positioned ON TOP of CameraView sibling */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="Close camera">
            <X size={22} color={colors.white} />
          </Pressable>
          
          <View style={styles.liveScanningPill}>
            <View style={styles.liveBlueDot} />
            <Text style={styles.liveScanningText}>AI ROAD CAMERA ONLINE</Text>
          </View>

          <Pressable style={styles.iconButton} onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))} accessibilityLabel="Toggle flash">
            {flash === 'off' ? <ZapOff size={20} color={colors.white} /> : <Zap size={20} color={colors.white} />}
          </Pressable>
        </View>

        {aiStatusMessage ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{aiStatusMessage}</Text>
          </View>
        ) : null}

        {cameraError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{cameraError}</Text>
          </View>
        ) : null}

        <View style={styles.bottomBar}>
          <Pressable style={styles.galleryButton} onPress={handlePickFromGallery} accessibilityLabel="Choose from gallery">
            <ImageIcon size={24} color={colors.white} />
          </Pressable>
          <Pressable
            style={[styles.captureButton, isCapturing && styles.captureButtonBusy]}
            onPress={handleCapture}
            disabled={isCapturing}
            accessibilityLabel="Capture photo"
            accessibilityRole="button"
          >
            <View style={styles.captureButtonInner} />
          </Pressable>
          <View style={styles.galleryButton} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNavy },
  permissionContainer: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  permissionTitle: { ...typography.headlineLg, color: colors.white, textAlign: 'center' },
  permissionBody: { ...typography.bodyLg, color: colors.white, opacity: 0.85, textAlign: 'center', marginBottom: spacing.md },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  topBarTitle: { ...typography.labelMd, color: colors.white },
  liveDetectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  liveGreenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' },
  liveDetectedText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  liveScanningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(11, 31, 51, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  liveBlueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0070EB' },
  liveScanningText: { color: '#ffffff', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBanner: { marginHorizontal: spacing.lg, backgroundColor: 'rgba(0,153,59,0.92)', borderRadius: 12, padding: spacing.sm, marginBottom: 8 },
  successText: { ...typography.bodyMd, fontWeight: '700', color: colors.white, textAlign: 'center' },
  errorBanner: { marginHorizontal: spacing.lg, backgroundColor: 'rgba(229,72,77,0.92)', borderRadius: 12, padding: spacing.sm, marginBottom: 8 },
  errorText: { ...typography.bodyMd, fontWeight: '700', color: colors.white, textAlign: 'center' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  galleryButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  captureButtonBusy: { opacity: 0.6 },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.white },
});
