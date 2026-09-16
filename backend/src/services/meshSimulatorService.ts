import { MeshPacket } from '../types';
import { VirtualDevice } from './virtualDevice';

export interface GossipResult {
  transfers: number;
  deviceCounts: Record<string, number>;
}

export interface BridgeUpload {
  bridgeNodeId: string;
  packet: MeshPacket;
}

/**
 * Simulates the Bluetooth mesh.
 *
 * Each VirtualDevice represents a phone. A "gossip" round has every device
 * broadcast everything it holds to every other device within "Bluetooth
 * range" (which, in this simulator, means everyone), decrementing TTL per
 * hop. When a device with internet (a "bridge node") holds a packet, the
 * demo's /api/mesh/flush endpoint has it actually POST that packet to our
 * own /api/bridge/ingest — simulating the moment a phone walks outside and
 * gets 4G.
 */
class MeshSimulatorService {
  private readonly devices = new Map<string, VirtualDevice>();

  constructor() {
    this.seedDefaultDevices();
  }

  private seedDefaultDevices(): void {
    // Default scenario: your phone + 3 strangers' phones in a basement,
    // all offline, plus one phone that already has signal (the "bridge").
    this.devices.set('my-phone', new VirtualDevice('my-phone', false));
    this.devices.set('stranger-phone-1', new VirtualDevice('stranger-phone-1', false));
    this.devices.set('stranger-phone-2', new VirtualDevice('stranger-phone-2', false));
    this.devices.set('stranger-phone-3', new VirtualDevice('stranger-phone-3', false));
    this.devices.set('bridge-phone', new VirtualDevice('bridge-phone', true));
  }

  getDevices(): VirtualDevice[] {
    return [...this.devices.values()];
  }

  /** Sender drops a packet into the mesh by handing it to their own device. */
  inject(senderDeviceId: string, packet: MeshPacket): void {
    const sender = this.devices.get(senderDeviceId);
    if (!sender) throw new Error(`Unknown device: ${senderDeviceId}`);
    sender.hold(packet);
    console.log(`Packet ${packet.packetId.slice(0, 8)} injected at ${senderDeviceId} (TTL=${packet.ttl})`);
  }

  /**
   * One round of gossip. Every device shares everything it has with every
   * other device. TTL decrements per hop; packets at TTL 0 stay put but
   * aren't forwarded further.
   */
  gossipOnce(): GossipResult {
    let transfers = 0;
    const deviceList = this.getDevices();

    // Snapshot what each device holds at the start of the round, so we
    // don't gossip the same packet through all 5 devices in one step.
    const snapshot = new Map<string, MeshPacket[]>();
    for (const d of deviceList) {
      snapshot.set(d.deviceId, [...d.getHeldPackets()]);
    }

    for (const src of deviceList) {
      for (const pkt of snapshot.get(src.deviceId)!) {
        if (pkt.ttl <= 0) continue;
        for (const dst of deviceList) {
          if (dst === src) continue;
          if (dst.holds(pkt.packetId)) continue;
          dst.hold({ ...pkt, ttl: pkt.ttl - 1 });
          transfers++;
        }
      }
    }

    console.log(`Gossip round complete: ${transfers} packet transfers`);
    return { transfers, deviceCounts: this.snapshotMap() };
  }

  snapshotMap(): Record<string, number> {
    const m: Record<string, number> = {};
    for (const d of this.devices.values()) m[d.deviceId] = d.packetCount();
    return m;
  }

  /**
   * Returns all packets held by devices with internet — these are what
   * would be uploaded to the backend the moment they reach connectivity.
   */
  collectBridgeUploads(): BridgeUpload[] {
    const out: BridgeUpload[] = [];
    for (const d of this.devices.values()) {
      if (!d.hasInternet) continue;
      for (const pkt of d.getHeldPackets()) {
        out.push({ bridgeNodeId: d.deviceId, packet: pkt });
      }
    }
    return out;
  }

  resetMesh(): void {
    for (const d of this.devices.values()) d.clear();
  }
}

export const meshSimulatorService = new MeshSimulatorService();
