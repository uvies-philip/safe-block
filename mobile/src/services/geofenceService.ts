import { Coordinates } from '../types';

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceInKilometers = (from: Coordinates, to: Coordinates) => {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const geofenceService = {
  getUsersWithinRadius<T extends { homeLocation: Coordinates | null }>(users: T[], center: Coordinates, radiusKm: number) {
    return users.filter((user) => user.homeLocation && distanceInKilometers(center, user.homeLocation) <= radiusKm);
  },

  notifyNearbyUsers(userIds: string[]) {
    return userIds;
  },
};
