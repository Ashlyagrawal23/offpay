import { Router } from 'express';
import { z } from 'zod';
import { sha256Hex } from '../crypto/hybridCryptoService';
import { serverKeyHolder } from '../crypto/serverKeyHolder';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../prisma';
import { bridgeIngestionService } from '../services/bridgeIngestionService';
import { idempotencyService } from '../services/idempotencyService';
import { meshSimulatorService } from '../services/meshSimulatorService';
import { createPaymentPacket } from '../services/paymentService';
import { MeshPacket } from '../types';

export const apiRouter = Router();

// ------------------------------------------------------------------ key

apiRouter.get('/server-key', (_req, res) => {
  res.json({
    publicKey: serverKeyHolder.getPublicKeyBase64(),
    algorithm: 'RSA-2048 / OAEP-SHA256',
    hybridScheme: 'RSA-OAEP encrypts an AES-256-GCM session key',
  });
});

// ----------------------------------------------------------------- me

/** Your own profile — display name, VPA, current balance. */
apiRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { vpa: req.user!.vpa } });
  res.json({
    username: user.username,
    vpa: user.vpa,
    displayName: user.displayName,
    balance: user.balance.toString(),
    createdAt: user.createdAt,
  });
});

/** Other OffPay users you can send money to — no balances exposed here. */
apiRouter.get('/users', requireAuth, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { vpa: { not: req.user!.vpa } },
    select: { vpa: true, displayName: true },
    orderBy: { displayName: 'asc' },
  });
  res.json(users);
});

// ------------------------------------------------------------ payments

const sendPaymentSchema = z.object({
  receiverVpa: z.string().min(1),
  amount: z.union([z.string(), z.number()]).transform(String),
  pin: z.string().min(1),
  ttl: z.number().int().min(0).optional(),
});

/**
 * Compose and inject a payment — you are always the sender (never
 * spoofable from the request body). The PIN is checked against what was
 * set at signup before anything is encrypted or injected into the mesh;
 * a wrong PIN never reaches the crypto layer at all.
 */
apiRouter.post('/payments/send', requireAuth, async (req, res) => {
  const parsed = sendPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  }
  const { receiverVpa, amount, pin, ttl } = parsed.data;

  if (receiverVpa === req.user!.vpa) {
    return res.status(400).json({ error: 'cannot_pay_self' });
  }

  const [sender, receiver] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { vpa: req.user!.vpa } }),
    prisma.user.findUnique({ where: { vpa: receiverVpa } }),
  ]);

  if (!receiver) {
    return res.status(404).json({ error: 'unknown_receiver' });
  }
  if (sha256Hex(pin) !== sender.pinHash) {
    // 400, not 401 — a wrong PIN is a bad request, not an authentication
    // failure. The frontend treats any 401 as "your session expired" and
    // wipes the JWT, which would otherwise log the user out just for
    // mistyping their PIN.
    return res.status(400).json({ error: 'incorrect_pin' });
  }

  const packet = createPaymentPacket(sender.vpa, receiverVpa, amount, pin, ttl ?? 5);
  meshSimulatorService.inject('my-phone', packet);

  res.json({
    packetId: packet.packetId,
    ciphertextPreview: `${packet.ciphertext.slice(0, 64)}...`,
    ttl: packet.ttl,
    injectedAt: 'my-phone',
  });
});

// -------------------------------------------------------------- mesh sim

apiRouter.get('/mesh/state', (_req, res) => {
  const deviceData = meshSimulatorService.getDevices().map((d) => ({
    deviceId: d.deviceId,
    hasInternet: d.hasInternet,
    packetCount: d.packetCount(),
    packetIds: d.getHeldPackets().map((p) => p.packetId.slice(0, 8)),
  }));

  res.json({ devices: deviceData, idempotencyCacheSize: idempotencyService.size() });
});

apiRouter.post('/mesh/gossip', requireAuth, (_req, res) => {
  res.json(meshSimulatorService.gossipOnce());
});

/**
 * "The bridge phone walks outside and gets signal." It uploads everything
 * it holds to /api/bridge/ingest, in parallel — this is the moment the
 * duplicate-storm idempotency case is exercised: if multiple bridge nodes
 * hold the same packet, only one upload should settle.
 */
apiRouter.post('/mesh/flush', requireAuth, async (_req, res) => {
  const uploads = meshSimulatorService.collectBridgeUploads();

  const results = await Promise.all(
    uploads.map(async (up) => {
      const r = await bridgeIngestionService.ingest(up.packet, up.bridgeNodeId, 5 - up.packet.ttl);
      return {
        bridgeNode: up.bridgeNodeId,
        packetId: up.packet.packetId.slice(0, 8),
        outcome: r.outcome,
        reason: r.reason ?? '',
        transactionId: r.transactionId ?? -1,
      };
    }),
  );

  res.json({ uploadsAttempted: uploads.length, results });
});

apiRouter.post('/mesh/reset', requireAuth, (_req, res) => {
  meshSimulatorService.resetMesh();
  idempotencyService.clear();
  res.json({ status: 'mesh and idempotency cache cleared' });
});

// -------------------------------------------------------------- bridge

const meshPacketSchema = z.object({
  packetId: z.string().min(1),
  ttl: z.number().int().min(0),
  createdAt: z.number(),
  ciphertext: z.string().min(1),
});

/**
 * THE PRODUCTION ENDPOINT. In a real deployment, the phone's bridge logic
 * POSTs here whenever the device has internet and is holding mesh packets.
 * Deliberately not behind user JWT auth — a real bridge node would
 * authenticate via mutual TLS / signed device certs, not a user login.
 */
apiRouter.post('/bridge/ingest', async (req, res) => {
  const parsed = meshPacketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_packet', details: parsed.error.flatten() });
  }
  const packet: MeshPacket = parsed.data;
  const bridgeNodeId = (req.header('X-Bridge-Node-Id') as string) ?? 'unknown';
  const hopCount = Number(req.header('X-Hop-Count') ?? 0);

  const result = await bridgeIngestionService.ingest(packet, bridgeNodeId, hopCount);
  res.json(result);
});

// --------------------------------------------------------- transactions

/** Your transaction history — payments you sent or received, most recent first. */
apiRouter.get('/transactions', requireAuth, async (req, res) => {
  const vpa = req.user!.vpa;
  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ senderVpa: vpa }, { receiverVpa: vpa }] },
    orderBy: { id: 'desc' },
    take: 20,
  });
  res.json(transactions);
});
