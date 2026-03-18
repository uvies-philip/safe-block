import { IncidentType as PrismaIncidentType } from '@prisma/client';
import { z } from 'zod';

import { Incident, IncidentType } from '../models/types';
import { distanceInKilometers } from '../utils/geo';
import { AppError } from '../utils/errors';
import { geofenceService } from './geofenceService';
import { notificationService } from './notificationService';
import { prisma } from './prisma';

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

type DbIncident = {
  id: string;
  type: PrismaIncidentType;
  description: string;
  reportedBy: string;
  anonymous: boolean;
  imageUri: string | null;
  latitude: number;
  longitude: number;
  timestamp: Date;
  verified: boolean;
  upvotes: number;
  upvotedBy: string[];
  verificationCount: number;
  trustScore: number;
  reporterCredibilityScore: number;
  verifiedBy: string[];
};

const toIncidentModel = (incident: DbIncident): Incident => ({
  id: incident.id,
  type: incident.type as IncidentType,
  description: incident.description,
  reportedBy: incident.reportedBy,
  anonymous: incident.anonymous,
  imageUri: incident.imageUri ?? undefined,
  location: {
    latitude: incident.latitude,
    longitude: incident.longitude,
  },
  timestamp: incident.timestamp.toISOString(),
  verified: incident.verified,
  upvotes: incident.upvotes,
  upvotedBy: incident.upvotedBy,
  verificationCount: incident.verificationCount,
  trustScore: incident.trustScore,
  reporterCredibilityScore: incident.reporterCredibilityScore,
  verifiedBy: incident.verifiedBy,
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
const DUPLICATE_WINDOW_MS = 15_000;

const calculateReporterCredibilityScore = async (userId: string) => {
  const authored = await prisma.incident.findMany({
    where: { reportedBy: userId },
    select: { verified: true, upvotes: true },
  });

  if (authored.length === 0) {
    return 50;
  }

  const verifiedCount = authored.filter((entry) => entry.verified).length;
  const upvoteCount = authored.reduce((sum, entry) => sum + entry.upvotes, 0);
  const score = 45 + verifiedCount * 9 + Math.min(20, Math.floor(upvoteCount / 3));

  return Math.max(0, Math.min(100, score));
};

const refreshReporterCredibility = async (userId: string) => {
  const nextCredibility = await calculateReporterCredibilityScore(userId);
  const authored = await prisma.incident.findMany({ where: { reportedBy: userId } });

  await Promise.all(
    authored.map(async (entry) => {
      const model = toIncidentModel(entry);
      const trustScore = recalculateTrustScore({
        ...model,
        reporterCredibilityScore: nextCredibility,
      });

      await prisma.incident.update({
        where: { id: entry.id },
        data: {
          reporterCredibilityScore: nextCredibility,
          trustScore,
        },
      });
    })
  );
};

const applyConsensusVerification = async (targetIncident: Incident) => {
  const targetTime = new Date(targetIncident.timestamp).getTime();
  const windowMs = CONSENSUS_WINDOW_MINUTES * 60 * 1000;

  const lower = new Date(targetTime - windowMs);
  const upper = new Date(targetTime + windowMs);

  const clusteredCandidates = await prisma.incident.findMany({
    where: {
      type: targetIncident.type as PrismaIncidentType,
      timestamp: {
        gte: lower,
        lte: upper,
      },
    },
  });

  const clustered = clusteredCandidates
    .map(toIncidentModel)
    .filter(
      (entry) => distanceInKilometers(targetIncident.location, entry.location) <= CONSENSUS_RADIUS_KM
    );

  const uniqueReporterIds = Array.from(new Set(clustered.map((entry) => entry.reportedBy)));

  if (uniqueReporterIds.length < CONSENSUS_REPORTER_THRESHOLD) {
    return;
  }

  await Promise.all(
    clustered.map(async (entry) => {
      const mergedVerifiers = Array.from(new Set([...entry.verifiedBy, ...uniqueReporterIds]));
      const verificationCount = Math.max(entry.verificationCount, mergedVerifiers.length);
      const verified = true;

      const trustScore = recalculateTrustScore({
        ...entry,
        verifiedBy: mergedVerifiers,
        verificationCount,
        verified,
      });

      await prisma.incident.update({
        where: { id: entry.id },
        data: {
          verifiedBy: mergedVerifiers,
          verificationCount,
          verified,
          trustScore,
        },
      });
    })
  );

  await Promise.all(clustered.map(async (entry) => refreshReporterCredibility(entry.reportedBy)));
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
  async submitIncident(userId: string, input: z.infer<typeof submitIncidentSchema>) {
    const normalizedDescription = input.description.trim();
    const duplicateCutoff = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const nearbyTolerance = 0.00005;

    const recentDuplicate = await prisma.incident.findFirst({
      where: {
        reportedBy: userId,
        type: input.type as PrismaIncidentType,
        description: normalizedDescription,
        timestamp: {
          gte: duplicateCutoff,
        },
        latitude: {
          gte: input.location.latitude - nearbyTolerance,
          lte: input.location.latitude + nearbyTolerance,
        },
        longitude: {
          gte: input.location.longitude - nearbyTolerance,
          lte: input.location.longitude + nearbyTolerance,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (recentDuplicate) {
      return toIncidentModel(recentDuplicate);
    }

    const reporterCredibilityScore = await calculateReporterCredibilityScore(userId);

    const created = await prisma.incident.create({
      data: {
        type: input.type as PrismaIncidentType,
        description: normalizedDescription,
        reportedBy: userId,
        anonymous: input.anonymous ?? false,
        imageUri: input.imageUri,
        latitude: input.location.latitude,
        longitude: input.location.longitude,
        verified: false,
        upvotes: 0,
        upvotedBy: [],
        verificationCount: 0,
        trustScore: 40,
        reporterCredibilityScore,
        verifiedBy: [],
      },
    });

    const createdModel = toIncidentModel(created);
    await applyConsensusVerification(createdModel);
    await refreshReporterCredibility(userId);

    const incident = await prisma.incident.findUnique({ where: { id: created.id } });
    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    const nearbyUserIds = await geofenceService.notifyNearbyUsers(input.location, 5);
    notificationService.sendPushNotification(
      nearbyUserIds.filter((entry) => entry !== userId),
      'INCIDENT',
      `New ${incident.type.toLowerCase().replace(/_/g, ' ')} incident reported nearby`,
      { incidentId: incident.id }
    );

    return toIncidentModel(incident);
  },

  async fetchNearbyIncidents(latitude: number, longitude: number, radiusKm = 10, limit = 20, offset = 0) {
    const incidents = await prisma.incident.findMany({ orderBy: { timestamp: 'desc' } });

    const nearby = incidents
      .map(toIncidentModel)
      .filter((incident) => distanceInKilometers({ latitude, longitude }, incident.location) <= radiusKm);

    const items = nearby.slice(offset, offset + limit);

    return {
      items,
      total: nearby.length,
      limit,
      offset,
      hasMore: offset + items.length < nearby.length,
    };
  },

  async fetchIncidentHotspots(
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

    const incidents = await prisma.incident.findMany({
      where: {
        timestamp: {
          gte: new Date(cutoff),
        },
      },
    });

    const candidates = incidents.map(toIncidentModel).filter((incident) => {
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

  async getIncident(incidentId: string) {
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    return toIncidentModel(incident);
  },

  async upvoteIncident(incidentId: string, userId: string) {
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    let nextUpvotedBy = incident.upvotedBy;
    let nextUpvotes = incident.upvotes;

    if (!nextUpvotedBy.includes(userId)) {
      nextUpvotedBy = [...nextUpvotedBy, userId];
      nextUpvotes += 1;
    }

    const updated = await prisma.incident.update({
      where: { id: incidentId },
      data: {
        upvotedBy: nextUpvotedBy,
        upvotes: nextUpvotes,
      },
    });

    await refreshReporterCredibility(updated.reportedBy);
    const refreshed = await prisma.incident.findUnique({ where: { id: incidentId } });

    if (!refreshed) {
      throw new AppError('Incident not found', 404);
    }

    return toIncidentModel(refreshed);
  },

  async verifyIncident(incidentId: string, userId: string) {
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    let nextVerifiedBy = incident.verifiedBy;
    let nextVerificationCount = incident.verificationCount;

    if (!nextVerifiedBy.includes(userId)) {
      nextVerifiedBy = [...nextVerifiedBy, userId];
      nextVerificationCount += 1;
    }

    const verified = nextVerificationCount >= 3;

    const updated = await prisma.incident.update({
      where: { id: incidentId },
      data: {
        verifiedBy: nextVerifiedBy,
        verificationCount: nextVerificationCount,
        verified,
      },
    });

    await refreshReporterCredibility(updated.reportedBy);
    const refreshed = await prisma.incident.findUnique({ where: { id: incidentId } });

    if (!refreshed) {
      throw new AppError('Incident not found', 404);
    }

    return toIncidentModel(refreshed);
  },
};
