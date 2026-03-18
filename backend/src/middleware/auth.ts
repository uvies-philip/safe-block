import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../utils/env';
import { AppError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth = (request: Request, _response: Response, next: NextFunction): void => {
  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

  if (!token) {
    next(new AppError('Authentication required', 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as { sub: string };
    request.userId = payload.sub;
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError('Invalid or expired token', 401));
  }
};
