import { Router } from 'express';
import { z } from 'zod';

import { incidentController } from '../controllers/incidentController';
import { requireAuth } from '../middleware/auth';
import { incidentRateLimiter } from '../middleware/rateLimiter';
import { validateBody, validateQuery } from '../middleware/validate';
import { hotspotIncidentSchema, nearbyIncidentSchema, submitIncidentSchema } from '../services/incidentService';

const upvoteSchema = z.object({
  incidentId: z.string().min(10),
});

const verifySchema = z.object({
  incidentId: z.string().min(10),
});

export const incidentRoutes = Router();

incidentRoutes.use(requireAuth);
incidentRoutes.post('/', incidentRateLimiter, validateBody(submitIncidentSchema), incidentController.submit);
incidentRoutes.get('/nearby', validateQuery(nearbyIncidentSchema), incidentController.nearby);
incidentRoutes.get('/hotspots', validateQuery(hotspotIncidentSchema), incidentController.hotspots);
incidentRoutes.get('/:incidentId', incidentController.details);
incidentRoutes.post('/upvote', validateBody(upvoteSchema), incidentController.upvote);
incidentRoutes.post('/verify', validateBody(verifySchema), incidentController.verify);
