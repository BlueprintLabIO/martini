import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IframeBridgeTransport } from './IframeBridgeTransport';
import type { BridgeMessage } from './IframeBridgeTransport';
import type { WireMessage } from '@martini/core';

describe('IframeBridgeTransport', () => {
  let transport: IframeBridgeTransport;
  let mockParent: Window;
  let messageListeners: Array<(event: MessageEvent) => void> = [];

  beforeEach(() => {
    // Mock parent window
    messageListeners = [];
    mockParent = {
      postMessage: vi.fn()
    } as unknown as Window;

    // Mock window.parent
    Object.defineProperty(window, 'parent', {
      value: mockParent,
      writable: true,
      configurable: true
    });

    // Mock addEventListener to capture handlers
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'message') {
        messageListeners.push(handler as (event: MessageEvent) => void);
      }
    });
  });

  afterEach(() => {
    transport?.disconnect();
    vi.restoreAllMocks();
    messageListeners = [];
  });

  describe('Constructor', () => {
    it('should create transport with auto-generated player ID', () => {
      transport = new IframeBridgeTransport({
        roomId: 'test-room',
        isHost: true
      });

      expect(transport.getPlayerId()).toMatch(/^player-[a-z0-9]{7}$/);
      expect(transport.isHost()).toBe(true);
    });

    it('should create transport with custom player ID', () => {
      transport = new IframeBridgeTransport({
        roomId: 'test-room',
        playerId: 'custom-id',
        isHost: false
      });

      expect(transport.getPlayerId()).toBe('custom-id');
      expect(transport.isHost()).toBe(false);
    });

    it('should register message listener on window', () => {
      transport = new IframeBridgeTransport({
        roomId: 'test-room',
        isHost: true
      });

      expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(messageListeners.length).toBe(1);
    });

    it('should send registration message to parent', () => {
      transport = new IframeBridgeTransport({
        roomId: 'test-room',
        playerId: 'player-1',
        isHost: true
      });

      expect(mockParent.postMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_REGISTER',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: {}
        },
        '*'
      );
    });

    it('should warn if no parent window', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      Object.defineProperty(window, 'parent', {
        value: window,
        writable: true,
        configurable: true
      });

      transport = new IframeBridgeTransport({
        roomId: 'test-room',
        isHost: true
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('No parent window found')
      );

      consoleWarn.mockRestore();
    });
  });

  describe('send()', () => {
    beforeEach(() => {
      transport = new IframeBridgeTransport({
        roomId: 'test-room',
        playerId: 'player-1',
        isHost: true
      });

      // Clear registration call
      vi.mocked(mockParent.postMessage).mockClear();
    });

    it('should send broadcast message to parent', () => {
      const message: WireMessage = { type: 'state', tick: 1, payload: {} };

      transport.send(message);

      expect(mockParent.postMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_SEND',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: {
            message,
            targetId: undefined
          }
        },
        '*'
      );
    });

    it('should send unicast message to parent', () => {
      const message: WireMessage = { type: 'action', tick: 1, payload: {} };

      transport.send(message, 'player-2');

      expect(mockParent.postMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_SEND',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: {
            message,
            targetId: 'player-2'
          }
        },
        '*'
      );
    });

    it('should not send after disconnect', () => {
      transport.disconnect();

      // Clear the disconnect message call
      vi.mocked(mockParent.postMessage).mockClear();

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const message: WireMessage = { type: 'state', tick: 1, payload: {} };

      transport.send(message);

      expect(mockParent.postMessage).not.toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Cannot send - transport is disconnected')
      );

      consoleWarn.mockRestore();
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      transport = new IframeBridgeTransport({
        roomId: 'test-room',
        playerId: 'player-1',
        isHost: true
      });
    });

    it('should handle BRIDGE_DELIVER message', () => {
      const handler = vi.fn();
      transport.onMessage(handler);

      const message: WireMessage = { type: 'state', tick: 1, payload: { test: 'data' } };
      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_DELIVER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: { message }
      };

      // Simulate message from parent
      messageListeners[0](new MessageEvent('message', { data: bridgeMessage }));

      expect(handler).toHaveBeenCalledWith(message, 'player-2');
    });

    it('should ignore BRIDGE_DELIVER from self', () => {
      const handler = vi.fn();
      transport.onMessage(handler);

      const message: WireMessage = { type: 'state', tick: 1, payload: {} };
      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_DELIVER',
        roomId: 'test-room',
        playerId: 'player-1', // Same as transport.playerId
        payload: { message }
      };

      messageListeners[0](new MessageEvent('message', { data: bridgeMessage }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should ignore messages from other rooms', () => {
      const handler = vi.fn();
      transport.onMessage(handler);

      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_DELIVER',
        roomId: 'other-room',
        playerId: 'player-2',
        payload: { message: { type: 'state', tick: 1, payload: {} } }
      };

      messageListeners[0](new MessageEvent('message', { data: bridgeMessage }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle BRIDGE_PEER_JOIN', () => {
      const handler = vi.fn();
      transport.onPeerJoin(handler);

      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_PEER_JOIN',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: { peerId: 'player-2' }
      };

      messageListeners[0](new MessageEvent('message', { data: bridgeMessage }));

      expect(handler).toHaveBeenCalledWith('player-2');
      expect(transport.getPeerIds()).toContain('player-2');
    });

    it('should not add self to peer list on BRIDGE_PEER_JOIN', () => {
      const handler = vi.fn();
      transport.onPeerJoin(handler);

      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_PEER_JOIN',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: { peerId: 'player-1' } // Self
      };

      messageListeners[0](new MessageEvent('message', { data: bridgeMessage }));

      expect(handler).not.toHaveBeenCalled();
      expect(transport.getPeerIds()).not.toContain('player-1');
    });

    it('should handle BRIDGE_PEER_LEAVE', () => {
      // First add a peer
      transport.onPeerJoin(() => {});
      messageListeners[0](new MessageEvent('message', {
        data: {
          type: 'BRIDGE_PEER_JOIN',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: { peerId: 'player-2' }
        }
      }));

      expect(transport.getPeerIds()).toContain('player-2');

      // Now remove the peer
      const handler = vi.fn();
      transport.onPeerLeave(handler);

      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_PEER_LEAVE',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: { peerId: 'player-2', wasHost: false }
      };

      messageListeners[0](new MessageEvent('message', { data: bridgeMessage }));

      expect(handler).toHaveBeenCalledWith('player-2');
      expect(transport.getPeerIds()).not.toContain('player-2');
    });

    it('should handle BRIDGE_HOST_DISCONNECT', () => {
      const clientTransport = new IframeBridgeTransport({
        roomId: 'test-room',
        playerId: 'player-2',
        isHost: false
      });

      const handler = vi.fn();
      clientTransport.onHostDisconnect(handler);

      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_HOST_DISCONNECT',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: { wasHost: true }
      };

      // Simulate message to client
      messageListeners[1](new MessageEvent('message', { data: bridgeMessage }));

      expect(handler).toHaveBeenCalled();

      clientTransport.disconnect();
    });

    it('should not trigger host disconnect for host itself', () => {
      const handler = vi.fn();
      transport.onHostDisconnect(handler);

      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_HOST_DISCONNECT',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: { wasHost: true }
      };

      messageListeners[0](new MessageEvent('message', { data: bridgeMessage }));

      // Host shouldn't receive its own disconnect event
      expect(handler).not.toHaveBeenCalled();
    });

    it('should ignore non-bridge messages', () => {
      const handler = vi.fn();
      transport.onMessage(handler);

      messageListeners[0](new MessageEvent('message', { data: { type: 'RANDOM_MESSAGE' } }));
      messageListeners[0](new MessageEvent('message', { data: 'string message' }));
      messageListeners[0](new MessageEvent('message', { data: null }));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Event Handlers', () => {
    beforeEach(() => {
      transport = new IframeBridgeTransport({
        roomId: 'test-room',
        playerId: 'player-1',
        isHost: true
      });
    });

    it('should support multiple message handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      transport.onMessage(handler1);
      transport.onMessage(handler2);

      const message: WireMessage = { type: 'state', tick: 1, payload: {} };
      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_DELIVER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: { message }
      };

      messageListeners[0](new MessageEvent('message', { data: bridgeMessage }));

      expect(handler1).toHaveBeenCalledWith(message, 'player-2');
      expect(handler2).toHaveBeenCalledWith(message, 'player-2');
    });

    it('should remove handler when unsubscribe is called', () => {
      const handler = vi.fn();
      const unsubscribe = transport.onMessage(handler);

      unsubscribe();

      const message: WireMessage = { type: 'state', tick: 1, payload: {} };
      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_DELIVER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: { message }
      };

      messageListeners[0](new MessageEvent('message', { data: bridgeMessage }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support all event types', () => {
      const messageHandler = vi.fn();
      const peerJoinHandler = vi.fn();
      const peerLeaveHandler = vi.fn();
      const hostDisconnectHandler = vi.fn();

      const unsub1 = transport.onMessage(messageHandler);
      const unsub2 = transport.onPeerJoin(peerJoinHandler);
      const unsub3 = transport.onPeerLeave(peerLeaveHandler);
      const unsub4 = transport.onHostDisconnect(hostDisconnectHandler);

      expect(unsub1).toBeTypeOf('function');
      expect(unsub2).toBeTypeOf('function');
      expect(unsub3).toBeTypeOf('function');
      expect(unsub4).toBeTypeOf('function');
    });
  });

  describe('disconnect()', () => {
    beforeEach(() => {
      transport = new IframeBridgeTransport({
        roomId: 'test-room',
        playerId: 'player-1',
        isHost: true
      });
    });

    it('should send disconnect message to parent', () => {
      vi.mocked(mockParent.postMessage).mockClear();

      transport.disconnect();

      expect(mockParent.postMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_PEER_LEAVE',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: {
            peerId: 'player-1',
            wasHost: true
          }
        },
        '*'
      );
    });

    it('should remove event listener', () => {
      const removeEventListener = vi.spyOn(window, 'removeEventListener');

      transport.disconnect();

      expect(removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should clear all handlers', () => {
      const handler = vi.fn();
      transport.onMessage(handler);
      transport.onPeerJoin(handler);
      transport.onPeerLeave(handler);
      transport.onHostDisconnect(handler);

      transport.disconnect();

      // Try to trigger handlers
      const bridgeMessage: BridgeMessage = {
        type: 'BRIDGE_DELIVER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: { message: { type: 'state', tick: 1, payload: {} } }
      };

      messageListeners[0](new MessageEvent('message', { data: bridgeMessage }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should clear peer list', () => {
      // Add a peer
      messageListeners[0](new MessageEvent('message', {
        data: {
          type: 'BRIDGE_PEER_JOIN',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: { peerId: 'player-2' }
        }
      }));

      expect(transport.getPeerIds()).toContain('player-2');

      transport.disconnect();

      expect(transport.getPeerIds()).toEqual([]);
    });

    it('should be idempotent', () => {
      transport.disconnect();
      transport.disconnect(); // Should not throw or cause issues
    });
  });

  describe('getPeerIds()', () => {
    beforeEach(() => {
      transport = new IframeBridgeTransport({
        roomId: 'test-room',
        playerId: 'player-1',
        isHost: true
      });
    });

    it('should return empty array initially', () => {
      expect(transport.getPeerIds()).toEqual([]);
    });

    it('should return peer IDs after joins', () => {
      // Add peer 2
      messageListeners[0](new MessageEvent('message', {
        data: {
          type: 'BRIDGE_PEER_JOIN',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: { peerId: 'player-2' }
        }
      }));

      // Add peer 3
      messageListeners[0](new MessageEvent('message', {
        data: {
          type: 'BRIDGE_PEER_JOIN',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: { peerId: 'player-3' }
        }
      }));

      expect(transport.getPeerIds()).toEqual(['player-2', 'player-3']);
    });
  });
});
