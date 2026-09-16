import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashPassword } from '../src/auth/passwords';
import { decrypt, encrypt, sha256Hex } from '../src/crypto/hybridCryptoService';
import { serverKeyHolder } from '../src/crypto/serverKeyHolder';
import { prisma } from '../src/prisma';
import { bridgeIngestionService } from '../src/services/bridgeIngestionService';
import { idempotencyService } from '../src/services/idempotencyService';
import { createPaymentPacket } from '../src/services/paymentService';
import { PaymentInstruction } from '../src/types';

const PIN = '1234';

async function ensureTestUser(vpa: string, username: string, displayName: string) {
  return prisma.user.upsert({
    where: { vpa },
    update: {},
    create: {
      vpa,
      username,
      displayName,
      passwordHash: await hashPassword('irrelevant-for-these-tests'),
      pinHash: sha256Hex(PIN),
      balance: '5000.00',
    },
  });
}

/**
 * Requires a running PostgreSQL reachable via DATABASE_URL, migrated with
 * `prisma migrate dev`. Mirrors upstream's @SpringBootTest, which ran
 * against a real (in-memory H2) database rather than mocks.
 */
describe('bridge ingestion pipeline', () => {
  beforeEach(async () => {
    idempotencyService.clear();
    await ensureTestUser('alice@offpay', 'alice', 'Alice');
    await ensureTestUser('bob@offpay', 'bob', 'Bob');
  });

  it('settles a single packet delivered by three bridges exactly once', async () => {
    const aliceBefore = await prisma.user.findUniqueOrThrow({ where: { vpa: 'alice@offpay' } });
    const bobBefore = await prisma.user.findUniqueOrThrow({ where: { vpa: 'bob@offpay' } });

    // One packet, delivered from 3 "bridges" simultaneously.
    const packet = createPaymentPacket('alice@offpay', 'bob@offpay', '100.00', PIN, 5);

    const outcomes = await Promise.all(
      ['bridge-0', 'bridge-1', 'bridge-2'].map((node) => bridgeIngestionService.ingest(packet, node, 3)),
    );

    const settled = outcomes.filter((r) => r.outcome === 'SETTLED');
    const duplicates = outcomes.filter((r) => r.outcome === 'DUPLICATE_DROPPED');

    expect(settled).toHaveLength(1);
    expect(duplicates).toHaveLength(2);

    const aliceAfter = await prisma.user.findUniqueOrThrow({ where: { vpa: 'alice@offpay' } });
    const bobAfter = await prisma.user.findUniqueOrThrow({ where: { vpa: 'bob@offpay' } });

    expect(aliceAfter.balance.toString()).toBe(aliceBefore.balance.minus(new Prisma.Decimal('100.00')).toString());
    expect(bobAfter.balance.toString()).toBe(bobBefore.balance.plus(new Prisma.Decimal('100.00')).toString());
  });

  it('rejects a tampered ciphertext', async () => {
    const packet = createPaymentPacket('alice@offpay', 'bob@offpay', '50.00', PIN, 5);

    const chars = packet.ciphertext.split('');
    const mid = Math.floor(chars.length / 2);
    chars[mid] = chars[mid] === 'A' ? 'B' : 'A';
    packet.ciphertext = chars.join('');

    const result = await bridgeIngestionService.ingest(packet, 'bridge-x', 1);
    expect(result.outcome).toBe('INVALID');
  });

  it('round-trips encrypt/decrypt', () => {
    const original: PaymentInstruction = {
      senderVpa: 'alice@offpay',
      receiverVpa: 'bob@offpay',
      amount: '123.45',
      pinHash: 'abcdef',
      nonce: 'nonce-1',
      signedAt: Date.now(),
    };

    const ciphertext = encrypt(original, serverKeyHolder.getPublicKey());
    const decrypted = decrypt(ciphertext);

    expect(decrypted.senderVpa).toBe(original.senderVpa);
    expect(decrypted.receiverVpa).toBe(original.receiverVpa);
    expect(decrypted.amount).toBe(original.amount);
    expect(decrypted.nonce).toBe(original.nonce);
  });
});
