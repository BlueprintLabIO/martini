/**
 * Transport interface - how messages flow between peers
 */

export interface WireMessage {
  type: 'state_sync' | 'action' | 'player_join' | 'player_leave' | 'event' | 'heartbeat' | 'host_migration' | 'host_query' | 'host_announce';
  payload?: any;
  senderId?: string;
  timestamp?: number;
  sessionId?: string; // for heartbeat messages
  newHost?: string; // for host migration
  hostId?: string; // for host announce
  [key: string]: any; // allow additional properties
}

/**
 * Connection state for transport observability
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

/**
 * Message statistics for transport metrics
 */
export interface MessageStats {
  sent: number;
  received: number;
  errors: number;
}

/**
 * TransportMetrics - Optional interface for transport observability
 *
 * Inspired by libp2p's StatTransport and WebRTC's getStats() API.
 * Transports can optionally implement this interface to expose metrics
 * for debugging, monitoring, and DevTools integration.
 *
 * @example
 * ```typescript
 * const transport = new LocalTransport(config);
 * if (transport.metrics) {
 *   console.log('Connection state:', transport.metrics.getConnectionState());
 *
 *   transport.metrics.onConnectionChange((state) => {
 *     console.log('Connection changed:', state);
 *   });
 * }
 * ```
 */
export interface TransportMetrics {
  /**
   * Get current connection state
   * @returns Current state: disconnected, connecting, or connected
   */
  getConnectionState(): ConnectionState;

  /**
   * Listen for connection state changes
   * @param callback Function called when connection state changes
   * @returns Unsubscribe function
   */
  onConnectionChange(callback: (state: ConnectionState) => void): () => void;

  /**
   * Get number of connected peers (excluding self)
   * @returns Count of active peer connections
   */
  getPeerCount(): number;

  /**
   * Get message statistics (counters)
   * @returns Object with sent/received/error counts
   */
  getMessageStats(): MessageStats;

  /**
   * Get round-trip latency in milliseconds (optional, transport-dependent)
   * @returns Latency in ms, or undefined if not supported
   */
  getLatencyMs?(): number | undefined;

  /**
   * Reset all metrics counters (useful for testing)
   */
  resetStats?(): void;
}

export interface Transport {
  /** Send a message to specific peer or broadcast to all */
  send(message: WireMessage, targetId?: string): void;

  /** Listen for incoming messages */
  onMessage(handler: (message: WireMessage, senderId: string) => void): () => void;

  /** Listen for peer joining */
  onPeerJoin(handler: (peerId: string) => void): () => void;

  /** Listen for peer leaving */
  onPeerLeave(handler: (peerId: string) => void): () => void;

  /** Get current peer ID */
  getPlayerId(): string;

  /** Get all connected peer IDs */
  getPeerIds(): string[];

  /** Is this peer the host */
  isHost(): boolean;

  /**
   * Optional metrics interface for observability
   * Transports can implement this to expose connection state,
   * message statistics, and other debugging information.
   */
  metrics?: TransportMetrics;
}

export interface RuntimeConfig {
  /** Is this instance the host (runs authoritative simulation) */
  isHost: boolean;

  /** Initial player IDs (optional, can be added dynamically) */
  playerIds?: string[];

  /** How often to sync state (ms) - default 16ms (60 FPS) */
  syncInterval?: number;
}
