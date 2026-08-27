// §map-provider — maps run on MapLibre Native (constants/mapStyle.ts), not
// react-native-maps/Google Maps: Android's Google-backed MapView needs a
// billed Google Cloud API key just to initialize, MapLibre doesn't.

module.exports = {
  expo: {
    name: 'SafePath AI',
    slug: 'safepath-ai-citizen',
    scheme: 'safepathai',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    primaryColor: '#1769E0',
    backgroundColor: '#F7F9FC',
    androidStatusBar: {
      backgroundColor: '#0B1F33',
      barStyle: 'light-content',
    },
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0B1F33',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'ai.safepath.citizen',
      infoPlist: {
        NSCameraUsageDescription: 'SafePath uses your camera to capture photo evidence of road hazards you report.',
        NSLocationWhenInUseUsageDescription: 'SafePath uses your location to show nearby road hazards and place your reports accurately.',
        NSPhotoLibraryUsageDescription: 'SafePath lets you attach an existing photo when reporting a road hazard.',
      },
    },
    android: {
      package: 'ai.safepath.citizen',
      adaptiveIcon: {
        backgroundColor: '#0B1F33',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ['CAMERA', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'RECORD_AUDIO'],
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#0B1F33',
          image: './assets/icon.png',
          imageWidth: 140,
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'SafePath uses your camera to capture photo evidence of road hazards you report.',
          microphonePermission: 'SafePath uses your microphone to record optional video evidence of road hazards.',
          recordAudioAndroid: true,
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'SafePath uses your location to show nearby road hazards and place your reports accurately.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'SafePath lets you attach an existing photo when reporting a road hazard.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#1769E0',
        },
      ],
      '@maplibre/maplibre-react-native',
    ],
    extra: {
      router: {},
      eas: {
        projectId: '3869e547-d14b-49c3-a005-876acd62240f',
      },
    },
  },
};
