import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/authRoutes';
import { contactRoutes } from './routes/contactRoutes';
import { seedRoutes } from './routes/seedRoutes';
import { incidentRoutes } from './routes/incidentRoutes';
import { sosRoutes } from './routes/sosRoutes';
import { userRoutes } from './routes/userRoutes';
import { env } from './utils/env';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin === '*' ? true : env.clientOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'safeblock-backend' });
  });

  app.use('/dev', seedRoutes);
  app.use('/auth', authRoutes);
  app.use('/contacts', contactRoutes);
  app.use('/incidents', incidentRoutes);
  app.use('/sos', sosRoutes);
  app.use('/user', userRoutes);

  app.use(errorHandler);

  return app;
};
