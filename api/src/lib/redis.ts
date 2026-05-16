import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Fail silently - cache is best effort
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // Fail silently
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    // Use SCAN instead of KEYS to avoid blocking Redis in production
    let cursor = '0';
    do {
      const reply = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = reply[0];
      const keys = reply[1];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // Fail silently - cache is best effort
  }
}

export default redis;
