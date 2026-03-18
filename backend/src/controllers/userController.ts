import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { authService } from '../services/authService';
import { guardianService } from '../services/guardianService';

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
  async profile(request: Request, response: Response, next: NextFunction) {
    try {
      response.json(await authService.getProfile(request.userId as string));
    } catch (error) {
      next(error);
    }
  },

  async update(request: Request, response: Response, next: NextFunction) {
    try {
      const parsed = updateProfileSchema.parse(request.body);
      response.json(
        await authService.updateProfile(request.userId as string, {
          name: parsed.name,
          phone: parsed.phone,
          photoUrl: parsed.photoUrl,
          homeLocation: parsed.homeLocation,
        })
      );
    } catch (error) {
      next(error);
    }
  },

  async setGuardianAvailability(request: Request, response: Response, next: NextFunction) {
    try {
      response.json(await guardianService.setAvailability(request.userId as string, Boolean(request.body.available)));
    } catch (error) {
      next(error);
    }
  },

  async nearbyGuardians(request: Request, response: Response, next: NextFunction) {
    try {
      response.json(
        await guardianService.getNearbyGuardians(
          { latitude: Number(request.query.latitude), longitude: Number(request.query.longitude) },
          request.query.radiusKm ? Number(request.query.radiusKm) : 2,
          request.userId as string
        )
      );
    } catch (error) {
      next(error);
    }
  },
};
