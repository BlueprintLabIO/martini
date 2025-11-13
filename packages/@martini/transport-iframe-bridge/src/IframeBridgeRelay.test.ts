import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IframeBridgeRelay } from './IframeBridgeRelay';
import type { BridgeMessage } from './IframeBridgeTransport';

describe('IframeBridgeRelay', () => {
  let relay: IframeBridgeRelay;
  let messageListeners: Array<(event: MessageEvent) => void> = [];
  let mockIframes: Map<string, HTMLIFrameElement> = new Map();

  beforeEach(() => {
    messageListeners = [];
    mockIframes.clear();

    // Mock addEventListener to capture handlers
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'message') {
        messageListeners.push(handler as (event: MessageEvent) => void);
      }
    });

    // Mock querySelectorAll to return our mock iframes
    vi.spyOn(document, 'querySelectorAll').mockImplementation((selector: string) => {
      if (selector === 'iframe') {
        return Array.from(mockIframes.values()) as any;
      }
      return [] as any;
    });
  });

  afterEach(() => {
    relay?.destroy();
    vi.restoreAllMocks();
    messageListeners = [];
    mockIframes.clear();
  });

  function createMockIframe(id: string): HTMLIFrameElement {
    const mockWindow = {
      postMessage: vi.fn()
    } as unknown as Window;

    const iframe = {
      contentWindow: mockWindow,
      id
    } as unknown as HTMLIFrameElement;

    mockIframes.set(id, iframe);
    return iframe;
  }

  function simulateMessage(source: Window, data: BridgeMessage): void {
    const event = new MessageEvent('message', {
      data,
      source
    });
    messageListeners[0](event);
  }

  describe('Constructor', () => {
    it('should create relay and set up message listener', () => {
      relay = new IframeBridgeRelay();

      expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(messageListeners.length).toBe(1);
    });
  });

  describe('Peer Registration', () => {
    beforeEach(() => {
      relay = new IframeBridgeRelay();
    });

    it('should register peer from BRIDGE_REGISTER message', () => {
      const iframe = createMockIframe('host-iframe');

      const message: BridgeMessage = {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      };

      simulateMessage(iframe.contentWindow!, message);

      const peers = relay.getPeers();
      expect(peers).toHaveLength(1);
      expect(peers[0].playerId).toBe('player-1');
      expect(peers[0].roomId).toBe('test-room');
      expect(peers[0].isHost).toBe(true); // First peer is host
    });

    it('should mark first peer as host', () => {
      const hostIframe = createMockIframe('host-iframe');

      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      const peers = relay.getPeers();
      expect(peers[0].isHost).toBe(true);
    });

    it('should mark second peer as non-host', () => {
      const hostIframe = createMockIframe('host-iframe');
      const clientIframe = createMockIframe('client-iframe');

      // Register host
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      // Register client
      simulateMessage(clientIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: {}
      });

      const peers = relay.getPeers();
      expect(peers).toHaveLength(2);
      expect(peers[0].isHost).toBe(true);
      expect(peers[1].isHost).toBe(false);
    });

    it('should notify existing peers when new peer joins', () => {
      const hostIframe = createMockIframe('host-iframe');
      const clientIframe = createMockIframe('client-iframe');

      // Register host
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      const hostPostMessage = vi.mocked(hostIframe.contentWindow!.postMessage);
      hostPostMessage.mockClear();

      // Register client
      simulateMessage(clientIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: {}
      });

      // Host should be notified about client
      expect(hostPostMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_PEER_JOIN',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: { peerId: 'player-2' }
        },
        '*'
      );
    });

    it('should notify new peer about existing peers', () => {
      const hostIframe = createMockIframe('host-iframe');
      const clientIframe = createMockIframe('client-iframe');

      // Register host
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      // Register client
      simulateMessage(clientIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: {}
      });

      const clientPostMessage = vi.mocked(clientIframe.contentWindow!.postMessage);

      // Client should be notified about host
      expect(clientPostMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_PEER_JOIN',
          roomId: 'test-room',
          playerId: 'player-2',
          payload: { peerId: 'player-1' }
        },
        '*'
      );
    });

    it('should handle multiple rooms independently', () => {
      const room1Host = createMockIframe('room1-host');
      const room1Client = createMockIframe('room1-client');
      const room2Host = createMockIframe('room2-host');

      simulateMessage(room1Host.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'room-1',
        playerId: 'player-1',
        payload: {}
      });

      simulateMessage(room1Client.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'room-1',
        playerId: 'player-2',
        payload: {}
      });

      simulateMessage(room2Host.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'room-2',
        playerId: 'player-3',
        payload: {}
      });

      const room1Peers = relay.getPeersInRoomById('room-1');
      const room2Peers = relay.getPeersInRoomById('room-2');

      expect(room1Peers).toHaveLength(2);
      expect(room2Peers).toHaveLength(1);
      expect(room2Peers[0].isHost).toBe(true); // First in room-2
    });

    it('should warn if iframe not found for registration', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate message from unknown source
      const unknownWindow = { postMessage: vi.fn() } as unknown as Window;

      simulateMessage(unknownWindow, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Could not find iframe'),
        'player-1'
      );

      consoleWarn.mockRestore();
    });
  });

  describe('Message Relaying', () => {
    beforeEach(() => {
      relay = new IframeBridgeRelay();
    });

    it('should relay broadcast messages to all other peers', () => {
      const hostIframe = createMockIframe('host-iframe');
      const client1Iframe = createMockIframe('client1-iframe');
      const client2Iframe = createMockIframe('client2-iframe');

      // Register all peers
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      simulateMessage(client1Iframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: {}
      });

      simulateMessage(client2Iframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-3',
        payload: {}
      });

      // Clear previous calls
      vi.mocked(client1Iframe.contentWindow!.postMessage).mockClear();
      vi.mocked(client2Iframe.contentWindow!.postMessage).mockClear();

      // Host sends broadcast message
      const message = { type: 'state', tick: 1, payload: { test: 'data' } };
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_SEND',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: { message }
      });

      // Both clients should receive the message
      expect(client1Iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_DELIVER',
          roomId: 'test-room',
          playerId: 'player-1', // Original sender
          payload: { message }
        },
        '*'
      );

      expect(client2Iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_DELIVER',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: { message }
        },
        '*'
      );
    });

    it('should relay unicast messages only to target peer', () => {
      const hostIframe = createMockIframe('host-iframe');
      const client1Iframe = createMockIframe('client1-iframe');
      const client2Iframe = createMockIframe('client2-iframe');

      // Register all peers
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      simulateMessage(client1Iframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: {}
      });

      simulateMessage(client2Iframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-3',
        payload: {}
      });

      // Clear previous calls
      vi.mocked(client1Iframe.contentWindow!.postMessage).mockClear();
      vi.mocked(client2Iframe.contentWindow!.postMessage).mockClear();

      // Host sends unicast to client1 only
      const message = { type: 'action', tick: 1, payload: {} };
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_SEND',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {
          message,
          targetId: 'player-2' // Only client1
        }
      });

      // Only client1 should receive
      expect(client1Iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_DELIVER',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: { message }
        },
        '*'
      );

      // Client2 should NOT receive
      expect(client2Iframe.contentWindow!.postMessage).not.toHaveBeenCalled();
    });

    it('should not relay message to sender', () => {
      const hostIframe = createMockIframe('host-iframe');
      const clientIframe = createMockIframe('client-iframe');

      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      simulateMessage(clientIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: {}
      });

      const hostPostMessage = vi.mocked(hostIframe.contentWindow!.postMessage);
      hostPostMessage.mockClear();

      // Host sends message
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_SEND',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: { message: { type: 'state', tick: 1, payload: {} } }
      });

      // Host should NOT receive its own message
      expect(hostPostMessage).not.toHaveBeenCalled();
    });

    it('should warn if message has no payload', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const hostIframe = createMockIframe('host-iframe');
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_SEND',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {} // No message
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('No message in BRIDGE_SEND')
      );

      consoleWarn.mockRestore();
    });

    it('should warn if sender is unknown', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const unknownWindow = { postMessage: vi.fn() } as unknown as Window;

      simulateMessage(unknownWindow, {
        type: 'BRIDGE_SEND',
        roomId: 'test-room',
        playerId: 'unknown-player',
        payload: { message: { type: 'state', tick: 1, payload: {} } }
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown sender'),
        'unknown-player'
      );

      consoleWarn.mockRestore();
    });
  });

  describe('Peer Disconnection', () => {
    beforeEach(() => {
      relay = new IframeBridgeRelay();
    });

    it('should remove peer on BRIDGE_PEER_LEAVE', () => {
      const hostIframe = createMockIframe('host-iframe');
      const clientIframe = createMockIframe('client-iframe');

      // Register peers
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      simulateMessage(clientIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: {}
      });

      expect(relay.getPeers()).toHaveLength(2);

      // Client leaves
      simulateMessage(clientIframe.contentWindow!, {
        type: 'BRIDGE_PEER_LEAVE',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: { peerId: 'player-2', wasHost: false }
      });

      expect(relay.getPeers()).toHaveLength(1);
      expect(relay.getPeers()[0].playerId).toBe('player-1');
    });

    it('should notify remaining peers when peer leaves', () => {
      const hostIframe = createMockIframe('host-iframe');
      const clientIframe = createMockIframe('client-iframe');

      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      simulateMessage(clientIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: {}
      });

      const hostPostMessage = vi.mocked(hostIframe.contentWindow!.postMessage);
      hostPostMessage.mockClear();

      // Client leaves
      simulateMessage(clientIframe.contentWindow!, {
        type: 'BRIDGE_PEER_LEAVE',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: { peerId: 'player-2', wasHost: false }
      });

      // Host should be notified
      expect(hostPostMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_PEER_LEAVE',
          roomId: 'test-room',
          playerId: 'player-1',
          payload: { peerId: 'player-2', wasHost: false }
        },
        '*'
      );
    });

    it('should send host disconnect when host leaves', () => {
      const hostIframe = createMockIframe('host-iframe');
      const clientIframe = createMockIframe('client-iframe');

      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      simulateMessage(clientIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: {}
      });

      const clientPostMessage = vi.mocked(clientIframe.contentWindow!.postMessage);
      clientPostMessage.mockClear();

      // Host leaves
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_PEER_LEAVE',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: { peerId: 'player-1', wasHost: true }
      });

      // Client should receive both PEER_LEAVE and HOST_DISCONNECT
      expect(clientPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BRIDGE_PEER_LEAVE' }),
        '*'
      );

      expect(clientPostMessage).toHaveBeenCalledWith(
        {
          type: 'BRIDGE_HOST_DISCONNECT',
          roomId: 'test-room',
          playerId: 'player-2',
          payload: { wasHost: true }
        },
        '*'
      );
    });

    it('should remove room when last peer leaves', () => {
      const hostIframe = createMockIframe('host-iframe');

      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      expect(relay.getPeersInRoomById('test-room')).toHaveLength(1);

      // Host leaves
      simulateMessage(hostIframe.contentWindow!, {
        type: 'BRIDGE_PEER_LEAVE',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: { peerId: 'player-1', wasHost: true }
      });

      expect(relay.getPeersInRoomById('test-room')).toHaveLength(0);
    });
  });

  describe('Manual Registration', () => {
    beforeEach(() => {
      relay = new IframeBridgeRelay();
    });

    it('should support manual iframe registration', () => {
      const iframe = createMockIframe('manual-iframe');

      relay.registerIframe('player-1', 'test-room', iframe, true);

      const peers = relay.getPeers();
      expect(peers).toHaveLength(1);
      expect(peers[0].playerId).toBe('player-1');
      expect(peers[0].roomId).toBe('test-room');
      expect(peers[0].isHost).toBe(true);
    });
  });

  describe('Query Methods', () => {
    beforeEach(() => {
      relay = new IframeBridgeRelay();
    });

    it('should return all peers', () => {
      const host = createMockIframe('host');
      const client = createMockIframe('client');

      simulateMessage(host.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      simulateMessage(client.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-2',
        payload: {}
      });

      const peers = relay.getPeers();
      expect(peers).toHaveLength(2);
    });

    it('should return empty array for non-existent room', () => {
      const peers = relay.getPeersInRoomById('non-existent-room');
      expect(peers).toEqual([]);
    });
  });

  describe('destroy()', () => {
    beforeEach(() => {
      relay = new IframeBridgeRelay();
    });

    it('should remove event listener', () => {
      const removeEventListener = vi.spyOn(window, 'removeEventListener');

      relay.destroy();

      expect(removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should clear all peers and rooms', () => {
      const iframe = createMockIframe('iframe');

      simulateMessage(iframe.contentWindow!, {
        type: 'BRIDGE_REGISTER',
        roomId: 'test-room',
        playerId: 'player-1',
        payload: {}
      });

      expect(relay.getPeers()).toHaveLength(1);

      relay.destroy();

      expect(relay.getPeers()).toHaveLength(0);
      expect(relay.getPeersInRoomById('test-room')).toHaveLength(0);
    });
  });
});
