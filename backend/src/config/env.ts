import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET', 'change-me-in-production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '2h',
  idempotencyTtlSeconds: Number(process.env.IDEMPOTENCY_TTL_SECONDS ?? 86400),
  packetMaxAgeSeconds: Number(process.env.PACKET_MAX_AGE_SECONDS ?? 86400),
  vpaDomain: process.env.VPA_DOMAIN ?? 'offpay',
  signupBonus: process.env.SIGNUP_BONUS ?? '1000.00',
};
