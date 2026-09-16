import { Prisma } from '@prisma/client';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { sha256Hex } from '../crypto/hybridCryptoService';
import { prisma } from '../prisma';
import { hashPassword, verifyPassword } from './passwords';
import { JwtPayload } from './passport';

export const authRouter = Router();

function issueToken(vpa: string): { token: string; expiresIn: string } {
  const payload: JwtPayload = { sub: vpa };
  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
  return { token, expiresIn: env.jwtExpiresIn };
}

function publicProfile(user: {
  username: string;
  vpa: string;
  displayName: string;
  balance: Prisma.Decimal;
  createdAt: Date;
}) {
  return {
    username: user.username,
    vpa: user.vpa,
    displayName: user.displayName,
    balance: user.balance.toString(),
    createdAt: user.createdAt,
  };
}

const signupSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9_]+$/, 'lowercase letters, numbers, and underscores only'),
  displayName: z.string().min(1).max(40),
  password: z.string().min(8, 'at least 8 characters'),
  pin: z.string().regex(/^\d{4,6}$/, '4 to 6 digits'),
});

/**
 * Create a new OffPay user. Every signup gets a welcome balance (there's no
 * real bank behind this demo) and picks a login password plus a separate
 * UPI-style PIN used only to authorize payments — see paymentService.
 */
authRouter.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  }
  const { username, displayName, password, pin } = parsed.data;
  const vpa = `${username}@${env.vpaDomain}`;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: 'username_taken' });
  }

  const user = await prisma.user.create({
    data: {
      username,
      vpa,
      displayName,
      passwordHash: await hashPassword(password),
      pinHash: sha256Hex(pin),
      balance: env.signupBonus,
    },
  });

  const { token, expiresIn } = issueToken(user.vpa);
  res.status(201).json({ token, expiresIn, user: publicProfile(user) });
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const { token, expiresIn } = issueToken(user.vpa);
  res.json({ token, expiresIn, user: publicProfile(user) });
});
