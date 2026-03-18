import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { FetchHotspotsParams, hotspotService } from '../../services/hotspotService';
import { Hotspot } from '../../types';

type HotspotsState = {
  items: Hotspot[];
  generatedAt: string | null;
  loading: boolean;
  error: string | null;
};

const initialState: HotspotsState = {
  items: [],
  generatedAt: null,
  loading: false,
  error: null,
};

export const fetchHotspots = createAsyncThunk('hotspots/fetch', async (params: FetchHotspotsParams) => {
  return hotspotService.fetchHotspots(params);
});

const hotspotsSlice = createSlice({
  name: 'hotspots',
  initialState,
  reducers: {
    clearHotspots(state) {
      state.items = [];
      state.generatedAt = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchHotspots.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchHotspots.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload.hotspots;
      state.generatedAt = action.payload.generatedAt;
    });
    builder.addCase(fetchHotspots.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? 'Failed to load hotspots';
    });
  },
});

export const { clearHotspots } = hotspotsSlice.actions;
export default hotspotsSlice.reducer;
