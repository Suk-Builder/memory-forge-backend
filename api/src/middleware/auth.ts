import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { cacheGet } from '@/lib/redis';
import type { AuthRequest } from '@/types';
import type { TokenPayload } from '@/utils/jwt';

// Ensure this file is treated as a module
export {};

const JWT_SECRET = process.env.JWT_SECRET || 'memory-forge-secret-key';

// Extend Express Request globally for user property
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { name: string | null };
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user info to request
 */
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未登录，请先登录' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: null,
      role: decoded.role,
    };

    next();
  } catch {
    res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    return;
  }
}

/**
 * Optional auth middleware
 * Attaches user info if token is valid, but doesn't require it
 */
export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: null,
      role: decoded.role,
    };
  } catch {
    // Invalid token: explicitly clear any existing user and proceed without auth
    req.user = undefined;
  }

  next();
}

/**
 * Admin authorization middleware
 * Requires authentication and admin role
 */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: '需要登录' });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: '需要管理员权限' });
    return;
  }

  next();
}
