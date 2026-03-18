import { api } from './api';
import { notificationService } from './notificationService';
import { getBestEffortLocation, isLikelyOfflineError, sleep } from './sosHelpers';
import { SOSAlert, TriggerSOSResult } from '../types';

type TriggerSOSOptions = {
  smsEnabled?: boolean;
};

type FirestoreSaver = (alert: SOSAlert) => Promise<void>;

type QueuedSOS = {
  location: {
    latitude: number;
    longitude: number;
  };
  options: TriggerSOSOptions;
  attempts: number;
};

let firestoreSaver: FirestoreSaver | null = null;
const queuedSOS: QueuedSOS[] = [];
let queueWorkerRunning = false;

const saveAlertToFirestore = async (alert: SOSAlert) => {
  if (!firestoreSaver) {
    throw new Error('FIRESTORE_NOT_CONFIGURED');
  }

  await firestoreSaver(alert);
};

const processQueuedSOS = async () => {
  if (queueWorkerRunning || queuedSOS.length === 0) {
    return;
  }

  queueWorkerRunning = true;

  try {
    while (queuedSOS.length > 0) {
      const current = queuedSOS[0];

      try {
        await api.post<SOSAlert>('/sos', { location: current.location });
        queuedSOS.shift();
      } catch (error) {
        current.attempts += 1;
        const backoffMs = Math.min(5000 * current.attempts, 5 * 60 * 1000);
        await sleep(backoffMs);

        if (!isLikelyOfflineError(error)) {
          queuedSOS.shift();
        }
      }
    }
  } finally {
    queueWorkerRunning = false;
  }
};

export const sosService = {
  registerFirestoreSaver(saver: FirestoreSaver) {
    firestoreSaver = saver;
  },

  async triggerSOS(options: TriggerSOSOptions = {}): Promise<TriggerSOSResult> {
    const { location, source } = await getBestEffortLocation();

    const payload = { location };

    let alert: SOSAlert | null = null;
    let queued = false;

    try {
      const response = await api.post<SOSAlert>('/sos', payload);
      alert = response.data;
    } catch (error) {
      if (isLikelyOfflineError(error)) {
        queuedSOS.push({ attempts: 0, location, options });
        processQueuedSOS().catch(() => undefined);
        queued = true;
      } else {
        throw error;
      }
    }

    let notificationFailed = false;
    let smsFailed = false;
    let firestoreFailed = false;
    const nearbyAlertFailed = false;

    if (alert) {
      try {
        await notificationService.sendPushNotification(
          'SOS Alert Triggered',
          'Emergency signal sent to your trusted network.'
        );
      } catch {
        notificationFailed = true;
      }

      if (options.smsEnabled) {
        try {
          await api.post('/sos/sms', { alertId: alert.id });
        } catch {
          smsFailed = true;
        }
      }

      try {
        await saveAlertToFirestore(alert);
      } catch {
        firestoreFailed = true;
      }

    }

    return {
      alert,
      queued,
      locationSource: source,
      notificationFailed,
      smsFailed,
      firestoreFailed,
      nearbyAlertFailed,
    };
  },

  async sendPushAlerts() {
    return { status: 'queued' };
  },

  async sendSMSAlert() {
    return { status: 'deferred' };
  },

  async saveAlertToDatabase(alert: SOSAlert) {
    return alert;
  },

  async flushQueuedSOS() {
    await processQueuedSOS();
    return queuedSOS.length;
  },

  async fetchActiveAlerts() {
    const response = await api.get<SOSAlert[]>('/sos/active');
    return response.data;
  },

  async getAlertStatus(alertId: string) {
    const response = await api.get<SOSAlert>(`/sos/${alertId}`);
    return response.data;
  },

  async respondToSOS(payload: { alertId: string; status: 'coming' | 'unable'; etaMinutes?: number }) {
    const response = await api.post<SOSAlert>('/sos/respond', payload);
    return response.data;
  },
};
