import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { COOKIE_NAMES, type Role } from '@sis/shared';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

function getSecret(key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const secret = process.env[key];
  if (!secret) throw new Error(`${key} is not configured`);
  return secret;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret('JWT_ACCESS_SECRET'), { expiresIn: '15m' });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret('JWT_ACCESS_SECRET')) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as JwtPayload;
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  // SameSite=None required for cross-origin (direct API). Lax works when web proxies API.
  const sameSite =
    process.env.COOKIE_SAME_SITE === 'lax'
      ? ('lax' as const)
      : isProduction
        ? ('none' as const)
        : ('lax' as const);
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: '/',
  };

  res.cookie(COOKIE_NAMES.accessToken, accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie(COOKIE_NAMES.refreshToken, refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite =
    process.env.COOKIE_SAME_SITE === 'lax'
      ? ('lax' as const)
      : isProduction
        ? ('none' as const)
        : ('lax' as const);
  const options = { path: '/', secure: isProduction, sameSite };
  res.clearCookie(COOKIE_NAMES.accessToken, options);
  res.clearCookie(COOKIE_NAMES.refreshToken, options);
}
