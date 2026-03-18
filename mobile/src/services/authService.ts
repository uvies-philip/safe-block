import axios from 'axios';

import { api, setAccessToken } from './api';
import { User } from '../types';

export type AuthResponse = {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (!error.response) {
      return 'Cannot reach SafeBlock API. Run: npm run dev:mobile at repo root.';
    }

    return error.response?.data?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Authentication request failed';
};

export const authService = {
  async register(payload: { name: string; phone: string; email: string; password: string; photoUrl?: string }) {
    try {
      const response = await api.post<AuthResponse>('/auth/register', payload);
      setAccessToken(response.data.tokens.accessToken);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async login(payload: { email: string; password: string }) {
    try {
      const response = await api.post<AuthResponse>('/auth/login', payload);
      setAccessToken(response.data.tokens.accessToken);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async logout(refreshToken: string) {
    await api.post('/auth/logout', { refreshToken });
    setAccessToken('');
  },
};
