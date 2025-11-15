// src/IframeBridgeTransport.ts
var IframeBridgeTransportMetrics = class {
  constructor(transport) {
    this.transport = transport;
    this.connectionState = "connecting";
    this.connectionChangeHandlers = [];
    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.messagesErrored = 0;
  }
  getConnectionState() {
    return this.connectionState;
  }
  onConnectionChange(callback) {
    this.connectionChangeHandlers.push(callback);
    return () => {
      const idx = this.connectionChangeHandlers.indexOf(callback);
      if (idx >= 0) this.connectionChangeHandlers.splice(idx, 1);
    };
  }
  getPeerCount() {
    return this.transport.getPeerIds().length;
  }
  getMessageStats() {
    return {
      sent: this.messagesSent,
      received: this.messagesReceived,
      errors: this.messagesErrored
    };
  }
  resetStats() {
    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.messagesErrored = 0;
  }
  /** @internal */
  trackMessageSent() {
    this.messagesSent++;
  }
  /** @internal */
  trackMessageReceived() {
    this.messagesReceived++;
  }
  /** @internal */
  trackMessageError() {
    this.messagesErrored++;
  }
  /** @internal */
  setConnected() {
    if (this.connectionState !== "connected") {
      this.connectionState = "connected";
      this.notifyConnectionChange();
    }
  }
  /** @internal */
  setDisconnected() {
    if (this.connectionState !== "disconnected") {
      this.connectionState = "disconnected";
      this.notifyConnectionChange();
    }
  }
  notifyConnectionChange() {
    this.connectionChangeHandlers.forEach((h) => {
      try {
        h(this.connectionState);
      } catch (error) {
        console.error("Error in connection change handler:", error);
      }
    });
  }
};
var IframeBridgeTransport = class {
  constructor(config) {
    this.messageHandlers = [];
    this.peerJoinHandlers = [];
    this.peerLeaveHandlers = [];
    this.hostDisconnectHandlers = [];
    this.peerIds = /* @__PURE__ */ new Set();
    this.messageHandler = null;
    this.isDisconnected = false;
    this.roomId = config.roomId;
    this.playerId = config.playerId || `player-${Math.random().toString(36).substring(2, 9)}`;
    this._isHost = config.isHost;
    this.metrics = new IframeBridgeTransportMetrics(this);
    this.setupMessageListener();
    this.registerWithRelay();
  }
  /**
   * Set up listener for messages from parent relay
   */
  setupMessageListener() {
    this.messageHandler = (event) => {
      const data = event.data;
      if (!data || !data.type || !data.type.startsWith("BRIDGE_")) {
        return;
      }
      if (data.roomId !== this.roomId) {
        return;
      }
      switch (data.type) {
        case "BRIDGE_DELIVER":
          if (data.payload?.message && data.playerId !== this.playerId) {
            this.metrics.trackMessageReceived();
            this.messageHandlers.forEach((h) => h(data.payload.message, data.playerId));
          }
          break;
        case "BRIDGE_PEER_JOIN":
          if (data.payload?.peerId && data.payload.peerId !== this.playerId) {
            this.peerIds.add(data.payload.peerId);
            this.metrics.setConnected();
            this.peerJoinHandlers.forEach((h) => h(data.payload.peerId));
          }
          break;
        case "BRIDGE_PEER_LEAVE":
          if (data.payload?.peerId) {
            this.peerIds.delete(data.payload.peerId);
            this.peerLeaveHandlers.forEach((h) => h(data.payload.peerId));
          }
          break;
        case "BRIDGE_HOST_DISCONNECT":
          if (data.payload?.wasHost && !this._isHost) {
            this.hostDisconnectHandlers.forEach((h) => h());
          }
          break;
      }
    };
    window.addEventListener("message", this.messageHandler);
  }
  /**
   * Register this transport instance with parent relay
   */
  registerWithRelay() {
    if (!window.parent || window.parent === window) {
      console.warn("[IframeBridgeTransport] No parent window found - transport may not work");
      return;
    }
    const registerMessage = {
      type: "BRIDGE_REGISTER",
      roomId: this.roomId,
      playerId: this.playerId,
      payload: {}
    };
    window.parent.postMessage(registerMessage, "*");
  }
  /**
   * Send message to peer(s)
   */
  send(message, targetId) {
    if (this.isDisconnected) {
      console.warn("[IframeBridgeTransport] Cannot send - transport is disconnected");
      this.metrics.trackMessageError();
      return;
    }
    if (!window.parent || window.parent === window) {
      console.warn("[IframeBridgeTransport] No parent window - message not sent");
      this.metrics.trackMessageError();
      return;
    }
    try {
      const bridgeMessage = {
        type: "BRIDGE_SEND",
        roomId: this.roomId,
        playerId: this.playerId,
        payload: {
          message,
          targetId
        }
      };
      window.parent.postMessage(bridgeMessage, "*");
      this.metrics.trackMessageSent();
    } catch (error) {
      this.metrics.trackMessageError();
      throw error;
    }
  }
  onMessage(handler) {
    this.messageHandlers.push(handler);
    return () => {
      const idx = this.messageHandlers.indexOf(handler);
      if (idx >= 0) this.messageHandlers.splice(idx, 1);
    };
  }
  onPeerJoin(handler) {
    this.peerJoinHandlers.push(handler);
    return () => {
      const idx = this.peerJoinHandlers.indexOf(handler);
      if (idx >= 0) this.peerJoinHandlers.splice(idx, 1);
    };
  }
  onPeerLeave(handler) {
    this.peerLeaveHandlers.push(handler);
    return () => {
      const idx = this.peerLeaveHandlers.indexOf(handler);
      if (idx >= 0) this.peerLeaveHandlers.splice(idx, 1);
    };
  }
  onHostDisconnect(handler) {
    this.hostDisconnectHandlers.push(handler);
    return () => {
      const idx = this.hostDisconnectHandlers.indexOf(handler);
      if (idx >= 0) this.hostDisconnectHandlers.splice(idx, 1);
    };
  }
  getPlayerId() {
    return this.playerId;
  }
  getPeerIds() {
    return Array.from(this.peerIds);
  }
  isHost() {
    return this._isHost;
  }
  disconnect() {
    if (this.isDisconnected) return;
    this.metrics.setDisconnected();
    this.isDisconnected = true;
    if (window.parent && window.parent !== window) {
      const disconnectMessage = {
        type: "BRIDGE_PEER_LEAVE",
        roomId: this.roomId,
        playerId: this.playerId,
        payload: {
          peerId: this.playerId,
          wasHost: this._isHost
        }
      };
      window.parent.postMessage(disconnectMessage, "*");
    }
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);
      this.messageHandler = null;
    }
    this.messageHandlers = [];
    this.peerJoinHandlers = [];
    this.peerLeaveHandlers = [];
    this.hostDisconnectHandlers = [];
    this.peerIds.clear();
  }
};

// src/IframeBridgeRelay.ts
var IframeBridgeRelay = class {
  constructor() {
    this.peers = /* @__PURE__ */ new Map();
    this.rooms = /* @__PURE__ */ new Map();
    // roomId → Set<playerId>
    this.messageHandler = null;
    this.setupMessageListener();
  }
  /**
   * Set up listener for messages from iframes
   */
  setupMessageListener() {
    this.messageHandler = (event) => {
      const data = event.data;
      if (!data || !data.type || !data.type.startsWith("BRIDGE_")) {
        return;
      }
      switch (data.type) {
        case "BRIDGE_REGISTER":
          this.handleRegister(data, event.source);
          break;
        case "BRIDGE_SEND":
          this.handleSend(data);
          break;
        case "BRIDGE_PEER_LEAVE":
          this.handlePeerLeave(data);
          break;
      }
    };
    window.addEventListener("message", this.messageHandler);
  }
  /**
   * Handle peer registration
   */
  handleRegister(data, source) {
    const { playerId, roomId } = data;
    const iframe = Array.from(document.querySelectorAll("iframe")).find(
      (iframe2) => iframe2.contentWindow === source
    );
    if (!iframe) {
      console.warn("[IframeBridgeRelay] Could not find iframe for registration:", playerId);
      return;
    }
    const room = this.rooms.get(roomId);
    const isHost = !room || room.size === 0;
    this.peers.set(playerId, {
      playerId,
      roomId,
      iframe,
      isHost
    });
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, /* @__PURE__ */ new Set());
    }
    this.rooms.get(roomId).add(playerId);
    const existingPeers = this.getPeersInRoom(roomId).filter((p) => p.playerId !== playerId);
    for (const peer of existingPeers) {
      this.sendToIframe(peer.iframe, {
        type: "BRIDGE_PEER_JOIN",
        roomId,
        playerId: peer.playerId,
        payload: { peerId: playerId }
      });
    }
    for (const peer of existingPeers) {
      this.sendToIframe(iframe, {
        type: "BRIDGE_PEER_JOIN",
        roomId,
        playerId,
        payload: { peerId: peer.playerId }
      });
    }
  }
  /**
   * Handle message send from a peer
   */
  handleSend(data) {
    const { playerId, roomId, payload } = data;
    if (!payload?.message) {
      console.warn("[IframeBridgeRelay] No message in BRIDGE_SEND");
      return;
    }
    const sender = this.peers.get(playerId);
    if (!sender) {
      console.warn("[IframeBridgeRelay] Unknown sender:", playerId);
      return;
    }
    const targets = payload.targetId ? [this.peers.get(payload.targetId)].filter(Boolean) : this.getPeersInRoom(roomId).filter((p) => p.playerId !== playerId);
    for (const target of targets) {
      this.sendToIframe(target.iframe, {
        type: "BRIDGE_DELIVER",
        roomId,
        playerId,
        // Original sender ID
        payload: { message: payload.message }
      });
    }
  }
  /**
   * Handle peer leaving
   */
  handlePeerLeave(data) {
    const { playerId, roomId, payload } = data;
    const peer = this.peers.get(playerId);
    if (!peer) return;
    this.peers.delete(playerId);
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(playerId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    console.log(`[IframeBridgeRelay] Peer ${playerId} left room ${roomId}`);
    const remainingPeers = this.getPeersInRoom(roomId);
    for (const otherPeer of remainingPeers) {
      this.sendToIframe(otherPeer.iframe, {
        type: "BRIDGE_PEER_LEAVE",
        roomId,
        playerId: otherPeer.playerId,
        payload: {
          peerId: playerId,
          wasHost: payload?.wasHost || false
        }
      });
    }
    if (peer.isHost) {
      for (const otherPeer of remainingPeers) {
        this.sendToIframe(otherPeer.iframe, {
          type: "BRIDGE_HOST_DISCONNECT",
          roomId,
          playerId: otherPeer.playerId,
          payload: { wasHost: true }
        });
      }
    }
  }
  /**
   * Get all peers in a room
   */
  getPeersInRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room).map((playerId) => this.peers.get(playerId)).filter(Boolean);
  }
  /**
   * Send message to an iframe
   */
  sendToIframe(iframe, message) {
    if (!iframe.contentWindow) {
      console.warn("[IframeBridgeRelay] Iframe has no contentWindow");
      return;
    }
    iframe.contentWindow.postMessage(message, "*");
  }
  /**
   * Manually register an iframe (useful for testing or explicit control)
   */
  registerIframe(playerId, roomId, iframe, isHost) {
    this.peers.set(playerId, {
      playerId,
      roomId,
      iframe,
      isHost
    });
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, /* @__PURE__ */ new Set());
    }
    this.rooms.get(roomId).add(playerId);
    console.log(`[IframeBridgeRelay] Manually registered ${playerId} in ${roomId}`);
  }
  /**
   * Get info about registered peers
   */
  getPeers() {
    return Array.from(this.peers.values());
  }
  /**
   * Get peers in a specific room
   */
  getPeersInRoomById(roomId) {
    return this.getPeersInRoom(roomId);
  }
  /**
   * Clean up
   */
  destroy() {
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);
      this.messageHandler = null;
    }
    this.peers.clear();
    this.rooms.clear();
  }
};
export {
  IframeBridgeRelay,
  IframeBridgeTransport
};
//# sourceMappingURL=browser.js.map
