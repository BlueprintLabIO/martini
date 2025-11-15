var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/LocalTransport.ts
var LocalTransportRegistry = class {
  static register(roomId, transport) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, /* @__PURE__ */ new Set());
    }
    this.rooms.get(roomId).add(transport);
    const room = this.rooms.get(roomId);
    for (const peer of room) {
      if (peer !== transport) {
        peer.notifyPeerJoin(transport.playerId);
        transport.notifyPeerJoin(peer.playerId);
      }
    }
  }
  static unregister(roomId, transport) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const isLeavingPeerHost = transport.isHost();
    room.delete(transport);
    for (const peer of room) {
      peer.notifyPeerLeave(transport.playerId, isLeavingPeerHost);
    }
    if (room.size === 0) {
      this.rooms.delete(roomId);
    }
  }
  static getPeers(roomId, excludeId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room).filter((t) => t.playerId !== excludeId);
  }
  static broadcast(roomId, message, senderId) {
    const peers = this.getPeers(roomId, senderId);
    for (const peer of peers) {
      peer.deliver(message, senderId);
    }
  }
  static unicast(roomId, message, senderId, targetId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const target = Array.from(room).find((p) => p.playerId === targetId);
    if (target) {
      target.deliver(message, senderId);
    }
  }
};
__publicField(LocalTransportRegistry, "rooms", /* @__PURE__ */ new Map());
var LocalTransportMetrics = class {
  constructor(transport) {
    this.transport = transport;
    __publicField(this, "connectionState", "disconnected");
    __publicField(this, "connectionChangeHandlers", []);
    __publicField(this, "messagesSent", 0);
    __publicField(this, "messagesReceived", 0);
    __publicField(this, "messagesErrored", 0);
    this.connectionState = "connected";
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
  /** @internal - Called by LocalTransport when message is sent */
  trackMessageSent() {
    this.messagesSent++;
  }
  /** @internal - Called by LocalTransport when message is received */
  trackMessageReceived() {
    this.messagesReceived++;
  }
  /** @internal - Called by LocalTransport when message fails */
  trackMessageError() {
    this.messagesErrored++;
  }
  /** @internal - Called by LocalTransport when disconnecting */
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
var LocalTransport = class {
  constructor(config) {
    __publicField(this, "playerId");
    __publicField(this, "roomId");
    __publicField(this, "_isHost");
    __publicField(this, "metrics");
    __publicField(this, "messageHandlers", []);
    __publicField(this, "peerJoinHandlers", []);
    __publicField(this, "peerLeaveHandlers", []);
    __publicField(this, "hostDisconnectHandlers", []);
    this.roomId = config.roomId;
    this.playerId = config.playerId || `player-${Math.random().toString(36).substring(2, 9)}`;
    this._isHost = config.isHost;
    this.metrics = new LocalTransportMetrics(this);
    LocalTransportRegistry.register(this.roomId, this);
  }
  send(message, targetId) {
    try {
      if (targetId) {
        LocalTransportRegistry.unicast(this.roomId, message, this.playerId, targetId);
      } else {
        LocalTransportRegistry.broadcast(this.roomId, message, this.playerId);
      }
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
    return LocalTransportRegistry.getPeers(this.roomId, this.playerId).map((p) => p.playerId);
  }
  isHost() {
    return this._isHost;
  }
  disconnect() {
    this.metrics.setDisconnected();
    LocalTransportRegistry.unregister(this.roomId, this);
  }
  // Internal methods called by the registry
  /** @internal */
  deliver(message, senderId) {
    this.metrics.trackMessageReceived();
    this.messageHandlers.forEach((h) => h(message, senderId));
  }
  /** @internal */
  notifyPeerJoin(peerId) {
    this.peerJoinHandlers.forEach((h) => h(peerId));
  }
  /** @internal */
  notifyPeerLeave(peerId, wasHost) {
    this.peerLeaveHandlers.forEach((h) => h(peerId));
    if (wasHost) {
      this.hostDisconnectHandlers.forEach((h) => h());
    }
  }
};
export {
  LocalTransport
};
//# sourceMappingURL=browser.js.map
