import Constants from 'expo-constants';

import { Coordinates, Incident } from '../types';
import { distanceKm } from '../utils/distance';

type GoogleDirectionsResponse = {
  routes: Array<{
    summary: string;
    legs: Array<{
      distance: { value: number };
      duration: { value: number };
    }>;
    overview_polyline: { points: string };
  }>;
};

export type RouteRisk = {
  riskScore: number;
  dangerHits: number;
  roadblockHits: number;
  recentHits: number;
};

export type RouteOption = {
  id: string;
  label: 'Fastest' | 'Safest';
  durationMinutes: number;
  distanceKm: number;
  polyline: Coordinates[];
  risk: RouteRisk;
};

export type RouteComparison = {
  fastest: RouteOption;
  safest: RouteOption;
  dangerZones: Coordinates[];
};

const HIGH_CRIME_TYPES = new Set(['ROBBERY', 'KIDNAPPING', 'POLICE_EXTORTION', 'SUSPICIOUS_ACTIVITY']);

const GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

const decodePolyline = (encoded: string): Coordinates[] => {
  const coordinates: Coordinates[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLatitude = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += deltaLatitude;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLongitude = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += deltaLongitude;

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
};

const interpolateFallbackRoute = (origin: Coordinates, destination: Coordinates, offsetFactor: number): Coordinates[] => {
  const points: Coordinates[] = [];
  const steps = 22;

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const lat = origin.latitude + (destination.latitude - origin.latitude) * t;
    const lon = origin.longitude + (destination.longitude - origin.longitude) * t;
    const curve = Math.sin(t * Math.PI) * offsetFactor;

    points.push({ latitude: lat + curve * 0.01, longitude: lon - curve * 0.01 });
  }

  return points;
};

const computeRouteRisk = (polyline: Coordinates[], incidents: Incident[]): RouteRisk => {
  const sampledPoints = polyline.filter((_, index) => index % 3 === 0);

  let riskScore = 0;
  let dangerHits = 0;
  let roadblockHits = 0;
  let recentHits = 0;

  sampledPoints.forEach((point) => {
    incidents.forEach((incident) => {
      const distance = distanceKm(point, incident.location);

      if (distance > 0.45) {
        return;
      }

      const ageHours = Math.max(0, (Date.now() - new Date(incident.timestamp).getTime()) / (1000 * 60 * 60));
      const recencyWeight = ageHours < 6 ? 1.8 : ageHours < 24 ? 1.2 : 0.7;

      let baseWeight = 2.5;
      if (HIGH_CRIME_TYPES.has(incident.type)) {
        baseWeight = 6;
        dangerHits += 1;
      }

      if (incident.type === 'ROADBLOCK') {
        baseWeight = 8;
        roadblockHits += 1;
      }

      if (ageHours < 12) {
        recentHits += 1;
      }

      riskScore += baseWeight * recencyWeight;
    });
  });

  return {
    riskScore: Number(riskScore.toFixed(2)),
    dangerHits,
    roadblockHits,
    recentHits,
  };
};

const buildDangerZones = (incidents: Incident[], selectedPolylines: Coordinates[][]) => {
  const zones: Coordinates[] = [];

  incidents.forEach((incident) => {
    const nearAnyRoute = selectedPolylines.some((polyline) =>
      polyline.some((point, index) => index % 3 === 0 && distanceKm(point, incident.location) < 0.5)
    );

    if (nearAnyRoute) {
      zones.push(incident.location);
    }
  });

  return zones.slice(0, 60);
};

const makeOption = (id: string, label: 'Fastest' | 'Safest', distanceKmValue: number, durationMinutes: number, polyline: Coordinates[], incidents: Incident[]): RouteOption => ({
  id,
  label,
  distanceKm: Number(distanceKmValue.toFixed(2)),
  durationMinutes: Number(durationMinutes.toFixed(1)),
  polyline,
  risk: computeRouteRisk(polyline, incidents),
});

const getGoogleApiKey = () => (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ?? '';

const fetchGoogleRoutes = async (origin: Coordinates, destination: Coordinates): Promise<RouteOption[] | null> => {
  const googleApiKey = getGoogleApiKey();

  if (!googleApiKey) {
    return null;
  }

  const query = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    alternatives: 'true',
    mode: 'driving',
    key: googleApiKey,
  });

  const response = await fetch(`${GOOGLE_DIRECTIONS_URL}?${query.toString()}`);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GoogleDirectionsResponse;
  if (!payload.routes || payload.routes.length === 0) {
    return null;
  }

  return payload.routes.slice(0, 3).map((route, index) => {
    const leg = route.legs[0];
    const distanceKmValue = (leg?.distance?.value ?? 0) / 1000;
    const durationMinutes = (leg?.duration?.value ?? 0) / 60;

    return {
      id: `google-${index}`,
      label: 'Fastest' as const,
      distanceKm: distanceKmValue,
      durationMinutes,
      polyline: decodePolyline(route.overview_polyline.points),
      risk: { riskScore: 0, dangerHits: 0, roadblockHits: 0, recentHits: 0 },
    };
  });
};

export const routeService = {
  async compareRoutes(origin: Coordinates, destination: Coordinates, incidents: Incident[]): Promise<RouteComparison> {
    const googleRoutes = await fetchGoogleRoutes(origin, destination);

    const baseRoutes =
      googleRoutes && googleRoutes.length >= 1
        ? googleRoutes
        : [
            {
              id: 'fallback-fast',
              label: 'Fastest' as const,
              distanceKm: distanceKm(origin, destination) * 1.03,
              durationMinutes: (distanceKm(origin, destination) / 38) * 60,
              polyline: interpolateFallbackRoute(origin, destination, 0),
              risk: { riskScore: 0, dangerHits: 0, roadblockHits: 0, recentHits: 0 },
            },
            {
              id: 'fallback-safe',
              label: 'Safest' as const,
              distanceKm: distanceKm(origin, destination) * 1.12,
              durationMinutes: (distanceKm(origin, destination) / 32) * 60,
              polyline: interpolateFallbackRoute(origin, destination, 1),
              risk: { riskScore: 0, dangerHits: 0, roadblockHits: 0, recentHits: 0 },
            },
          ];

    const scored = baseRoutes.map((route, index) =>
      makeOption(
        route.id,
        index === 0 ? 'Fastest' : 'Safest',
        route.distanceKm,
        route.durationMinutes,
        route.polyline,
        incidents
      )
    );

    const fastest = [...scored].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
    const safest = [...scored].sort((a, b) => a.risk.riskScore - b.risk.riskScore)[0];

    return {
      fastest,
      safest,
      dangerZones: buildDangerZones(incidents, [fastest.polyline, safest.polyline]),
    };
  },
};
