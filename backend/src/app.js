import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import { api } from './routes.js';
import { errorHandler, notFound } from './middleware/error.js';
import { logger } from './lib/logger.js';
import { UPLOAD_DIR } from './lib/storage.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('tiny', { stream: { write: (m) => logger.http?.(m.trim()) ?? logger.info(m.trim()) } }));

  app.use('/uploads', express.static(UPLOAD_DIR));
  app.use('/api', api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
