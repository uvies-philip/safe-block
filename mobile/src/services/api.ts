import axios from 'axios';
import Constants from 'expo-constants';

const runtimeEnvBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

const getCandidateBaseUrls = (): string[] => {
  const candidates = new Set<string>();

  if (runtimeEnvBaseUrl) {
    candidates.add(runtimeEnvBaseUrl);
  }

  if (configuredBaseUrl) {
    candidates.add(configuredBaseUrl);
  }

  candidates.add('http://localhost:4000');
  candidates.add('http://127.0.0.1:4000');

  if (typeof window !== 'undefined' && window.location?.hostname) {
    candidates.add(`http://${window.location.hostname}:4000`);
  }

  return Array.from(candidates);
};

const baseUrlCandidates = getCandidateBaseUrls();
let currentBaseUrlIndex = 0;

const getCurrentBaseUrl = () => baseUrlCandidates[currentBaseUrlIndex] ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: getCurrentBaseUrl(),
  timeout: 10000,
});

let accessToken = '';

export const setAccessToken = (token: string) => {
  accessToken = token;
};

api.interceptors.request.use((config) => {
  config.baseURL = getCurrentBaseUrl();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response) {
      return Promise.reject(error);
    }

    const requestConfig = error.config;

    if (!requestConfig || (requestConfig as { _baseRetry?: boolean })._baseRetry) {
      return Promise.reject(error);
    }

    if (baseUrlCandidates.length < 2) {
      return Promise.reject(error);
    }

    currentBaseUrlIndex = (currentBaseUrlIndex + 1) % baseUrlCandidates.length;
    (requestConfig as { _baseRetry?: boolean })._baseRetry = true;
    requestConfig.baseURL = getCurrentBaseUrl();

    return api.request(requestConfig);
  }
);
