import { Coordinates, User } from '../models/types';
import { distanceInKilometers } from '../utils/geo';
import { prisma } from './prisma';

export const geofenceService = {
  async getUsersWithinRadius(location: Coordinates, radiusInKilometers: number): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: {
        homeLatitude: { not: null },
        homeLongitude: { not: null },
      },
      include: {
        trustedContacts: {
          select: { id: true },
        },
      },
    });

    return users
      .map((user) => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        photoUrl: user.photoUrl,
        passwordHash: user.passwordHash,
        homeLocation:
          user.homeLatitude != null && user.homeLongitude != null
            ? { latitude: user.homeLatitude, longitude: user.homeLongitude }
            : null,
        trustedContacts: user.trustedContacts.map((entry) => entry.id),
        guardianAvailable: user.guardianAvailable,
        guardianVerificationBadge: user.guardianVerificationBadge,
        guardianAssistCount: user.guardianAssistCount,
        createdAt: user.createdAt.toISOString(),
      }))
      .filter((user) => {
        if (!user.homeLocation) {
          return false;
        }

        return distanceInKilometers(location, user.homeLocation) <= radiusInKilometers;
      });
  },

  async notifyNearbyUsers(location: Coordinates, radiusInKilometers: number) {
    const users = await this.getUsersWithinRadius(location, radiusInKilometers);
    return users.map((user) => user.id);
  },
};
