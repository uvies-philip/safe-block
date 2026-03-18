import { Request, Response } from 'express';

import { incidentService } from '../services/incidentService';

export const incidentController = {
  submit(request: Request, response: Response) {
    const incident = incidentService.submitIncident(request.userId as string, request.body);
    response.status(201).json(incident);
  },

  nearby(request: Request, response: Response) {
    const latitude = Number(request.query.latitude);
    const longitude = Number(request.query.longitude);
    const radiusKm = request.query.radiusKm ? Number(request.query.radiusKm) : 10;
    const limit = request.query.limit ? Number(request.query.limit) : 20;
    const offset = request.query.offset ? Number(request.query.offset) : 0;
    const incidents = incidentService.fetchNearbyIncidents(latitude, longitude, radiusKm, limit, offset);
    response.json(incidents);
  },

  hotspots(request: Request, response: Response) {
    const latitude = Number(request.query.latitude);
    const longitude = Number(request.query.longitude);
    const radiusKm = request.query.radiusKm ? Number(request.query.radiusKm) : 10;
    const windowHours = request.query.windowHours ? Number(request.query.windowHours) : 24;
    const gridSizeKm = request.query.gridSizeKm ? Number(request.query.gridSizeKm) : 0.5;
    const minIncidents = request.query.minIncidents ? Number(request.query.minIncidents) : 2;

    response.json(
      incidentService.fetchIncidentHotspots(
        latitude,
        longitude,
        radiusKm,
        windowHours,
        gridSizeKm,
        minIncidents
      )
    );
  },

  details(request: Request, response: Response) {
    response.json(incidentService.getIncident(String(request.params.incidentId)));
  },

  upvote(request: Request, response: Response) {
    response.json(incidentService.upvoteIncident(request.body.incidentId, request.userId as string));
  },

  verify(request: Request, response: Response) {
    response.json(incidentService.verifyIncident(request.body.incidentId, request.userId as string));
  },
};
