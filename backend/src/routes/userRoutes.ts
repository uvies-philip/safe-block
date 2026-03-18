import { Router } from 'express';

import { userController } from '../controllers/userController';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { nearbyGuardiansSchema, toggleGuardianSchema } from '../services/guardianService';

export const userRoutes = Router();

userRoutes.use(requireAuth);
userRoutes.get('/profile', userController.profile);
userRoutes.put('/update', userController.update);
userRoutes.put('/guardian-availability', validateBody(toggleGuardianSchema), userController.setGuardianAvailability);
userRoutes.get('/guardians/nearby', validateQuery(nearbyGuardiansSchema), userController.nearbyGuardians);
