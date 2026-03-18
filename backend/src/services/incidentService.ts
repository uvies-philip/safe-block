import { z } from 'zod';

import { Incident, IncidentType } from '../models/types';
import { distanceInKilometers } from '../utils/geo';
import { createId } from '../utils/id';
import { AppError } from '../utils/errors';
import { geofenceService } from './geofenceService';
import { notificationService } from './notificationService';
import { store } from './store';

const incidentTypeEnum = z.enum([
  'ROBBERY',
  'KIDNAPPING',
  'FIRE',
  'POLICE_EXTORTION',
  'ROADBLOCK',
  'ACCIDENT',
  'SUSPICIOUS_ACTIVITY',
]);

export const submitIncidentSchema = z.object({
  type: incidentTypeEnum,
  description: z.string().trim().min(5).max(280),
  anonymous: z.boolean().optional(),
  imageUri: z.string().trim().min(1).max(600).optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export const nearbyIncidentSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radiusKm: z.coerce.number().default(10),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const hotspotIncidentSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radiusKm: z.coerce.number().min(1).max(100).default(10),
  windowHours: z.coerce.number().int().min(1).max(168).default(24),
  gridSizeKm: z.coerce.number().min(0.1).max(2).default(0.5),
  minIncidents: z.coerce.number().int().min(1).max(20).default(2),
});

const recalculateTrustScore = (incident: Incident): number => {
  const ageHours = Math.max(0, (Date.now() - new Date(incident.timestamp).getTime()) / (1000 * 60 * 60));
  const stalePenalty = Math.min(30, Math.floor(ageHours / 12) * 2);
  const credibilityDelta = (incident.reporterCredibilityScore ?? 50) - 50;
  const score =
    40 +
    incident.verificationCount * 12 +
    incident.upvotes * 2 +
    Math.round(credibilityDelta * 0.3) +
    (incident.verified ? 8 : 0) -
    stalePenalty;

  return Math.max(0, Math.min(100, score));
};

const CONSENSUS_RADIUS_KM = 0.3;
const CONSENSUS_WINDOW_MINUTES = 90;
const CONSENSUS_REPORTER_THRESHOLD = 3;

const calculateReporterCredibilityScore = (userId: string) => {
  const authored = store.incidents.filter((entry) => entry.reportedBy === userId);

  if (authored.length === 0) {
    return 50;
  }

  const verifiedCount = authored.filter((entry) => entry.verified).length;
  const upvoteCount = authored.reduce((sum, entry) => sum + entry.upvotes, 0);
  const score = 45 + verifiedCount * 9 + Math.min(20, Math.floor(upvoteCount / 3));

  return Math.max(0, Math.min(100, score));
};

const refreshReporterCredibility = (userId: string) => {
  const nextCredibility = calculateReporterCredibilityScore(userId);

  for (const entry of store.incidents) {
    if (entry.reportedBy !== userId) {
      continue;
    }

    entry.reporterCredibilityScore = nextCredibility;
    entry.trustScore = recalculateTrustScore(entry);
  }
};

const applyConsensusVerification = (targetIncident: Incident) => {
  const targetTime = new Date(targetIncident.timestamp).getTime();
  const windowMs = CONSENSUS_WINDOW_MINUTES * 60 * 1000;

  const clustered = store.incidents.filter((entry) => {
    if (entry.type !== targetIncident.type) {
      return false;
    }

    const incidentTime = new Date(entry.timestamp).getTime();
    const isWithinTimeWindow = Math.abs(targetTime - incidentTime) <= windowMs;
    if (!isWithinTimeWindow) {
      return false;
    }

    return distanceInKilometers(targetIncident.location, entry.location) <= CONSENSUS_RADIUS_KM;
  });

  const uniqueReporterIds = Array.from(new Set(clustered.map((entry) => entry.reportedBy)));

  if (uniqueReporterIds.length < CONSENSUS_REPORTER_THRESHOLD) {
    return;
  }

  for (const entry of clustered) {
    const mergedVerifiers = Array.from(new Set([...entry.verifiedBy, ...uniqueReporterIds]));
    entry.verifiedBy = mergedVerifiers;
    entry.verificationCount = Math.max(entry.verificationCount, mergedVerifiers.length);
    entry.verified = true;
    entry.trustScore = recalculateTrustScore(entry);
  }

  for (const entry of clustered) {
    refreshReporterCredibility(entry.reportedBy);
  }
};

const getTimeOfDayKey = (hour: number): 'morning' | 'afternoon' | 'evening' | 'night' => {
  if (hour >= 6 && hour <= 11) {
    return 'morning';
  }

  if (hour >= 12 && hour <= 16) {
    return 'afternoon';
  }

  if (hour >= 17 && hour <= 21) {
    return 'evening';
  }

  return 'night';
};

export const incidentService = {
  submitIncident(userId: string, input: z.infer<typeof submitIncidentSchema>) {
    const reporterCredibilityScore = calculateReporterCredibilityScore(userId);

    const incident: Incident = {
      id: createId(),
      type: input.type as IncidentType,
      description: input.description,
      reportedBy: userId,
      anonymous: input.anonymous ?? false,
      imageUri: input.imageUri,
      location: input.location,
      timestamp: new Date().toISOString(),
      verified: false,
      upvotes: 0,
      upvotedBy: [],
      verificationCount: 0,
      trustScore: 40,
      reporterCredibilityScore,
      verifiedBy: [],
    };

    store.incidents.unshift(incident);
    applyConsensusVerification(incident);
    refreshReporterCredibility(userId);

    const nearbyUserIds = geofenceService.notifyNearbyUsers(input.location, 5);
    notificationService.sendPushNotification(
      nearbyUserIds.filter((entry) => entry !== userId),
      'INCIDENT',
      `New ${incident.type.toLowerCase().replace(/_/g, ' ')} incident reported nearby`,
      { incidentId: incident.id }
    );

    return incident;
  },

  fetchNearbyIncidents(latitude: number, longitude: number, radiusKm = 10, limit = 20, offset = 0) {
    const nearby = store.incidents.filter((incident) =>
      distanceInKilometers({ latitude, longitude }, incident.location) <= radiusKm
    );

    const items = nearby.slice(offset, offset + limit);

    return {
      items,
      total: nearby.length,
      limit,
      offset,
      hasMore: offset + items.length < nearby.length,
    };
  },

  fetchIncidentHotspots(
    latitude: number,
    longitude: number,
    radiusKm = 10,
    windowHours = 24,
    gridSizeKm = 0.5,
    minIncidents = 2
  ) {
    const now = Date.now();
    const cutoff = now - windowHours * 60 * 60 * 1000;
    const latStep = gridSizeKm / 111;
    const lonStep = gridSizeKm / (111 * Math.max(0.15, Math.cos((latitude * Math.PI) / 180)));

    const candidates = store.incidents.filter((incident) => {
      const incidentTime = new Date(incident.timestamp).getTime();

      if (incidentTime < cutoff) {
        return false;
      }

      return distanceInKilometers({ latitude, longitude }, incident.location) <= radiusKm;
    });

    const buckets = new Map<
      string,
      {
        latIndex: number;
        lonIndex: number;
        incidents: Incident[];
        byType: Record<string, number>;
        hourCounts: number[];
        timeOfDay: { morning: number; afternoon: number; evening: number; night: number };
      }
    >();

    for (const incident of candidates) {
      const latIndex = Math.floor(incident.location.latitude / latStep);
      const lonIndex = Math.floor(incident.location.longitude / lonStep);
      const key = `${latIndex}:${lonIndex}`;
      const hour = new Date(incident.timestamp).getHours();

      if (!buckets.has(key)) {
        buckets.set(key, {
          latIndex,
          lonIndex,
          incidents: [],
          byType: {},
          hourCounts: Array.from({ length: 24 }, () => 0),
          timeOfDay: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        });
      }

      const bucket = buckets.get(key)!;
      bucket.incidents.push(incident);
      bucket.byType[incident.type] = (bucket.byType[incident.type] ?? 0) + 1;
      bucket.hourCounts[hour] += 1;
      bucket.timeOfDay[getTimeOfDayKey(hour)] += 1;
    }

    const hotspots = Array.from(buckets.values())
      .filter((bucket) => bucket.incidents.length >= minIncidents)
      .map((bucket) => {
        const incidentCount = bucket.incidents.length;
        const avgTrust =
          bucket.incidents.reduce((sum, incident) => sum + incident.trustScore, 0) /
          Math.max(1, incidentCount);
        const recentCount = bucket.incidents.filter(
          (incident) => now - new Date(incident.timestamp).getTime() <= 3 * 60 * 60 * 1000
        ).length;
        const peakHourIndex = bucket.hourCounts.reduce(
          (best, current, index, arr) => (current > arr[best] ? index : best),
          0
        );
        const riskScore = Math.max(
          0,
          Math.min(100, Math.round(incidentCount * 9 + avgTrust * 0.45 + recentCount * 6))
        );

        return {
          center: {
            latitude: (bucket.latIndex + 0.5) * latStep,
            longitude: (bucket.lonIndex + 0.5) * lonStep,
          },
          incidentCount,
          avgTrustScore: Math.round(avgTrust),
          riskScore,
          byType: bucket.byType,
          timeOfDay: bucket.timeOfDay,
          peakHour: `${String(peakHourIndex).padStart(2, '0')}:00`,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore || b.incidentCount - a.incidentCount);

    return {
      generatedAt: new Date(now).toISOString(),
      radiusKm,
      windowHours,
      gridSizeKm,
      hotspots,
    };
  },

  getIncident(incidentId: string) {
    const incident = store.incidents.find((entry) => entry.id === incidentId);

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    return incident;
  },

  upvoteIncident(incidentId: string, userId: string) {
    const incident = store.incidents.find((entry) => entry.id === incidentId);

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    if (!incident.upvotedBy.includes(userId)) {
      incident.upvotedBy.push(userId);
      incident.upvotes += 1;
    }

    refreshReporterCredibility(incident.reportedBy);
    return incident;
  },

  verifyIncident(incidentId: string, userId: string) {
    const incident = store.incidents.find((entry) => entry.id === incidentId);

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    if (!incident.verifiedBy.includes(userId)) {
      incident.verifiedBy.push(userId);
      incident.verificationCount += 1;
    }

    incident.verified = incident.verificationCount >= 3;
    refreshReporterCredibility(incident.reportedBy);
    return incident;
  },
};
