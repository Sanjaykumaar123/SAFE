// Standalone Expo project for the SafePath AI Fleet Operator app — a
// separate codebase/repo from Citizen/Municipality on purpose (same
// pattern as ../municipality), talking to the same shared SafePath backend
// purely over HTTP. See DEFERRED.md: on-device YOLO needs Expo Prebuild /
// a custom development build (§07/94) — this config still declares the
// camera/location plugins that build would need, even though the app runs
// fine on a standard Expo dev client with server/mock inference today.
//
// §map-provider — maps run on MapLibre Native, not react-native-maps/
// Google Maps: Android's Google-backed MapView needs a billed Google Cloud
// API key just to initialize, MapLibre doesn't. No map screen exists here
// yet (DEFERRED.md), but the dependency/plugin is set up the same way as
// every sibling app for when one is built.

module.exports = {
  expo: {
    name: 'SafePath Fleet',
    slug: 'safepath-ai-fleet-operator',
    scheme: 'safepathfleet',
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
      bundleIdentifier: 'ai.safepath.fleetoperator',
      infoPlist: {
        NSCameraUsageDescription: 'SafePath Fleet uses your camera to automatically detect and document road conditions while you drive.',
        NSLocationWhenInUseUsageDescription: 'SafePath Fleet uses your location to accurately position the road conditions it detects.',
      },
    },
    android: {
      package: 'ai.safepath.fleetoperator',
      usesCleartextTraffic: true,
      adaptiveIcon: {
        backgroundColor: '#0B1F33',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // No ACCESS_BACKGROUND_LOCATION — monitoring only tracks while the app
      // is foregrounded (see DEFERRED.md); a real background service is a
      // native-build concern, not an Expo-managed one.
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
        'expo-camera',
        {
          cameraPermission: 'SafePath Fleet uses your camera to automatically detect and document road conditions while you drive.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'SafePath Fleet uses your location to accurately position the road conditions it detects.',
          isAndroidBackgroundLocationEnabled: false,
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
