import { NextFunction, Request, Response } from 'express';

import { authService } from '../services/authService';

export const authController = {
  async register(request: Request, response: Response, next: NextFunction) {
    try {
      const result = await authService.register(request.body);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async login(request: Request, response: Response, next: NextFunction) {
    try {
      const result = await authService.login(request.body);
      response.json(result);
    } catch (error) {
      next(error);
    }
  },

  logout(request: Request, response: Response) {
    authService.logout(request.body.refreshToken);
    response.status(204).send();
  },
};
