import { HotspotsResponse } from '../types';
import { api } from './api';

export type FetchHotspotsParams = {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  windowHours?: number;
  gridSizeKm?: number;
  minIncidents?: number;
};

export const hotspotService = {
  async fetchHotspots(params: FetchHotspotsParams): Promise<HotspotsResponse> {
    const response = await api.get<HotspotsResponse>('/incidents/hotspots', { params });
    return response.data;
  },
};
