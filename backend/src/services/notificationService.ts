import { NotificationEvent } from '../models/types';
import { createId } from '../utils/id';
import { store } from './store';

const RETRY_DELAYS_MS = [15000, 45000, 120000];
const PROCESSOR_INTERVAL_MS = 5000;

let retryProcessor: NodeJS.Timeout | null = null;

const shouldSimulateFailure = (event: NotificationEvent) => {
  if (event.metadata.forceDeliveryFailure === 'true') {
    return true;
  }

  const failuresBeforeSuccess = Number(event.metadata.failuresBeforeSuccess ?? '0');

  return Number.isFinite(failuresBeforeSuccess) && failuresBeforeSuccess > event.retryCount;
};

const attemptDelivery = (event: NotificationEvent, now = Date.now()) => {
  if (!shouldSimulateFailure(event)) {
    event.status = 'delivered';
    event.deliveredAt = new Date(now).toISOString();
    event.nextRetryAt = undefined;
    event.lastError = undefined;
    return;
  }

  event.retryCount += 1;
  event.lastError = 'Simulated transient delivery failure';

  if (event.retryCount > event.maxRetries) {
    event.status = 'failed';
    event.failedAt = new Date(now).toISOString();
    event.nextRetryAt = undefined;
    return;
  }

  const delay = RETRY_DELAYS_MS[event.retryCount - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 120000;
  event.status = 'retrying';
  event.nextRetryAt = new Date(now + delay).toISOString();
};

export const notificationService = {
  sendPushNotification(
    recipientUserIds: string[],
    category: 'SOS' | 'INCIDENT',
    message: string,
    metadata: Record<string, string>
  ) {
    const event: NotificationEvent = {
      id: createId(),
      recipientUserIds,
      category,
      message,
      createdAt: new Date().toISOString(),
      metadata,
      status: 'queued',
      retryCount: 0,
      maxRetries: 3,
    };

    store.notificationEvents.push(event);
    attemptDelivery(event);
    return event;
  },

  processRetryQueue(now = Date.now()) {
    for (const event of store.notificationEvents) {
      if (event.status !== 'retrying') {
        continue;
      }

      if (!event.nextRetryAt) {
        attemptDelivery(event, now);
        continue;
      }

      if (new Date(event.nextRetryAt).getTime() <= now) {
        attemptDelivery(event, now);
      }
    }
  },

  startRetryProcessor() {
    if (retryProcessor) {
      return;
    }

    retryProcessor = setInterval(() => {
      notificationService.processRetryQueue();
    }, PROCESSOR_INTERVAL_MS);
  },

  stopRetryProcessor() {
    if (!retryProcessor) {
      return;
    }

    clearInterval(retryProcessor);
    retryProcessor = null;
  },

  subscribeToLocationAlerts(userId: string) {
    return {
      userId,
      subscribedAt: new Date().toISOString(),
      status: 'subscribed',
    };
  },
};
