import { Router, Request, Response } from 'express';

import { store } from '../services/store';
import { generateSeedData } from '../utils/seedData';

export const seedRoutes = Router();

seedRoutes.post('/seed', (_request: Request, response: Response) => {
  const seedData = generateSeedData();

  // Clear existing data and repopulate
  store.users.length = 0;
  store.incidents.length = 0;
  store.sosAlerts.length = 0;
  store.notificationEvents.length = 0;
  store.refreshTokens.clear();

  store.users.push(...seedData.users);
  store.incidents.push(...seedData.incidents);
  store.sosAlerts.push(...seedData.sosAlerts);

  response.json({
    message: 'Seed data loaded successfully',
    stats: {
      users: store.users.length,
      incidents: store.incidents.length,
      sosAlerts: store.sosAlerts.length,
    },
  });
});

seedRoutes.delete('/seed', (_request: Request, response: Response) => {
  store.users.length = 0;
  store.incidents.length = 0;
  store.sosAlerts.length = 0;
  store.notificationEvents.length = 0;
  store.refreshTokens.clear();

  response.json({
    message: 'All seed data cleared',
  });
});
