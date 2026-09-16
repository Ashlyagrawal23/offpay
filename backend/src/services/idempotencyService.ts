import { env } from '../config/env';

/**
 * In-memory idempotency cache. In production this would be Redis with
 * `SET key NX EX ttl` — same semantics, distributed across instances.
 *
 * The contract:
 *   - claim(hash) returns true on the first call, false on every call after
 *     that (within the TTL window)
 *   - the check-then-set must be atomic even under concurrent callers
 *
 * Node is single-threaded, so as long as `claim` does its check and its
 * write in the same synchronous tick (no `await` in between), it's
 * atomic for the same reason `ConcurrentHashMap.putIfAbsent` is atomic on
 * the JVM: nothing else can run in the middle. This is what makes "three
 * bridges deliver the same packet simultaneously" settle exactly once.
 */
class IdempotencyService {
  private readonly seen = new Map<string, number>(); // hash -> claimed-at epoch ms
  private evictionTimer: NodeJS.Timeout | null = null;

  startEvictionLoop(): void {
    if (this.evictionTimer) return;
    this.evictionTimer = setInterval(() => this.evictExpired(), 60_000);
    this.evictionTimer.unref();
  }

  /**
   * Try to claim a hash. Returns true if this caller is the first; false
   * if someone else already claimed it (i.e. the packet is a duplicate).
   * Synchronous by design — see class doc.
   */
  claim(packetHash: string): boolean {
    if (this.seen.has(packetHash)) return false;
    this.seen.set(packetHash, Date.now());
    return true;
  }

  size(): number {
    return this.seen.size;
  }

  private evictExpired(): void {
    const cutoff = Date.now() - env.idempotencyTtlSeconds * 1000;
    for (const [hash, claimedAt] of this.seen) {
      if (claimedAt < cutoff) this.seen.delete(hash);
    }
  }

  /** Test/demo helper. */
  clear(): void {
    this.seen.clear();
  }
}

export const idempotencyService = new IdempotencyService();
