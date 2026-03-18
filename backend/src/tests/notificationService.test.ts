import { notificationService } from '../services/notificationService';
import { store } from '../services/store';

describe('notificationService', () => {
  beforeEach(() => {
    store.notificationEvents.length = 0;
    jest.useRealTimers();
  });

  afterEach(() => {
    notificationService.stopRetryProcessor();
  });

  it('marks event delivered immediately when no failure is configured', () => {
    const event = notificationService.sendPushNotification(
      ['user-1'],
      'SOS',
      'Emergency SOS alert reported nearby',
      { sosAlertId: 'alert-1' }
    );

    expect(event.status).toBe('delivered');
    expect(event.retryCount).toBe(0);
    expect(event.deliveredAt).toBeDefined();
  });

  it('retries and eventually delivers when transient failure count is configured', () => {
    const event = notificationService.sendPushNotification(
      ['user-1'],
      'INCIDENT',
      'Incident alert',
      { incidentId: 'incident-1', failuresBeforeSuccess: '2' }
    );

    expect(event.status).toBe('retrying');
    expect(event.retryCount).toBe(1);
    expect(event.nextRetryAt).toBeDefined();

    notificationService.processRetryQueue(new Date(event.nextRetryAt as string).getTime());
    expect(event.status).toBe('retrying');
    expect(event.retryCount).toBe(2);

    notificationService.processRetryQueue(new Date(event.nextRetryAt as string).getTime());
    expect(event.status).toBe('delivered');
    expect(event.retryCount).toBe(2);
  });

  it('marks event failed after max retries when forced failure is enabled', () => {
    const event = notificationService.sendPushNotification(
      ['user-1'],
      'SOS',
      'Always fail delivery',
      { sosAlertId: 'alert-1', forceDeliveryFailure: 'true' }
    );

    while (event.status === 'retrying' && event.nextRetryAt) {
      notificationService.processRetryQueue(new Date(event.nextRetryAt).getTime());
    }

    expect(event.status).toBe('failed');
    expect(event.retryCount).toBe(4);
    expect(event.failedAt).toBeDefined();
    expect(event.lastError).toBe('Simulated transient delivery failure');
  });

  it('does not retry before nextRetryAt is due', () => {
    const event = notificationService.sendPushNotification(
      ['user-1'],
      'INCIDENT',
      'Incident alert',
      { incidentId: 'incident-2', failuresBeforeSuccess: '2' }
    );

    expect(event.status).toBe('retrying');
    const dueAt = new Date(event.nextRetryAt as string).getTime();

    notificationService.processRetryQueue(dueAt - 1);

    expect(event.status).toBe('retrying');
    expect(event.retryCount).toBe(1);
  });

  it('attempts retry immediately when nextRetryAt is missing for retrying event', () => {
    const event = notificationService.sendPushNotification(
      ['user-1'],
      'INCIDENT',
      'Incident alert',
      { incidentId: 'incident-3', failuresBeforeSuccess: '1' }
    );

    expect(event.status).toBe('retrying');
    event.nextRetryAt = undefined;

    notificationService.processRetryQueue(Date.now());

    expect(event.status).toBe('delivered');
    expect(event.retryCount).toBe(1);
    expect(event.deliveredAt).toBeDefined();
  });

  it('starts one processor interval and stops processing after stopRetryProcessor', () => {
    jest.useFakeTimers();
    const processSpy = jest.spyOn(notificationService, 'processRetryQueue');

    notificationService.startRetryProcessor();
    notificationService.startRetryProcessor();

    jest.advanceTimersByTime(12000);
    expect(processSpy).toHaveBeenCalledTimes(2);

    notificationService.stopRetryProcessor();
    jest.advanceTimersByTime(10000);
    expect(processSpy).toHaveBeenCalledTimes(2);

    processSpy.mockRestore();
  });
});
