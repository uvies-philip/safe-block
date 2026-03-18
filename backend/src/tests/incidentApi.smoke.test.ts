import request from 'supertest';

import { createApp } from '../app';
import { store } from '../services/store';

const app = createApp();

const createAuthHeader = async () => {
  const email = `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;
  const response = await request(app).post('/auth/register').send({
    name: 'Smoke Tester',
    phone: '08000001234',
    email,
    password: 'password123',
    photoUrl: '',
  });

  expect(response.status).toBe(201);
  const token = response.body?.tokens?.accessToken as string;
  expect(token).toBeTruthy();

  return `Bearer ${token}`;
};

describe('incident API smoke', () => {
  beforeEach(() => {
    store.users.length = 0;
    store.contacts.length = 0;
    store.incidents.length = 0;
    store.sosAlerts.length = 0;
    store.notificationEvents.length = 0;
    store.refreshTokens.clear();
  });

  it('returns paginated nearby incidents with metadata', async () => {
    const auth = await createAuthHeader();

    for (let index = 0; index < 5; index += 1) {
      const submit = await request(app)
        .post('/incidents')
        .set('Authorization', auth)
        .send({
          type: 'ROBBERY',
          description: `Smoke incident ${index + 1}`,
          location: { latitude: 6.5244 + index * 0.0001, longitude: 3.3792 + index * 0.0001 },
        });

      expect(submit.status).toBe(201);
    }

    const response = await request(app)
      .get('/incidents/nearby')
      .set('Authorization', auth)
      .query({ latitude: 6.5244, longitude: 3.3792, radiusKm: 5, limit: 2, offset: 1 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.total).toBe(5);
    expect(response.body.limit).toBe(2);
    expect(response.body.offset).toBe(1);
    expect(response.body.hasMore).toBe(true);
  });

  it('returns hotspot aggregates for nearby incidents', async () => {
    const auth = await createAuthHeader();

    const clusterPayloads = [
      { type: 'ROBBERY', description: 'Cluster report one', location: { latitude: 6.5244, longitude: 3.3792 } },
      { type: 'ROBBERY', description: 'Cluster report two', location: { latitude: 6.5245, longitude: 3.3793 } },
      { type: 'FIRE', description: 'Cluster report three', location: { latitude: 6.5246, longitude: 3.3794 } },
    ];

    for (const payload of clusterPayloads) {
      const submit = await request(app)
        .post('/incidents')
        .set('Authorization', auth)
        .send(payload);

      expect(submit.status).toBe(201);
    }

    const response = await request(app)
      .get('/incidents/hotspots')
      .set('Authorization', auth)
      .query({
        latitude: 6.5244,
        longitude: 3.3792,
        radiusKm: 10,
        windowHours: 24,
        gridSizeKm: 0.5,
        minIncidents: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body.generatedAt).toBeTruthy();
    expect(Array.isArray(response.body.hotspots)).toBe(true);
    expect(response.body.hotspots.length).toBeGreaterThan(0);

    const first = response.body.hotspots[0];
    expect(first.center).toEqual(
      expect.objectContaining({
        latitude: expect.any(Number),
        longitude: expect.any(Number),
      })
    );
    expect(first).toEqual(
      expect.objectContaining({
        incidentCount: expect.any(Number),
        avgTrustScore: expect.any(Number),
        riskScore: expect.any(Number),
        byType: expect.any(Object),
        timeOfDay: expect.objectContaining({
          morning: expect.any(Number),
          afternoon: expect.any(Number),
          evening: expect.any(Number),
          night: expect.any(Number),
        }),
      })
    );
  });
});
