import { Request, Response } from 'express';
import { z } from 'zod';

import { authService } from '../services/authService';
import { guardianService } from '../services/guardianService';
import { store } from '../services/store';
import { AppError } from '../utils/errors';

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  homeLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .nullable()
    .optional(),
});

export const userController = {
  profile(request: Request, response: Response) {
    response.json(authService.getProfile(request.userId as string));
  },

  update(request: Request, response: Response) {
    const parsed = updateProfileSchema.parse(request.body);
    const user = store.users.find((entry) => entry.id === request.userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    Object.assign(user, parsed);
    response.json(authService.getProfile(user.id));
  },

  setGuardianAvailability(request: Request, response: Response) {
    response.json(guardianService.setAvailability(request.userId as string, Boolean(request.body.available)));
  },

  nearbyGuardians(request: Request, response: Response) {
    response.json(
      guardianService.getNearbyGuardians(
        { latitude: Number(request.query.latitude), longitude: Number(request.query.longitude) },
        request.query.radiusKm ? Number(request.query.radiusKm) : 2,
        request.userId as string
      )
    );
  },
};
