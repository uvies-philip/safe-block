import { Request, Response } from 'express';

import { sosService } from '../services/sosService';

export const sosController = {
  create(request: Request, response: Response) {
    const alert = sosService.triggerSOS(request.userId as string, request.body.location);
    response.status(201).json(alert);
  },

  active(_request: Request, response: Response) {
    response.json(sosService.getActiveAlerts());
  },

  resolve(request: Request, response: Response) {
    response.json(sosService.resolveSOS(request.body.alertId, request.userId as string));
  },

  status(request: Request, response: Response) {
    response.json(sosService.getAlertStatus(String(request.params.alertId)));
  },

  respond(request: Request, response: Response) {
    response.json(sosService.respondToSOS(request.body.alertId, request.userId as string, request.body.status, request.body.etaMinutes));
  },
};
