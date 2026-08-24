import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ImageIcon, X, Zap, ZapOff } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { useReportStore } from '@/store/reportStore';

/**
 * Dedicated camera screen (section 15). Produces a media file + metadata
 * only — no AI inference happens here (that's analyze.tsx, via the
 * IAIAnalysisService boundary).
 */
export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const setMedia = useReportStore((s) => s.setMedia);

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo) throw new Error('No photo returned');
      setMedia({ uri: photo.uri, type: 'image', width: photo.width, height: photo.height });
      router.push('/report/preview');
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
    setMedia({ uri: asset.uri, type: 'image', width: asset.width, height: asset.height });
    router.push('/report/preview');
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
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" flash={flash} onCameraReady={() => setCameraError(null)}>
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          <View style={styles.topBar}>
            <Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="Close camera">
              <X size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.topBarTitle}>Capture Road Hazard</Text>
            <Pressable style={styles.iconButton} onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))} accessibilityLabel="Toggle flash">
              {flash === 'off' ? <ZapOff size={20} color={colors.white} /> : <Zap size={20} color={colors.white} />}
            </Pressable>
          </View>

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
      </CameraView>
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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: { marginHorizontal: spacing.lg, backgroundColor: 'rgba(229,72,77,0.9)', borderRadius: 12, padding: spacing.sm },
  errorText: { ...typography.bodyMd, color: colors.white, textAlign: 'center' },
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
