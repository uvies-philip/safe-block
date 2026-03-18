import { Router } from 'express';
import { z } from 'zod';

import { sosController } from '../controllers/sosController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { respondSOSSchema, triggerSOSSchema } from '../services/sosService';

const resolveSchema = z.object({
  alertId: z.string().min(10),
});

export const sosRoutes = Router();

sosRoutes.use(requireAuth);
sosRoutes.post('/', validateBody(triggerSOSSchema), sosController.create);
sosRoutes.get('/active', sosController.active);
sosRoutes.post('/resolve', validateBody(resolveSchema), sosController.resolve);
sosRoutes.get('/:alertId', sosController.status);
sosRoutes.post('/respond', validateBody(respondSOSSchema), sosController.respond);
