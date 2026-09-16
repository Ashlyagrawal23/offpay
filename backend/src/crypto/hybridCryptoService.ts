import {
  constants as cryptoConstants,
  createCipheriv,
  createDecipheriv,
  createHash,
  KeyObject,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from 'node:crypto';
import { PaymentInstruction } from '../types';
import { serverKeyHolder } from './serverKeyHolder';

/**
 * Hybrid encryption — the same pattern used by TLS, PGP, Signal, etc.
 *
 * Why hybrid? RSA can only encrypt small data (~245 bytes for a 2048-bit
 * key). Our payment instruction (JSON) might exceed that once device
 * certs/signatures are added in a real deployment.
 *
 * Generate a fresh AES key per packet, encrypt the JSON with AES-256-GCM
 * (fast + authenticated), then encrypt just the AES key with RSA-OAEP.
 *
 * Wire format (after base64 encoding):
 *   [ 256 bytes RSA-encrypted AES key ][ 12 bytes GCM IV ][ ciphertext + 16-byte tag ]
 *
 * AES-GCM is authenticated encryption: any single-bit tampering with the
 * ciphertext makes decryption throw. That's what makes it safe for
 * untrusted intermediates to carry.
 */
const AES_KEY_BYTES = 32; // 256 bits
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;
const RSA_ENCRYPTED_KEY_BYTES = 256; // for a 2048-bit RSA key

export function encrypt(instruction: PaymentInstruction, serverPublicKey: KeyObject): string {
  const plaintext = Buffer.from(JSON.stringify(instruction), 'utf8');

  // 1. Generate a one-time AES key for this packet.
  const aesKey = randomBytes(AES_KEY_BYTES);

  // 2. AES-256-GCM encrypt the payload.
  const iv = randomBytes(GCM_IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
  const aesCiphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes

  // 3. RSA-OAEP encrypt the AES key with the server's public key.
  const encryptedAesKey = publicEncrypt(
    { key: serverPublicKey, padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey,
  );

  // 4. Pack: [encrypted AES key][IV][AES ciphertext + tag]
  const packed = Buffer.concat([encryptedAesKey, iv, aesCiphertext, authTag]);
  return packed.toString('base64');
}

/**
 * Decrypt with the server's private key. If anything has been tampered
 * with — wrong key, modified ciphertext, truncated input — this throws.
 */
export function decrypt(base64Ciphertext: string): PaymentInstruction {
  const all = Buffer.from(base64Ciphertext, 'base64');

  const minLength = RSA_ENCRYPTED_KEY_BYTES + GCM_IV_BYTES + GCM_TAG_BYTES;
  if (all.length < minLength) {
    throw new Error('Ciphertext too short');
  }

  const encryptedAesKey = all.subarray(0, RSA_ENCRYPTED_KEY_BYTES);
  const iv = all.subarray(RSA_ENCRYPTED_KEY_BYTES, RSA_ENCRYPTED_KEY_BYTES + GCM_IV_BYTES);
  const rest = all.subarray(RSA_ENCRYPTED_KEY_BYTES + GCM_IV_BYTES);
  const authTag = rest.subarray(rest.length - GCM_TAG_BYTES);
  const aesCiphertext = rest.subarray(0, rest.length - GCM_TAG_BYTES);

  // 1. RSA-decrypt the AES key.
  const aesKey = privateDecrypt(
    {
      key: serverKeyHolder.getPrivateKey(),
      padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    encryptedAesKey,
  );

  // 2. AES-GCM decrypt + verify the tag.
  const decipher = createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(aesCiphertext), decipher.final()]);

  return JSON.parse(plaintext.toString('utf8')) as PaymentInstruction;
}

/**
 * SHA-256 of the ciphertext. This is the idempotency key.
 *
 * Why ciphertext and not packetId? Intermediates can rewrite packetId but
 * cannot forge a valid ciphertext for a different payload. Two delivered
 * copies of the same packet have byte-identical ciphertexts, hence
 * identical hashes.
 */
export function hashCiphertext(base64Ciphertext: string): string {
  return createHash('sha256').update(base64Ciphertext, 'utf8').digest('hex');
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
