import type { Request, Response, NextFunction } from 'express';
import { COOKIE_NAMES, type Role } from '@sis/shared';
import { verifyAccessToken, type JwtPayload } from '../lib/jwt.js';
import { isOnboardingComplete } from '../lib/admissions-utils.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.cookies?.[COOKIE_NAMES.accessToken] ??
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAMES.accessToken];
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // ignore invalid token
    }
  }
  next();
}

export function requireOnboardingComplete() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (req.user.role !== 'student') {
      next();
      return;
    }
    const complete = await isOnboardingComplete(req.user.userId);
    if (!complete) {
      res.status(403).json({ error: 'Onboarding must be completed first' });
      return;
    }
    next();
  };
}
