import { NextFunction, Request, Response } from 'express';

import { sosService } from '../services/sosService';

export const sosController = {
  async create(request: Request, response: Response, next: NextFunction) {
    try {
      const alert = await sosService.triggerSOS(request.userId as string, request.body.location);
      response.status(201).json(alert);
    } catch (error) {
      next(error);
    }
  },

  async active(_request: Request, response: Response, next: NextFunction) {
    try {
      response.json(await sosService.getActiveAlerts());
    } catch (error) {
      next(error);
    }
  },

  async resolve(request: Request, response: Response, next: NextFunction) {
    try {
      response.json(await sosService.resolveSOS(request.body.alertId, request.userId as string));
    } catch (error) {
      next(error);
    }
  },

  async status(request: Request, response: Response, next: NextFunction) {
    try {
      response.json(await sosService.getAlertStatus(String(request.params.alertId)));
    } catch (error) {
      next(error);
    }
  },

  async respond(request: Request, response: Response, next: NextFunction) {
    try {
      response.json(
        await sosService.respondToSOS(
          request.body.alertId,
          request.userId as string,
          request.body.status,
          request.body.etaMinutes
        )
      );
    } catch (error) {
      next(error);
    }
  },
};
