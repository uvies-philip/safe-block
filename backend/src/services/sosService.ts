import { z } from 'zod';

import { SOSAlert } from '../models/types';
import { createId } from '../utils/id';
import { AppError } from '../utils/errors';
import { contactService } from './contactService';
import { guardianService } from './guardianService';
import { geofenceService } from './geofenceService';
import { notificationService } from './notificationService';
import { store } from './store';

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

export const sosService = {
  triggerSOS(userId: string, location: z.infer<typeof triggerSOSSchema>['location']) {
    const requester = store.users.find((entry) => entry.id === userId);

    const alert: SOSAlert = {
      id: createId(),
      userId,
      requesterName: requester?.name,
      requesterPhone: requester?.phone,
      location,
      timestamp: new Date().toISOString(),
      status: 'active',
      escalationLevel: 1,
      responders: [],
    };

    store.sosAlerts.unshift(alert);

    const trustedContacts = contactService.list(userId);
    const nearbyUserIds = geofenceService.notifyNearbyUsers(location, 5).filter((entry) => entry !== userId);
    const nearbyGuardians = guardianService.getNearbyGuardians(location, 2, userId);

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

  getActiveAlerts() {
    return store.sosAlerts.filter((entry) => entry.status === 'active');
  },

  resolveSOS(alertId: string, userId: string) {
    const alert = store.sosAlerts.find((entry) => entry.id === alertId);

    if (!alert) {
      throw new AppError('SOS alert not found', 404);
    }

    if (alert.userId !== userId) {
      throw new AppError('You can only resolve your own SOS alert', 403);
    }

    alert.status = 'resolved';
    return alert;
  },

  getAlertStatus(alertId: string) {
    const alert = store.sosAlerts.find((entry) => entry.id === alertId);

    if (!alert) {
      throw new AppError('SOS alert not found', 404);
    }

    return alert;
  },

  respondToSOS(alertId: string, responderUserId: string, status: 'coming' | 'unable', etaMinutes?: number) {
    const alert = store.sosAlerts.find((entry) => entry.id === alertId);

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
    const payload = {
      userId: responderUserId,
      status,
      etaMinutes,
      updatedAt: new Date().toISOString(),
    };

    if (existingResponder) {
      existingResponder.status = payload.status;
      existingResponder.etaMinutes = payload.etaMinutes;
      existingResponder.updatedAt = payload.updatedAt;
    } else {
      alert.responders.push(payload);

      if (status === 'coming') {
        guardianService.recordAssist(responderUserId);
      }
    }

    if (status === 'coming') {
      alert.escalationLevel = 2;
    }

    return alert;
  },
};
