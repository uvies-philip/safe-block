import type { ExpoConfig } from 'expo/config';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const config: ExpoConfig = {
  name: 'SafeBlock',
  slug: 'safeblock',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  splash: {
    backgroundColor: '#121212',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
  },
  android: {
    package: 'com.safeblock.mobile',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
  },
  plugins: ['expo-location', 'expo-notifications'],
  extra: {
    apiBaseUrl,
    googleMapsApiKey,
  },
};

export default config;