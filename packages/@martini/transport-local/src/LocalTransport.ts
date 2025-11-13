/**
 * LocalTransport - In-memory transport for same-page multiplayer
 *
 * Perfect for:
 * - Side-by-side demo instances on the same page
 * - Unit/integration testing
 * - Local development without network overhead
 *
 * All instances in the same room share messages instantly via an in-memory event bus.
 */

import type { Transport, WireMessage } from '@martini/core';

type MessageHandler = (message: WireMessage, senderId: string) => void;
type PeerHandler = (peerId: string) => void;

/**
 * Static registry of all local transport instances, grouped by room
 */
class LocalTransportRegistry {
  private static rooms = new Map<string, Set<LocalTransport>>();

  static register(roomId: string, transport: LocalTransport): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(transport);

    // Notify existing peers about the new peer
    const room = this.rooms.get(roomId)!;
    for (const peer of room) {
      if (peer !== transport) {
        // Notify existing peer about new peer
        peer.notifyPeerJoin(transport.playerId);
        // Notify new peer about existing peer
        transport.notifyPeerJoin(peer.playerId);
      }
    }
  }

  static unregister(roomId: string, transport: LocalTransport): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.delete(transport);

    // Notify remaining peers about the disconnect
    for (const peer of room) {
      peer.notifyPeerLeave(transport.playerId);
    }

    if (room.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  static getPeers(roomId: string, excludeId: string): LocalTransport[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room).filter((t) => t.playerId !== excludeId);
  }

  static broadcast(roomId: string, message: WireMessage, senderId: string): void {
    const peers = this.getPeers(roomId, senderId);
    for (const peer of peers) {
      peer.deliver(message, senderId);
    }
  }

  static unicast(roomId: string, message: WireMessage, senderId: string, targetId: string): void {
    const peers = this.getPeers(roomId, senderId);
    const target = peers.find((p) => p.playerId === targetId);
    if (target) {
      target.deliver(message, senderId);
    }
  }
}

export interface LocalTransportConfig {
  roomId: string;
  playerId?: string;
  isHost: boolean;
}

export class LocalTransport implements Transport {
  public readonly playerId: string;
  private readonly roomId: string;
  private readonly _isHost: boolean;

  private messageHandlers: MessageHandler[] = [];
  private peerJoinHandlers: PeerHandler[] = [];
  private peerLeaveHandlers: PeerHandler[] = [];
  private hostDisconnectHandlers: (() => void)[] = [];

  constructor(config: LocalTransportConfig) {
    this.roomId = config.roomId;
    this.playerId = config.playerId || `player-${Math.random().toString(36).substring(2, 9)}`;
    this._isHost = config.isHost;

    // Register with the global registry
    LocalTransportRegistry.register(this.roomId, this);
  }

  send(message: WireMessage, targetId?: string): void {
    if (targetId) {
      // Unicast
      LocalTransportRegistry.unicast(this.roomId, message, this.playerId, targetId);
    } else {
      // Broadcast
      LocalTransportRegistry.broadcast(this.roomId, message, this.playerId);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const idx = this.messageHandlers.indexOf(handler);
      if (idx >= 0) this.messageHandlers.splice(idx, 1);
    };
  }

  onPeerJoin(handler: PeerHandler): () => void {
    this.peerJoinHandlers.push(handler);
    return () => {
      const idx = this.peerJoinHandlers.indexOf(handler);
      if (idx >= 0) this.peerJoinHandlers.splice(idx, 1);
    };
  }

  onPeerLeave(handler: PeerHandler): () => void {
    this.peerLeaveHandlers.push(handler);
    return () => {
      const idx = this.peerLeaveHandlers.indexOf(handler);
      if (idx >= 0) this.peerLeaveHandlers.splice(idx, 1);
    };
  }

  onHostDisconnect(handler: () => void): () => void {
    this.hostDisconnectHandlers.push(handler);
    return () => {
      const idx = this.hostDisconnectHandlers.indexOf(handler);
      if (idx >= 0) this.hostDisconnectHandlers.splice(idx, 1);
    };
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getPeerIds(): string[] {
    return LocalTransportRegistry.getPeers(this.roomId, this.playerId).map((p) => p.playerId);
  }

  isHost(): boolean {
    return this._isHost;
  }

  disconnect(): void {
    LocalTransportRegistry.unregister(this.roomId, this);
  }

  // Internal methods called by the registry

  /** @internal */
  deliver(message: WireMessage, senderId: string): void {
    this.messageHandlers.forEach((h) => h(message, senderId));
  }

  /** @internal */
  notifyPeerJoin(peerId: string): void {
    this.peerJoinHandlers.forEach((h) => h(peerId));
  }

  /** @internal */
  notifyPeerLeave(peerId: string): void {
    this.peerLeaveHandlers.forEach((h) => h(peerId));

    // If the leaving peer was the host, notify host disconnect handlers
    const peers = LocalTransportRegistry.getPeers(this.roomId, this.playerId);
    const leavingPeer = peers.find((p) => p.playerId === peerId);
    if (leavingPeer && leavingPeer.isHost()) {
      this.hostDisconnectHandlers.forEach((h) => h());
    }
  }
}
