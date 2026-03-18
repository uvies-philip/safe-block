import { createServer } from 'node:http';

import { Server } from 'socket.io';

import { createApp } from './app';
import { notificationService } from './services/notificationService';
import { env } from './utils/env';

const app = createApp();
const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: env.clientOrigin === '*' ? true : env.clientOrigin,
  },
});

io.on('connection', (socket) => {
  socket.on('alerts:subscribe', (userId: string) => {
    socket.join(`user:${userId}`);
  });
});

server.listen(env.port, () => {
  notificationService.startRetryProcessor();
  console.log(`SafeBlock backend listening on port ${env.port}`);
});
