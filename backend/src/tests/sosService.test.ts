import { sosService } from '../services/sosService';
import { store } from '../services/store';

jest.mock(
  'firebase/app',
  () => ({
    getApps: jest.fn(() => []),
    getApp: jest.fn(() => ({})),
    initializeApp: jest.fn(() => ({})),
  }),
  { virtual: true }
);

jest.mock(
  'firebase/firestore',
  () => ({
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn(),
    query: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
  }),
  { virtual: true }
);

describe('sosService', () => {
  beforeEach(() => {
    store.users.length = 0;
    store.contacts.length = 0;
    store.sosAlerts.length = 0;
    store.notificationEvents.length = 0;

    store.users.push({
      id: 'initiator',
      name: 'Initiator',
      phone: '08000000004',
      email: 'initiator@example.com',
      photoUrl: '',
      passwordHash: 'hash',
      homeLocation: { latitude: 6.5244, longitude: 3.3792 },
      trustedContacts: [],
      guardianAvailable: false,
      guardianVerificationBadge: 'NONE',
      guardianAssistCount: 0,
      createdAt: new Date().toISOString(),
    });

    store.users.push({
      id: 'guardian-near',
      name: 'Guardian Near',
      phone: '08000001001',
      email: 'guardian-near@example.com',
      photoUrl: '',
      passwordHash: 'hash',
      homeLocation: { latitude: 6.5246, longitude: 3.3791 },
      trustedContacts: [],
      guardianAvailable: true,
      guardianVerificationBadge: 'NONE',
      guardianAssistCount: 0,
      createdAt: new Date().toISOString(),
    });

    store.users.push({
      id: 'guardian-far',
      name: 'Guardian Far',
      phone: '08000001002',
      email: 'guardian-far@example.com',
      photoUrl: '',
      passwordHash: 'hash',
      homeLocation: { latitude: 6.61, longitude: 3.5 },
      trustedContacts: [],
      guardianAvailable: true,
      guardianVerificationBadge: 'NONE',
      guardianAssistCount: 0,
      createdAt: new Date().toISOString(),
    });

    store.contacts.push({
      id: 'contact-1',
      userId: 'initiator',
      contactName: 'Sister',
      phone: '08000000005',
      relationship: 'Family',
      createdAt: new Date().toISOString(),
    });
  });

  it('creates an active SOS alert and notifies nearby guardians within 2km', () => {
    const alert = sosService.triggerSOS('initiator', { latitude: 6.5244, longitude: 3.3792 });

    expect(alert.status).toBe('active');
    expect(alert.requesterName).toBe('Initiator');
    expect(alert.requesterPhone).toBe('08000000004');
    expect(store.sosAlerts).toHaveLength(1);
    expect(store.notificationEvents.length).toBeGreaterThanOrEqual(2);

    const guardianEvent = store.notificationEvents.find((event) =>
      event.message.includes('Guardian request')
    );

    expect(guardianEvent).toBeDefined();
    expect(guardianEvent?.recipientUserIds).toContain('guardian-near');
    expect(guardianEvent?.recipientUserIds).not.toContain('guardian-far');
  });

  it('prevents user from responding to own SOS alert', () => {
    const alert = sosService.triggerSOS('initiator', { latitude: 6.5244, longitude: 3.3792 });

    expect(() =>
      sosService.respondToSOS(alert.id, 'initiator', 'coming', 5)
    ).toThrow('You cannot respond to your own SOS alert');
  });

  it('awards guardian assist and badge progression on first coming response', () => {
    const alert = sosService.triggerSOS('initiator', { latitude: 6.5244, longitude: 3.3792 });

    const updated = sosService.respondToSOS(alert.id, 'guardian-near', 'coming', 6);
    const guardian = store.users.find((entry) => entry.id === 'guardian-near');

    expect(updated.escalationLevel).toBe(2);
    expect(updated.responders).toHaveLength(1);
    expect(guardian?.guardianAssistCount).toBe(1);
    expect(guardian?.guardianVerificationBadge).toBe('NONE');
  });

  it('queues multiple responders without duplicating entries', () => {
    const alert = sosService.triggerSOS('initiator', { latitude: 6.5244, longitude: 3.3792 });

    // First responder marks unable
    const resp1 = sosService.respondToSOS(alert.id, 'guardian-near', 'unable');
    expect(resp1.responders).toHaveLength(1);
    expect(resp1.responders[0].userId).toBe('guardian-near');
    expect(resp1.responders[0].status).toBe('unable');

    // Same responder updates to coming
    const resp2 = sosService.respondToSOS(alert.id, 'guardian-near', 'coming', 8);
    expect(resp2.responders).toHaveLength(1);
    expect(resp2.responders[0].status).toBe('coming');
    expect(resp2.escalationLevel).toBe(2);

    // Second responder adds to queue
    const resp3 = sosService.respondToSOS(alert.id, 'guardian-far', 'coming', 12);
    expect(resp3.responders).toHaveLength(2);
    expect(resp3.escalationLevel).toBe(2);
  });

  it('does not record assist for unable response', () => {
    const alert = sosService.triggerSOS('initiator', { latitude: 6.5244, longitude: 3.3792 });
    const guardianBefore = store.users.find((entry) => entry.id === 'guardian-near')!;
    const assistBefore = guardianBefore.guardianAssistCount;

    sosService.respondToSOS(alert.id, 'guardian-near', 'unable');
    const guardianAfter = store.users.find((entry) => entry.id === 'guardian-near')!;

    expect(guardianAfter.guardianAssistCount).toBe(assistBefore);
  });

  it('prevents responding to resolved SOS alert', () => {
    const alert = sosService.triggerSOS('initiator', { latitude: 6.5244, longitude: 3.3792 });

    sosService.resolveSOS(alert.id, 'initiator');

    expect(() =>
      sosService.respondToSOS(alert.id, 'guardian-near', 'coming', 5)
    ).toThrow('SOS alert is no longer active');
  });

  it('only initiator can resolve their own SOS alert', () => {
    const alert = sosService.triggerSOS('initiator', { latitude: 6.5244, longitude: 3.3792 });

    expect(() =>
      sosService.resolveSOS(alert.id, 'guardian-near')
    ).toThrow('You can only resolve your own SOS alert');

    const resolved = sosService.resolveSOS(alert.id, 'initiator');
    expect(resolved.status).toBe('resolved');
  });
});
