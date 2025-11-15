var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/helpers/SpriteManager.ts
var SpriteManager = class {
  constructor(adapter, config) {
    __publicField(this, "sprites", /* @__PURE__ */ new Map());
    __publicField(this, "config");
    __publicField(this, "adapter");
    __publicField(this, "unsubscribe");
    this.adapter = adapter;
    this.config = config;
    if (!adapter.isHost()) {
      this.unsubscribe = adapter.onChange((state) => {
        this.syncFromState(state);
      });
    }
  }
  /**
   * Add a sprite (call this on HOST only)
   * The sprite will automatically sync to clients
   */
  add(key, data) {
    if (!this.adapter.isHost()) {
      console.warn("[SpriteManager] add() should only be called on host. Use state sync on clients.");
      return null;
    }
    if (this.sprites.has(key)) {
      return this.sprites.get(key);
    }
    const sprite = this.config.onCreate(key, data);
    this.sprites.set(key, sprite);
    if (this.config.onCreatePhysics) {
      this.config.onCreatePhysics(sprite, key, data);
    }
    this.adapter.trackSprite(sprite, key, {
      properties: this.config.syncProperties || ["x", "y", "rotation", "alpha"],
      syncInterval: this.config.syncInterval
    });
    return sprite;
  }
  /**
   * Remove a sprite
   */
  remove(key) {
    const sprite = this.sprites.get(key);
    if (!sprite) return;
    this.config.onDestroy?.(sprite, key);
    if (sprite.destroy) {
      sprite.destroy();
    }
    if (this.adapter.isHost()) {
      this.adapter.untrackSprite(key);
    } else {
      this.adapter.unregisterRemoteSprite(key);
    }
    this.sprites.delete(key);
  }
  /**
   * Get a sprite by key
   */
  get(key) {
    return this.sprites.get(key);
  }
  /**
   * Get all sprites
   */
  getAll() {
    return this.sprites;
  }
  /**
   * Update loop (call this in scene.update() for smooth interpolation on clients)
   */
  update() {
    if (!this.adapter.isHost()) {
      this.adapter.updateInterpolation();
    }
  }
  /**
   * Cleanup
   */
  destroy() {
    for (const key of this.sprites.keys()) {
      this.remove(key);
    }
    this.unsubscribe?.();
  }
  /**
   * CLIENT ONLY: Sync sprites from state
   */
  syncFromState(state) {
    const spriteNamespace = this.adapter.spriteNamespace || "_sprites";
    const spriteData = state[spriteNamespace];
    if (!spriteData) return;
    for (const [key, data] of Object.entries(spriteData)) {
      if (!this.sprites.has(key)) {
        const sprite = this.config.onCreate(key, data);
        this.sprites.set(key, sprite);
        this.adapter.registerRemoteSprite(key, sprite);
      } else {
        if (this.config.onUpdate) {
          const sprite = this.sprites.get(key);
          this.config.onUpdate(sprite, data);
        }
      }
    }
    for (const key of this.sprites.keys()) {
      if (!(key in spriteData)) {
        this.remove(key);
      }
    }
  }
};

// src/helpers/InputManager.ts
var InputManager = class {
  // Track one-shot keys
  constructor(adapter, scene) {
    __publicField(this, "runtime");
    __publicField(this, "scene");
    // Phaser.Scene
    __publicField(this, "keyBindings", /* @__PURE__ */ new Map());
    __publicField(this, "cursorBindings");
    __publicField(this, "cursors");
    // Phaser.Types.Input.Keyboard.CursorKeys
    __publicField(this, "pressedKeys", /* @__PURE__ */ new Set());
    this.runtime = adapter.getRuntime();
    this.scene = scene;
  }
  /**
   * Bind keyboard keys to actions
   *
   * @example
   * ```ts
   * input.bindKeys({
   *   'W': { action: 'move', input: { y: -1 }, mode: 'continuous' },
   *   'S': { action: 'move', input: { y: 1 }, mode: 'continuous' },
   *   'Space': { action: 'jump', mode: 'oneshot' },
   *   'E': 'interact' // Shorthand
   * });
   * ```
   */
  bindKeys(bindings) {
    console.log("[InputManager] bindKeys called with:", bindings);
    for (const [key, binding] of Object.entries(bindings)) {
      const normalized = this.normalizeBinding(binding);
      this.keyBindings.set(key.toUpperCase(), normalized);
      console.log(`[InputManager] Registered key: ${key.toUpperCase()}`, normalized);
    }
  }
  /**
   * Bind Phaser cursor keys to actions
   *
   * @example
   * ```ts
   * const cursors = this.input.keyboard.createCursorKeys();
   * input.bindCursors(cursors, {
   *   left: { action: 'move', input: { x: -1 } },
   *   right: { action: 'move', input: { x: 1 } },
   *   up: 'jump'
   * });
   * ```
   */
  bindCursors(cursors, bindings) {
    this.cursors = cursors;
    this.cursorBindings = bindings;
  }
  /**
   * Update input (call this in scene.update())
   */
  update() {
    if (!this.scene.input?.keyboard) {
      console.warn("[InputManager] No keyboard input available! Phaser keyboard may not be initialized.");
      return;
    }
    for (const [key, binding] of this.keyBindings.entries()) {
      const keyObj = this.scene.input.keyboard?.addKey(key, false);
      if (!keyObj) {
        console.warn(`[InputManager] Failed to create key object for: ${key}`);
        continue;
      }
      if (binding.mode === "oneshot") {
        if (keyObj.isDown && !this.pressedKeys.has(key)) {
          console.log(`[InputManager] Key pressed (oneshot): ${key}`, binding);
          this.submitBinding(binding);
          this.pressedKeys.add(key);
        } else if (keyObj.isUp) {
          this.pressedKeys.delete(key);
        }
      } else {
        if (keyObj.isDown) {
          console.log(`[InputManager] Key held (continuous): ${key}`, binding);
          this.submitBinding(binding);
        }
      }
    }
    if (this.cursors && this.cursorBindings) {
      const mappings = [
        [this.cursors.left, this.cursorBindings.left],
        [this.cursors.right, this.cursorBindings.right],
        [this.cursors.up, this.cursorBindings.up],
        [this.cursors.down, this.cursorBindings.down],
        [this.cursors.space, this.cursorBindings.space],
        [this.cursors.shift, this.cursorBindings.shift]
      ];
      for (const [keyObj, binding] of mappings) {
        if (!keyObj || !binding) continue;
        const normalized = this.normalizeBinding(binding);
        const keyName = `cursor_${normalized.action}`;
        if (normalized.mode === "oneshot") {
          if (keyObj.isDown && !this.pressedKeys.has(keyName)) {
            console.log(`[InputManager] Cursor pressed (oneshot):`, normalized);
            this.submitBinding(normalized);
            this.pressedKeys.add(keyName);
          } else if (keyObj.isUp) {
            this.pressedKeys.delete(keyName);
          }
        } else {
          if (keyObj.isDown) {
            console.log(`[InputManager] Cursor held (continuous):`, normalized);
            this.submitBinding(normalized);
          }
        }
      }
    }
  }
  /**
   * Manually submit an action (useful for pointer/touch input)
   */
  submitAction(action, input, targetId) {
    this.runtime.submitAction(action, input, targetId);
  }
  /**
   * Clear all bindings
   */
  clear() {
    this.keyBindings.clear();
    this.cursorBindings = void 0;
    this.cursors = void 0;
    this.pressedKeys.clear();
  }
  /**
   * Get runtime for advanced usage
   */
  getRuntime() {
    return this.runtime;
  }
  // Private helpers
  normalizeBinding(binding) {
    if (typeof binding === "string") {
      return { action: binding, mode: "oneshot" };
    }
    return {
      ...binding,
      mode: binding.mode || "oneshot"
    };
  }
  submitBinding(binding) {
    console.log(`[InputManager] submitAction('${binding.action}', ${JSON.stringify(binding.input)}, ${binding.targetId || "self"})`);
    this.runtime.submitAction(binding.action, binding.input, binding.targetId);
  }
};

// src/PhaserAdapter.ts
var PhaserAdapter = class {
  constructor(runtime, scene, config = {}) {
    this.runtime = runtime;
    this.scene = scene;
    __publicField(this, "trackedSprites", /* @__PURE__ */ new Map());
    __publicField(this, "remoteSprites", /* @__PURE__ */ new Map());
    // Sprites created for remote players
    __publicField(this, "syncIntervalId", null);
    __publicField(this, "spriteNamespace");
    __publicField(this, "autoInterpolate");
    __publicField(this, "lerpFactor");
    this.spriteNamespace = config.spriteNamespace || "_sprites";
    this.autoInterpolate = config.autoInterpolate !== false;
    this.lerpFactor = config.lerpFactor ?? 0.3;
    this.runtime.mutateState((state) => {
      if (!state[this.spriteNamespace]) {
        state[this.spriteNamespace] = {};
      }
    });
    this.runtime.onChange((state) => {
      if (!this.isHost()) {
        this.updateSpritesFromState(state);
      }
    });
  }
  /**
   * Get my player ID
   */
  get myId() {
    return this.runtime.getTransport().getPlayerId();
  }
  /**
   * Check if this peer is the host
   */
  isHost() {
    return this.runtime.getTransport().isHost();
  }
  /**
   * Track a sprite - automatically syncs position/rotation/etc
   *
   * @param sprite Phaser sprite to track
   * @param key Unique key for this sprite (e.g., `player-${playerId}`)
   * @param options Tracking options
   *
   * @example
   * ```ts
   * const player = this.physics.add.sprite(100, 100, 'player');
   * adapter.trackSprite(player, `player-${adapter.myId}`);
   * ```
   */
  trackSprite(sprite, key, options = {}) {
    this.trackedSprites.set(key, { sprite, options });
    if (this.isHost() && !this.syncIntervalId) {
      const interval = options.syncInterval || 50;
      this.syncIntervalId = setInterval(() => this.syncAllSprites(), interval);
    }
  }
  /**
   * Stop tracking a sprite
   */
  untrackSprite(key) {
    this.trackedSprites.delete(key);
    this.runtime.mutateState((state) => {
      const sprites = state[this.spriteNamespace];
      if (sprites && sprites[key]) {
        delete sprites[key];
      }
    });
    if (this.trackedSprites.size === 0 && this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }
  /**
   * Broadcast a custom event
   */
  broadcast(eventName, payload) {
    this.runtime.broadcastEvent(eventName, payload);
  }
  /**
   * Listen for custom events
   */
  on(eventName, callback) {
    return this.runtime.onEvent(eventName, (senderId, _eventName, payload) => {
      callback(senderId, payload);
    });
  }
  /**
   * Cleanup
   */
  destroy() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    this.trackedSprites.clear();
    this.remoteSprites.clear();
  }
  // ============================================================================
  // Private methods
  // ============================================================================
  /**
   * Sync all tracked sprites to state (host only)
   */
  syncAllSprites() {
    if (!this.isHost()) return;
    for (const [key, { sprite, options }] of this.trackedSprites.entries()) {
      this.syncSpriteToState(key, sprite, options);
    }
  }
  /**
   * Sync a single sprite to state
   */
  syncSpriteToState(key, sprite, options) {
    const properties = options.properties || ["x", "y", "rotation", "alpha"];
    const updates = {};
    for (const prop of properties) {
      if (prop in sprite) {
        updates[prop] = sprite[prop];
      }
    }
    this.runtime.mutateState((state) => {
      if (!state[this.spriteNamespace]) {
        state[this.spriteNamespace] = {};
      }
      const sprites = state[this.spriteNamespace];
      sprites[key] = { ...sprites[key], ...updates };
    });
  }
  /**
   * Update sprites from state (clients only)
   */
  updateSpritesFromState(state) {
    const sprites = state[this.spriteNamespace];
    if (this.isHost() || !sprites) return;
    for (const [key, tracked] of this.trackedSprites.entries()) {
      const spriteData = sprites[key];
      if (spriteData) {
        this.applySpriteData(tracked.sprite, spriteData);
      }
    }
    for (const [key, spriteData] of Object.entries(sprites)) {
      if (this.trackedSprites.has(key)) continue;
      const remoteSprite = this.remoteSprites.get(key);
      if (remoteSprite) {
        remoteSprite._targetX = spriteData.x;
        remoteSprite._targetY = spriteData.y;
        remoteSprite._targetRotation = spriteData.rotation;
        if (remoteSprite._targetX !== void 0 && remoteSprite.x === void 0) {
          remoteSprite.x = remoteSprite._targetX;
          remoteSprite.y = remoteSprite._targetY;
          remoteSprite.rotation = remoteSprite._targetRotation || 0;
        }
      }
    }
  }
  /**
   * Apply sprite data to a sprite
   */
  applySpriteData(sprite, data) {
    if ("x" in data) sprite.x = data.x;
    if ("y" in data) sprite.y = data.y;
    if ("rotation" in data) sprite.rotation = data.rotation;
    if ("alpha" in data) sprite.alpha = data.alpha;
    if ("scaleX" in data) sprite.scaleX = data.scaleX;
    if ("scaleY" in data) sprite.scaleY = data.scaleY;
    if ("visible" in data) sprite.visible = data.visible;
  }
  /**
   * Register a remote sprite (for tracking sprites from other players)
   *
   * @param key - Unique identifier for this sprite
   * @param sprite - The Phaser sprite to register
   *
   * @example
   * ```ts
   * adapter.onChange((state) => {
   *   const sprites = state._sprites || state.gameSprites; // depends on config
   *   for (const [key, data] of Object.entries(sprites)) {
   *     if (!this.sprites[key] && key !== `player-${adapter.myId}`) {
   *       const sprite = this.add.sprite(data.x, data.y, 'player');
   *       adapter.registerRemoteSprite(key, sprite);
   *     }
   *   }
   * });
   * ```
   */
  registerRemoteSprite(key, sprite) {
    this.remoteSprites.set(key, sprite);
  }
  /**
   * Call this in your Phaser update() loop to smoothly interpolate remote sprites
   * This should be called every frame (60 FPS) for smooth movement
   *
   * Note: If autoInterpolate is enabled in config, you don't need to call this manually.
   */
  updateInterpolation() {
    if (this.isHost()) return;
    for (const [key, sprite] of this.remoteSprites.entries()) {
      if (sprite._targetX !== void 0) {
        sprite.x += (sprite._targetX - sprite.x) * this.lerpFactor;
        sprite.y += (sprite._targetY - sprite.y) * this.lerpFactor;
        if (sprite._targetRotation !== void 0) {
          sprite.rotation += (sprite._targetRotation - sprite.rotation) * this.lerpFactor;
        }
      }
    }
  }
  /**
   * Unregister a remote sprite
   */
  unregisterRemoteSprite(key) {
    const sprite = this.remoteSprites.get(key);
    if (sprite && sprite.destroy) {
      sprite.destroy();
    }
    this.remoteSprites.delete(key);
  }
  /**
   * Listen for state changes (convenience wrapper)
   */
  onChange(callback) {
    return this.runtime.onChange(callback);
  }
  /**
   * Get the current game state (typed)
   */
  getState() {
    return this.runtime.getState();
  }
  /**
   * Get the runtime (for advanced usage)
   */
  getRuntime() {
    return this.runtime;
  }
  // ============================================================================
  // Helper Factories
  // ============================================================================
  /**
   * Create a SpriteManager for automatic sprite synchronization
   *
   * @example
   * ```ts
   * const spriteManager = adapter.createSpriteManager({
   *   onCreate: (key, data) => {
   *     const sprite = this.add.sprite(data.x, data.y, 'player');
   *     if (adapter.isHost()) {
   *       this.physics.add.existing(sprite);
   *     }
   *     return sprite;
   *   }
   * });
   *
   * // Host: Add sprites
   * spriteManager.add('player-1', { x: 100, y: 100 });
   *
   * // Update loop: Enable interpolation
   * spriteManager.update();
   * ```
   */
  createSpriteManager(config) {
    return new SpriteManager(this, config);
  }
  /**
   * Create an InputManager for simplified input handling
   *
   * @example
   * ```ts
   * const input = adapter.createInputManager();
   *
   * input.bindKeys({
   *   'ArrowLeft': { action: 'move', input: { x: -1 }, mode: 'continuous' },
   *   'ArrowRight': { action: 'move', input: { x: 1 }, mode: 'continuous' },
   *   'Space': 'jump'
   * });
   *
   * // In update loop
   * input.update();
   * ```
   */
  createInputManager() {
    return new InputManager(this, this.scene);
  }
};

// src/runtime.ts
import { GameRuntime } from "@martini/core";
import { LocalTransport } from "@martini/transport-local";
import { IframeBridgeTransport } from "@martini/transport-iframe-bridge";
import Phaser from "phaser";
function initializeGame(config) {
  const platformConfig = window.__MARTINI_CONFIG__;
  if (!platformConfig) {
    throw new Error(
      "Missing __MARTINI_CONFIG__. The platform must inject this before running user code."
    );
  }
  const transport = createTransport(platformConfig.transport);
  const runtime = new GameRuntime(
    config.game,
    transport,
    {
      isHost: platformConfig.transport.isHost,
      playerIds: [transport.getPlayerId()]
    }
  );
  const defaultScale = {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: config.phaserConfig?.width || 800,
    height: config.phaserConfig?.height || 600
  };
  const phaserConfig = {
    type: Phaser.AUTO,
    parent: "game",
    scale: defaultScale,
    ...config.phaserConfig,
    scene: config.scene(runtime)
  };
  const phaserGame = new Phaser.Game(phaserConfig);
  if (typeof window !== "undefined" && window.__MARTINI_IDE__) {
    window.__MARTINI_IDE__.registerRuntime(runtime);
  }
  return { runtime, phaser: phaserGame };
}
function createTransport(config) {
  switch (config.type) {
    case "iframe-bridge":
      return new IframeBridgeTransport({
        roomId: config.roomId,
        isHost: config.isHost
      });
    case "local":
      return new LocalTransport({
        roomId: config.roomId,
        isHost: config.isHost
      });
    // case 'trystero':
    //   return new TrysteroTransport({
    //     appId: config.appId || 'martini',
    //     roomId: config.roomId,
    //     isHost: config.isHost
    //   });
    default:
      throw new Error(`Unknown transport type: ${config.type}. Only 'local' and 'iframe-bridge' are supported in IDE mode.`);
  }
}
export {
  InputManager,
  PhaserAdapter,
  SpriteManager,
  initializeGame
};
//# sourceMappingURL=browser.js.map
