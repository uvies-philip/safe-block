import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { sosService } from '../../services/sosService';
import { SOSAlert, SOSWorkflowStatus, TriggerSOSResult } from '../../types';

type SosState = {
  activeAlert: SOSAlert | null;
  activeAlerts: SOSAlert[];
  workflowStatus: SOSWorkflowStatus;
  cancelSecondsLeft: number;
  queued: boolean;
  warning: string | null;
  loading: boolean;
  error: string | null;
};

const initialState: SosState = {
  activeAlert: null,
  activeAlerts: [],
  workflowStatus: 'idle',
  cancelSecondsLeft: 0,
  queued: false,
  warning: null,
  loading: false,
  error: null,
};

export const triggerSOS = createAsyncThunk<TriggerSOSResult, { smsEnabled?: boolean } | undefined>(
  'sos/trigger',
  sosService.triggerSOS
);
export const fetchActiveAlerts = createAsyncThunk('sos/active', sosService.fetchActiveAlerts);
export const fetchSOSStatus = createAsyncThunk('sos/status', sosService.getAlertStatus);
export const respondToSOS = createAsyncThunk('sos/respond', sosService.respondToSOS);
export const flushQueuedSOS = createAsyncThunk('sos/flushQueue', sosService.flushQueuedSOS);

const sosSlice = createSlice({
  name: 'sos',
  initialState,
  reducers: {
    beginSOSTrigger(state) {
      state.workflowStatus = 'triggered';
      state.cancelSecondsLeft = 10;
      state.error = null;
      state.warning = null;
    },
    tickSOSTrigger(state) {
      state.cancelSecondsLeft = Math.max(0, state.cancelSecondsLeft - 1);
    },
    cancelSOSTrigger(state) {
      state.workflowStatus = 'idle';
      state.cancelSecondsLeft = 0;
      state.warning = 'SOS canceled before dispatch.';
    },
    markSOSResolved(state) {
      state.workflowStatus = 'resolved';
    },
    clearSOSWarning(state) {
      state.warning = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(triggerSOS.pending, (state) => {
        state.loading = true;
        state.workflowStatus = 'sending';
        state.cancelSecondsLeft = 0;
        state.error = null;
        state.warning = null;
      })
      .addCase(triggerSOS.fulfilled, (state, action) => {
        state.loading = false;
        state.queued = action.payload.queued;

        if (action.payload.alert) {
          state.activeAlert = action.payload.alert;
          state.activeAlerts = [
            action.payload.alert,
            ...state.activeAlerts.filter((entry) => entry.id !== action.payload.alert?.id),
          ];
          state.workflowStatus = 'active';
        } else {
          state.workflowStatus = 'sending';
        }

        const warnings: string[] = [];
        if (action.payload.queued) warnings.push('No internet: SOS queued and will retry automatically.');
        if (action.payload.locationSource === 'lastKnown') warnings.push('Using last known location.');
        if (action.payload.notificationFailed) warnings.push('Push notification failed.');
        if (action.payload.smsFailed) warnings.push('SMS delivery failed.');
        if (action.payload.firestoreFailed) warnings.push('Cloud save failed.');
        if (action.payload.nearbyAlertFailed) warnings.push('Nearby-user alerts failed.');
        state.warning = warnings.length > 0 ? warnings.join(' ') : null;
      })
      .addCase(triggerSOS.rejected, (state, action) => {
        state.loading = false;
        state.workflowStatus = 'idle';
        state.error = action.error.message ?? 'Unable to trigger SOS';
      })
      .addCase(fetchActiveAlerts.fulfilled, (state, action) => {
        state.activeAlerts = action.payload;

        if (state.activeAlert) {
          const refreshedActive = action.payload.find((entry) => entry.id === state.activeAlert?.id);
          if (refreshedActive) {
            state.activeAlert = refreshedActive;
            state.workflowStatus = refreshedActive.status === 'resolved' ? 'resolved' : 'active';
          }
        }
      })
      .addCase(fetchSOSStatus.fulfilled, (state, action) => {
        state.activeAlert = action.payload;
        state.workflowStatus = action.payload.status === 'resolved' ? 'resolved' : 'active';
      })
      .addCase(respondToSOS.fulfilled, (state, action) => {
        state.activeAlert = action.payload;
        const existing = state.activeAlerts.some((entry) => entry.id === action.payload.id);
        state.activeAlerts = existing
          ? state.activeAlerts.map((entry) => (entry.id === action.payload.id ? action.payload : entry))
          : [action.payload, ...state.activeAlerts];
      })
      .addCase(flushQueuedSOS.fulfilled, (state, action) => {
        state.queued = action.payload > 0;
      });
  },
});

export const { beginSOSTrigger, tickSOSTrigger, cancelSOSTrigger, markSOSResolved, clearSOSWarning } = sosSlice.actions;
export default sosSlice.reducer;
