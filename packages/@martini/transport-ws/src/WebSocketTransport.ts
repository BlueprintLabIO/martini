/**
 * WebSocketTransport - Production-ready WebSocket transport for @martini/core
 *
 * Features:
 * - Client-server architecture
 * - Automatic reconnection
 * - Server-managed host election
 * - Peer tracking via server
 * - Error handling with callbacks
 *
 * Usage:
 * ```ts
 * const transport = new WebSocketTransport('ws://localhost:8080', {
 *   playerId: 'player-123',
 *   reconnect: true
 * });
 *
 * await transport.waitForReady();
 * ```
 */

import type { Transport, WireMessage } from '@martini/core';

export interface WebSocketTransportConfig {
  /** Player ID (generated if not provided) */
  playerId?: string;

  /** Enable automatic reconnection (default: true) */
  reconnect?: boolean;

  /** Reconnection delay in ms (default: 1000) */
  reconnectDelay?: number;

  /** Max reconnection attempts (default: Infinity) */
  maxReconnectAttempts?: number;
}

type MessageHandler = (message: WireMessage, senderId: string) => void;
type PeerHandler = (peerId: string) => void;
type ErrorHandler = (error: Error) => void;

export class WebSocketTransport implements Transport {
  private ws: WebSocket | null = null;
  private playerId: string;
  private connectedPeers = new Set<string>();
  private currentHost: string | null = null;

  private messageHandlers: MessageHandler[] = [];
  private peerJoinHandlers: PeerHandler[] = [];
  private peerLeaveHandlers: PeerHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];

  private readyPromise: Promise<void>;
  private readyResolve: (() => void) | null = null;

  private reconnectEnabled: boolean;
  private reconnectDelay: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private reconnectTimeout: any = null;

  constructor(
    private url: string,
    config: WebSocketTransportConfig = {}
  ) {
    this.playerId = config.playerId || this.generatePlayerId();
    this.reconnectEnabled = config.reconnect ?? true;
    this.reconnectDelay = config.reconnectDelay ?? 1000;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? Infinity;

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WebSocketTransport] Connected to server');
        this.reconnectAttempts = 0;

        // Send initial handshake
        this.sendRaw({
          type: 'handshake',
          playerId: this.playerId
        });

        this.readyResolve?.();
      };

      this.ws.onclose = () => {
        console.log('[WebSocketTransport] Disconnected from server');
        this.handleDisconnect();
      };

      this.ws.onerror = (event: any) => {
        // Pass through the actual error if available, otherwise create one
        const error = event instanceof Error ? event : new Error('WebSocket error occurred');
        console.error('[WebSocketTransport] Error:', error);
        this.notifyError(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          const parseError = new Error(`Failed to parse message: ${error}`);
          this.notifyError(parseError);
        }
      };
    } catch (error) {
      this.notifyError(error as Error);
    }
  }

  private handleDisconnect(): void {
    if (this.reconnectEnabled && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocketTransport] Reconnecting (attempt ${this.reconnectAttempts})...`);

      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    }
  }

  private handleMessage(data: any): void {
    const { type, senderId, payload, hostId } = data;

    switch (type) {
      case 'player_join':
        if (payload?.playerId && payload.playerId !== this.playerId) {
          this.connectedPeers.add(payload.playerId);
          this.notifyPeerJoin(payload.playerId);
        }
        // Also notify message handlers for server protocol messages
        this.notifyMessage(data, 'server');
        break;

      case 'player_leave':
        if (payload?.playerId) {
          this.connectedPeers.delete(payload.playerId);
          this.notifyPeerLeave(payload.playerId);
        }
        this.notifyMessage(data, 'server');
        break;

      case 'host_announce':
        this.currentHost = hostId;
        console.log(`[WebSocketTransport] Host is now: ${hostId}`);
        this.notifyMessage(data, 'server');
        break;

      case 'peers_list':
        // Server sends list of all connected peers
        if (payload?.peers) {
          this.connectedPeers.clear();
          payload.peers.forEach((peerId: string) => {
            if (peerId !== this.playerId) {
              this.connectedPeers.add(peerId);
            }
          });
        }
        this.notifyMessage(data, 'server');
        break;

      default:
        // Regular message from another peer
        if (senderId && senderId !== this.playerId) {
          this.notifyMessage(data, senderId);
        }
        break;
    }
  }

  private sendRaw(data: any): void {
    if (this.ws?.readyState === 1) { // OPEN
      this.ws.send(JSON.stringify(data));
    }
  }

  private generatePlayerId(): string {
    return `player-${Math.random().toString(36).substring(2, 11)}`;
  }

  private notifyMessage(message: WireMessage, senderId: string): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message, senderId);
      } catch (error) {
        this.notifyError(error as Error);
      }
    });
  }

  private notifyPeerJoin(peerId: string): void {
    this.peerJoinHandlers.forEach(handler => handler(peerId));
  }

  private notifyPeerLeave(peerId: string): void {
    this.peerLeaveHandlers.forEach(handler => handler(peerId));
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach(handler => handler(error));
  }

  // ============================================================================
  // Transport Interface Implementation
  // ============================================================================

  send(message: WireMessage, targetId?: string): void {
    const envelope = {
      ...message,
      senderId: this.playerId,
      targetId
    };

    this.sendRaw(envelope);
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index >= 0) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  onPeerJoin(handler: PeerHandler): () => void {
    this.peerJoinHandlers.push(handler);
    return () => {
      const index = this.peerJoinHandlers.indexOf(handler);
      if (index >= 0) {
        this.peerJoinHandlers.splice(index, 1);
      }
    };
  }

  onPeerLeave(handler: PeerHandler): () => void {
    this.peerLeaveHandlers.push(handler);
    return () => {
      const index = this.peerLeaveHandlers.indexOf(handler);
      if (index >= 0) {
        this.peerLeaveHandlers.splice(index, 1);
      }
    };
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getPeerIds(): string[] {
    return Array.from(this.connectedPeers);
  }

  isHost(): boolean {
    return this.currentHost === this.playerId;
  }

  // ============================================================================
  // Additional Methods
  // ============================================================================

  /**
   * Wait for the connection to be ready
   */
  async waitForReady(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Listen for errors
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index >= 0) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectEnabled = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clear all handlers
    this.messageHandlers = [];
    this.peerJoinHandlers = [];
    this.peerLeaveHandlers = [];
    this.errorHandlers = [];
  }
}
