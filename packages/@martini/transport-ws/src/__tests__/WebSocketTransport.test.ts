/**
 * Tests for WebSocketTransport - WebSocket-based transport
 *
 * These tests use a mock WebSocket to test the transport logic without
 * requiring an actual WebSocket server.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketTransport } from '../WebSocketTransport';
import type { WireMessage } from '@martini/core';

// Mock WebSocket
class MockWebSocket {
  public readyState = 0; // CONNECTING
  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: ((error: any) => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;

  private messageQueue: string[] = [];

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.();
    }, 0);
  }

  send(data: string): void {
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open');
    }
    this.messageQueue.push(data);
  }

  close(): void {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  // Test helper: simulate receiving a message
  __simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  // Test helper: get sent messages
  __getSentMessages(): string[] {
    return [...this.messageQueue];
  }

  // Test helper: clear sent messages
  __clearSentMessages(): void {
    this.messageQueue = [];
  }
}

// Replace global WebSocket with mock
const originalWebSocket = global.WebSocket;
beforeEach(() => {
  (global as any).WebSocket = MockWebSocket;
});

describe('WebSocketTransport', () => {
  describe('Initialization', () => {
    it('connects to WebSocket server', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(transport.getPlayerId()).toBe('player-1');
    });

    it('generates player ID if not provided', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080');

      await new Promise(resolve => setTimeout(resolve, 10));

      const playerId = transport.getPlayerId();
      expect(playerId).toBeTruthy();
      expect(typeof playerId).toBe('string');
    });

    it('waits for connection to be ready', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      // Should resolve when connected
      await expect(transport.waitForReady()).resolves.toBeUndefined();
    });
  });

  describe('Message Sending', () => {
    it('sends broadcast messages to server', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      const ws = (transport as any).ws as MockWebSocket;
      ws.__clearSentMessages(); // Clear handshake message

      const message: WireMessage = {
        type: 'action',
        payload: { actionName: 'move', input: { x: 100 } }
      };

      transport.send(message);

      const sent = ws.__getSentMessages();

      expect(sent).toHaveLength(1);
      const parsed = JSON.parse(sent[0]);
      expect(parsed.type).toBe('action');
      expect(parsed.senderId).toBe('player-1');
    });

    it('sends unicast messages with targetId', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      const ws = (transport as any).ws as MockWebSocket;
      ws.__clearSentMessages(); // Clear handshake message

      const message: WireMessage = {
        type: 'state_sync',
        payload: { score: 100 }
      };

      transport.send(message, 'player-2');

      const sent = ws.__getSentMessages();

      expect(sent).toHaveLength(1);
      const parsed = JSON.parse(sent[0]);
      expect(parsed.targetId).toBe('player-2');
    });
  });

  describe('Message Receiving', () => {
    it('receives messages from server', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      const messages: Array<{ message: WireMessage; senderId: string }> = [];
      transport.onMessage((msg, senderId) => {
        messages.push({ message: msg, senderId });
      });

      const ws = (transport as any).ws as MockWebSocket;
      ws.__simulateMessage(JSON.stringify({
        type: 'action',
        payload: { actionName: 'jump' },
        senderId: 'player-2'
      }));

      expect(messages).toHaveLength(1);
      expect(messages[0].senderId).toBe('player-2');
      expect(messages[0].message.type).toBe('action');
    });

    it('onMessage returns cleanup function', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      let callCount = 0;
      const cleanup = transport.onMessage(() => {
        callCount++;
      });

      const ws = (transport as any).ws as MockWebSocket;
      ws.__simulateMessage(JSON.stringify({
        type: 'action',
        senderId: 'player-2'
      }));

      expect(callCount).toBe(1);

      cleanup();

      ws.__simulateMessage(JSON.stringify({
        type: 'action',
        senderId: 'player-2'
      }));

      expect(callCount).toBe(1); // Should not increase
    });
  });

  describe('Peer Management', () => {
    it('receives peer join notifications', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      const joinedPeers: string[] = [];
      transport.onPeerJoin((peerId) => {
        joinedPeers.push(peerId);
      });

      const ws = (transport as any).ws as MockWebSocket;
      ws.__simulateMessage(JSON.stringify({
        type: 'player_join',
        payload: { playerId: 'player-2' }
      }));

      expect(joinedPeers).toEqual(['player-2']);
    });

    it('receives peer leave notifications', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      const leftPeers: string[] = [];
      transport.onPeerLeave((peerId) => {
        leftPeers.push(peerId);
      });

      const ws = (transport as any).ws as MockWebSocket;
      ws.__simulateMessage(JSON.stringify({
        type: 'player_leave',
        payload: { playerId: 'player-2' }
      }));

      expect(leftPeers).toEqual(['player-2']);
    });

    it('tracks connected peers', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      const ws = (transport as any).ws as MockWebSocket;

      // Simulate peer join
      ws.__simulateMessage(JSON.stringify({
        type: 'player_join',
        payload: { playerId: 'player-2' }
      }));

      ws.__simulateMessage(JSON.stringify({
        type: 'player_join',
        payload: { playerId: 'player-3' }
      }));

      const peers = transport.getPeerIds();
      expect(peers).toContain('player-2');
      expect(peers).toContain('player-3');
      expect(peers).not.toContain('player-1'); // Should not include self
    });
  });

  describe('Host Management', () => {
    it('becomes host when server announces', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      expect(transport.isHost()).toBe(false);

      const ws = (transport as any).ws as MockWebSocket;
      ws.__simulateMessage(JSON.stringify({
        type: 'host_announce',
        hostId: 'player-1'
      }));

      expect(transport.isHost()).toBe(true);
    });

    it('is not host when server announces different player', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      const ws = (transport as any).ws as MockWebSocket;
      ws.__simulateMessage(JSON.stringify({
        type: 'host_announce',
        hostId: 'player-2'
      }));

      expect(transport.isHost()).toBe(false);
    });
  });

  describe('Disconnect', () => {
    it('closes WebSocket connection', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      const ws = (transport as any).ws as MockWebSocket;
      expect(ws.readyState).toBe(1); // OPEN

      transport.disconnect();

      expect(ws.readyState).toBe(3); // CLOSED
    });

    it('cleans up all handlers on disconnect', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      let messageCount = 0;
      let joinCount = 0;

      transport.onMessage(() => messageCount++);
      transport.onPeerJoin(() => joinCount++);

      // Get ws reference BEFORE disconnect (it becomes null after)
      const ws = (transport as any).ws as MockWebSocket;

      transport.disconnect();

      // Try to trigger handlers (should not fire because transport disconnected)
      ws.__simulateMessage(JSON.stringify({ type: 'action', senderId: 'player-2' }));
      ws.__simulateMessage(JSON.stringify({ type: 'player_join', payload: { playerId: 'player-3' } }));

      expect(messageCount).toBe(0);
      expect(joinCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('handles WebSocket errors', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      const errors: any[] = [];
      transport.onError((error) => {
        errors.push(error);
      });

      const ws = (transport as any).ws as MockWebSocket;
      const testError = new Error('Connection failed');
      ws.onerror?.(testError);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe(testError);
    });

    it('handles malformed messages', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1'
      });

      await transport.waitForReady();

      const errors: any[] = [];
      transport.onError((error) => {
        errors.push(error);
      });

      const ws = (transport as any).ws as MockWebSocket;
      ws.__simulateMessage('invalid json{{{');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('parse');
    });
  });

  describe('Reconnection', () => {
    it('supports reconnection with same player ID', async () => {
      const transport = new WebSocketTransport('ws://localhost:8080', {
        playerId: 'player-1',
        reconnect: true
      });

      await transport.waitForReady();

      // Simulate disconnect
      const ws = (transport as any).ws as MockWebSocket;
      ws.close();

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should maintain same player ID
      expect(transport.getPlayerId()).toBe('player-1');
    });
  });
});
