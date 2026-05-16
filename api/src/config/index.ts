import dotenv from 'dotenv';

dotenv.config();

/**
 * Get a required environment variable.
 * Throws an error if the variable is not set or empty (after trim).
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Required environment variable "${name}" is not set. ` +
      `Please check your .env file or environment configuration.`
    );
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv,

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/memoryforge?schema=public',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    // JWT_SECRET: required in production, fallback dev-only temporary value
    secret:
      nodeEnv === 'production'
        ? requireEnv('JWT_SECRET')
        : (process.env.JWT_SECRET || 'dev-jwt-secret-temporary'),
    accessExpiry: '24h',
    refreshExpiry: '7d',
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    maxTokens: 2048,
    temperature: 0.7,
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
  },

  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },
};

// Unsafe defaults that must never be used in production
const UNSAFE_JWT_SECRETS = [
  'memory-forge-jwt-secret-key-2026',
  'dev-jwt-secret-temporary',
];

/**
 * Validate critical configuration values.
 *
 * - Throws in production if JWT_SECRET is missing or uses a known unsafe default.
 * - Warns if DEEPSEEK_API_KEY is missing (AI features will be unavailable).
 *
 * Call this function once at application startup before starting the server.
 */
export function validateConfig(): void {
  if (config.nodeEnv === 'production') {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret || jwtSecret.trim() === '') {
      throw new Error(
        'JWT_SECRET is required in production environment but is not set.'
      );
    }

    if (UNSAFE_JWT_SECRETS.includes(jwtSecret)) {
      throw new Error(
        `JWT_SECRET uses an unsafe default value in production. ` +
        `Please set a strong, randomly generated secret.`
      );
    }
  }

  if (!config.deepseek.apiKey) {
    console.warn(
      '[Config Warning] DEEPSEEK_API_KEY is not set. AI features will be unavailable.'
    );
  }
}

export default config;
