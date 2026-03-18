import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { authService } from '../../services/authService';
import { User } from '../../types';

type AuthState = {
  user: User | null;
  accessToken: string;
  refreshToken: string;
  loading: boolean;
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  accessToken: '',
  refreshToken: '',
  loading: false,
  error: null,
};

export const login = createAsyncThunk('auth/login', authService.login);
export const register = createAsyncThunk('auth/register', authService.register);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearSession(state) {
      state.user = null;
      state.accessToken = '';
      state.refreshToken = '';
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
    updateGuardianProfile(
      state,
      action: {
        payload: {
          guardianAvailable: boolean;
          guardianVerificationBadge: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';
          guardianAssistCount: number;
        };
      }
    ) {
      if (!state.user) {
        return;
      }

      state.user.guardianAvailable = action.payload.guardianAvailable;
      state.user.guardianVerificationBadge = action.payload.guardianVerificationBadge;
      state.user.guardianAssistCount = action.payload.guardianAssistCount;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to log in';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to register';
      });
  },
});

export const { clearSession, clearError, updateGuardianProfile } = authSlice.actions;
export default authSlice.reducer;
