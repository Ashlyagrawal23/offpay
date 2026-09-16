import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { env } from '../config/env';
import { prisma } from '../prisma';

export interface JwtPayload {
  sub: string; // vpa
}

export interface AuthUser {
  id: number;
  vpa: string;
  username: string;
  displayName: string;
}

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.jwtSecret,
    },
    async (payload: JwtPayload, done) => {
      try {
        // Looked up fresh on every request (rather than trusting the JWT's
        // own claims) so a balance change or profile edit is reflected
        // immediately, not just after the token expires.
        const user = await prisma.user.findUnique({ where: { vpa: payload.sub } });
        if (!user) return done(null, false);
        const authUser: AuthUser = {
          id: user.id,
          vpa: user.vpa,
          username: user.username,
          displayName: user.displayName,
        };
        return done(null, authUser);
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);

export { passport };
