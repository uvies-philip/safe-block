import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { incidentService } from '../../services/incidentService';
import { Incident, IncidentDraft, IncidentType } from '../../types';

type IncidentPayload = {
  type: IncidentType;
  description: string;
  anonymous?: boolean;
  imageUri?: string;
  location: {
    latitude: number;
    longitude: number;
  };
};

type IncidentsState = {
  items: Incident[];
  digestItems: Incident[];
  selectedIncident: Incident | null;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  loading: boolean;
  /** true while upvote or verify is in flight — prevents double-taps */
  actionLoading: boolean;
  digestLoading: boolean;
  error: string | null;
  draftQueue: IncidentDraft[];
  draftsLoaded: boolean;
  syncingDrafts: boolean;
};

const initialState: IncidentsState = {
  items: [],
  digestItems: [],
  selectedIncident: null,
  total: 0,
  limit: 20,
  offset: 0,
  hasMore: false,
  loading: false,
  actionLoading: false,
  digestLoading: false,
  error: null,
  draftQueue: [],
  draftsLoaded: false,
  syncingDrafts: false,
};
export const saveIncidentDraft = createAsyncThunk(
  'incidents/saveDraft',
  (payload: { type: IncidentType; description: string; anonymous?: boolean; imageUri?: string; location: { latitude: number; longitude: number } }) =>
    incidentService.saveAsDraft(payload)
);
export const loadIncidentDrafts = createAsyncThunk('incidents/loadDrafts', () => incidentService.loadDrafts());
export const syncAllDrafts = createAsyncThunk('incidents/syncAll', async () => {
  const drafts = await incidentService.loadDrafts();
  const pending = drafts.filter((d) => d.status === 'pending' || d.status === 'failed');
  const results: Incident[] = [];
  for (const draft of pending) {
    try {
      const incident = await incidentService.syncDraft(draft);
      results.push(incident);
    } catch {
      // individual failure already recorded in storage; continue next draft
    }
  }
  return results;
});
export const removeIncidentDraft = createAsyncThunk('incidents/removeDraft', async (draftId: string) => {
  await incidentService.removeDraft(draftId);
  return draftId;
});
export const submitIncident = createAsyncThunk('incidents/submit', (payload: IncidentPayload) => incidentService.submitIncident(payload));
export const fetchNearbyIncidents = createAsyncThunk(
  'incidents/fetchNearby',
  ({
    latitude,
    longitude,
    radiusKm = 10,
    limit = 20,
    offset = 0,
  }: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    limit?: number;
    offset?: number;
  }) => incidentService.fetchNearbyIncidents(latitude, longitude, radiusKm, limit, offset)
);
export const fetchDigestFeed = createAsyncThunk('incidents/fetchDigest', ({ latitude, longitude }: { latitude: number; longitude: number }) =>
  incidentService.fetchDigestFeed(latitude, longitude)
);
export const fetchIncidentDetails = createAsyncThunk('incidents/details', incidentService.getIncidentDetails);
export const upvoteIncident = createAsyncThunk('incidents/upvote', incidentService.upvoteIncident);
export const verifyIncident = createAsyncThunk('incidents/verify', incidentService.verifyIncident);

const incidentsSlice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    updateDraftStatus(state, action: PayloadAction<{ draftId: string; status: IncidentDraft['status'] }>) {
      const draft = state.draftQueue.find((d) => d.draftId === action.payload.draftId);
      if (draft) {
        draft.status = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNearbyIncidents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNearbyIncidents.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.limit = action.payload.limit;
        state.offset = action.payload.offset;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchNearbyIncidents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load incidents';
      })
      .addCase(fetchDigestFeed.pending, (state) => {
        state.digestLoading = true;
        state.error = null;
      })
      .addCase(fetchDigestFeed.fulfilled, (state, action) => {
        state.digestLoading = false;
        state.digestItems = action.payload.items;
      })
      .addCase(fetchDigestFeed.rejected, (state, action) => {
        state.digestLoading = false;
        state.error = action.error.message ?? 'Unable to load digest feed';
      })
      .addCase(submitIncident.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.digestItems.unshift(action.payload);
      })
      .addCase(submitIncident.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitIncident.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to submit incident';
      })
      // drafts
      .addCase(saveIncidentDraft.fulfilled, (state, action) => {
        state.draftQueue.unshift(action.payload);
      })
      .addCase(loadIncidentDrafts.fulfilled, (state, action) => {
        state.draftQueue = action.payload;
        state.draftsLoaded = true;
      })
      .addCase(syncAllDrafts.pending, (state) => {
        state.syncingDrafts = true;
        state.draftQueue = state.draftQueue.map((d) =>
          d.status === 'pending' || d.status === 'failed' ? { ...d, status: 'syncing' as const } : d
        );
      })
      .addCase(syncAllDrafts.fulfilled, (state, action) => {
        state.syncingDrafts = false;
        // add synced incidents to the live list
        state.items.unshift(...action.payload);
        state.digestItems.unshift(...action.payload);
        // reload drafts from storage to reflect removed entries
      })
      .addCase(syncAllDrafts.rejected, (state) => {
        state.syncingDrafts = false;
      })
      .addCase(removeIncidentDraft.fulfilled, (state, action) => {
        state.draftQueue = state.draftQueue.filter((d) => d.draftId !== action.payload);
      })
      .addCase(fetchIncidentDetails.fulfilled, (state, action) => {
        state.selectedIncident = action.payload;
      })
      // upvote
      .addCase(upvoteIncident.pending, (state) => { state.actionLoading = true; })
      .addCase(upvoteIncident.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selectedIncident = action.payload;
        state.items = state.items.map((incident) => (incident.id === action.payload.id ? action.payload : incident));
        state.digestItems = state.digestItems.map((incident) => (incident.id === action.payload.id ? action.payload : incident));
      })
      .addCase(upvoteIncident.rejected, (state) => { state.actionLoading = false; })
      // verify
      .addCase(verifyIncident.pending, (state) => { state.actionLoading = true; })
      .addCase(verifyIncident.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selectedIncident = action.payload;
        state.items = state.items.map((incident) => (incident.id === action.payload.id ? action.payload : incident));
        state.digestItems = state.digestItems.map((incident) => (incident.id === action.payload.id ? action.payload : incident));
      })
      .addCase(verifyIncident.rejected, (state) => { state.actionLoading = false; });
  },
});

export default incidentsSlice.reducer;
