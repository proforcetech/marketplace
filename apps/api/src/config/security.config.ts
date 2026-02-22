/**
 * Centralized Security Configuration
 *
 * All security-related constants, thresholds, and tunable parameters are defined here.
 * This prevents magic numbers scattered across the codebase and allows security
 * parameters to be audited, tuned, and overridden via environment variables in one place.
 */

export interface RateLimitTier {
  /** Max requests allowed within the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitConfig {
  anonymous: RateLimitTier;
  authenticatedLow: RateLimitTier; // Trust levels 0-1
  authenticatedHigh: RateLimitTier; // Trust levels 2-3
  verified: RateLimitTier; // Trust levels 4-5
  admin: RateLimitTier;
}

export interface TrustLevelConfig {
  level: number;
  name: string;
  dailyListingLimit: number;
  dailyMessageLimit: number;
  dailyMediaUploadLimit: number;
  canPurchasePromos: boolean;
}

export interface RiskThresholds {
  autoApproveMax: number;
  asyncReviewMax: number;
  holdForReviewMax: number;
  autoRejectMax: number;
  // Scores above autoRejectMax trigger auto-reject + escalation
}

export interface TokenConfig {
  accessTokenExpirySeconds: number;
  refreshTokenExpirySeconds: number;
  refreshTokenExpirySecondsMobile: number;
  /** How many seconds before expiry a token is considered "stale" and should be proactively refreshed */
  accessTokenRefreshThresholdSeconds: number;
  /** Maximum number of active refresh tokens per user (across all devices) */
  maxActiveRefreshTokensPerUser: number;
}

export interface PasswordConfig {
  /** Minimum password length */
  minLength: number;
  /** Maximum password length (prevents DoS via extremely long passwords sent to hashing) */
  maxLength: number;
  /** Argon2id memory cost in KiB */
  argon2MemoryCostKiB: number;
  /** Argon2id time cost (iterations) */
  argon2TimeCost: number;
  /** Argon2id parallelism */
  argon2Parallelism: number;
  /** bcrypt cost factor (fallback) */
  bcryptRounds: number;
}

export interface OtpConfig {
  /** OTP code length (digits) */
  codeLength: number;
  /** OTP validity in seconds */
  expirySeconds: number;
  /** Max verification attempts per OTP code */
  maxAttempts: number;
  /** Max OTP requests per phone per hour */
  maxRequestsPerPhonePerHour: number;
  /** Max OTP requests per IP per hour */
  maxRequestsPerIpPerHour: number;
}

export interface AccountRecoveryConfig {
  /** Recovery token validity in seconds */
  tokenExpirySeconds: number;
  /** Max recovery requests per email per hour */
  maxRequestsPerEmailPerHour: number;
  /** Grace period after account deletion request (seconds) */
  deletionGracePeriodSeconds: number;
}

export interface ModerationConfig {
  /** Percentage of auto-approved listings to randomly sample for human review */
  autoApproveReviewSamplePercent: number;
  /** Maximum time (seconds) a held listing should wait for review before escalation */
  holdReviewEscalationSeconds: number;
  /** Maximum time (seconds) for async review of approved-but-flagged listings */
  asyncReviewDeadlineSeconds: number;
  /** Number of reports in a window that triggers account trust level demotion */
  reportDemotionThreshold: number;
  /** Window (seconds) for report counting */
  reportDemotionWindowSeconds: number;
}

export interface FileUploadConfig {
  /** Max image file size in bytes */
  maxImageSizeBytes: number;
  /** Max video file size in bytes (Phase 2) */
  maxVideoSizeBytes: number;
  /** Max files per single upload request */
  maxFilesPerRequest: number;
  /** Max total images per listing */
  maxImagesPerListing: number;
  /** Allowed image MIME types */
  allowedImageMimeTypes: string[];
  /** Allowed video MIME types (Phase 2) */
  allowedVideoMimeTypes: string[];
  /** Max image dimension on longest edge (pixels) for server-side resize */
  maxImageDimension: number;
}

export interface SecurityConfig {
  tokens: TokenConfig;
  password: PasswordConfig;
  otp: OtpConfig;
  accountRecovery: AccountRecoveryConfig;
  rateLimits: Record<string, RateLimitConfig>;
  trustLevels: TrustLevelConfig[];
  riskThresholds: RiskThresholds;
  moderation: ModerationConfig;
  fileUpload: FileUploadConfig;
  cors: {
    allowedOrigins: string[];
    maxAgeSeconds: number;
  };
  /** Internal service request signing: max clock skew in seconds */
  serviceRequestMaxClockSkewSeconds: number;
  /** How long revoked JTIs are kept in Redis (should match access token expiry) */
  jtiBlacklistTtlSeconds: number;
}

function parseIntEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

function parseCorsOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map((origin) => origin.trim());
  }

  if (process.env.NODE_ENV === 'production') {
    return [
      'https://marketplace.example.com',
      'https://admin.marketplace.example.com',
    ];
  }

  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://marketplace.example.com',
    'https://admin.marketplace.example.com',
  ];
}

export function createSecurityConfig(): SecurityConfig {
  return {
    tokens: {
      accessTokenExpirySeconds: parseIntEnv('ACCESS_TOKEN_EXPIRY_SECONDS', 900), // 15 minutes
      refreshTokenExpirySeconds: parseIntEnv('REFRESH_TOKEN_EXPIRY_SECONDS', 604800), // 7 days
      refreshTokenExpirySecondsMobile: parseIntEnv('REFRESH_TOKEN_EXPIRY_SECONDS_MOBILE', 2592000), // 30 days
      accessTokenRefreshThresholdSeconds: parseIntEnv('ACCESS_TOKEN_REFRESH_THRESHOLD_SECONDS', 120), // 2 minutes
      maxActiveRefreshTokensPerUser: parseIntEnv('MAX_ACTIVE_REFRESH_TOKENS_PER_USER', 10),
    },

    password: {
      minLength: 8,
      maxLength: 128,
      argon2MemoryCostKiB: parseIntEnv('ARGON2_MEMORY_COST_KIB', 65536), // 64 MB
      argon2TimeCost: parseIntEnv('ARGON2_TIME_COST', 3),
      argon2Parallelism: parseIntEnv('ARGON2_PARALLELISM', 4),
      bcryptRounds: parseIntEnv('BCRYPT_ROUNDS', 12),
    },

    otp: {
      codeLength: 6,
      expirySeconds: 300, // 5 minutes
      maxAttempts: 5,
      maxRequestsPerPhonePerHour: 3,
      maxRequestsPerIpPerHour: 5,
    },

    accountRecovery: {
      tokenExpirySeconds: 3600, // 1 hour
      maxRequestsPerEmailPerHour: 3,
      deletionGracePeriodSeconds: 2592000, // 30 days
    },

    rateLimits: {
      auth: {
        anonymous: { limit: 5, windowSeconds: 60 },
        authenticatedLow: { limit: 5, windowSeconds: 60 },
        authenticatedHigh: { limit: 5, windowSeconds: 60 },
        verified: { limit: 5, windowSeconds: 60 },
        admin: { limit: 30, windowSeconds: 60 },
      },
      search: {
        anonymous: { limit: 30, windowSeconds: 60 },
        authenticatedLow: { limit: 60, windowSeconds: 60 },
        authenticatedHigh: { limit: 120, windowSeconds: 60 },
        verified: { limit: 300, windowSeconds: 60 },
        admin: { limit: 10000, windowSeconds: 60 },
      },
      listingCreate: {
        anonymous: { limit: 0, windowSeconds: 3600 },
        authenticatedLow: { limit: 1, windowSeconds: 3600 },
        authenticatedHigh: { limit: 3, windowSeconds: 3600 },
        verified: { limit: 10, windowSeconds: 3600 },
        admin: { limit: 10000, windowSeconds: 3600 },
      },
      listingUpdate: {
        anonymous: { limit: 0, windowSeconds: 3600 },
        authenticatedLow: { limit: 5, windowSeconds: 3600 },
        authenticatedHigh: { limit: 15, windowSeconds: 3600 },
        verified: { limit: 30, windowSeconds: 3600 },
        admin: { limit: 10000, windowSeconds: 3600 },
      },
      messageSend: {
        anonymous: { limit: 0, windowSeconds: 3600 },
        authenticatedLow: { limit: 5, windowSeconds: 3600 },
        authenticatedHigh: { limit: 30, windowSeconds: 3600 },
        verified: { limit: 100, windowSeconds: 3600 },
        admin: { limit: 10000, windowSeconds: 3600 },
      },
      mediaUpload: {
        anonymous: { limit: 0, windowSeconds: 3600 },
        authenticatedLow: { limit: 3, windowSeconds: 3600 },
        authenticatedHigh: { limit: 10, windowSeconds: 3600 },
        verified: { limit: 25, windowSeconds: 3600 },
        admin: { limit: 10000, windowSeconds: 3600 },
      },
      report: {
        anonymous: { limit: 5, windowSeconds: 3600 },
        authenticatedLow: { limit: 10, windowSeconds: 3600 },
        authenticatedHigh: { limit: 10, windowSeconds: 3600 },
        verified: { limit: 10, windowSeconds: 3600 },
        admin: { limit: 10000, windowSeconds: 3600 },
      },
    },

    trustLevels: [
      {
        level: 0,
        name: 'new',
        dailyListingLimit: 0,
        dailyMessageLimit: 5,
        dailyMediaUploadLimit: 3,
        canPurchasePromos: false,
      },
      {
        level: 1,
        name: 'basic',
        dailyListingLimit: 1,
        dailyMessageLimit: 25,
        dailyMediaUploadLimit: 10,
        canPurchasePromos: false,
      },
      {
        level: 2,
        name: 'established',
        dailyListingLimit: 3,
        dailyMessageLimit: 100,
        dailyMediaUploadLimit: 30,
        canPurchasePromos: true,
      },
      {
        level: 3,
        name: 'trusted',
        dailyListingLimit: 10,
        dailyMessageLimit: 500,
        dailyMediaUploadLimit: 100,
        canPurchasePromos: true,
      },
      {
        level: 4,
        name: 'verified',
        dailyListingLimit: 25,
        dailyMessageLimit: 1000,
        dailyMediaUploadLimit: 250,
        canPurchasePromos: true,
      },
      {
        level: 5,
        name: 'pro',
        dailyListingLimit: 100,
        dailyMessageLimit: 5000,
        dailyMediaUploadLimit: 1000,
        canPurchasePromos: true,
      },
    ],

    riskThresholds: {
      autoApproveMax: 20,
      asyncReviewMax: 45,
      holdForReviewMax: 65,
      autoRejectMax: 85,
    },

    moderation: {
      autoApproveReviewSamplePercent: 5,
      holdReviewEscalationSeconds: 7200, // 2 hours
      asyncReviewDeadlineSeconds: 14400, // 4 hours
      reportDemotionThreshold: 3,
      reportDemotionWindowSeconds: 604800, // 7 days
    },

    fileUpload: {
      maxImageSizeBytes: 10 * 1024 * 1024, // 10 MB
      maxVideoSizeBytes: 100 * 1024 * 1024, // 100 MB
      maxFilesPerRequest: 5,
      maxImagesPerListing: 10,
      allowedImageMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
      ],
      allowedVideoMimeTypes: ['video/mp4', 'video/quicktime'],
      maxImageDimension: 2048,
    },

    cors: {
      allowedOrigins: parseCorsOrigins(),
      maxAgeSeconds: 86400,
    },

    serviceRequestMaxClockSkewSeconds: 300,
    jtiBlacklistTtlSeconds: 900, // Matches access token expiry
  };
}

/**
 * Singleton instance. Import this directly in modules that need security configuration.
 *
 * For NestJS DI, register via a custom provider:
 *   { provide: 'SECURITY_CONFIG', useValue: securityConfig }
 */
export const securityConfig = createSecurityConfig();
