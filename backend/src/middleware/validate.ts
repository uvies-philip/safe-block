import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

import { AppError } from '../utils/errors';

export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(request.body);

    if (!parsed.success) {
      next(new AppError(parsed.error.issues.map((issue) => issue.message).join(', '), 400));
      return;
    }

    request.body = parsed.data;
    next();
  };
};

export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(request.query);

    if (!parsed.success) {
      next(new AppError(parsed.error.issues.map((issue) => issue.message).join(', '), 400));
      return;
    }

    request.query = parsed.data as Request['query'];
    next();
  };
};
