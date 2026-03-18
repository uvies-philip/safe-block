import { api } from './api';
import { NearbyGuardian } from '../types';

export const guardianService = {
  async setAvailability(available: boolean) {
    const response = await api.put<{ guardianAvailable: boolean; guardianVerificationBadge: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD'; guardianAssistCount: number }>(
      '/user/guardian-availability',
      { available }
    );

    return response.data;
  },

  async fetchNearbyGuardians(latitude: number, longitude: number, radiusKm = 2) {
    const response = await api.get<NearbyGuardian[]>('/user/guardians/nearby', {
      params: { latitude, longitude, radiusKm },
    });

    return response.data;
  },
};
