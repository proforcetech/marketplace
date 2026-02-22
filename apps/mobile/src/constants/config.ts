import Constants from 'expo-constants';

/**
 * App configuration resolved from environment.
 * Values come from app.json extra or EAS environment variables.
 */

type Environment = 'development' | 'staging' | 'production';

function getEnvironment(): Environment {
  const env = Constants.expoConfig?.extra?.environment;
  if (env === 'staging' || env === 'production') return env;
  return 'development';
}

const API_URLS: Record<Environment, string> = {
  development: 'http://localhost:3001',
  staging: 'https://staging-api.marketplace.app',
  production: 'https://api.marketplace.app',
};

const WS_URLS: Record<Environment, string> = {
  development: 'ws://localhost:3001',
  staging: 'wss://staging-api.marketplace.app',
  production: 'wss://api.marketplace.app',
};

const environment = getEnvironment();

export const Config = {
  environment,
  apiUrl: API_URLS[environment],
  wsUrl: WS_URLS[environment],

  // Auth
  accessTokenExpiryMs: 15 * 60 * 1000, // 15 minutes
  refreshTokenExpiryDays: 30,
  biometricPromptDelay: 500, // ms after app foreground

  // Listings
  maxImagesPerListing: 12,
  maxImageSizeMb: 10,
  imageResizeMaxDimension: 2048,
  imageCompressionQuality: 0.8,
  listingExpiryDays: 30,

  // Search
  defaultSearchRadiusMiles: 25,
  maxSearchRadiusMiles: 100,
  searchDebounceMs: 300,

  // Maps
  defaultMapDelta: 0.05,
  maxVisibleMarkers: 100,
  clusterRadius: 50,

  // Chat
  wsReconnectBaseMs: 1000,
  wsReconnectMaxMs: 30000,
  wsHeartbeatIntervalMs: 30000,
  backgroundGracePeriodMs: 30000,
  typingIndicatorThrottleMs: 3000,

  // Cache
  queryCacheTimeMs: 5 * 60 * 1000, // 5 minutes
  queryStaleTimeMs: 30 * 1000, // 30 seconds

  // Feature flags (will be fetched from API in production)
  features: {
    aiListingSuggestions: false,
    priceGuidance: false,
    safeExchangeSpots: false,
    voipCalling: false,
    qrHandshake: true,
    backgroundLocationAlerts: true,
  },
} as const;
