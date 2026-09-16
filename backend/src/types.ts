/**
 * The over-the-wire packet format. This is what hops from phone to phone
 * via Bluetooth in the real system.
 *
 * Intermediate phones can read the outer fields (packetId, ttl, createdAt)
 * because they need them for routing and dedup. They cannot read
 * `ciphertext` — that's encrypted with the server's public key.
 *
 * A malicious intermediate could rewrite `packetId` or `createdAt`, which is
 * exactly why the server uses the ciphertext's hash — not packetId — as the
 * idempotency key (see HybridCryptoService.hashCiphertext).
 */
export interface MeshPacket {
  packetId: string;
  ttl: number;
  createdAt: number; // epoch millis
  ciphertext: string; // base64(RSA-encrypted AES key + AES-GCM ciphertext)
}

/**
 * The decrypted payment instruction. Critical fields:
 *   - nonce: unique per payment intent, so two legitimate identical payments
 *     still produce different ciphertexts (and hashes).
 *   - signedAt: lets the server reject stale packets (replay protection).
 */
export interface PaymentInstruction {
  senderVpa: string;
  receiverVpa: string;
  amount: string; // decimal string, e.g. "500.00"
  pinHash: string;
  nonce: string;
  signedAt: number; // epoch millis
}

export type IngestOutcome = 'SETTLED' | 'DUPLICATE_DROPPED' | 'INVALID';

export interface IngestResult {
  outcome: IngestOutcome;
  packetHash: string;
  reason: string | null;
  transactionId: number | null;
}
