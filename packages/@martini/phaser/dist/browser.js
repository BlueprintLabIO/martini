var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/helpers/SpriteManager.ts
var SpriteManager = class {
  // Phaser.Scene (needed for creating labels)
  constructor(adapter, config) {
    __publicField(this, "sprites", /* @__PURE__ */ new Map());
    __publicField(this, "labels", /* @__PURE__ */ new Map());
    // Phaser.GameObjects.Text
    __publicField(this, "metadata", /* @__PURE__ */ new Map());
    // Track static metadata for change detection
    __publicField(this, "localSprites", /* @__PURE__ */ new Set());
    // Track sprites created locally (via add())
    __publicField(this, "config");
    __publicField(this, "adapter");
    __publicField(this, "unsubscribe");
    __publicField(this, "scene");
    this.adapter = adapter;
    this.config = config;
    if (config.selectState && true) {
      console.warn(
        "[SpriteManager] DEPRECATION WARNING: selectState is prone to race conditions.\nUse staticProperties instead to avoid timing bugs.\nSee: https://docs.martini.dev/guides/sprite-sync"
      );
    }
    if (!adapter.isHost()) {
      this.unsubscribe = adapter.onChange((state) => {
        this.syncFromState(state);
      });
    }
  }
  /**
   * Add a sprite
   *
   * In host-authoritative mode (default):
   * - HOST: Creates sprite with physics
   * - CLIENT: No-op (sprites auto-created from state sync)
   *
   * In shared mode:
   * - Both host and client create sprites when add() is called
   */
  add(key, data) {
    const authority = this.config.authority || "host-authoritative";
    if (authority === "host-authoritative" && !this.adapter.isHost()) {
      return null;
    }
    if (this.sprites.has(key)) {
      return this.sprites.get(key);
    }
    const enrichedData = this.config.selectState ? { ...data, ...this.config.selectState(key) } : data;
    if (this.config.staticProperties && this.config.staticProperties.length > 0) {
      const staticData = {};
      for (const prop of this.config.staticProperties) {
        if (prop in enrichedData) {
          staticData[prop] = enrichedData[prop];
        }
      }
      this.metadata.set(key, staticData);
      this.adapter.runtime.mutateState((state) => {
        const spriteNamespace = this.adapter.spriteNamespace || "_sprites";
        if (!state[spriteNamespace]) {
          state[spriteNamespace] = {};
        }
        state[spriteNamespace][key] = staticData;
      });
    }
    const sprite = this.config.onCreate(key, enrichedData);
    if (!sprite) {
      return null;
    }
    this.sprites.set(key, sprite);
    this.localSprites.add(key);
    if (this.config.label) {
      this.createLabel(key, sprite, enrichedData);
    }
    if (this.config.onCreatePhysics) {
      this.config.onCreatePhysics(sprite, key, enrichedData);
    }
    this.adapter.trackSprite(sprite, key, {
      properties: this.config.syncProperties || ["x", "y", "rotation", "alpha"],
      syncInterval: this.config.syncInterval
    });
    if (this.config.onAdd) {
      this.config.onAdd(sprite, key, enrichedData, {
        manager: this,
        allSprites: this.sprites
      });
    }
    return sprite;
  }
  /**
   * Remove a sprite
   */
  remove(key) {
    const sprite = this.sprites.get(key);
    if (!sprite) return;
    this.config.onDestroy?.(sprite, key);
    const label = this.labels.get(key);
    if (label && label.destroy) {
      label.destroy();
    }
    this.labels.delete(key);
    this.metadata.delete(key);
    this.localSprites.delete(key);
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
    if (this.config.label && this.labels.size > 0) {
      const offsetX = this.config.label.offset?.x || 0;
      const offsetY = this.config.label.offset?.y || 0;
      for (const [key, sprite] of this.sprites.entries()) {
        const label = this.labels.get(key);
        if (label && sprite) {
          label.setPosition(sprite.x + offsetX, sprite.y + offsetY);
        }
      }
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
        if (this.localSprites.has(key)) {
          continue;
        }
        const enrichedData = this.config.selectState ? { ...data, ...this.config.selectState(key) } : data;
        if (this.config.staticProperties && this.config.staticProperties.length > 0) {
          const staticData = {};
          for (const prop of this.config.staticProperties) {
            if (prop in enrichedData) {
              staticData[prop] = enrichedData[prop];
            }
          }
          this.metadata.set(key, staticData);
        }
        const sprite = this.config.onCreate(key, enrichedData);
        if (!sprite) {
          return;
        }
        this.sprites.set(key, sprite);
        this.adapter.registerRemoteSprite(key, sprite);
        if (this.config.label) {
          this.createLabel(key, sprite, enrichedData);
        }
        if (this.config.onAdd) {
          this.config.onAdd(sprite, key, enrichedData, {
            manager: this,
            allSprites: this.sprites
          });
        }
      } else {
        const oldMetadata = this.metadata.get(key) || {};
        const newMetadata = {};
        if (this.config.staticProperties) {
          for (const prop of this.config.staticProperties) {
            if (prop in data) {
              newMetadata[prop] = data[prop];
            }
          }
        }
        const metadataChanged = this.hasMetadataChanged(oldMetadata, newMetadata);
        if (metadataChanged) {
          this.metadata.set(key, newMetadata);
          const sprite = this.sprites.get(key);
          if (this.config.onMetadataChange && sprite) {
            this.config.onMetadataChange(sprite, oldMetadata, newMetadata);
          }
          if (this.config.label) {
            const label = this.labels.get(key);
            if (label) {
              const enrichedData = this.config.selectState ? { ...data, ...this.config.selectState(key) } : data;
              label.setText(this.config.label.getText(enrichedData));
            }
          }
        }
        if (this.config.onUpdate) {
          const sprite = this.sprites.get(key);
          const enrichedData = this.config.selectState ? { ...data, ...this.config.selectState(key) } : data;
          this.config.onUpdate(sprite, enrichedData);
        }
      }
    }
    for (const key of this.sprites.keys()) {
      if (!(key in spriteData)) {
        this.remove(key);
      }
    }
  }
  /**
   * Helper: Create a label for a sprite
   */
  createLabel(key, sprite, data) {
    if (!this.config.label) return;
    const scene = sprite.scene;
    if (!scene || !scene.add) {
      console.warn("[SpriteManager] Cannot create label: sprite has no scene");
      return;
    }
    const labelText = this.config.label.getText(data);
    const label = scene.add.text(
      sprite.x,
      sprite.y,
      labelText,
      this.config.label.style || {}
    ).setOrigin(0.5);
    this.labels.set(key, label);
  }
  /**
   * Helper: Check if metadata has changed
   */
  hasMetadataChanged(oldMeta, newMeta) {
    if (!this.config.staticProperties) return false;
    for (const prop of this.config.staticProperties) {
      if (oldMeta[prop] !== newMeta[prop]) {
        return true;
      }
    }
    return false;
  }
};

// src/helpers/InputProfiles.ts
var BUILT_IN_PROFILES = {
  platformer: {
    name: "platformer",
    description: "Side-scrolling platformer controls (Arrow keys + Space for jump)",
    config: {
      type: "aggregated",
      action: "move",
      keys: {
        left: "ArrowLeft",
        right: "ArrowRight",
        up: "Space"
      },
      mode: "continuous"
    }
  },
  platformerWASD: {
    name: "platformerWASD",
    description: "Platformer controls with WASD",
    config: {
      type: "aggregated",
      action: "move",
      keys: {
        left: "A",
        right: "D",
        up: "W"
      },
      mode: "continuous"
    }
  },
  topDown: {
    name: "topDown",
    description: "4-directional movement (Arrow keys)",
    config: {
      type: "aggregated",
      action: "move",
      keys: {
        left: "ArrowLeft",
        right: "ArrowRight",
        up: "ArrowUp",
        down: "ArrowDown"
      },
      mode: "continuous"
    }
  },
  topDownWASD: {
    name: "topDownWASD",
    description: "4-directional movement (WASD)",
    config: {
      type: "aggregated",
      action: "move",
      keys: {
        left: "A",
        right: "D",
        up: "W",
        down: "S"
      },
      mode: "continuous"
    }
  },
  shooter: {
    name: "shooter",
    description: "Top-down shooter (WASD for move, Space for shoot)",
    config: {
      type: "per-key",
      bindings: {
        "W": { action: "move", input: { y: -1 }, mode: "continuous" },
        "A": { action: "move", input: { x: -1 }, mode: "continuous" },
        "S": { action: "move", input: { y: 1 }, mode: "continuous" },
        "D": { action: "move", input: { x: 1 }, mode: "continuous" },
        "Space": { action: "shoot", mode: "oneshot" }
      }
    }
  },
  twinStick: {
    name: "twinStick",
    description: "Twin-stick shooter (WASD for move, Arrow keys for aim)",
    config: {
      type: "per-key",
      bindings: {
        "W": { action: "move", input: { y: -1 }, mode: "continuous" },
        "A": { action: "move", input: { x: -1 }, mode: "continuous" },
        "S": { action: "move", input: { y: 1 }, mode: "continuous" },
        "D": { action: "move", input: { x: 1 }, mode: "continuous" },
        "ArrowLeft": { action: "aim", input: { x: -1 }, mode: "continuous" },
        "ArrowRight": { action: "aim", input: { x: 1 }, mode: "continuous" },
        "ArrowUp": { action: "aim", input: { y: -1 }, mode: "continuous" },
        "ArrowDown": { action: "aim", input: { y: 1 }, mode: "continuous" }
      }
    }
  }
};
var customProfiles = /* @__PURE__ */ new Map();
function registerProfile(name, profile) {
  customProfiles.set(name, profile);
}
function getProfile(name) {
  return customProfiles.get(name) || BUILT_IN_PROFILES[name];
}
function applyProfileOptions(profile, options) {
  if (!options) return profile.config;
  const config = profile.config;
  if (config.type === "aggregated") {
    let keys = { ...config.keys };
    if (options.player === 2) {
      const keyMap = {
        "ArrowLeft": "A",
        "ArrowRight": "D",
        "ArrowUp": "W",
        "ArrowDown": "S",
        "Space": "Space"
        // Keep Space unchanged
      };
      const newKeys = {};
      for (const [field, key] of Object.entries(keys)) {
        newKeys[field] = keyMap[key] || key;
      }
      keys = newKeys;
    }
    return {
      type: "aggregated",
      action: options.action || config.action,
      keys,
      mode: config.mode
    };
  }
  let bindings = { ...config.bindings };
  if (options.player === 2) {
    const keyMap = {
      "ArrowLeft": "A",
      "ArrowRight": "D",
      "ArrowUp": "W",
      "ArrowDown": "S"
    };
    const newBindings = {};
    for (const [key, binding] of Object.entries(bindings)) {
      const newKey = keyMap[key] || key;
      newBindings[newKey] = binding;
    }
    bindings = newBindings;
  }
  if (options.action) {
    for (const key of Object.keys(bindings)) {
      const binding = bindings[key];
      if (typeof binding === "object") {
        bindings[key] = { ...binding, action: options.action };
      }
    }
  }
  if (options.overrides) {
    for (const [key, binding] of Object.entries(options.overrides)) {
      if (binding !== void 0) {
        bindings[key] = binding;
      }
    }
  }
  return {
    type: "per-key",
    bindings
  };
}
function mergeProfiles(profileNames) {
  const merged = {};
  for (const name of profileNames) {
    const profile = getProfile(name);
    if (profile && profile.config.type === "per-key") {
      Object.assign(merged, profile.config.bindings);
    }
  }
  return merged;
}
function listProfiles() {
  return [
    ...Object.keys(BUILT_IN_PROFILES),
    ...Array.from(customProfiles.keys())
  ];
}

// src/helpers/InputManager.ts
var InputManager = class {
  // NEW: Track aggregated state
  constructor(adapter, scene) {
    __publicField(this, "runtime");
    __publicField(this, "scene");
    // Phaser.Scene
    __publicField(this, "keyBindings", /* @__PURE__ */ new Map());
    __publicField(this, "cursorBindings");
    __publicField(this, "cursors");
    // Phaser.Types.Input.Keyboard.CursorKeys
    __publicField(this, "pressedKeys", /* @__PURE__ */ new Set());
    // Track one-shot keys
    __publicField(this, "aggregatedBindings", /* @__PURE__ */ new Map());
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
    for (const [key, binding] of Object.entries(bindings)) {
      const normalized = this.normalizeBinding(binding);
      this.keyBindings.set(key.toUpperCase(), normalized);
    }
  }
  /**
   * Bind multiple keys that aggregate into a single input state
   * Perfect for platformers, twin-stick shooters, fighting games
   *
   * Key codes: Use standard DOM key names (ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Space).
   * Letter keys (A-Z) are automatically uppercased. Arrow keys and Space are automatically
   * converted to Phaser's internal format (LEFT, RIGHT, UP, DOWN, SPACE).
   *
   * @example
   * ```ts
   * // Platformer controls - use ArrowLeft/ArrowRight/Space
   * inputManager.bindKeysAggregated('move', {
   *   left: 'ArrowLeft',
   *   right: 'ArrowRight',
   *   up: 'Space'
   * });
   * // Automatically tracks: { left: true/false, right: true/false, up: true/false }
   *
   * // Top-down movement - letter keys work as-is
   * inputManager.bindKeysAggregated('move', {
   *   left: 'A',
   *   right: 'D',
   *   up: 'W',
   *   down: 'S'
   * });
   * ```
   */
  bindKeysAggregated(action, keyMap, options) {
    const state = options?.initialState || Object.fromEntries(
      Object.keys(keyMap).map((field) => [field, false])
    );
    this.aggregatedBindings.set(action, {
      keyMap,
      state,
      mode: options?.mode || "continuous",
      targetId: options?.targetId
    });
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
          this.submitBinding(binding);
          this.pressedKeys.add(key);
        } else if (keyObj.isUp) {
          this.pressedKeys.delete(key);
        }
      } else {
        if (keyObj.isDown) {
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
            this.submitBinding(normalized);
            this.pressedKeys.add(keyName);
          } else if (keyObj.isUp) {
            this.pressedKeys.delete(keyName);
          }
        } else {
          if (keyObj.isDown) {
            this.submitBinding(normalized);
          }
        }
      }
    }
    for (const [action, binding] of this.aggregatedBindings.entries()) {
      let stateChanged = false;
      for (const [field, keyCode] of Object.entries(binding.keyMap)) {
        let phaserKeyCode = keyCode;
        const keyCodeMap = {
          "ArrowLeft": "LEFT",
          "ArrowRight": "RIGHT",
          "ArrowUp": "UP",
          "ArrowDown": "DOWN",
          "Space": "SPACE"
        };
        if (keyCodeMap[keyCode]) {
          phaserKeyCode = keyCodeMap[keyCode];
        }
        const keyObj = this.scene.input.keyboard?.addKey(phaserKeyCode, false);
        if (!keyObj) {
          console.warn(`[InputManager] Failed to create key object for: ${keyCode} (mapped to ${phaserKeyCode})`);
          continue;
        }
        const pressed = keyObj.isDown;
        if (binding.state[field] !== pressed) {
          binding.state[field] = pressed;
          stateChanged = true;
        }
      }
      if (binding.mode === "continuous") {
        this.runtime.submitAction(
          action,
          { ...binding.state },
          binding.targetId
        );
      } else if (binding.mode === "oneshot" && stateChanged) {
        this.runtime.submitAction(
          action,
          { ...binding.state },
          binding.targetId
        );
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
   * Use a pre-defined input profile
   *
   * @param profileName - Name of the profile ('platformer', 'topDown', 'shooter', etc.)
   * @param options - Optional customization
   *
   * @example
   * ```ts
   * // Simple usage
   * inputManager.useProfile('platformer');
   *
   * // With player 2 (uses WASD instead of arrows)
   * inputManager.useProfile('platformer', { player: 2 });
   *
   * // With custom action name
   * inputManager.useProfile('platformer', { action: 'move' });
   *
   * // With key overrides
   * inputManager.useProfile('platformer', {
   *   overrides: {
   *     'Space': { action: 'jump', mode: 'oneshot' }
   *   }
   * });
   * ```
   */
  useProfile(profileName, options) {
    const profile = getProfile(profileName);
    if (!profile) {
      console.warn(`[InputManager] Profile "${profileName}" not found. Available profiles:`, [
        "platformer",
        "platformerWASD",
        "topDown",
        "topDownWASD",
        "shooter",
        "twinStick"
      ]);
      return;
    }
    const config = applyProfileOptions(profile, options);
    if (config.type === "aggregated") {
      this.bindKeysAggregated(config.action, config.keys, {
        mode: config.mode
      });
    } else {
      this.bindKeys(config.bindings);
    }
  }
  /**
   * Merge multiple profiles into one
   *
   * @param profileNames - Array of profile names
   *
   * @example
   * ```ts
   * // Combine platformer movement with shooter actions
   * inputManager.mergeProfiles(['platformer', 'shooter']);
   * ```
   */
  mergeProfiles(profileNames) {
    const merged = mergeProfiles(profileNames);
    this.bindKeys(merged);
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
    this.runtime.submitAction(binding.action, binding.input, binding.targetId);
  }
};

// src/helpers/PhysicsManager.ts
var PhysicsManager = class {
  constructor(runtime, config) {
    __publicField(this, "runtime");
    __publicField(this, "spriteManager");
    __publicField(this, "inputKey");
    __publicField(this, "spriteKeyPrefix");
    __publicField(this, "behaviorType", null);
    __publicField(this, "behaviorConfig", null);
    this.runtime = runtime;
    this.spriteManager = config.spriteManager;
    this.inputKey = config.inputKey || "inputs";
    this.spriteKeyPrefix = config.spriteKeyPrefix || "player-";
  }
  addBehavior(type, config) {
    this.behaviorType = type;
    this.behaviorConfig = config || {};
  }
  /**
   * Update physics for all sprites (call in scene.update())
   * Only runs on host.
   */
  update() {
    const transport = this.runtime.getTransport();
    if (!transport.isHost()) return;
    const state = this.runtime.getState();
    const inputs = state[this.inputKey];
    if (!inputs) return;
    for (const [playerId, playerInput] of Object.entries(inputs)) {
      const sprite = this.spriteManager.get(`${this.spriteKeyPrefix}${playerId}`);
      if (!sprite || !sprite.body) continue;
      const body = sprite.body;
      if (this.behaviorType === "platformer") {
        this.applyPlatformerBehavior(body, playerInput, this.behaviorConfig);
      } else if (this.behaviorType === "topDown") {
        this.applyTopDownBehavior(body, playerInput, this.behaviorConfig);
      } else if (this.behaviorType === "custom" && this.behaviorConfig) {
        const customConfig = this.behaviorConfig;
        customConfig.apply(sprite, playerInput, body);
      }
    }
  }
  applyPlatformerBehavior(body, input, config) {
    const speed = config.speed || 200;
    const jumpPower = config.jumpPower || 350;
    const keys = config.keys || { left: "left", right: "right", jump: "up" };
    if (input[keys.left]) {
      body.setVelocityX(-speed);
    } else if (input[keys.right]) {
      body.setVelocityX(speed);
    } else {
      body.setVelocityX(0);
    }
    if (input[keys.jump] && body.touching.down) {
      body.setVelocityY(-jumpPower);
    }
  }
  applyTopDownBehavior(body, input, config) {
    const speed = config.speed || 200;
    const keys = config.keys || { left: "left", right: "right", up: "up", down: "down" };
    let vx = 0;
    let vy = 0;
    if (input[keys.left]) vx = -speed;
    if (input[keys.right]) vx = speed;
    if (input[keys.up]) vy = -speed;
    if (input[keys.down]) vy = speed;
    body.setVelocity(vx, vy);
  }
};

// src/helpers/CollisionManager.ts
var CollisionManager = class {
  // sprite -> Set of colliders
  constructor(adapter, scene, config) {
    __publicField(this, "adapter");
    __publicField(this, "scene");
    // Phaser.Scene
    __publicField(this, "config");
    __publicField(this, "rules", []);
    __publicField(this, "colliders", []);
    // Phaser.Physics.Arcade.Collider instances
    __publicField(this, "namedSprites", /* @__PURE__ */ new Map());
    // key -> sprite
    __publicField(this, "spriteToColliders", /* @__PURE__ */ new WeakMap());
    this.adapter = adapter;
    this.scene = scene;
    this.config = config || {};
  }
  /**
   * Register a sprite by name (for string-based collision rules)
   *
   * @example
   * ```ts
   * collisionManager.registerSprite('ball', this.ball);
   * collisionManager.addCollision('ball', paddleManager);
   * ```
   */
  registerSprite(key, sprite) {
    this.namedSprites.set(key, sprite);
    this.reapplyRules();
  }
  /**
   * Unregister a sprite by name
   */
  unregisterSprite(key) {
    const sprite = this.namedSprites.get(key);
    if (sprite) {
      this.removeCollidersForSprite(sprite);
    }
    this.namedSprites.delete(key);
  }
  /**
   * Add collision between sprites/groups/managers
   *
   * Supports:
   * - String keys (via registerSprite)
   * - SpriteManager instances (auto-syncs with new sprites)
   * - Phaser sprites or groups
   */
  addCollision(a, b, options) {
    const rule = {
      a,
      b,
      handler: options?.onCollide
    };
    this.rules.push(rule);
    if (this.isSpriteManager(a)) {
      this.hookSpriteManager(a);
    }
    if (this.isSpriteManager(b)) {
      this.hookSpriteManager(b);
    }
    this.applyRule(rule);
  }
  /**
   * Remove collision rule
   */
  removeCollision(a, b) {
    const ruleIndex = this.rules.findIndex(
      (r) => r.a === a && r.b === b || r.a === b && r.b === a
    );
    if (ruleIndex !== -1) {
      this.rules.splice(ruleIndex, 1);
    }
  }
  /**
   * Cleanup all colliders
   */
  destroy() {
    for (const collider of this.colliders) {
      if (collider && collider.destroy) {
        collider.destroy();
      }
    }
    this.colliders.length = 0;
    this.rules.length = 0;
    this.namedSprites.clear();
  }
  /**
   * Install onAdd hook on a SpriteManager to re-apply rules when sprites are added
   */
  hookSpriteManager(manager) {
    if (manager._collisionManagerHooked) {
      return;
    }
    manager._collisionManagerHooked = true;
    const originalConfig = manager.config;
    const originalOnAdd = originalConfig.onAdd;
    originalConfig.onAdd = (sprite, key, data, context) => {
      if (originalOnAdd) {
        originalOnAdd(sprite, key, data, context);
      }
      this.reapplyRules();
    };
  }
  /**
   * Apply a single collision rule (create colliders)
   */
  applyRule(rule) {
    const objectsA = this.resolveToObjects(rule.a);
    const objectsB = this.resolveToObjects(rule.b);
    if (objectsA.length === 0 || objectsB.length === 0) {
      return;
    }
    const handler = rule.handler || this.config.onCollide;
    for (const objA of objectsA) {
      for (const objB of objectsB) {
        if (this.hasCollider(objA, objB)) {
          continue;
        }
        const collider = this.scene.physics.add.collider(objA, objB, handler);
        this.colliders.push(collider);
        this.trackCollider(objA, collider);
        this.trackCollider(objB, collider);
      }
    }
  }
  /**
   * Re-apply all collision rules (called when sprites are added)
   */
  reapplyRules() {
    for (const rule of this.rules) {
      this.applyRule(rule);
    }
  }
  /**
   * Resolve a rule target to an array of Phaser objects
   */
  resolveToObjects(target) {
    if (typeof target === "string") {
      const sprite = this.namedSprites.get(target);
      return sprite ? [sprite] : [];
    }
    if (this.isSpriteManager(target)) {
      const sprites = Array.from(target.getAll().values());
      return sprites;
    }
    return [target];
  }
  /**
   * Check if target is a SpriteManager
   */
  isSpriteManager(target) {
    return target && typeof target === "object" && "getAll" in target && "add" in target;
  }
  /**
   * Check if a collider already exists between two objects
   */
  hasCollider(objA, objB) {
    const collidersA = this.spriteToColliders.get(objA);
    const collidersB = this.spriteToColliders.get(objB);
    if (!collidersA || !collidersB) {
      return false;
    }
    for (const collider of collidersA) {
      if (collidersB.has(collider)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Track that a collider belongs to a sprite
   */
  trackCollider(sprite, collider) {
    let colliders = this.spriteToColliders.get(sprite);
    if (!colliders) {
      colliders = /* @__PURE__ */ new Set();
      this.spriteToColliders.set(sprite, colliders);
    }
    colliders.add(collider);
  }
  /**
   * Remove all colliders associated with a sprite
   */
  removeCollidersForSprite(sprite) {
    const colliders = this.spriteToColliders.get(sprite);
    if (!colliders) return;
    for (const collider of colliders) {
      if (collider && collider.destroy) {
        collider.destroy();
      }
      const index = this.colliders.indexOf(collider);
      if (index !== -1) {
        this.colliders.splice(index, 1);
      }
    }
    this.spriteToColliders.delete(sprite);
  }
};

// src/helpers/PlayerUIManager.ts
var PlayerUIManager = class {
  constructor(adapter, scene, config) {
    __publicField(this, "adapter");
    __publicField(this, "scene");
    // Phaser.Scene
    __publicField(this, "config");
    __publicField(this, "playerElements", /* @__PURE__ */ new Map());
    // playerId -> elementName -> UIElement
    __publicField(this, "unsubscribe");
    this.adapter = adapter;
    this.scene = scene;
    this.config = config;
    this.unsubscribe = adapter.onChange((state) => {
      this.syncFromState(state);
    });
  }
  /**
   * Get UI element for a specific player
   */
  get(playerId, elementName) {
    return this.playerElements.get(playerId)?.get(elementName)?.gameObject;
  }
  /**
   * Manually update all UI (also called automatically on state changes)
   */
  update() {
    const state = this.adapter.getRuntime().getState();
    this.syncFromState(state);
  }
  /**
   * Cleanup
   */
  destroy() {
    for (const [playerId, elements] of this.playerElements.entries()) {
      for (const [elementName, element] of elements.entries()) {
        this.destroyElement(element);
      }
    }
    this.playerElements.clear();
    this.unsubscribe?.();
  }
  /**
   * Sync UI from state
   */
  syncFromState(state) {
    if (!state.players) return;
    const existingPlayers = new Set(this.playerElements.keys());
    for (const [playerId, playerData] of Object.entries(state.players)) {
      existingPlayers.delete(playerId);
      let elements = this.playerElements.get(playerId);
      if (!elements) {
        elements = /* @__PURE__ */ new Map();
        this.playerElements.set(playerId, elements);
      }
      for (const [elementName, elementConfig] of Object.entries(this.config)) {
        const existing = elements.get(elementName);
        const requiredMetadata = elementConfig.requiredMetadata || [];
        const hasMetadata = requiredMetadata.every((key) => key in playerData);
        if (!hasMetadata) {
          continue;
        }
        if (!existing) {
          const element = this.createElement(elementName, elementConfig, playerId, playerData);
          if (element) {
            elements.set(elementName, element);
          }
        } else {
          this.updateElement(existing, playerId, playerData);
        }
      }
    }
    for (const playerId of existingPlayers) {
      const elements = this.playerElements.get(playerId);
      if (elements) {
        for (const element of elements.values()) {
          this.destroyElement(element);
        }
      }
      this.playerElements.delete(playerId);
    }
  }
  /**
   * Create a UI element
   */
  createElement(elementName, config, playerId, playerData) {
    const pos = config.position(playerData, playerId);
    if (this.isTextConfig(config)) {
      const text = this.scene.add.text(
        pos.x,
        pos.y,
        config.getText(playerData, playerId),
        config.style || {}
      );
      if (config.origin !== void 0) {
        if (typeof config.origin === "number") {
          text.setOrigin(config.origin);
        } else {
          text.setOrigin(config.origin.x, config.origin.y);
        }
      }
      if (config.depth !== void 0) {
        text.setDepth(config.depth);
      }
      return {
        type: "text",
        config,
        gameObject: text
      };
    } else {
      const container = this.scene.add.container(pos.x, pos.y);
      const bg = this.scene.add.rectangle(0, 0, config.width, config.height, config.backgroundColor);
      const fg = this.scene.add.rectangle(
        0,
        0,
        config.width * config.getValue(playerData, playerId),
        config.height,
        config.foregroundColor
      );
      if (config.origin !== void 0) {
        const originX = typeof config.origin === "number" ? config.origin : config.origin.x;
        const originY = typeof config.origin === "number" ? config.origin : config.origin.y;
        bg.setOrigin(originX, originY);
        fg.setOrigin(originX, originY);
      }
      container.add([bg, fg]);
      if (config.depth !== void 0) {
        container.setDepth(config.depth);
      }
      container._bg = bg;
      container._fg = fg;
      return {
        type: "bar",
        config,
        gameObject: container
      };
    }
  }
  /**
   * Update a UI element
   */
  updateElement(element, playerId, playerData) {
    const pos = element.config.position(playerData, playerId);
    if (element.type === "text") {
      const config = element.config;
      const text = element.gameObject;
      text.setPosition(pos.x, pos.y);
      text.setText(config.getText(playerData, playerId));
    } else {
      const config = element.config;
      const container = element.gameObject;
      const fg = container._fg;
      container.setPosition(pos.x, pos.y);
      const value = Math.max(0, Math.min(1, config.getValue(playerData, playerId)));
      fg.width = config.width * value;
    }
  }
  /**
   * Destroy a UI element
   */
  destroyElement(element) {
    if (element.gameObject && element.gameObject.destroy) {
      element.gameObject.destroy();
    }
  }
  /**
   * Type guard for TextUIConfig
   */
  isTextConfig(config) {
    return "getText" in config;
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
    // My Player tracking
    __publicField(this, "myPlayerCache");
    __publicField(this, "myPlayerCallbacks", /* @__PURE__ */ new Set());
    __publicField(this, "myPlayerUnsubscribe");
    this.spriteNamespace = config.spriteNamespace || "_sprites";
    this.autoInterpolate = config.autoInterpolate !== false;
    this.lerpFactor = config.lerpFactor ?? 0.3;
    this.runtime.mutateState((state) => {
      if (!state[this.spriteNamespace]) {
        state[this.spriteNamespace] = {};
      }
    });
    this.myPlayerUnsubscribe = this.runtime.onChange(() => {
      if (this.myPlayerCallbacks.size > 0) {
        this.checkMyPlayerChanges();
      }
    });
    this.runtime.onChange((state) => {
      if (!this.isHost()) {
        this.updateSpritesFromState(state);
      }
    });
  }
  /**
   * Get the current player's ID
   *
   * @returns The unique player ID for this client
   *
   * @example
   * ```ts
   * const myId = adapter.getMyPlayerId();
   * adapter.trackSprite(playerSprite, `player-${myId}`);
   * ```
   */
  getMyPlayerId() {
    return this.runtime.getMyPlayerId();
  }
  /**
   * Get my player ID
   * @deprecated Use getMyPlayerId() instead for consistency with other getter methods
   */
  get myId() {
    return this.runtime.getMyPlayerId();
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
      if (!sprite) continue;
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
  /**
   * Create a PhysicsManager for automatic physics behavior
   *
   * @example
   * ```ts
   * const physicsManager = adapter.createPhysicsManager({
   *   spriteManager: this.spriteManager,
   *   inputKey: 'inputs'
   * });
   *
   * physicsManager.addBehavior('platformer', {
   *   speed: 200,
   *   jumpPower: 350
   * });
   *
   * // In update loop (host only)
   * physicsManager.update();
   * ```
   */
  createPhysicsManager(config) {
    return new PhysicsManager(this.runtime, config);
  }
  /**
   * Create a CollisionManager for declarative collision rules
   *
   * @example
   * ```ts
   * const collisionManager = adapter.createCollisionManager();
   *
   * // Declare collision rules ONCE - they auto-apply to late-joining players!
   * collisionManager.addCollision('ball', 'paddles');
   *
   * // With custom handler
   * collisionManager.addCollision('bullets', 'enemies', {
   *   onCollide: (bullet, enemy) => {
   *     enemy.takeDamage(bullet.damage);
   *     bullet.destroy();
   *   }
   * });
   * ```
   */
  createCollisionManager(config) {
    return new CollisionManager(this, this.scene, config);
  }
  /**
   * Create a PlayerUIManager for automatic player UI synchronization
   *
   * @example
   * ```ts
   * const playerUI = adapter.createPlayerUIManager({
   *   score: {
   *     position: (player) => ({
   *       x: player.side === 'left' ? 200 : 600,
   *       y: 80
   *     }),
   *     getText: (player) => String(player.score || 0),
   *     style: { fontSize: '48px', color: '#fff' },
   *     requiredMetadata: ['side'] // Wait for 'side' before creating
   *   },
   *
   *   health: {
   *     position: (player) => ({ x: player.x, y: player.y - 30 }),
   *     width: 50,
   *     height: 5,
   *     getValue: (player) => player.health / player.maxHealth,
   *     backgroundColor: 0x333333,
   *     foregroundColor: 0x00ff00
   *   }
   * });
   * ```
   */
  createPlayerUIManager(config) {
    return new PlayerUIManager(this, this.scene, config);
  }
  /**
   * Get current player data (cached, updates automatically)
   *
   * Returns the player object for the current client from state.
   * The result is cached and only updated when the player data actually changes,
   * making it safe to call in update() loops without performance concerns.
   *
   * @param playersKey - Key in state where players are stored (default: 'players')
   * @returns Current player data or undefined if not found
   *
   * @example
   * ```ts
   * // In scene.update()
   * const myPlayer = this.adapter.getMyPlayer();
   * if (myPlayer) {
   *   // Use player data (role, name, stats, etc.)
   *   const role = myPlayer.role;
   * }
   * ```
   */
  getMyPlayer(playersKey = "players") {
    const myId = this.runtime.getTransport().getPlayerId();
    const state = this.runtime.getState();
    return state[playersKey]?.[myId];
  }
  /**
   * Internal: Check if player data changed and notify callbacks
   */
  checkMyPlayerChanges(playersKey = "players") {
    const myId = this.runtime.getTransport().getPlayerId();
    const state = this.runtime.getState();
    const myPlayer = state[playersKey]?.[myId];
    if (myPlayer !== this.myPlayerCache) {
      this.myPlayerCache = myPlayer;
      for (const callback of this.myPlayerCallbacks) {
        callback(myPlayer);
      }
    }
  }
  /**
   * Subscribe to current player changes (reactive pattern)
   *
   * The callback is called immediately with the current player state,
   * then called again whenever the player data changes.
   *
   * @param callback - Called when player data changes
   * @param playersKey - Key in state where players are stored (default: 'players')
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * // In scene.create()
   * this.adapter.onMyPlayerChange((myPlayer) => {
   *   if (myPlayer && this.roleText) {
   *     const role = myPlayer.role === 'fire' ? 'Fire Player' : 'Ice Player';
   *     this.roleText.setText(`You are: ${role}`);
   *   }
   * });
   * ```
   */
  onMyPlayerChange(callback, playersKey = "players") {
    this.myPlayerCallbacks.add(callback);
    const myPlayer = this.getMyPlayer(playersKey);
    callback(myPlayer);
    return () => {
      this.myPlayerCallbacks.delete(callback);
    };
  }
};

// src/helpers/HUDHelper.ts
function createPlayerHUD(adapter, scene, config) {
  const playersKey = config.playersKey || "players";
  const layout = {
    title: config.layout?.title || { x: 400, y: 20 },
    role: config.layout?.role || { x: 400, y: 50 },
    controls: config.layout?.controls || { x: 400, y: 75 }
  };
  const titleStyle = {
    fontSize: config.titleStyle?.fontSize || "24px",
    color: config.titleStyle?.color || "#000",
    fontStyle: config.titleStyle?.fontStyle || "bold",
    backgroundColor: config.titleStyle?.backgroundColor,
    padding: config.titleStyle?.padding
  };
  const roleStyle = {
    fontSize: config.roleStyle?.fontSize || "16px",
    color: config.roleStyle?.color || "#000",
    fontStyle: config.roleStyle?.fontStyle,
    backgroundColor: config.roleStyle?.backgroundColor,
    padding: config.roleStyle?.padding
  };
  const controlsStyle = {
    fontSize: config.controlsStyle?.fontSize || "14px",
    color: config.controlsStyle?.color || "#333",
    fontStyle: config.controlsStyle?.fontStyle,
    backgroundColor: config.controlsStyle?.backgroundColor,
    padding: config.controlsStyle?.padding
  };
  let titleText = null;
  let roleText = null;
  let controlsText = null;
  if (config.title) {
    titleText = scene.add.text(layout.title.x, layout.title.y, config.title, titleStyle);
    titleText.setOrigin(0.5);
  }
  if (config.roleText) {
    roleText = scene.add.text(layout.role.x, layout.role.y, "Loading...", roleStyle);
    roleText.setOrigin(0.5);
  }
  if (config.controlHints) {
    controlsText = scene.add.text(layout.controls.x, layout.controls.y, "", controlsStyle);
    controlsText.setOrigin(0.5);
  }
  const update = () => {
    const myPlayer = adapter.getMyPlayer(playersKey);
    if (roleText && config.roleText) {
      roleText.setText(config.roleText(myPlayer));
    }
    if (controlsText && config.controlHints) {
      controlsText.setText(config.controlHints(myPlayer));
    }
  };
  const unsubscribe = adapter.onMyPlayerChange((myPlayer) => {
    if (roleText && config.roleText) {
      roleText.setText(config.roleText(myPlayer));
    }
    if (controlsText && config.controlHints) {
      controlsText.setText(config.controlHints(myPlayer));
    }
  }, playersKey);
  return {
    update,
    destroy: () => {
      unsubscribe();
      titleText?.destroy();
      roleText?.destroy();
      controlsText?.destroy();
    },
    getTitleText: () => titleText,
    getRoleText: () => roleText,
    getControlsText: () => controlsText
  };
}

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
  BUILT_IN_PROFILES,
  CollisionManager,
  InputManager,
  PhaserAdapter,
  PhysicsManager,
  PlayerUIManager,
  SpriteManager,
  createPlayerHUD,
  getProfile,
  initializeGame,
  listProfiles,
  registerProfile
};
//# sourceMappingURL=browser.js.map
