import axios from 'axios';
import * as Location from 'expo-location';

import { Coordinates } from '../types';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LOCATION_TIMEOUT_MS = 8000;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutError: Error): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const getBestEffortLocation = async (): Promise<{ location: Coordinates; source: 'gps' | 'lastKnown' }> => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('LOCATION_PERMISSION_DENIED');
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const current = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
        LOCATION_TIMEOUT_MS,
        new Error('LOCATION_TIMEOUT')
      );

      return {
        source: 'gps',
        location: {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        },
      };
    } catch {
      if (attempt < 3) {
        await sleep(attempt * 600);
      }
    }
  }

  const fallback = await Location.getLastKnownPositionAsync({ maxAge: 1000 * 60 * 15 });

  if (!fallback) {
    throw new Error('LOCATION_UNAVAILABLE');
  }

  return {
    source: 'lastKnown',
    location: {
      latitude: fallback.coords.latitude,
      longitude: fallback.coords.longitude,
    },
  };
};

export const isLikelyOfflineError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return !error.response;
};
