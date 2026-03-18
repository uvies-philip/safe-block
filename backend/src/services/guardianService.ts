import { z } from 'zod';

import { User } from '../models/types';
import { AppError } from '../utils/errors';
import { distanceInKilometers } from '../utils/geo';
import { store } from './store';

export const toggleGuardianSchema = z.object({
  available: z.boolean(),
});

export const nearbyGuardiansSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radiusKm: z.coerce.number().default(2),
});

const computeBadge = (assistCount: number): 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' => {
  if (assistCount >= 20) return 'GOLD';
  if (assistCount >= 10) return 'SILVER';
  if (assistCount >= 3) return 'BRONZE';
  return 'NONE';
};

const toGuardianPublic = (user: User, distanceKm: number) => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  homeLocation: user.homeLocation,
  guardianAvailable: user.guardianAvailable ?? false,
  guardianVerificationBadge: user.guardianVerificationBadge ?? 'NONE',
  guardianAssistCount: user.guardianAssistCount ?? 0,
  distanceKm,
});

export const guardianService = {
  setAvailability(userId: string, available: boolean) {
    const user = store.users.find((entry) => entry.id === userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.guardianAvailable = available;

    return {
      userId,
      guardianAvailable: user.guardianAvailable,
      guardianVerificationBadge: user.guardianVerificationBadge ?? 'NONE',
      guardianAssistCount: user.guardianAssistCount ?? 0,
    };
  },

  getNearbyGuardians(location: { latitude: number; longitude: number }, radiusKm: number, excludeUserId?: string) {
    const nearby = store.users
      .filter((user) => user.id !== excludeUserId)
      .filter((user) => Boolean(user.guardianAvailable))
      .filter((user) => Boolean(user.homeLocation))
      .map((user) => ({
        user,
        distanceKm: distanceInKilometers(location, user.homeLocation!),
      }))
      .filter((entry) => entry.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((entry) => toGuardianPublic(entry.user, entry.distanceKm));

    return nearby;
  },

  recordAssist(userId: string) {
    const user = store.users.find((entry) => entry.id === userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const nextAssistCount = (user.guardianAssistCount ?? 0) + 1;
    user.guardianAssistCount = nextAssistCount;
    user.guardianVerificationBadge = computeBadge(nextAssistCount);

    return {
      userId,
      guardianAssistCount: user.guardianAssistCount,
      guardianVerificationBadge: user.guardianVerificationBadge,
    };
  },
};
