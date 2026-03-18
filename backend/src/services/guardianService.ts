import { z } from 'zod';

import { AppError } from '../utils/errors';
import { distanceInKilometers } from '../utils/geo';
import { prisma } from './prisma';

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

const toGuardianPublic = (
  user: {
    id: string;
    name: string;
    phone: string;
    homeLatitude: number | null;
    homeLongitude: number | null;
    guardianAvailable: boolean;
    guardianVerificationBadge: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';
    guardianAssistCount: number;
  },
  distanceKm: number
) => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  homeLocation:
    user.homeLatitude != null && user.homeLongitude != null
      ? { latitude: user.homeLatitude, longitude: user.homeLongitude }
      : null,
  guardianAvailable: user.guardianAvailable ?? false,
  guardianVerificationBadge: user.guardianVerificationBadge ?? 'NONE',
  guardianAssistCount: user.guardianAssistCount ?? 0,
  distanceKm,
});

export const guardianService = {
  async setAvailability(userId: string, available: boolean) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { guardianAvailable: available },
    });

    return {
      userId,
      guardianAvailable: user.guardianAvailable,
      guardianVerificationBadge: user.guardianVerificationBadge ?? 'NONE',
      guardianAssistCount: user.guardianAssistCount ?? 0,
    };
  },

  async getNearbyGuardians(
    location: { latitude: number; longitude: number },
    radiusKm: number,
    excludeUserId?: string
  ) {
    const users = await prisma.user.findMany({
      where: {
        guardianAvailable: true,
        homeLatitude: { not: null },
        homeLongitude: { not: null },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        homeLatitude: true,
        homeLongitude: true,
        guardianAvailable: true,
        guardianVerificationBadge: true,
        guardianAssistCount: true,
      },
    });

    const nearby = users
      .map((user) => ({
        user,
        distanceKm: distanceInKilometers(location, {
          latitude: user.homeLatitude!,
          longitude: user.homeLongitude!,
        }),
      }))
      .filter((entry) => entry.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((entry) => toGuardianPublic(entry.user, entry.distanceKm));

    return nearby;
  },

  async recordAssist(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const nextAssistCount = (user.guardianAssistCount ?? 0) + 1;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        guardianAssistCount: nextAssistCount,
        guardianVerificationBadge: computeBadge(nextAssistCount),
      },
    });

    return {
      userId,
      guardianAssistCount: updated.guardianAssistCount,
      guardianVerificationBadge: updated.guardianVerificationBadge,
    };
  },
};
