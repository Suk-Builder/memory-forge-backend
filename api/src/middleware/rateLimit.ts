import rateLimit from 'express-rate-limit';
import { config } from '@/config';

export const globalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    error: '登录尝试次数过多，请15分钟后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Chat rate limit (more generous but still protected)
export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: {
    success: false,
    error: '消息发送过于频繁，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
