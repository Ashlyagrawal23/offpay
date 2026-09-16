import { env } from '../config/env';
import { decrypt, hashCiphertext } from '../crypto/hybridCryptoService';
import { IngestResult, MeshPacket } from '../types';
import { idempotencyService } from './idempotencyService';
import { settlementService } from './settlementService';

/**
 * Orchestrates the full server-side pipeline for one inbound packet from a
 * bridge node:
 *
 *   1. Hash the ciphertext.
 *   2. Try to claim that hash via the idempotency cache — if already
 *      claimed, this is a duplicate; drop it.
 *   3. Decrypt with the server's private key — if that fails, it's
 *      tampered or junk; reject.
 *   4. Check freshness — reject if signedAt is too old (replay protection).
 *   5. Hand off to SettlementService for the actual debit/credit.
 */
class BridgeIngestionService {
  async ingest(packet: MeshPacket, bridgeNodeId: string, hopCount: number): Promise<IngestResult> {
    let packetHash = '?';
    try {
      packetHash = hashCiphertext(packet.ciphertext);

      // ---- Idempotency gate (synchronous claim — see IdempotencyService) ----
      if (!idempotencyService.claim(packetHash)) {
        console.log(`DUPLICATE packet ${packetHash.slice(0, 12)}... from bridge ${bridgeNodeId} — dropped`);
        return { outcome: 'DUPLICATE_DROPPED', packetHash, reason: null, transactionId: null };
      }

      // ---- Decrypt ----
      let instruction;
      try {
        instruction = decrypt(packet.ciphertext);
      } catch (e) {
        console.warn(`Decryption failed for packet ${packetHash.slice(0, 12)}...: ${(e as Error).message}`);
        return { outcome: 'INVALID', packetHash, reason: 'decryption_failed', transactionId: null };
      }

      // ---- Freshness check (replay protection) ----
      const ageSeconds = (Date.now() - instruction.signedAt) / 1000;
      if (ageSeconds > env.packetMaxAgeSeconds) {
        console.warn(`Packet ${packetHash.slice(0, 12)}... too old (${ageSeconds}s), rejected`);
        return { outcome: 'INVALID', packetHash, reason: 'stale_packet', transactionId: null };
      }
      if (ageSeconds < -300) {
        // small clock-skew tolerance
        return { outcome: 'INVALID', packetHash, reason: 'future_dated', transactionId: null };
      }

      // ---- Settle ----
      const tx = await settlementService.settle(instruction, packetHash, bridgeNodeId, hopCount);
      return { outcome: 'SETTLED', packetHash, reason: null, transactionId: tx.id };
    } catch (e) {
      console.error(`Ingestion error: ${(e as Error).message}`, e);
      return { outcome: 'INVALID', packetHash, reason: `internal_error: ${(e as Error).message}`, transactionId: null };
    }
  }
}

export const bridgeIngestionService = new BridgeIngestionService();
