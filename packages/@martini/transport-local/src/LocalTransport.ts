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

import type { Transport, WireMessage, TransportMetrics, ConnectionState, MessageStats } from '@martini/core';

type MessageHandler = (message: WireMessage, senderId: string) => void;
type PeerHandler = (peerId: string) => void;
type ConnectionChangeHandler = (state: ConnectionState) => void;

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

    // Check if the leaving peer is the host before removing
    const isLeavingPeerHost = transport.isHost();

    room.delete(transport);

    // Notify remaining peers about the disconnect
    for (const peer of room) {
      peer.notifyPeerLeave(transport.playerId, isLeavingPeerHost);
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
    const room = this.rooms.get(roomId);
    if (!room) return;

    const target = Array.from(room).find((p) => p.playerId === targetId);
    if (target) {
      target.deliver(message, senderId);
    }
  }
}

/**
 * Metrics implementation for LocalTransport
 * Tracks connection state, peer count, and message statistics
 */
class LocalTransportMetrics implements TransportMetrics {
  private connectionState: ConnectionState = 'disconnected';
  private connectionChangeHandlers: ConnectionChangeHandler[] = [];
  private messagesSent = 0;
  private messagesReceived = 0;
  private messagesErrored = 0;

  constructor(private transport: LocalTransport) {
    // LocalTransport is always "connected" since it's in-memory
    this.connectionState = 'connected';
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  onConnectionChange(callback: ConnectionChangeHandler): () => void {
    this.connectionChangeHandlers.push(callback);
    return () => {
      const idx = this.connectionChangeHandlers.indexOf(callback);
      if (idx >= 0) this.connectionChangeHandlers.splice(idx, 1);
    };
  }

  getPeerCount(): number {
    return this.transport.getPeerIds().length;
  }

  getMessageStats(): MessageStats {
    return {
      sent: this.messagesSent,
      received: this.messagesReceived,
      errors: this.messagesErrored
    };
  }

  resetStats(): void {
    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.messagesErrored = 0;
  }

  /** @internal - Called by LocalTransport when message is sent */
  trackMessageSent(): void {
    this.messagesSent++;
  }

  /** @internal - Called by LocalTransport when message is received */
  trackMessageReceived(): void {
    this.messagesReceived++;
  }

  /** @internal - Called by LocalTransport when message fails */
  trackMessageError(): void {
    this.messagesErrored++;
  }

  /** @internal - Called by LocalTransport when disconnecting */
  setDisconnected(): void {
    if (this.connectionState !== 'disconnected') {
      this.connectionState = 'disconnected';
      this.notifyConnectionChange();
    }
  }

  private notifyConnectionChange(): void {
    this.connectionChangeHandlers.forEach(h => {
      try {
        h(this.connectionState);
      } catch (error) {
        console.error('Error in connection change handler:', error);
      }
    });
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
  public readonly metrics: TransportMetrics;

  private messageHandlers: MessageHandler[] = [];
  private peerJoinHandlers: PeerHandler[] = [];
  private peerLeaveHandlers: PeerHandler[] = [];
  private hostDisconnectHandlers: (() => void)[] = [];

  constructor(config: LocalTransportConfig) {
    this.roomId = config.roomId;
    this.playerId = config.playerId || `player-${Math.random().toString(36).substring(2, 9)}`;
    this._isHost = config.isHost;

    // Initialize metrics
    this.metrics = new LocalTransportMetrics(this);

    // Register with the global registry
    LocalTransportRegistry.register(this.roomId, this);
  }

  send(message: WireMessage, targetId?: string): void {
    try {
      if (targetId) {
        // Unicast
        LocalTransportRegistry.unicast(this.roomId, message, this.playerId, targetId);
      } else {
        // Broadcast
        LocalTransportRegistry.broadcast(this.roomId, message, this.playerId);
      }
      (this.metrics as LocalTransportMetrics).trackMessageSent();
    } catch (error) {
      (this.metrics as LocalTransportMetrics).trackMessageError();
      throw error;
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
    (this.metrics as LocalTransportMetrics).setDisconnected();
    LocalTransportRegistry.unregister(this.roomId, this);
  }

  // Internal methods called by the registry

  /** @internal */
  deliver(message: WireMessage, senderId: string): void {
    (this.metrics as LocalTransportMetrics).trackMessageReceived();
    this.messageHandlers.forEach((h) => h(message, senderId));
  }

  /** @internal */
  notifyPeerJoin(peerId: string): void {
    this.peerJoinHandlers.forEach((h) => h(peerId));
  }

  /** @internal */
  notifyPeerLeave(peerId: string, wasHost: boolean): void {
    this.peerLeaveHandlers.forEach((h) => h(peerId));

    // If the leaving peer was the host, notify host disconnect handlers
    if (wasHost) {
      this.hostDisconnectHandlers.forEach((h) => h());
    }
  }
}
