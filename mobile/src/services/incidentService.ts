import { api } from './api';
import { Incident, IncidentDraft, IncidentType, PagedIncidentsResponse } from '../types';
import { draftStorage } from '../utils/draftStorage';

const generateDraftId = () => `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const incidentService = {
  async submitIncident(payload: {
    type: IncidentType;
    description: string;
    anonymous?: boolean;
    imageUri?: string;
    location: { latitude: number; longitude: number };
  }) {
    const response = await api.post<Incident>('/incidents', payload);
    return response.data;
  },

  async saveAsDraft(payload: {
    type: IncidentType;
    description: string;
    anonymous?: boolean;
    imageUri?: string;
    location: { latitude: number; longitude: number };
  }): Promise<IncidentDraft> {
    const draft: IncidentDraft = {
      draftId: generateDraftId(),
      type: payload.type,
      description: payload.description,
      anonymous: payload.anonymous ?? false,
      imageUri: payload.imageUri,
      location: payload.location,
      savedAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };
    await draftStorage.saveDraft(draft);
    return draft;
  },

  async loadDrafts(): Promise<IncidentDraft[]> {
    return draftStorage.loadDrafts();
  },

  async removeDraft(draftId: string): Promise<void> {
    return draftStorage.removeDraft(draftId);
  },

  async syncDraft(draft: IncidentDraft): Promise<Incident> {
    await draftStorage.updateDraftStatus(draft.draftId, 'syncing');
    try {
      const response = await api.post<Incident>('/incidents', {
        type: draft.type,
        description: draft.description,
        anonymous: draft.anonymous,
        imageUri: draft.imageUri,
        location: draft.location,
      });
      await draftStorage.removeDraft(draft.draftId);
      return response.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      await draftStorage.updateDraftStatus(draft.draftId, 'failed', msg);
      throw err;
    }
  },

  async fetchNearbyIncidents(
    latitude: number,
    longitude: number,
    radiusKm = 10,
    limit = 20,
    offset = 0
  ) {
    const response = await api.get<PagedIncidentsResponse>('/incidents/nearby', {
      params: { latitude, longitude, radiusKm, limit, offset },
    });
    return response.data;
  },

  async fetchDigestFeed(latitude: number, longitude: number) {
    const response = await api.get<PagedIncidentsResponse>('/incidents/nearby', {
      params: { latitude, longitude, radiusKm: 5, limit: 30, offset: 0 },
    });

    const ranked = [...response.data.items].sort((a, b) => {
      if (a.verified !== b.verified) {
        return a.verified ? -1 : 1;
      }

      if (a.trustScore !== b.trustScore) {
        return b.trustScore - a.trustScore;
      }

      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return {
      ...response.data,
      items: ranked,
      hasMore: false,
    };
  },

  async getIncidentDetails(incidentId: string) {
    const response = await api.get<Incident>(`/incidents/${incidentId}`);
    return response.data;
  },

  async upvoteIncident(incidentId: string) {
    const response = await api.post<Incident>('/incidents/upvote', { incidentId });
    return response.data;
  },

  async verifyIncident(incidentId: string) {
    const response = await api.post<Incident>('/incidents/verify', { incidentId });
    return response.data;
  },
};
