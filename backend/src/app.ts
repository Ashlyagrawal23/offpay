import cors from 'cors';
import express, { Express } from 'express';
import { passport } from './auth/passport';
import { authRouter } from './auth/authRoutes';
import { apiRouter } from './routes/apiRoutes';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(passport.initialize());

  app.use('/api/auth', authRouter);
  app.use('/api', apiRouter);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}
