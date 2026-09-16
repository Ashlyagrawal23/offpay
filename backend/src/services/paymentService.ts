import { v4 as uuid } from 'uuid';
import { encrypt, sha256Hex } from '../crypto/hybridCryptoService';
import { serverKeyHolder } from '../crypto/serverKeyHolder';
import { MeshPacket, PaymentInstruction } from '../types';

/**
 * Simulates the sender's phone:
 *   1. Build a PaymentInstruction with a fresh nonce + signedAt timestamp.
 *   2. Encrypt with the server's public key (hybrid RSA+AES).
 *   3. Wrap in a MeshPacket with TTL.
 *
 * In a real Android/iOS app, this exact logic (minus the server-side
 * reference) runs on the phone, using a copy of the server's public key
 * cached from a previous online session. The caller (the payments route)
 * is responsible for having already verified the sender's PIN — this
 * function just embeds its hash in the payload for the record.
 */
export function createPaymentPacket(
  senderVpa: string,
  receiverVpa: string,
  amount: string,
  pin: string,
  ttl: number,
): MeshPacket {
  const instruction: PaymentInstruction = {
    senderVpa,
    receiverVpa,
    amount,
    pinHash: sha256Hex(pin),
    nonce: uuid(),
    signedAt: Date.now(),
  };

  const ciphertext = encrypt(instruction, serverKeyHolder.getPublicKey());

  return {
    packetId: uuid(),
    ttl,
    createdAt: Date.now(),
    ciphertext,
  };
}
