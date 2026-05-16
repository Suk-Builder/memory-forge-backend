import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'memory-forge-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate access and refresh tokens for a user
 */
export function generateTokens(payload: TokenPayload): Tokens {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId },
    JWT_REFRESH_SECRET,
    {
      expiresIn: '7d',
    },
  );

  return { accessToken, refreshToken };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
}
