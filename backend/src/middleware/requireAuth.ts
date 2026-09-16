import { NextFunction, Request, Response } from 'express';
import { passport } from '../auth/passport';

/** Guards mutating demo/mesh endpoints. `/api/bridge/ingest` is deliberately excluded — see authRoutes.ts. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate('jwt', { session: false }, (err: unknown, user: Express.User | false) => {
    if (err || !user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    req.user = user;
    next();
  })(req, res, next);
}
