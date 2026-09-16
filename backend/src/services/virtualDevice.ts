import { MeshPacket } from '../types';

/**
 * A simulated phone in the mesh. Holds packets it has seen.
 *
 * In the real system this state lives on a physical Android device, with
 * packets exchanged over BLE GATT characteristics.
 */
export class VirtualDevice {
  private readonly heldPackets = new Map<string, MeshPacket>();

  constructor(
    public readonly deviceId: string,
    public readonly hasInternet: boolean,
  ) {}

  hold(packet: MeshPacket): void {
    if (!this.heldPackets.has(packet.packetId)) {
      this.heldPackets.set(packet.packetId, packet);
    }
  }

  getHeldPackets(): MeshPacket[] {
    return [...this.heldPackets.values()];
  }

  holds(packetId: string): boolean {
    return this.heldPackets.has(packetId);
  }

  packetCount(): number {
    return this.heldPackets.size;
  }

  clear(): void {
    this.heldPackets.clear();
  }
}
