// Standalone Expo project for the SafePath AI Central Admin app — a
// separate codebase/repo from Citizen/Municipality/Fleet on purpose (same
// pattern as its sibling apps), talking to the same shared SafePath
// backend purely over HTTP. It never opens a database connection and never
// talks to another SafePath mobile app directly (see README.md, §01/§77).
//
// §map-provider — maps run on MapLibre Native (constants/mapStyle.ts),
// not react-native-maps/Google Maps: Android's Google-backed MapView needs
// a billed Google Cloud API key just to initialize, MapLibre doesn't.
// EXPO_PUBLIC_MAP_KEY is unused here as a result — kept in .env.example
// only for anyone who later wants to layer in a paid provider.

module.exports = {
  expo: {
    name: 'SafePath Admin',
    slug: 'safepath-ai-admin',
    scheme: 'safepathadmin',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    primaryColor: '#0058BC',
    backgroundColor: '#F7F9FB',
    androidStatusBar: {
      backgroundColor: '#0D1C32',
      barStyle: 'light-content',
    },
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0D1C32',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'ai.safepath.admin',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'SafePath Admin uses your location to center the map and speed up nearby-place search.',
      },
    },
    android: {
      package: 'ai.safepath.admin',
      adaptiveIcon: {
        backgroundColor: '#0D1C32',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
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
          backgroundColor: '#0D1C32',
          image: './assets/icon.png',
          imageWidth: 140,
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'SafePath Admin uses your location to center the map and speed up nearby-place search.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#0058BC',
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
