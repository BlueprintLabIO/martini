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
}

export interface RuntimeConfig {
  /** Is this instance the host (runs authoritative simulation) */
  isHost: boolean;

  /** Initial player IDs (optional, can be added dynamically) */
  playerIds?: string[];

  /** How often to sync state (ms) - default 50ms (20 FPS) */
  syncInterval?: number;
}
