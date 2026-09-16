import { generateKeyPairSync, KeyObject } from 'node:crypto';

/**
 * Holds the server's RSA keypair.
 *
 * In production, the private key would live in an HSM or at least a KMS
 * (AWS KMS / HashiCorp Vault) — never in source or process memory alone.
 * For this demo we generate a fresh 2048-bit keypair on every startup, same
 * as upstream. The public key is exposed via /api/server-key so simulated
 * sender devices can encrypt payloads with it.
 */
class ServerKeyHolder {
  private readonly keyPair: { publicKey: KeyObject; privateKey: KeyObject };

  constructor() {
    this.keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    console.log(
      `Server RSA keypair generated (2048-bit). Public key fingerprint: ${this.getPublicKeyBase64().slice(0, 32)}...`,
    );
  }

  getPublicKey(): KeyObject {
    return this.keyPair.publicKey;
  }

  getPrivateKey(): KeyObject {
    return this.keyPair.privateKey;
  }

  /** Base64-encoded X.509 SubjectPublicKeyInfo DER — matches Java's PublicKey.getEncoded(). */
  getPublicKeyBase64(): string {
    return this.keyPair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  }
}

export const serverKeyHolder = new ServerKeyHolder();
