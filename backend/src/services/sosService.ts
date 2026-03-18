import { SosResponderStatus } from '@prisma/client';
import { z } from 'zod';

import { SOSAlert, SOSResponder } from '../models/types';
import { AppError } from '../utils/errors';
import { contactService } from './contactService';
import { guardianService } from './guardianService';
import { geofenceService } from './geofenceService';
import { notificationService } from './notificationService';
import { prisma } from './prisma';

export const triggerSOSSchema = z.object({
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export const respondSOSSchema = z.object({
  alertId: z.string().min(10),
  status: z.enum(['coming', 'unable']),
  etaMinutes: z.number().int().min(1).max(240).optional(),
});

type DbAlert = {
  id: string;
  userId: string;
  requesterName: string | null;
  requesterPhone: string | null;
  latitude: number;
  longitude: number;
  timestamp: Date;
  status: 'active' | 'resolved';
  escalationLevel: number;
  responders: {
    userId: string;
    status: SosResponderStatus;
    etaMinutes: number | null;
    updatedAt: Date;
  }[];
};

const mapResponder = (responder: DbAlert['responders'][number]): SOSResponder => ({
  userId: responder.userId,
  status: responder.status,
  etaMinutes: responder.etaMinutes ?? undefined,
  updatedAt: responder.updatedAt.toISOString(),
});

const toSOSAlert = (alert: DbAlert): SOSAlert => ({
  id: alert.id,
  userId: alert.userId,
  requesterName: alert.requesterName ?? undefined,
  requesterPhone: alert.requesterPhone ?? undefined,
  location: {
    latitude: alert.latitude,
    longitude: alert.longitude,
  },
  timestamp: alert.timestamp.toISOString(),
  status: alert.status,
  escalationLevel: alert.escalationLevel >= 2 ? 2 : 1,
  responders: alert.responders.map(mapResponder),
});

export const sosService = {
  async triggerSOS(userId: string, location: z.infer<typeof triggerSOSSchema>['location']) {
    const requester = await prisma.user.findUnique({ where: { id: userId } });

    const created = await prisma.sosAlert.create({
      data: {
        userId,
        requesterName: requester?.name,
        requesterPhone: requester?.phone,
        latitude: location.latitude,
        longitude: location.longitude,
        status: 'active',
        escalationLevel: 1,
      },
      include: {
        responders: {
          select: {
            userId: true,
            status: true,
            etaMinutes: true,
            updatedAt: true,
          },
        },
      },
    });

    const alert = toSOSAlert(created);

    const trustedContacts = await contactService.list(userId);
    const nearbyUserIds = (await geofenceService.notifyNearbyUsers(location, 5)).filter((entry) => entry !== userId);
    const nearbyGuardians = await guardianService.getNearbyGuardians(location, 2, userId);

    notificationService.sendPushNotification([], 'SOS', 'Trusted contact triggered an SOS alert', {
      sosAlertId: alert.id,
      trustedContactPhones: trustedContacts.map((contact) => contact.phone).join(','),
    });

    notificationService.sendPushNotification(nearbyUserIds, 'SOS', 'Emergency SOS alert reported nearby', {
      sosAlertId: alert.id,
    });

    notificationService.sendPushNotification(
      nearbyGuardians.map((entry) => entry.id),
      'SOS',
      'Guardian request: SOS within 2km. You are marked available to help.',
      {
        sosAlertId: alert.id,
        requesterName: requester?.name ?? 'Nearby user',
        requesterPhone: requester?.phone ?? '',
      }
    );

    return alert;
  },

  async getActiveAlerts() {
    const alerts = await prisma.sosAlert.findMany({
      where: { status: 'active' },
      orderBy: { timestamp: 'desc' },
      include: {
        responders: {
          select: {
            userId: true,
            status: true,
            etaMinutes: true,
            updatedAt: true,
          },
        },
      },
    });

    return alerts.map(toSOSAlert);
  },

  async resolveSOS(alertId: string, userId: string) {
    const alert = await prisma.sosAlert.findUnique({
      where: { id: alertId },
      include: {
        responders: {
          select: {
            userId: true,
            status: true,
            etaMinutes: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!alert) {
      throw new AppError('SOS alert not found', 404);
    }

    if (alert.userId !== userId) {
      throw new AppError('You can only resolve your own SOS alert', 403);
    }

    const updated = await prisma.sosAlert.update({
      where: { id: alertId },
      data: { status: 'resolved' },
      include: {
        responders: {
          select: {
            userId: true,
            status: true,
            etaMinutes: true,
            updatedAt: true,
          },
        },
      },
    });

    return toSOSAlert(updated);
  },

  async getAlertStatus(alertId: string) {
    const alert = await prisma.sosAlert.findUnique({
      where: { id: alertId },
      include: {
        responders: {
          select: {
            userId: true,
            status: true,
            etaMinutes: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!alert) {
      throw new AppError('SOS alert not found', 404);
    }

    return toSOSAlert(alert);
  },

  async respondToSOS(alertId: string, responderUserId: string, status: 'coming' | 'unable', etaMinutes?: number) {
    const alert = await prisma.sosAlert.findUnique({
      where: { id: alertId },
      include: {
        responders: {
          select: {
            userId: true,
            status: true,
            etaMinutes: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!alert) {
      throw new AppError('SOS alert not found', 404);
    }

    if (alert.status !== 'active') {
      throw new AppError('SOS alert is no longer active', 400);
    }

    if (alert.userId === responderUserId) {
      throw new AppError('You cannot respond to your own SOS alert', 400);
    }

    const existingResponder = alert.responders.find((entry) => entry.userId === responderUserId);

    if (existingResponder) {
      await prisma.sosResponder.update({
        where: {
          alertId_userId: {
            alertId,
            userId: responderUserId,
          },
        },
        data: {
          status: status as SosResponderStatus,
          etaMinutes: etaMinutes ?? null,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.sosResponder.create({
        data: {
          alertId,
          userId: responderUserId,
          status: status as SosResponderStatus,
          etaMinutes: etaMinutes ?? null,
          updatedAt: new Date(),
        },
      });

      if (status === 'coming') {
        await guardianService.recordAssist(responderUserId);
      }
    }

    if (status === 'coming' && alert.escalationLevel < 2) {
      await prisma.sosAlert.update({
        where: { id: alertId },
        data: { escalationLevel: 2 },
      });
    }

    return this.getAlertStatus(alertId);
  },
};
