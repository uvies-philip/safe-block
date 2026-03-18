import { Coordinates, User } from '../models/types';
import { distanceInKilometers } from '../utils/geo';
import { store } from './store';

export const geofenceService = {
  getUsersWithinRadius(location: Coordinates, radiusInKilometers: number): User[] {
    return store.users.filter((user) => {
      if (!user.homeLocation) {
        return false;
      }

      return distanceInKilometers(location, user.homeLocation) <= radiusInKilometers;
    });
  },

  notifyNearbyUsers(location: Coordinates, radiusInKilometers: number) {
    return this.getUsersWithinRadius(location, radiusInKilometers).map((user) => user.id);
  },
};
