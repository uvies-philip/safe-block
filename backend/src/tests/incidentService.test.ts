import { incidentService } from '../services/incidentService';
import { store } from '../services/store';

describe('incidentService', () => {
  beforeEach(() => {
    store.users.length = 0;
    store.incidents.length = 0;
    store.notificationEvents.length = 0;

    store.users.push({
      id: 'reporter',
      name: 'Reporter',
      phone: '08000000003',
      email: 'reporter@example.com',
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
      id: 'voter',
      name: 'Voter',
      phone: '08000000009',
      email: 'voter@example.com',
      photoUrl: '',
      passwordHash: 'hash',
      homeLocation: { latitude: 6.5245, longitude: 3.3793 },
      trustedContacts: [],
      guardianAvailable: false,
      guardianVerificationBadge: 'NONE',
      guardianAssistCount: 0,
      createdAt: new Date().toISOString(),
    });

    store.users.push({
      id: 'reporter-2',
      name: 'Reporter Two',
      phone: '08000000010',
      email: 'reporter2@example.com',
      photoUrl: '',
      passwordHash: 'hash',
      homeLocation: { latitude: 6.5246, longitude: 3.3791 },
      trustedContacts: [],
      guardianAvailable: false,
      guardianVerificationBadge: 'NONE',
      guardianAssistCount: 0,
      createdAt: new Date().toISOString(),
    });

    store.users.push({
      id: 'reporter-3',
      name: 'Reporter Three',
      phone: '08000000011',
      email: 'reporter3@example.com',
      photoUrl: '',
      passwordHash: 'hash',
      homeLocation: { latitude: 6.5247, longitude: 3.3794 },
      trustedContacts: [],
      guardianAvailable: false,
      guardianVerificationBadge: 'NONE',
      guardianAssistCount: 0,
      createdAt: new Date().toISOString(),
    });
  });

  it('submits an incident with anonymous/image metadata and records notification event', () => {
    const incident = incidentService.submitIncident('reporter', {
      type: 'ROBBERY',
      description: 'Armed robbery reported near the bus stop in Lekki.',
      anonymous: true,
      imageUri: 'https://cdn.example.com/evidence.jpg',
      location: { latitude: 6.5244, longitude: 3.3792 },
    });

    expect(store.incidents).toHaveLength(1);
    expect(incident.type).toBe('ROBBERY');
    expect(incident.anonymous).toBe(true);
    expect(incident.imageUri).toContain('evidence.jpg');
    expect(store.notificationEvents).toHaveLength(1);
  });

  it('upvote is idempotent per user and does not double count', () => {
    const incident = incidentService.submitIncident('reporter', {
      type: 'ROADBLOCK',
      description: 'Multiple tyres and barricades blocking road.',
      location: { latitude: 6.5244, longitude: 3.3792 },
    });

    const first = incidentService.upvoteIncident(incident.id, 'voter');
    const second = incidentService.upvoteIncident(incident.id, 'voter');

    expect(first.upvotes).toBe(1);
    expect(second.upvotes).toBe(1);
    expect(second.upvotedBy).toEqual(['voter']);
  });

  it('auto-verifies clustered incidents after 3 independent reporters submit similar reports', () => {
    incidentService.submitIncident('reporter', {
      type: 'ROBBERY',
      description: 'Robbery incident one near central bus stop.',
      location: { latitude: 6.5244, longitude: 3.3792 },
    });

    incidentService.submitIncident('reporter-2', {
      type: 'ROBBERY',
      description: 'Robbery incident two nearby same area.',
      location: { latitude: 6.5246, longitude: 3.3794 },
    });

    incidentService.submitIncident('reporter-3', {
      type: 'ROBBERY',
      description: 'Robbery incident three confirms the same zone.',
      location: { latitude: 6.5245, longitude: 3.3793 },
    });

    const robberyIncidents = store.incidents.filter((entry) => entry.type === 'ROBBERY');
    expect(robberyIncidents).toHaveLength(3);
    expect(robberyIncidents.every((entry) => entry.verified)).toBe(true);
    expect(robberyIncidents.every((entry) => entry.verificationCount >= 3)).toBe(true);
    expect(robberyIncidents[0]?.verifiedBy).toEqual(
      expect.arrayContaining(['reporter', 'reporter-2', 'reporter-3'])
    );
  });

  it('does not auto-verify clustered incidents when reports are from the same reporter', () => {
    incidentService.submitIncident('reporter', {
      type: 'ROADBLOCK',
      description: 'Roadblock report one in same location.',
      location: { latitude: 6.5244, longitude: 3.3792 },
    });

    incidentService.submitIncident('reporter', {
      type: 'ROADBLOCK',
      description: 'Roadblock report two in same location.',
      location: { latitude: 6.5245, longitude: 3.3792 },
    });

    incidentService.submitIncident('reporter', {
      type: 'ROADBLOCK',
      description: 'Roadblock report three in same location.',
      location: { latitude: 6.5246, longitude: 3.3792 },
    });

    const roadblocks = store.incidents.filter((entry) => entry.type === 'ROADBLOCK');
    expect(roadblocks).toHaveLength(3);
    expect(roadblocks.every((entry) => entry.verified === false)).toBe(true);
  });

  it('applies recency penalty so older incidents score lower than fresh ones', () => {
    const oldIncident = incidentService.submitIncident('reporter', {
      type: 'ACCIDENT',
      description: 'Older accident report for trust comparison.',
      location: { latitude: 6.5244, longitude: 3.3792 },
    });

    const freshIncident = incidentService.submitIncident('reporter-2', {
      type: 'ACCIDENT',
      description: 'Fresh accident report for trust comparison.',
      location: { latitude: 6.5245, longitude: 3.3794 },
    });

    oldIncident.timestamp = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    const oldUpdated = incidentService.upvoteIncident(oldIncident.id, 'voter');
    const freshUpdated = incidentService.upvoteIncident(freshIncident.id, 'reporter-3');

    expect(oldUpdated.trustScore).toBeLessThan(freshUpdated.trustScore);
  });

  it('increases reporter credibility and trust after incident verification milestones', () => {
    const incident = incidentService.submitIncident('reporter', {
      type: 'FIRE',
      description: 'Fire report requiring multi-user verification.',
      location: { latitude: 6.5244, longitude: 3.3792 },
    });

    const baselineCredibility = incident.reporterCredibilityScore;
    const baselineTrust = incident.trustScore;

    incidentService.verifyIncident(incident.id, 'voter');
    incidentService.verifyIncident(incident.id, 'reporter-2');
    const verified = incidentService.verifyIncident(incident.id, 'reporter-3');

    expect(verified.verified).toBe(true);
    expect(verified.reporterCredibilityScore).toBeGreaterThan(baselineCredibility);
    expect(verified.trustScore).toBeGreaterThan(baselineTrust);
  });

  it('returns hotspot clusters with risk score and time-of-day aggregation', () => {
    incidentService.submitIncident('reporter', {
      type: 'ROBBERY',
      description: 'Hotspot report one around same corridor.',
      location: { latitude: 6.5244, longitude: 3.3792 },
    });

    incidentService.submitIncident('reporter-2', {
      type: 'ROADBLOCK',
      description: 'Hotspot report two around same corridor.',
      location: { latitude: 6.5245, longitude: 3.3793 },
    });

    incidentService.submitIncident('reporter-3', {
      type: 'SUSPICIOUS_ACTIVITY',
      description: 'Hotspot report three around same corridor.',
      location: { latitude: 6.5246, longitude: 3.3794 },
    });

    incidentService.submitIncident('voter', {
      type: 'FIRE',
      description: 'Far away incident should not enter hotspot zone.',
      location: { latitude: 6.61, longitude: 3.5 },
    });

    const result = incidentService.fetchIncidentHotspots(6.5244, 3.3792, 3, 48, 0.5, 2);

    expect(result.hotspots.length).toBeGreaterThanOrEqual(1);
    expect(result.hotspots[0]?.incidentCount).toBeGreaterThanOrEqual(3);
    expect(result.hotspots[0]?.riskScore).toBeGreaterThan(0);
    expect(result.hotspots[0]?.timeOfDay).toEqual(
      expect.objectContaining({
        morning: expect.any(Number),
        afternoon: expect.any(Number),
        evening: expect.any(Number),
        night: expect.any(Number),
      })
    );
    expect(result.hotspots[0]?.byType).toEqual(
      expect.objectContaining({ ROBBERY: expect.any(Number) })
    );
    expect(result.hotspots[0]?.peakHour).toMatch(/^\d{2}:00$/);
  });
});
