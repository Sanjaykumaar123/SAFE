// Standalone Expo project for the SafePath AI Municipality app — a
// separate codebase/repo from the Citizen app on purpose (see README.md),
// talking to the same shared SafePath backend purely over HTTP.
//
// §map-provider — maps run on MapLibre Native (constants/mapStyle.ts), not
// react-native-maps/Google Maps: Android's Google-backed MapView needs a
// billed Google Cloud API key just to initialize, MapLibre doesn't.

module.exports = {
  expo: {
    name: 'SafePath Municipality',
    slug: 'safepath-ai-municipality',
    scheme: 'safepathmunicipality',
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
      bundleIdentifier: 'ai.safepath.municipality',
      infoPlist: {
        NSCameraUsageDescription: 'SafePath Municipality uses your camera to capture repair progress photos.',
        NSLocationWhenInUseUsageDescription: 'SafePath Municipality uses your location to tag inspection and repair evidence accurately.',
        NSPhotoLibraryUsageDescription: 'SafePath Municipality lets you attach a photo when logging repair progress.',
      },
    },
    android: {
      package: 'ai.safepath.municipality',
      adaptiveIcon: {
        backgroundColor: '#0B1F33',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ['CAMERA', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
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
        'expo-location',
        {
          locationWhenInUsePermission: 'SafePath Municipality uses your location to tag inspection and repair evidence accurately.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'SafePath Municipality lets you attach a photo when logging repair progress.',
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
      'expo-dev-client',
    ],
    extra: {
      router: {},
    },
  },
};
