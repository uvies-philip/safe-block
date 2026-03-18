import { NextFunction, Request, Response } from 'express';

import { incidentService } from '../services/incidentService';

export const incidentController = {
  async submit(request: Request, response: Response, next: NextFunction) {
    try {
      const incident = await incidentService.submitIncident(request.userId as string, request.body);
      response.status(201).json(incident);
    } catch (error) {
      next(error);
    }
  },

  async nearby(request: Request, response: Response, next: NextFunction) {
    try {
      const latitude = Number(request.query.latitude);
      const longitude = Number(request.query.longitude);
      const radiusKm = request.query.radiusKm ? Number(request.query.radiusKm) : 10;
      const limit = request.query.limit ? Number(request.query.limit) : 20;
      const offset = request.query.offset ? Number(request.query.offset) : 0;
      const incidents = await incidentService.fetchNearbyIncidents(latitude, longitude, radiusKm, limit, offset);
      response.json(incidents);
    } catch (error) {
      next(error);
    }
  },

  async hotspots(request: Request, response: Response, next: NextFunction) {
    try {
      const latitude = Number(request.query.latitude);
      const longitude = Number(request.query.longitude);
      const radiusKm = request.query.radiusKm ? Number(request.query.radiusKm) : 10;
      const windowHours = request.query.windowHours ? Number(request.query.windowHours) : 24;
      const gridSizeKm = request.query.gridSizeKm ? Number(request.query.gridSizeKm) : 0.5;
      const minIncidents = request.query.minIncidents ? Number(request.query.minIncidents) : 2;

      response.json(
        await incidentService.fetchIncidentHotspots(
          latitude,
          longitude,
          radiusKm,
          windowHours,
          gridSizeKm,
          minIncidents
        )
      );
    } catch (error) {
      next(error);
    }
  },

  async details(request: Request, response: Response, next: NextFunction) {
    try {
      response.json(await incidentService.getIncident(String(request.params.incidentId)));
    } catch (error) {
      next(error);
    }
  },

  async upvote(request: Request, response: Response, next: NextFunction) {
    try {
      response.json(await incidentService.upvoteIncident(request.body.incidentId, request.userId as string));
    } catch (error) {
      next(error);
    }
  },

  async verify(request: Request, response: Response, next: NextFunction) {
    try {
      response.json(await incidentService.verifyIncident(request.body.incidentId, request.userId as string));
    } catch (error) {
      next(error);
    }
  },
};
