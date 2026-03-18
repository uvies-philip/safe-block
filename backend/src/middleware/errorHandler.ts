import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/errors';

export const errorHandler = (error: Error, _request: Request, response: Response, _next: NextFunction): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: 'Internal server error' });
};
