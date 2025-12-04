var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/helpers/CameraFollower.ts
var CameraFollower_exports = {};
__export(CameraFollower_exports, {
  createCameraFollower: () => createCameraFollower
});
function createCameraFollower(adapter, scene, config = {}) {
  const {
    target = "myPlayer",
    mode = "instant",
    lerpFactor = 0.1,
    offset = { x: 0, y: 0 },
    bounds,
    deadzone = { width: 200, height: 150 },
    centerOnTarget = true
  } = config;
  let targetPlayerId;
  let stateKey;
  if (target === "myPlayer") {
    targetPlayerId = adapter.getMyPlayerId();
    stateKey = "players";
  } else {
    targetPlayerId = target.playerId || adapter.getMyPlayerId();
    stateKey = target.stateKey || "players";
  }
  const camera = scene.cameras.main;
  let unsubscribe = null;
  let initialized = false;
  let destroyed = false;
  if (bounds) {
    camera.setBounds(0, 0, bounds.width, bounds.height);
  }
  const initializeCamera = () => {
    const state = adapter["runtime"].getState();
    const players = state?.[stateKey];
    const player = players?.[targetPlayerId];
    if (player && typeof player.x === "number" && typeof player.y === "number") {
      setCameraPosition(player.x, player.y, true);
      initialized = true;
    }
  };
  unsubscribe = adapter.waitForMetadata(
    stateKey,
    targetPlayerId,
    ["x", "y"],
    (playerData) => {
      if (!initialized && !destroyed) {
        setCameraPosition(playerData.x, playerData.y, true);
        initialized = true;
      }
    }
  );
  initializeCamera();
  function setCameraPosition(targetX, targetY, instant = false) {
    if (destroyed) return;
    const viewportWidth = camera.width;
    const viewportHeight = camera.height;
    let desiredScrollX;
    let desiredScrollY;
    if (centerOnTarget) {
      desiredScrollX = targetX - viewportWidth / 2 + offset.x;
      desiredScrollY = targetY - viewportHeight / 2 + offset.y;
    } else {
      desiredScrollX = targetX + offset.x;
      desiredScrollY = targetY + offset.y;
    }
    if (instant || mode === "instant") {
      camera.scrollX = desiredScrollX;
      camera.scrollY = desiredScrollY;
    } else if (mode === "lerp") {
      camera.scrollX += (desiredScrollX - camera.scrollX) * lerpFactor;
      camera.scrollY += (desiredScrollY - camera.scrollY) * lerpFactor;
    } else if (mode === "deadzone") {
      const targetScreenX = targetX - camera.scrollX;
      const targetScreenY = targetY - camera.scrollY;
      const deadzoneLeft = (viewportWidth - deadzone.width) / 2;
      const deadzoneRight = deadzoneLeft + deadzone.width;
      const deadzoneTop = (viewportHeight - deadzone.height) / 2;
      const deadzoneBottom = deadzoneTop + deadzone.height;
      if (targetScreenX < deadzoneLeft) {
        camera.scrollX += targetScreenX - deadzoneLeft;
      } else if (targetScreenX > deadzoneRight) {
        camera.scrollX += targetScreenX - deadzoneRight;
      }
      if (targetScreenY < deadzoneTop) {
        camera.scrollY += targetScreenY - deadzoneTop;
      } else if (targetScreenY > deadzoneBottom) {
        camera.scrollY += targetScreenY - deadzoneBottom;
      }
    }
  }
  function update() {
    if (destroyed || !initialized) return;
    const state = adapter["runtime"].getState();
    const players = state?.[stateKey];
    const player = players?.[targetPlayerId];
    if (player && typeof player.x === "number" && typeof player.y === "number") {
      setCameraPosition(player.x, player.y);
    }
  }
  const updateEvent = scene.events.on("update", update);
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    scene.events.off("update", update);
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }
  function setTarget(newPlayerId) {
    targetPlayerId = newPlayerId;
    initialized = false;
    if (unsubscribe) {
      unsubscribe();
    }
    unsubscribe = adapter.waitForMetadata(
      stateKey,
      targetPlayerId,
      ["x", "y"],
      (playerData) => {
        if (!initialized && !destroyed) {
          setCameraPosition(playerData.x, playerData.y, true);
          initialized = true;
        }
      }
    );
  }
  function getTarget() {
    return targetPlayerId;
  }
  return {
    update,
    destroy,
    setTarget,
    getTarget
  };
}
var init_CameraFollower = __esm({
  "src/helpers/CameraFollower.ts"() {
    "use strict";
  }
});

// src/helpers/SpriteManager.ts
var SpriteManager = class {
  constructor(adapter, config) {
    __publicField(this, "sprites", /* @__PURE__ */ new Map());
    __publicField(this, "spriteData", /* @__PURE__ */ new Map());
    __publicField(this, "labels", /* @__PURE__ */ new Map());
    __publicField(this, "config");
    __publicField(this, "adapter");
    __publicField(this, "unsubscribe");
    __publicField(this, "namespace");
    __publicField(this, "effectiveSyncInterval");
    /**
     * Track sprites created locally via add() method
     * This eliminates the need to know player IDs for filtering
     */
    __publicField(this, "localSprites", /* @__PURE__ */ new Set());
    /**
     * Phaser Group containing all sprites managed by this SpriteManager.
     * Use this for collision detection:
     * @example
     * ```ts
     * this.physics.add.collider(ball, playerManager.group);
     * ```
     *
     * The group automatically includes all sprites added to this manager,
     * both early-joining and late-joining, solving the "forgot to add collider
     * for new player" bug.
     */
    __publicField(this, "group");
    this.adapter = adapter;
    this.config = config;
    this.namespace = config.namespace || "_sprites";
    const hasPhysicsManager = adapter.hasPhysicsManagedNamespace(this.namespace);
    const motionProfile = config.motionProfile;
    this.effectiveSyncInterval = config.sync?.interval ?? (motionProfile === "platformer" || hasPhysicsManager ? 13 : 13);
    if (hasPhysicsManager && config.sync?.direction !== "toSprite") {
      console.warn(
        `[SpriteManager] Namespace "${this.namespace}" is managed by PhysicsManager. For platformer-style movement, set sync.direction: "toSprite" or disable syncPositionToState in PhysicsManager to avoid double writers.`
      );
    }
    const scene = adapter.getScene();
    this.group = scene.add.group();
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
    this.localSprites.add(key);
    const sprite = this.config.onCreate(key, data);
    this.sprites.set(key, sprite);
    this.spriteData.set(key, data);
    this.createLabel(key, data, sprite);
    this.group.add(sprite);
    if (this.config.onCreatePhysics) {
      this.config.onCreatePhysics(sprite, key, data);
    }
    if (this.config.staticProperties?.length) {
      const staticData = {};
      for (const prop of this.config.staticProperties) {
        if (prop in data) {
          staticData[prop] = data[prop];
        }
      }
      if (Object.keys(staticData).length > 0) {
        this.adapter.setSpriteStaticData(key, staticData, this.namespace);
      }
    }
    const syncProperties = this.config.sync?.properties || ["x", "y", "rotation", "alpha"];
    const syncInterval = this.effectiveSyncInterval;
    const adaptiveSync = this.config.sync?.adaptive ?? true;
    const adaptiveSyncThreshold = this.config.sync?.adaptiveThreshold;
    this.adapter.trackSprite(sprite, key, {
      properties: syncProperties,
      syncInterval,
      namespace: this.namespace,
      motionProfile: this.config.motionProfile,
      adaptiveSync,
      adaptiveSyncThreshold
    });
    if (this.config.onAdd) {
      this.config.onAdd(sprite, key, data, {
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
    if (sprite.destroy) {
      sprite.destroy();
    }
    const label = this.labels.get(key);
    if (label) {
      label.text.destroy();
      this.labels.delete(key);
    }
    this.spriteData.delete(key);
    if (this.adapter.isHost()) {
      this.adapter.untrackSprite(key, this.namespace);
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
   *
   * Automatically calls update methods on attached components (arrows, health bars, etc.)
   * if they use the `_update*` naming convention and autoUpdate is disabled.
   */
  update() {
    if (!this.adapter.isHost()) {
      this.adapter.updateInterpolation();
    }
    this.updateLabels();
    for (const sprite of this.sprites.values()) {
      if (typeof sprite._updateArrow === "function") {
        sprite._updateArrow();
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
    const spriteData = state[this.namespace];
    if (!spriteData) return;
    for (const [key, data] of Object.entries(spriteData)) {
      if (this.localSprites.has(key)) {
        continue;
      }
      if (!this.sprites.has(key)) {
        if (this.config.staticProperties?.length) {
          const hasAllStatic = this.config.staticProperties.every((prop) => prop in data);
          if (!hasAllStatic) {
            continue;
          }
        }
        const sprite = this.config.onCreate(key, data);
        this.sprites.set(key, sprite);
        this.spriteData.set(key, data);
        this.group.add(sprite);
        this.adapter.registerRemoteSprite(key, sprite, this.namespace);
        this.createLabel(key, data, sprite);
        if (this.config.onAdd) {
          this.config.onAdd(sprite, key, data, {
            manager: this,
            allSprites: this.sprites
          });
        }
      } else {
        if (this.config.onUpdate) {
          const sprite = this.sprites.get(key);
          this.config.onUpdate(sprite, data);
        }
        this.spriteData.set(key, data);
      }
      this.updateLabelText(key);
      this.updateLabelPosition(key);
    }
    for (const key of this.sprites.keys()) {
      if (!(key in spriteData)) {
        this.remove(key);
      }
    }
  }
  createLabel(key, data, sprite) {
    const labelConfig = this.config.label;
    if (!labelConfig) return;
    const scene = this.adapter.getScene();
    if (!scene?.add?.text) return;
    const textValue = labelConfig.getText(data);
    const style = labelConfig.style || { fontSize: "12px", color: "#ffffff" };
    const label = scene.add.text(sprite.x, sprite.y, textValue, style).setOrigin(0.5);
    this.labels.set(key, { text: label, offset: labelConfig.offset });
  }
  updateLabels() {
    for (const key of this.labels.keys()) {
      this.updateLabelText(key);
      this.updateLabelPosition(key);
    }
  }
  updateLabelText(key) {
    const labelConfig = this.config.label;
    if (!labelConfig) return;
    const labelEntry = this.labels.get(key);
    if (!labelEntry) return;
    const data = this.spriteData.get(key);
    if (!data) return;
    const next = labelConfig.getText(data);
    if (labelEntry.text.text !== next) {
      labelEntry.text.setText(next);
    }
  }
  updateLabelPosition(key) {
    const labelEntry = this.labels.get(key);
    if (!labelEntry) return;
    const sprite = this.sprites.get(key);
    if (!sprite) return;
    const offsetX = labelEntry.offset?.x ?? 0;
    const offsetY = labelEntry.offset?.y ?? -20;
    labelEntry.text.setPosition(sprite.x + offsetX, sprite.y + offsetY);
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
      if (stateChanged) {
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
   * Bind edge-triggered actions (fire once on press, not every frame)
   * Perfect for shoot, jump, interact, etc.
   *
   * @example
   * ```ts
   * // Shoot on space press
   * inputManager.bindEdgeTrigger('Space', 'shoot');
   *
   * // Jump on up arrow press
   * inputManager.bindEdgeTrigger('ArrowUp', 'jump');
   *
   * // Multiple edge triggers
   * inputManager.bindEdgeTriggers({
   *   'Space': 'shoot',
   *   'E': 'interact',
   *   'R': 'reload'
   * });
   * ```
   */
  bindEdgeTrigger(key, action, input) {
    this.keyBindings.set(key.toUpperCase(), {
      action,
      input,
      mode: "oneshot"
    });
  }
  /**
   * Bind multiple edge-triggered actions at once
   */
  bindEdgeTriggers(bindings) {
    for (const [key, binding] of Object.entries(bindings)) {
      if (typeof binding === "string") {
        this.bindEdgeTrigger(key, binding);
      } else {
        this.bindEdgeTrigger(key, binding.action, binding.input);
      }
    }
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
   * **NEW: Bridge input to actions automatically**
   *
   * Eliminates manual edge detection and action submission boilerplate.
   * Integrates with input profiles for complete automation.
   *
   * @example
   * ```ts
   * // Simple: Use existing profile bindings
   * inputManager.useProfile('topDown');
   * inputManager.bridgeToActions({
   *   move: 'continuous',  // submits every frame from profile
   *   shoot: 'edge'        // submits once on press from profile
   * });
   *
   * // Advanced: Custom key mapping
   * inputManager.bridgeToActions({
   *   move: { type: 'continuous', keys: { left: 'A', right: 'D', up: 'W', down: 'S' } },
   *   shoot: { type: 'edge', key: 'SPACE' }
   * });
   * ```
   */
  bridgeToActions(config) {
    for (const [action, actionConfig] of Object.entries(config)) {
      const normalized = typeof actionConfig === "string" ? { type: actionConfig } : actionConfig;
      if (normalized.type === "continuous") {
        const aggregated = this.aggregatedBindings.get(action);
        if (aggregated) {
          continue;
        }
        if (normalized.keys) {
          this.bindKeysAggregated(action, normalized.keys, { mode: "continuous" });
        }
      } else if (normalized.type === "edge") {
        if (normalized.key) {
          this.bindEdgeTrigger(normalized.key, action);
        }
      }
    }
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
    for (const rule of this.rules) {
      this.applyRule(rule);
    }
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
   * Resolve a rule target to an array of Phaser objects
   */
  resolveToObjects(target) {
    if (typeof target === "string") {
      const sprite = this.namedSprites.get(target);
      return sprite ? [sprite] : [];
    }
    if (this.isSpriteManager(target)) {
      return [target.group];
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

// src/helpers/PhysicsManager.ts
var VelocityEmitter = class {
  constructor() {
    __publicField(this, "listeners", []);
  }
  on(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  emit(playerId, velocity) {
    for (const listener of this.listeners) {
      listener(playerId, velocity);
    }
  }
};
var PhysicsManager = class {
  // Event emitter for velocity changes
  constructor(runtime, config) {
    __publicField(this, "runtime");
    __publicField(this, "spriteManager");
    __publicField(this, "inputKey");
    __publicField(this, "spriteKeyPrefix");
    __publicField(this, "syncPositionToState");
    __publicField(this, "stateKey");
    __publicField(this, "behaviorType", null);
    __publicField(this, "behaviorConfig", null);
    __publicField(this, "velocities", /* @__PURE__ */ new Map());
    // Track velocity for racing behavior
    __publicField(this, "velocityEmitter", new VelocityEmitter());
    this.runtime = runtime;
    this.spriteManager = config.spriteManager;
    this.inputKey = config.inputKey || "inputs";
    this.spriteKeyPrefix = config.spriteKeyPrefix || "player-";
    this.syncPositionToState = config.syncPositionToState !== false;
    this.stateKey = config.stateKey || "players";
  }
  /**
   * Get velocity for a specific player (racing behavior only)
   * Useful for displaying speed in HUD
   *
   * @param playerId - The player ID to get velocity for
   * @returns Current velocity, or 0 if not found
   *
   * @example
   * ```ts
   * const speed = physicsManager.getVelocity(adapter.getLocalPlayerId());
   * ```
   */
  getVelocity(playerId) {
    return this.velocities.get(playerId) || 0;
  }
  /**
   * Get readonly access to all velocities (for debugging/UI)
   * Returns a readonly map of player IDs to their current velocities
   */
  getVelocities() {
    return this.velocities;
  }
  /**
   * Subscribe to velocity changes (racing behavior only)
   *
   * **Important:** This is a LOCAL event that only fires on the HOST.
   * Events do NOT cross the network boundary.
   *
   * Use cases:
   * - Host-only displays (debug overlays, dev tools)
   * - Performance-critical updates (no network overhead)
   * - Analytics/telemetry (host-side tracking)
   *
   * For client displays, use `createSpeedDisplay()` helper which automatically
   * handles both events (host) and state sync (clients).
   *
   * Alternatively, read `state.players[playerId].velocity` which is automatically
   * synced across the network by PhysicsManager.
   *
   * @param callback - Called whenever a player's velocity changes (host only)
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * // Host-only analytics
   * const unsubscribe = physicsManager.onVelocityChange((playerId, velocity) => {
   *   if (velocity > 250) {
   *     trackAchievement('speed_demon', playerId);
   *   }
   * });
   *
   * // Later, cleanup
   * unsubscribe();
   * ```
   */
  onVelocityChange(callback) {
    return this.velocityEmitter.on(callback);
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
      } else if (this.behaviorType === "racing") {
        this.applyRacingBehavior(sprite, body, playerInput, playerId, this.behaviorConfig);
      } else if (this.behaviorType === "custom" && this.behaviorConfig) {
        const customConfig = this.behaviorConfig;
        customConfig.apply(sprite, playerInput, body);
      }
      if (this.syncPositionToState) {
        this.syncPositionToStateForPlayer(playerId, sprite);
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
  applyRacingBehavior(sprite, body, input, playerId, config) {
    const acceleration = config.acceleration ?? 5;
    const maxSpeed = config.maxSpeed ?? 200;
    const turnSpeed = config.turnSpeed ?? 0.05;
    const friction = config.friction ?? 0.98;
    const keys = config.keys || { left: "left", right: "right", accelerate: "up" };
    const prevVelocity = this.velocities.get(playerId) || 0;
    let velocity = prevVelocity;
    if (input[keys.left]) {
      sprite.rotation -= turnSpeed;
    }
    if (input[keys.right]) {
      sprite.rotation += turnSpeed;
    }
    if (input[keys.accelerate]) {
      velocity = Math.min(velocity + acceleration, maxSpeed);
    } else {
      velocity *= friction;
      if (velocity < 0.5) {
        velocity = 0;
      }
    }
    this.velocities.set(playerId, velocity);
    this.runtime.mutateState((state) => {
      if (state.players && state.players[playerId]) {
        state.players[playerId].velocity = velocity;
      }
    });
    this.velocityEmitter.emit(playerId, velocity);
    const vx = Math.cos(sprite.rotation) * velocity;
    const vy = Math.sin(sprite.rotation) * velocity;
    body.setVelocity(vx, vy);
  }
  /**
   * Sync sprite position and rotation back to state
   * Called automatically after physics updates when syncPositionToState is enabled
   */
  syncPositionToStateForPlayer(playerId, sprite) {
    this.runtime.mutateState((state) => {
      const entities = state[this.stateKey];
      if (entities && entities[playerId]) {
        entities[playerId].x = sprite.x;
        entities[playerId].y = sprite.y;
        if (this.behaviorType === "racing" && sprite.rotation !== void 0) {
          entities[playerId].rotation = sprite.rotation;
        }
      }
    });
  }
};

// src/helpers/StateDrivenSpawner.ts
var StateDrivenSpawner = class {
  constructor(adapter, config) {
    __publicField(this, "config");
    __publicField(this, "adapter");
    __publicField(this, "trackedKeys", /* @__PURE__ */ new Set());
    __publicField(this, "unsubscribe");
    this.adapter = adapter;
    if (!config.sync?.properties && !config.onUpdateSprite) {
      config.sync = { properties: ["x", "y"], direction: "toSprite" };
    }
    this.config = config;
    if (adapter.isHost()) {
    } else {
      this.unsubscribe = adapter.onChange((state) => {
        this.syncFromState(state);
      });
    }
  }
  /**
   * Call this in scene.update() (HOST ONLY)
   * Checks for new entries in the state collection and spawns sprites
   *
   * @param delta - Optional delta time in milliseconds for physics updates
   *
   * @example
   * ```ts
   * update(time: number, delta: number) {
   *   // Without physics: just sync spawning/despawning
   *   spawner.update();
   *
   *   // With physics: update positions from velocity
   *   spawner.update(delta);
   * }
   * ```
   */
  update(delta) {
    if (!this.adapter.isHost()) {
      return;
    }
    if (delta !== void 0 && this.config.physics) {
      this.updatePhysics(delta);
    }
    const state = this.adapter.getState();
    this.syncFromState(state);
  }
  /**
   * **NEW: Automatic physics updates**
   *
   * Updates entity positions from velocity in state.
   * Call this in your scene.update() with delta time.
   *
   * **Only runs on HOST** - clients receive position updates via state sync.
   *
   * @param delta - Delta time in milliseconds
   *
   * @example
   * ```ts
   * update(time: number, delta: number) {
   *   bulletSpawner.updatePhysics(delta);
   *   bulletSpawner.update(); // Sync sprites to new positions
   * }
   * ```
   */
  updatePhysics(delta) {
    if (!this.adapter.isHost()) {
      return;
    }
    if (!this.config.physics?.velocityFromState) {
      return;
    }
    const state = this.adapter.getState();
    const collection = state[this.config.stateKey];
    if (!collection) return;
    const deltaSeconds = delta / 1e3;
    const { x: velXKey, y: velYKey } = this.config.physics.velocityFromState;
    const isArray = Array.isArray(collection);
    const entries = isArray ? collection.map((item) => {
      const key = this.config.keyField ? item[this.config.keyField] : item.id;
      return [String(key), item];
    }) : Object.entries(collection);
    for (const [_, data] of entries) {
      if (this.config.filter && !this.config.filter(data)) {
        continue;
      }
      if (velXKey in data && velYKey in data) {
        if (!("x" in data)) data.x = 0;
        if (!("y" in data)) data.y = 0;
        data.x += data[velXKey] * deltaSeconds;
        data.y += data[velYKey] * deltaSeconds;
      }
    }
  }
  /**
   * Manually trigger a sync (useful for initial spawn in create())
   */
  sync() {
    const state = this.adapter.getState();
    this.syncFromState(state);
  }
  /**
   * Core sync logic - creates/removes sprites based on state
   */
  syncFromState(state) {
    const collection = state[this.config.stateKey];
    if (!collection) return;
    const currentKeys = /* @__PURE__ */ new Set();
    const isArray = Array.isArray(collection);
    const entries = isArray ? collection.map((item) => {
      const key = this.config.keyField ? item[this.config.keyField] : item.id;
      return [String(key), item];
    }) : Object.entries(collection);
    for (const [rawKey, data] of entries) {
      if (this.config.filter && !this.config.filter(data)) {
        continue;
      }
      const spriteKey = this.config.keyPrefix ? `${this.config.keyPrefix}${rawKey}` : rawKey;
      currentKeys.add(spriteKey);
      if (this.trackedKeys.has(spriteKey)) {
        this.updateSpriteFromState(spriteKey, data);
        continue;
      }
      if (this.adapter.isHost()) {
        this.config.spriteManager.add(spriteKey, data);
        this.trackedKeys.add(spriteKey);
      } else {
        this.trackedKeys.add(spriteKey);
      }
    }
    for (const spriteKey of this.trackedKeys) {
      if (!currentKeys.has(spriteKey)) {
        this.config.spriteManager.remove(spriteKey);
        this.trackedKeys.delete(spriteKey);
      }
    }
  }
  /**
   * Update sprite properties from state data
   * Only runs on HOST (clients get updates via SpriteManager sync)
   */
  updateSpriteFromState(spriteKey, data) {
    if (!this.adapter.isHost()) {
      return;
    }
    const sprite = this.config.spriteManager.get(spriteKey);
    if (!sprite) return;
    if (this.config.onUpdateSprite) {
      this.config.onUpdateSprite(sprite, data);
      return;
    }
    const syncProperties = this.config.sync?.properties;
    if (syncProperties) {
      for (const prop of syncProperties) {
        if (prop in data && sprite[prop] !== void 0) {
          sprite[prop] = data[prop];
        }
      }
    }
  }
  /**
   * Cleanup
   */
  destroy() {
    this.unsubscribe?.();
  }
};

// src/helpers/HealthBarManager.ts
var HealthBarManager = class {
  constructor(adapter, config) {
    __publicField(this, "adapter");
    __publicField(this, "scene");
    // Phaser.Scene
    __publicField(this, "config");
    __publicField(this, "healthBars", /* @__PURE__ */ new Map());
    this.adapter = adapter;
    this.scene = adapter.getScene();
    this.config = {
      offset: { x: 0, y: -30 },
      width: 50,
      height: 5,
      colorThresholds: {
        high: { value: 50, color: 4766584 },
        // Green
        medium: { value: 25, color: 15381256 },
        // Yellow
        low: { value: 0, color: 15680580 }
        // Red
      },
      depth: 100,
      showBackground: true,
      backgroundColor: 3355443,
      ...config
    };
  }
  /**
   * Update all health bars
   * Call this in your scene's update() loop
   */
  update() {
    const state = this.adapter.getState();
    const sprites = this.config.spriteManager.getAll();
    for (const [key, sprite] of sprites) {
      if (!this.healthBars.has(key)) {
        this.createHealthBar(key, sprite);
      }
    }
    for (const [key, healthBarObj] of this.healthBars.entries()) {
      const sprite = sprites.get(key);
      if (!sprite) {
        this.removeHealthBar(key);
        continue;
      }
      const entityId = this.extractEntityId(key);
      const entityState = this.getEntityState(state, entityId);
      if (!entityState) {
        continue;
      }
      const health = entityState[this.config.healthKey];
      if (health === void 0) {
        continue;
      }
      const offsetX = this.config.offset?.x ?? 0;
      const offsetY = this.config.offset?.y ?? -30;
      healthBarObj.bar.setPosition(sprite.x + offsetX, sprite.y + offsetY);
      if (healthBarObj.background) {
        healthBarObj.background.setPosition(sprite.x + offsetX, sprite.y + offsetY);
      }
      const healthPercent = health / this.config.maxHealth;
      healthBarObj.bar.setScale(Math.max(0, healthPercent), 1);
      const color = this.getColorForHealth(healthPercent * 100);
      healthBarObj.bar.setFillStyle(color);
    }
  }
  /**
   * Manually create a health bar for a sprite
   */
  createHealthBar(key, sprite) {
    const width = this.config.width ?? 50;
    const height = this.config.height ?? 5;
    const offsetX = this.config.offset?.x ?? 0;
    const offsetY = this.config.offset?.y ?? -30;
    let background;
    if (this.config.showBackground) {
      background = this.scene.add.rectangle(
        sprite.x + offsetX,
        sprite.y + offsetY,
        width,
        height,
        this.config.backgroundColor
      );
      background?.setDepth(this.config.depth ?? 100);
    }
    const bar = this.scene.add.rectangle(
      sprite.x + offsetX,
      sprite.y + offsetY,
      width,
      height,
      this.config.colorThresholds?.high?.color ?? 4766584
    );
    bar.setDepth((this.config.depth ?? 100) + 1);
    bar.setOrigin(0, 0.5);
    background?.setOrigin(0, 0.5);
    this.healthBars.set(key, { bar, background });
  }
  /**
   * Remove a health bar
   */
  removeHealthBar(key) {
    const healthBarObj = this.healthBars.get(key);
    if (healthBarObj) {
      healthBarObj.bar.destroy();
      healthBarObj.background?.destroy();
      this.healthBars.delete(key);
    }
  }
  /**
   * Extract entity ID from sprite key
   * Assumes format like "player-abc123" or "enemy-xyz789"
   */
  extractEntityId(key) {
    const parts = key.split("-");
    return parts.length > 1 ? parts.slice(1).join("-") : key;
  }
  /**
   * Get entity state from game state
   * Tries common state keys: players, enemies, entities
   */
  getEntityState(state, entityId) {
    if (state.players?.[entityId]) {
      return state.players[entityId];
    }
    if (state.enemies?.[entityId]) {
      return state.enemies[entityId];
    }
    if (state.entities?.[entityId]) {
      return state.entities[entityId];
    }
    return null;
  }
  /**
   * Get color based on health percentage
   */
  getColorForHealth(healthPercent) {
    const thresholds = this.config.colorThresholds;
    if (healthPercent > (thresholds.high?.value ?? 50)) {
      return thresholds.high?.color ?? 4766584;
    } else if (healthPercent > (thresholds.medium?.value ?? 25)) {
      return thresholds.medium?.color ?? 15381256;
    } else {
      return thresholds.low?.color ?? 15680580;
    }
  }
  /**
   * Cleanup all health bars
   */
  destroy() {
    for (const key of this.healthBars.keys()) {
      this.removeHealthBar(key);
    }
  }
};

// src/helpers/GridClickHelper.ts
var GridClickHelper = class {
  constructor(adapter, scene, config) {
    __publicField(this, "config");
    __publicField(this, "scene");
    __publicField(this, "highlights", []);
    __publicField(this, "debugGraphics");
    __publicField(this, "debugTexts", []);
    this.scene = scene;
    this.config = {
      ...config,
      canClick: config.canClick ?? (() => true),
      canHighlight: config.canHighlight ?? (() => true),
      highlightColor: config.highlightColor ?? 16777215,
      highlightAlpha: config.highlightAlpha ?? 0.15,
      useHandCursor: config.useHandCursor ?? true,
      origin: config.origin ?? "top-left",
      clickMode: config.clickMode ?? "down",
      debug: config.debug ?? false
    };
    this.setupHighlights();
    this.setupInputHandlers();
    if (this.config.debug) {
      this.setupDebugVisualization();
    }
  }
  /**
   * Create highlight rectangles for visual feedback
   */
  setupHighlights() {
    const { columns, rows, cellWidth, cellHeight, offsetX, offsetY, highlightColor, origin } = this.config;
    for (let col = 0; col < columns; col++) {
      for (let row = 0; row < rows; row++) {
        const x = offsetX + col * cellWidth + cellWidth / 2;
        const y = origin === "bottom-left" ? offsetY + (rows - 1 - row) * cellHeight + cellHeight / 2 : offsetY + row * cellHeight + cellHeight / 2;
        const highlight = this.scene.add.rectangle(
          x,
          y,
          cellWidth,
          cellHeight,
          highlightColor,
          0
          // Start invisible
        );
        highlight.gridCol = col;
        highlight.gridRow = row;
        this.highlights.push(highlight);
      }
    }
  }
  /**
   * Setup pointer event handlers using worldX/worldY for accurate mapping
   */
  setupInputHandlers() {
    const { useHandCursor, clickMode } = this.config;
    this.scene.input.on("pointermove", (pointer) => {
      const cell = this.pointerToCell(pointer);
      this.highlights.forEach((h) => h.setAlpha(0));
      if (cell && this.config.canHighlight(cell.col, cell.row)) {
        const highlight = this.getHighlight(cell.col, cell.row);
        if (highlight) {
          highlight.setAlpha(this.config.highlightAlpha);
        }
      }
      if (useHandCursor) {
        const canClick = cell && this.config.canClick(cell.col, cell.row);
        this.scene.input.setDefaultCursor(canClick ? "pointer" : "default");
      }
    });
    const eventName = clickMode === "down" ? "pointerdown" : "pointerup";
    this.scene.input.on(eventName, (pointer) => {
      const cell = this.pointerToCell(pointer);
      if (cell && this.config.canClick(cell.col, cell.row)) {
        this.config.onCellClick(cell.col, cell.row);
        const highlight = this.getHighlight(cell.col, cell.row);
        if (highlight) {
          this.scene.tweens.add({
            targets: highlight,
            alpha: this.config.highlightAlpha * 2,
            duration: 100,
            yoyo: true
          });
        }
      }
    });
    this.scene.input.on("pointerout", () => {
      this.highlights.forEach((h) => h.setAlpha(0));
      if (useHandCursor) {
        this.scene.input.setDefaultCursor("default");
      }
    });
  }
  /**
   * Convert pointer coordinates to grid cell
   * Uses worldX/worldY for accurate mapping in any scale mode
   */
  pointerToCell(pointer) {
    const { columns, rows, cellWidth, cellHeight, offsetX, offsetY, origin } = this.config;
    const col = Math.floor((pointer.worldX - offsetX) / cellWidth);
    const rowFromTop = Math.floor((pointer.worldY - offsetY) / cellHeight);
    const row = origin === "bottom-left" ? rows - 1 - rowFromTop : rowFromTop;
    if (col < 0 || col >= columns || row < 0 || row >= rows) {
      return null;
    }
    return { col, row };
  }
  /**
   * Get highlight rectangle for a specific cell
   */
  getHighlight(col, row) {
    return this.highlights.find((h) => h.gridCol === col && h.gridRow === row);
  }
  /**
   * Setup debug visualization (grid lines and coordinates)
   */
  setupDebugVisualization() {
    const { columns, rows, cellWidth, cellHeight, offsetX, offsetY, origin } = this.config;
    this.debugGraphics = this.scene.add.graphics();
    this.debugGraphics.lineStyle(1, 16711935, 0.5);
    for (let col = 0; col <= columns; col++) {
      const x = offsetX + col * cellWidth;
      this.debugGraphics.lineBetween(x, offsetY, x, offsetY + rows * cellHeight);
    }
    for (let row = 0; row <= rows; row++) {
      const y = offsetY + row * cellHeight;
      this.debugGraphics.lineBetween(offsetX, y, offsetX + columns * cellWidth, y);
    }
    for (let col = 0; col < columns; col++) {
      for (let row = 0; row < rows; row++) {
        const x = offsetX + col * cellWidth + 5;
        const y = origin === "bottom-left" ? offsetY + (rows - 1 - row) * cellHeight + 5 : offsetY + row * cellHeight + 5;
        const text = this.scene.add.text(x, y, `${col},${row}`, {
          fontSize: "10px",
          color: "#ff00ff",
          backgroundColor: "#000000"
        });
        this.debugTexts.push(text);
      }
    }
  }
  /**
   * Manually trigger a highlight (useful for showing valid moves, etc.)
   */
  showHighlight(col, row, alpha) {
    const highlight = this.getHighlight(col, row);
    if (highlight) {
      highlight.setAlpha(alpha ?? this.config.highlightAlpha);
    }
  }
  /**
   * Hide a specific cell's highlight
   */
  hideHighlight(col, row) {
    const highlight = this.getHighlight(col, row);
    if (highlight) {
      highlight.setAlpha(0);
    }
  }
  /**
   * Hide all highlights
   */
  hideAllHighlights() {
    this.highlights.forEach((h) => h.setAlpha(0));
  }
  /**
   * Update highlight color for a specific cell
   */
  setHighlightColor(col, row, color) {
    const highlight = this.getHighlight(col, row);
    if (highlight) {
      highlight.setFillStyle(color);
    }
  }
  /**
   * Destroy the helper and clean up resources
   */
  destroy() {
    this.highlights.forEach((h) => h.destroy());
    this.debugGraphics?.destroy();
    this.debugTexts.forEach((t) => t.destroy());
    this.highlights = [];
    this.debugTexts = [];
    this.scene.input.off("pointermove");
    this.scene.input.off("pointerdown");
    this.scene.input.off("pointerup");
    this.scene.input.off("pointerout");
  }
};

// src/helpers/GridCollisionManager.ts
var GridCollisionManager = class {
  constructor(adapter, config) {
    __publicField(this, "config");
    __publicField(this, "debugGraphics");
    // Phaser.GameObjects.Graphics
    __publicField(this, "adapter");
    this.adapter = adapter;
    this.config = {
      baseSpeed: 150,
      normalizeDiagonal: true,
      debug: false,
      debugColor: 16711680,
      ...config
    };
    if (this.config.debug) {
      this.debugGraphics = adapter.getScene().add.graphics();
      this.renderDebugGrid();
    }
  }
  /**
   * Move an entity based on input
   * Handles collision detection and smooth movement
   *
   * @param entity - Entity with x, y, and optional speed multiplier
   * @param input - Input with up/down/left/right flags
   * @param delta - Time delta in milliseconds
   */
  moveEntity(entity, input, delta) {
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dx === 0 && dy === 0) return;
    const speedMultiplier = entity.speed ?? 1;
    let speed = this.config.baseSpeed * speedMultiplier * (delta / 1e3);
    if (this.config.normalizeDiagonal && dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      speed /= length;
    }
    const nextX = entity.x + dx * speed;
    const nextY = entity.y + dy * speed;
    const gridPos = this.worldToGrid(nextX, nextY);
    const hasCollision = this.config.collisionCheck(gridPos.gridX, gridPos.gridY);
    const worldSize = {
      width: this.config.gridWidth * this.config.tileSize,
      height: this.config.gridHeight * this.config.tileSize
    };
    const outOfBounds = nextX < 0 || nextX >= worldSize.width || nextY < 0 || nextY >= worldSize.height;
    if (!hasCollision && !outOfBounds) {
      entity.x = nextX;
      entity.y = nextY;
    }
    if (this.config.debug && this.debugGraphics) {
      this.updateDebugVisualization(entity, hasCollision ? gridPos : null);
    }
  }
  /**
   * Convert world position to grid coordinates
   *
   * @param x - World X position in pixels
   * @param y - World Y position in pixels
   * @returns Grid coordinates and alignment status
   */
  worldToGrid(x, y) {
    const gridX = Math.floor(x / this.config.tileSize);
    const gridY = Math.floor(y / this.config.tileSize);
    const threshold = this.config.tileSize * 0.1;
    const offsetX = Math.abs(x - (gridX * this.config.tileSize + this.config.tileSize / 2));
    const offsetY = Math.abs(y - (gridY * this.config.tileSize + this.config.tileSize / 2));
    const isAligned = offsetX < threshold && offsetY < threshold;
    return { gridX, gridY, isAligned };
  }
  /**
   * Convert grid coordinates to world position (center of cell)
   *
   * @param gridX - Grid X coordinate
   * @param gridY - Grid Y coordinate
   * @returns World position in pixels (center of cell)
   */
  gridToWorld(gridX, gridY) {
    return {
      x: gridX * this.config.tileSize + this.config.tileSize / 2,
      y: gridY * this.config.tileSize + this.config.tileSize / 2
    };
  }
  /**
   * Snap an entity to the nearest grid cell center
   *
   * @param entity - Entity to snap
   */
  snapToGrid(entity) {
    const gridPos = this.worldToGrid(entity.x, entity.y);
    const worldPos = this.gridToWorld(gridPos.gridX, gridPos.gridY);
    entity.x = worldPos.x;
    entity.y = worldPos.y;
  }
  /**
   * Check if a grid cell is walkable (not blocked)
   *
   * @param gridX - Grid X coordinate
   * @param gridY - Grid Y coordinate
   * @returns True if cell is walkable
   */
  isWalkable(gridX, gridY) {
    if (gridX < 0 || gridX >= this.config.gridWidth) return false;
    if (gridY < 0 || gridY >= this.config.gridHeight) return false;
    return !this.config.collisionCheck(gridX, gridY);
  }
  /**
   * Get the current grid cell of an entity
   *
   * @param entity - Entity with x, y position
   * @returns Grid position with alignment status
   */
  getEntityGridPosition(entity) {
    return this.worldToGrid(entity.x, entity.y);
  }
  /**
   * Render debug grid overlay
   */
  renderDebugGrid() {
    if (!this.debugGraphics) return;
    this.debugGraphics.clear();
    this.debugGraphics.lineStyle(1, this.config.debugColor, 0.2);
    const worldWidth = this.config.gridWidth * this.config.tileSize;
    const worldHeight = this.config.gridHeight * this.config.tileSize;
    for (let i = 0; i <= this.config.gridWidth; i++) {
      const x = i * this.config.tileSize;
      this.debugGraphics.lineBetween(x, 0, x, worldHeight);
    }
    for (let i = 0; i <= this.config.gridHeight; i++) {
      const y = i * this.config.tileSize;
      this.debugGraphics.lineBetween(0, y, worldWidth, y);
    }
  }
  /**
   * Update debug visualization
   */
  updateDebugVisualization(entity, blockedCell) {
    if (!this.debugGraphics) return;
    this.renderDebugGrid();
    this.debugGraphics.fillStyle(65280, 0.8);
    this.debugGraphics.fillCircle(entity.x, entity.y, 4);
    const gridPos = this.worldToGrid(entity.x, entity.y);
    const worldPos = this.gridToWorld(gridPos.gridX, gridPos.gridY);
    this.debugGraphics.lineStyle(2, 65280, 0.6);
    this.debugGraphics.strokeRect(
      worldPos.x - this.config.tileSize / 2,
      worldPos.y - this.config.tileSize / 2,
      this.config.tileSize,
      this.config.tileSize
    );
    if (blockedCell) {
      const blockedWorld = this.gridToWorld(blockedCell.gridX, blockedCell.gridY);
      this.debugGraphics.fillStyle(this.config.debugColor, 0.4);
      this.debugGraphics.fillRect(
        blockedWorld.x - this.config.tileSize / 2,
        blockedWorld.y - this.config.tileSize / 2,
        this.config.tileSize,
        this.config.tileSize
      );
    }
  }
  /**
   * Cleanup debug graphics
   */
  destroy() {
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = void 0;
    }
  }
};
var GridMovementManager = GridCollisionManager;

// src/helpers/GridLockedMovementManager.ts
var GridLockedMovementManager = class {
  constructor(adapter, config) {
    __publicField(this, "config");
    __publicField(this, "debugGraphics");
    // Phaser.GameObjects.Graphics
    __publicField(this, "adapter");
    this.adapter = adapter;
    this.config = {
      baseSpeed: 3,
      debug: false,
      debugColor: 16711680,
      ...config
    };
    if (this.config.debug) {
      this.debugGraphics = adapter.getScene().add.graphics();
      this.renderDebugGrid();
    }
  }
  /**
   * Move an entity with grid-locked behavior
   * 
   * The entity will:
   * 1. Continue moving to targetCell if already in motion
   * 2. Accept new direction input only when aligned to a cell
   * 3. Smoothly interpolate position between cells
   *
   * @param entity - Entity with grid position state
   * @param input - Input with up/down/left/right flags
   * @param delta - Time delta in milliseconds
   */
  moveEntity(entity, input, delta) {
    if (!entity.currentCell) {
      const gridPos = this.worldToGrid(entity.x, entity.y);
      entity.currentCell = { x: gridPos.gridX, y: gridPos.gridY };
      entity.targetCell = null;
      entity.moveProgress = 0;
    }
    const speedMultiplier = entity.speed ?? 1;
    const cellsPerSecond = this.config.baseSpeed * speedMultiplier;
    const progressDelta = cellsPerSecond * delta / 1e3;
    if (entity.targetCell && entity.moveProgress !== void 0) {
      entity.moveProgress += progressDelta;
      if (entity.moveProgress >= 1) {
        entity.currentCell = { ...entity.targetCell };
        entity.targetCell = null;
        entity.moveProgress = 0;
        const worldPos = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
        entity.x = worldPos.x;
        entity.y = worldPos.y;
      } else {
        const currentWorld = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
        const targetWorld = this.gridToWorld(entity.targetCell.x, entity.targetCell.y);
        entity.x = this.lerp(currentWorld.x, targetWorld.x, entity.moveProgress);
        entity.y = this.lerp(currentWorld.y, targetWorld.y, entity.moveProgress);
      }
    } else {
      const direction = this.getDirection(input);
      if (direction.dx !== 0 || direction.dy !== 0) {
        const nextCell = {
          x: entity.currentCell.x + direction.dx,
          y: entity.currentCell.y + direction.dy
        };
        if (this.isWalkable(nextCell.x, nextCell.y)) {
          entity.targetCell = nextCell;
          entity.moveProgress = 0;
        }
      }
    }
    if (this.config.debug && this.debugGraphics) {
      this.updateDebugVisualization(entity);
    }
  }
  /**
   * Snap entity to nearest grid cell center
   */
  snapToGrid(entity) {
    const gridPos = this.worldToGrid(entity.x, entity.y);
    const worldPos = this.gridToWorld(gridPos.gridX, gridPos.gridY);
    entity.x = worldPos.x;
    entity.y = worldPos.y;
    entity.currentCell = { x: gridPos.gridX, y: gridPos.gridY };
    entity.targetCell = null;
    entity.moveProgress = 0;
  }
  /**
   * Check if entity is aligned to a grid cell
   */
  isAligned(entity) {
    return !entity.targetCell && entity.moveProgress === 0;
  }
  /**
   * Get entity's current grid position
   */
  getGridPosition(entity) {
    if (entity.currentCell) {
      return { ...entity.currentCell };
    }
    const gridPos = this.worldToGrid(entity.x, entity.y);
    return { x: gridPos.gridX, y: gridPos.gridY };
  }
  /**
   * Convert world coordinates to grid coordinates
   */
  worldToGrid(x, y) {
    const gridX = Math.floor(x / this.config.tileSize);
    const gridY = Math.floor(y / this.config.tileSize);
    const centerX = gridX * this.config.tileSize + this.config.tileSize / 2;
    const centerY = gridY * this.config.tileSize + this.config.tileSize / 2;
    const threshold = this.config.tileSize * 0.1;
    const isAligned = Math.abs(x - centerX) < threshold && Math.abs(y - centerY) < threshold;
    return { gridX, gridY, isAligned };
  }
  /**
   * Convert grid coordinates to world position (center of cell)
   */
  gridToWorld(gridX, gridY) {
    return {
      x: gridX * this.config.tileSize + this.config.tileSize / 2,
      y: gridY * this.config.tileSize + this.config.tileSize / 2
    };
  }
  /**
   * Check if a grid cell is walkable
   */
  isWalkable(gridX, gridY) {
    if (gridX < 0 || gridX >= this.config.gridWidth) return false;
    if (gridY < 0 || gridY >= this.config.gridHeight) return false;
    return !this.config.collisionCheck(gridX, gridY);
  }
  /**
   * Extract direction from input
   */
  getDirection(input) {
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dx !== 0 && dy !== 0) {
      return { dx, dy: 0 };
    }
    return { dx, dy };
  }
  /**
   * Linear interpolation
   */
  lerp(start, end, t) {
    return start + (end - start) * t;
  }
  /**
   * Render debug grid overlay
   */
  renderDebugGrid() {
    if (!this.debugGraphics) return;
    this.debugGraphics.clear();
    this.debugGraphics.lineStyle(1, this.config.debugColor, 0.3);
    const worldWidth = this.config.gridWidth * this.config.tileSize;
    const worldHeight = this.config.gridHeight * this.config.tileSize;
    for (let i = 0; i <= this.config.gridWidth; i++) {
      const x = i * this.config.tileSize;
      this.debugGraphics.lineBetween(x, 0, x, worldHeight);
    }
    for (let i = 0; i <= this.config.gridHeight; i++) {
      const y = i * this.config.tileSize;
      this.debugGraphics.lineBetween(0, y, worldWidth, y);
    }
  }
  /**
   * Update debug visualization for an entity
   */
  updateDebugVisualization(entity) {
    if (!this.debugGraphics) return;
    this.renderDebugGrid();
    if (entity.currentCell) {
      const worldPos = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
      this.debugGraphics.fillStyle(this.config.debugColor, 0.2);
      this.debugGraphics.fillRect(
        worldPos.x - this.config.tileSize / 2,
        worldPos.y - this.config.tileSize / 2,
        this.config.tileSize,
        this.config.tileSize
      );
    }
    if (entity.targetCell) {
      const worldPos = this.gridToWorld(entity.targetCell.x, entity.targetCell.y);
      this.debugGraphics.fillStyle(this.config.debugColor, 0.4);
      this.debugGraphics.fillRect(
        worldPos.x - this.config.tileSize / 2,
        worldPos.y - this.config.tileSize / 2,
        this.config.tileSize,
        this.config.tileSize
      );
      if (entity.currentCell) {
        const currentWorld = this.gridToWorld(entity.currentCell.x, entity.currentCell.y);
        const targetWorld = this.gridToWorld(entity.targetCell.x, entity.targetCell.y);
        this.debugGraphics.lineStyle(2, this.config.debugColor, 0.8);
        this.debugGraphics.lineBetween(
          currentWorld.x,
          currentWorld.y,
          targetWorld.x,
          targetWorld.y
        );
      }
    }
    this.debugGraphics.fillStyle(16777215, 1);
    this.debugGraphics.fillCircle(entity.x, entity.y, 3);
  }
  /**
   * Cleanup debug graphics
   */
  destroy() {
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = void 0;
    }
  }
};

// src/PhaserAdapter.ts
var PhaserAdapter = class {
  constructor(runtime, scene, config = {}) {
    this.runtime = runtime;
    this.scene = scene;
    __publicField(this, "trackedSprites", /* @__PURE__ */ new Map());
    __publicField(this, "remoteSprites", /* @__PURE__ */ new Map());
    __publicField(this, "syncIntervalId", null);
    __publicField(this, "spriteNamespace");
    __publicField(this, "snapshotBufferSizeOverride");
    __publicField(this, "targetInterpolationDelayMs", 78);
    // Increased from 32ms for smoother curves (6 snapshots at 13ms sync)
    __publicField(this, "defaultSyncIntervalMs", 13);
    __publicField(this, "spriteManagers", /* @__PURE__ */ new Set());
    // Track all registered SpriteManagers
    __publicField(this, "physicsManagedNamespaces", /* @__PURE__ */ new Set());
    // Track namespaces driven by PhysicsManager
    __publicField(this, "autoTick");
    __publicField(this, "tickAction");
    __publicField(this, "lastTickTime", Date.now());
    this.spriteNamespace = config.spriteNamespace || "_sprites";
    this.snapshotBufferSizeOverride = config.snapshotBufferSize ?? 4;
    this.autoTick = config.autoTick !== false;
    this.tickAction = config.tickAction || "tick";
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
   * Get the local player's ID
   * More discoverable alias for {@link myId}
   */
  getLocalPlayerId() {
    return this.myId;
  }
  /**
   * Backwards-compatible helper - alias for {@link myId}
   * @deprecated Use {@link getLocalPlayerId} instead for better discoverability
   */
  getMyPlayerId() {
    return this.myId;
  }
  /**
   * Get the current player's state object from the runtime
   *
   * @param playersKey Key in the state where player records are stored (default: 'players')
   */
  getMyPlayer(playersKey = "players") {
    const state = this.runtime.getState();
    const players = state?.[playersKey];
    if (!players) return void 0;
    return players[this.getMyPlayerId()];
  }
  /**
   * Subscribe to changes in the current player's state
   *
   * @param callback Invoked whenever the local player's record changes
   * @param playersKey Key in the state where player records are stored (default: 'players')
   */
  onMyPlayerChange(callback, playersKey = "players") {
    let lastValue = this.getMyPlayer(playersKey);
    callback(lastValue);
    return this.runtime.onChange((state) => {
      const players = state?.[playersKey];
      const nextValue = players ? players[this.getMyPlayerId()] : void 0;
      if (nextValue === lastValue) {
        return;
      }
      lastValue = nextValue;
      callback(nextValue);
    });
  }
  /**
   * Watch a derived value from the current player's state with automatic change detection
   *
   * This is the reactive counterpart to `onMyPlayerChange`. It re-runs a selector function
   * on every state change and only fires the callback when the selected value changes
   * (using Object.is equality by default).
   *
   * Perfect for reactive UIs that need to respond to property mutations like size, health, score, etc.
   *
   * @param selector Function that extracts a value from the player state
   * @param callback Invoked when the selected value changes
   * @param options Optional configuration
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * // Watch player size changes
   * adapter.watchMyPlayer(
   *   (player) => player?.size,
   *   (size) => {
   *     hudText.setText(`Size: ${size}`);
   *   }
   * );
   *
   * // Watch multiple properties
   * adapter.watchMyPlayer(
   *   (player) => ({ size: player?.size, health: player?.health }),
   *   (stats) => {
   *     hudText.setText(`Size: ${stats.size}, HP: ${stats.health}`);
   *   }
   * );
   *
   * // Custom equality check
   * adapter.watchMyPlayer(
   *   (player) => player?.position,
   *   (pos) => console.log('Position changed:', pos),
   *   { equals: (a, b) => a?.x === b?.x && a?.y === b?.y }
   * );
   * ```
   */
  watchMyPlayer(selector, callback, options) {
    const playersKey = options?.playersKey || "players";
    const equals = options?.equals || Object.is;
    let lastSelected = selector(this.getMyPlayer(playersKey));
    callback(lastSelected, void 0);
    return this.runtime.onChange((state) => {
      const players = state?.[playersKey];
      const player = players ? players[this.getMyPlayerId()] : void 0;
      const nextSelected = selector(player);
      if (!equals(nextSelected, lastSelected)) {
        const prev = lastSelected;
        lastSelected = nextSelected;
        callback(nextSelected, prev);
      }
    });
  }
  /**
   * Check if this peer is the host
   */
  isHost() {
    return this.runtime.getTransport().isHost();
  }
  /**
   * Expose the underlying Phaser scene
   */
  getScene() {
    return this.scene;
  }
  /**
   * Convert pointer screen coordinates to world coordinates
   *
   * IMPORTANT: Always use this helper (or pointer.worldX/worldY directly)
   * when handling pointer input for game logic. Using pointer.x/y will break
   * when the camera is scrolled/following a player.
   *
   * @param pointer - Phaser pointer object from input events
   * @returns World coordinates { x: number, y: number }
   *
   * @example
   * ```ts
   * this.input.on('pointerdown', (pointer) => {
   *   const worldPos = adapter.pointerToWorld(pointer);
   *   runtime.submitAction('move', { x: worldPos.x, y: worldPos.y });
   * });
   * ```
   */
  pointerToWorld(pointer) {
    return {
      x: pointer.worldX,
      y: pointer.worldY
    };
  }
  /**
   * FIX #2: Wait for required metadata properties before executing callback
   *
   * This is a shared utility that prevents race conditions when creating UI/sprites
   * that depend on static properties like role, team, side, etc.
   *
   * Extracted pattern from PlayerUIManager and HUDHelper for reuse across the SDK.
   *
   * @param stateKey - Key in state where the entity data lives (e.g., 'players')
   * @param entityId - ID of the specific entity (e.g., player ID)
   * @param requiredProperties - Array of property names that must exist before callback fires
   * @param callback - Called when all required properties are present
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * // Wait for player metadata before creating UI
   * adapter.waitForMetadata('players', playerId, ['role', 'team'], (data) => {
   *   const color = data.role === 'fire' ? 0xff0000 : 0x0000ff;
   *   const sprite = this.add.circle(data.x, data.y, 20, color);
   * });
   *
   * // Wait for sprite static properties
   * adapter.waitForMetadata('__sprites__.players', spriteKey, ['role'], (data) => {
   *   const label = this.add.text(data.x, data.y, data.role.toUpperCase());
   * });
   * ```
   */
  waitForMetadata(stateKey, entityId, requiredProperties, callback) {
    const hasAllProperties = (data) => {
      if (!data) return false;
      return requiredProperties.every((prop) => prop in data && data[prop] !== void 0);
    };
    const state = this.runtime.getState();
    const collection = this.getNestedProperty(state, stateKey);
    const currentData = collection?.[entityId];
    if (hasAllProperties(currentData)) {
      callback(currentData);
      return () => {
      };
    }
    return this.runtime.onChange((state2) => {
      const collection2 = this.getNestedProperty(state2, stateKey);
      const data = collection2?.[entityId];
      if (hasAllProperties(data)) {
        callback(data);
      }
    });
  }
  /**
   * Helper to get nested property from state (e.g., '__sprites__.players')
   * @internal
   */
  getNestedProperty(obj, path) {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current == null) return void 0;
      current = current[part];
    }
    return current;
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
    this.trackedSprites.set(key, {
      sprite,
      options,
      lastPosition: { x: sprite.x, y: sprite.y },
      lastGrounded: void 0
    });
    if (this.isHost() && !this.syncIntervalId) {
      const interval = options.syncInterval || 16;
      this.syncIntervalId = setInterval(() => this.syncAllSprites(), interval);
    }
    if (this.isHost()) {
      this.syncSpriteToState(key, sprite, options);
    }
  }
  /**
   * Stop tracking a sprite
   *
   * @param key - Sprite key
   * @param namespace - Optional namespace (defaults to spriteNamespace from config)
   */
  untrackSprite(key, namespace) {
    const tracked = this.trackedSprites.get(key);
    this.trackedSprites.delete(key);
    const ns = namespace || tracked?.options.namespace || this.spriteNamespace;
    this.runtime.mutateState((state) => {
      const sprites = state[ns];
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
   * Call this in your Phaser scene's update() loop
   *
   * When autoTick is enabled, this automatically calls the tick action.
   * Always handles remote sprite interpolation (on clients).
   *
   * @param time - Phaser time (total elapsed time in ms)
   * @param delta - Phaser delta (time since last frame in ms)
   *
   * @example
   * ```ts
   * // In your Phaser scene:
   * update(time: number, delta: number) {
   *   adapter.update(time, delta);
   * }
   * ```
   */
  update(time, delta) {
    if (this.autoTick && this.isHost()) {
      const now = Date.now();
      const tickDelta = now - this.lastTickTime;
      this.lastTickTime = now;
      this.runtime.submitAction(this.tickAction, { delta: tickDelta });
    }
    if (!this.isHost()) {
      this.updateInterpolation(delta);
    }
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
    for (const [key, tracked] of this.trackedSprites.entries()) {
      const { sprite, options, lastPosition } = tracked;
      const motionProfile = options.motionProfile;
      let forceSync = false;
      if (motionProfile === "platformer" && sprite?.body) {
        const body = sprite.body;
        const grounded = !!(body.blocked?.down || body.touching?.down);
        if (grounded && tracked.lastGrounded === false) {
          forceSync = true;
        }
        tracked.lastGrounded = grounded;
      }
      if (!forceSync && options.adaptiveSync && lastPosition) {
        const threshold = options.adaptiveSyncThreshold ?? 1;
        const dx = Math.abs(sprite.x - lastPosition.x);
        const dy = Math.abs(sprite.y - lastPosition.y);
        if (dx < threshold && dy < threshold) {
          continue;
        }
      }
      this.syncSpriteToState(key, sprite, options);
      if (options.adaptiveSync) {
        tracked.lastPosition = { x: sprite.x, y: sprite.y };
      }
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
    const namespace = options.namespace || this.spriteNamespace;
    this.runtime.mutateState((state) => {
      if (!state[namespace]) {
        state[namespace] = {};
      }
      const sprites = state[namespace];
      sprites[key] = { ...sprites[key], ...updates };
    });
  }
  /**
   * Set static metadata for a tracked sprite (host only)
   *
   * @param key - Sprite key
   * @param data - Static data to set
   * @param namespace - Optional namespace (defaults to spriteNamespace from config)
   */
  setSpriteStaticData(key, data, namespace) {
    if (!this.isHost()) return;
    const ns = namespace || this.spriteNamespace;
    this.runtime.mutateState((state) => {
      if (!state[ns]) {
        state[ns] = {};
      }
      const sprites = state[ns];
      sprites[key] = { ...data, ...sprites[key] };
    });
  }
  /**
   * Update sprites from state (clients only)
   *
   * MULTI-NAMESPACE SUPPORT: This method now handles sprites from all registered
   * namespaces, including both the default namespace and custom namespaces from
   * createSpriteRegistry(). This fixes the bug where sprites in custom namespaces
   * (like __sprites__.players) weren't getting interpolation targets on clients.
   */
  updateSpritesFromState(state) {
    if (this.isHost()) return;
    const namespacesToCheck = /* @__PURE__ */ new Set();
    namespacesToCheck.add(this.spriteNamespace);
    for (const manager of this.spriteManagers) {
      namespacesToCheck.add(manager.namespace);
    }
    for (const namespace of namespacesToCheck) {
      const sprites = state[namespace];
      if (!sprites) continue;
      for (const [key, tracked] of this.trackedSprites.entries()) {
        const spriteData = sprites[key];
        if (spriteData) {
          this.applySpriteData(tracked.sprite, spriteData);
        }
      }
      const now = Date.now();
      for (const [key, spriteData] of Object.entries(sprites)) {
        if (this.trackedSprites.has(key)) continue;
        const remoteSpriteData = this.remoteSprites.get(key);
        if (!remoteSpriteData || remoteSpriteData.namespace !== namespace) continue;
        const data = spriteData;
        const snapshots = remoteSpriteData.snapshots;
        snapshots.push({
          x: data.x,
          y: data.y,
          rotation: data.rotation,
          timestamp: now
        });
        if (snapshots.length >= 2) {
          const latest = snapshots[snapshots.length - 1].timestamp;
          const previous = snapshots[snapshots.length - 2].timestamp;
          const interval = latest - previous;
          if (interval > 0) {
            remoteSpriteData.estimatedSyncInterval = this.smoothSyncInterval(
              remoteSpriteData.estimatedSyncInterval,
              interval
            );
          }
        }
        const maxSnapshots = this.getMaxSnapshots(remoteSpriteData);
        while (snapshots.length > maxSnapshots) {
          snapshots.shift();
        }
        const sprite = remoteSpriteData.sprite;
        if (sprite.x === void 0 || Number.isNaN(sprite.x)) {
          sprite.x = data.x;
          sprite.y = data.y;
          sprite.rotation = data.rotation || 0;
        }
      }
    }
  }
  /**
   * Blend new sync interval measurements with previous estimate for stability
   */
  smoothSyncInterval(previous, next) {
    if (!previous) return next;
    const alpha = 0.2;
    return previous * (1 - alpha) + next * alpha;
  }
  /**
   * Number of snapshots we should keep to cover the target render delay window
   */
  getMaxSnapshots(remoteSpriteData) {
    const delayIntervals = this.getDelayIntervals(remoteSpriteData);
    return Math.max(2, delayIntervals + 1);
  }
  /**
   * Compute delay intervals (in sync steps) for this sprite
   */
  getDelayIntervals(remoteSpriteData) {
    if (this.snapshotBufferSizeOverride) {
      remoteSpriteData.delayIntervals = Math.max(1, this.snapshotBufferSizeOverride);
      return remoteSpriteData.delayIntervals;
    }
    const syncInterval = remoteSpriteData.estimatedSyncInterval ?? this.defaultSyncIntervalMs;
    const autoSize = Math.max(1, Math.ceil(this.targetInterpolationDelayMs / syncInterval));
    remoteSpriteData.delayIntervals = autoSize;
    return autoSize;
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
   * @param namespace - Optional namespace (defaults to spriteNamespace config)
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
  registerRemoteSprite(key, sprite, namespace) {
    this.remoteSprites.set(key, {
      sprite,
      namespace: namespace || this.spriteNamespace,
      snapshots: []
    });
  }
  /**
   * Call this in your Phaser update() loop to smoothly interpolate remote sprites
   * This should be called every frame (60 FPS) for smooth movement
   *
   * Clients always render between the last 2 received snapshots for buttery smooth motion.
   * This eliminates frame timing jitter while adding ~32ms consistent latency.
   */
  updateInterpolation(_delta) {
    if (this.isHost()) return;
    const now = Date.now();
    for (const [key, remoteSpriteData] of this.remoteSprites.entries()) {
      const sprite = remoteSpriteData.sprite;
      this.updateSnapshotBufferInterpolation(sprite, remoteSpriteData, now);
    }
  }
  /**
   * Snapshot buffer interpolation with Catmull-Rom splines for smooth curved motion
   * Falls back to cubic-eased linear interpolation when fewer snapshots available
   */
  updateSnapshotBufferInterpolation(sprite, remoteSpriteData, now) {
    const snapshots = remoteSpriteData.snapshots;
    if (!snapshots || snapshots.length < 2) return;
    const syncInterval = remoteSpriteData.estimatedSyncInterval ?? this.defaultSyncIntervalMs;
    const delayIntervals = this.getDelayIntervals(remoteSpriteData);
    const renderDelay = delayIntervals * syncInterval;
    const renderTime = now - renderDelay;
    if (snapshots.length >= 4) {
      this.interpolateCatmullRom(sprite, snapshots, renderTime);
    } else {
      this.interpolateLinearWithEasing(sprite, snapshots, renderTime);
    }
  }
  /**
   * Catmull-Rom spline interpolation for smooth curved paths (requires 4 points)
   */
  interpolateCatmullRom(sprite, snapshots, renderTime) {
    let p0 = null;
    let p1 = null;
    let p2 = null;
    let p3 = null;
    for (let i = 1; i < snapshots.length - 2; i++) {
      if (snapshots[i].timestamp <= renderTime && snapshots[i + 1].timestamp >= renderTime) {
        p0 = snapshots[i - 1];
        p1 = snapshots[i];
        p2 = snapshots[i + 1];
        p3 = snapshots[i + 2];
        break;
      }
    }
    if (!p1 || !p2) {
      if (renderTime <= snapshots[1].timestamp) {
        p0 = snapshots[0];
        p1 = snapshots[0];
        p2 = snapshots[1];
        p3 = snapshots[2];
      } else {
        const len = snapshots.length;
        p0 = snapshots[len - 3];
        p1 = snapshots[len - 2];
        p2 = snapshots[len - 1];
        p3 = snapshots[len - 1];
      }
    }
    const ts1 = p1.timestamp;
    const ts2 = p2.timestamp;
    const denom = ts2 - ts1;
    const t = denom === 0 ? 1 : Math.max(0, Math.min(1, (renderTime - ts1) / denom));
    const tSquared = t * t;
    const tCubed = tSquared * t;
    sprite.x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tSquared + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * tCubed);
    sprite.y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tSquared + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * tCubed);
    if (p1.rotation !== void 0 && p2.rotation !== void 0) {
      sprite.rotation = p1.rotation + (p2.rotation - p1.rotation) * t;
    }
  }
  /**
   * Linear interpolation with cubic easing for smoother feel
   */
  interpolateLinearWithEasing(sprite, snapshots, renderTime) {
    let snapshot0 = snapshots[0];
    let snapshot1 = snapshots[snapshots.length - 1];
    for (let i = 0; i < snapshots.length - 1; i++) {
      const current = snapshots[i];
      const next = snapshots[i + 1];
      if (current.timestamp <= renderTime && next.timestamp >= renderTime) {
        snapshot0 = current;
        snapshot1 = next;
        break;
      }
    }
    if (renderTime <= snapshots[0].timestamp) {
      snapshot0 = snapshots[0];
      snapshot1 = snapshots[1] ?? snapshots[0];
    } else if (renderTime >= snapshots[snapshots.length - 1].timestamp) {
      snapshot0 = snapshots[snapshots.length - 2] ?? snapshots[0];
      snapshot1 = snapshots[snapshots.length - 1];
    }
    const t0 = snapshot0.timestamp;
    const t1 = snapshot1.timestamp;
    const denom = t1 - t0;
    const t = denom === 0 ? 1 : (renderTime - t0) / denom;
    const linear = Math.max(0, Math.min(1, t));
    const eased = linear * linear * (3 - 2 * linear);
    sprite.x = snapshot0.x + (snapshot1.x - snapshot0.x) * eased;
    sprite.y = snapshot0.y + (snapshot1.y - snapshot0.y) * eased;
    if (snapshot0.rotation !== void 0 && snapshot1.rotation !== void 0) {
      sprite.rotation = snapshot0.rotation + (snapshot1.rotation - snapshot0.rotation) * eased;
    }
  }
  /**
   * Unregister a remote sprite
   */
  unregisterRemoteSprite(key) {
    const remoteSpriteData = this.remoteSprites.get(key);
    if (remoteSpriteData?.sprite && remoteSpriteData.sprite.destroy) {
      remoteSpriteData.sprite.destroy();
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
  // ============================================================================
  // Lobby System Helpers (Pit of Success)
  // ============================================================================
  /**
   * Register a callback that only runs once when transitioning to 'playing' phase
   *
   * ✅ Pit of success: Prevents creating game objects during lobby phase
   *
   * @example
   * ```ts
   * create() {
   *   // Static setup (background, lobby UI)
   *   this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);
   *
   *   // ✅ Game objects only created when playing starts
   *   this.adapter.onPlaying((state) => {
   *     this.ball = this.add.circle(state.ball.x, state.ball.y, 10, 0xff6b6b);
   *     this.physics.add.existing(this.ball);
   *   });
   * }
   * ```
   */
  onPlaying(callback) {
    let hasStarted = false;
    return this.runtime.onChange((state) => {
      if (!state.__lobby) {
        if (!hasStarted) {
          hasStarted = true;
          callback(state);
        }
        return;
      }
      if (!hasStarted && state.__lobby.phase === "playing") {
        hasStarted = true;
        callback(state);
      }
    });
  }
  /**
   * Register a callback that only runs while in 'playing' phase
   *
   * Runs every state update during gameplay, stops when game ends.
   *
   * @example
   * ```ts
   * this.adapter.whilePlaying((state) => {
   *   // Physics updates, collision checks, etc.
   *   this.handleGameLogic(state);
   * });
   * ```
   */
  whilePlaying(callback) {
    return this.runtime.onChange((state) => {
      if (!state.__lobby) {
        callback(state);
        return;
      }
      if (state.__lobby.phase === "playing") {
        callback(state);
      }
    });
  }
  /**
   * Register a callback that runs when game ends
   *
   * @example
   * ```ts
   * this.adapter.onEnded((state) => {
   *   this.showResults(state);
   * });
   * ```
   */
  onEnded(callback) {
    let hasEnded = false;
    return this.runtime.onChange((state) => {
      if (!state.__lobby) return;
      if (!hasEnded && state.__lobby.phase === "ended") {
        hasEnded = true;
        callback(state);
      }
    });
  }
  /**
   * Check if game is currently in lobby phase
   */
  isInLobby() {
    const state = this.runtime.getState();
    return state.__lobby?.phase === "lobby";
  }
  /**
   * Check if game is currently playing
   */
  isPlaying() {
    const state = this.runtime.getState();
    if (!state.__lobby) return true;
    return state.__lobby.phase === "playing";
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
   *   namespace: 'players',  // optional, defaults to '_sprites'
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
    const manager = new SpriteManager(this, config);
    this.registerSpriteManager(manager);
    return manager;
  }
  /**
   * Register a SpriteManager with this adapter for multi-namespace support
   * Internal method - automatically called by createSpriteManager
   */
  registerSpriteManager(manager) {
    this.spriteManagers.add(manager);
  }
  /**
   * Check if a namespace is already managed by PhysicsManager (for conflict warnings/defaults)
   */
  hasPhysicsManagedNamespace(namespace) {
    return this.physicsManagedNamespaces.has(namespace);
  }
  /**
   * Create a typed registry of sprite managers
   *
   * This provides type-safe collections of sprites with automatic namespacing.
   * Each sprite type gets its own isolated namespace in the state tree.
   *
   * @example
   * ```ts
   * const sprites = adapter.createSpriteRegistry({
   *   players: {
   *     onCreate: (key, data: { x: number, y: number, role: string }) => {
   *       const color = data.role === 'fire' ? 0xff3300 : 0x0033ff;
   *       return this.add.circle(data.x, data.y, 20, color);
   *     },
   *     staticProperties: ['role'],
   *     label: { getText: (d) => d.role.toUpperCase() }
   *   },
   *   enemies: {
   *     onCreate: (key, data: { x: number, y: number, type: string }) => {
   *       return this.add.sprite(data.x, data.y, data.type);
   *     }
   *   }
   * });
   *
   * // Type-safe sprite creation
   * sprites.players.add('p1', { x: 100, y: 100, role: 'fire' });
   * sprites.enemies.add('e1', { x: 200, y: 200, type: 'goblin' });
   *
   * // Each collection has its own namespace:
   * // state.__sprites__.players = { p1: { x: 100, y: 100, role: 'fire' } }
   * // state.__sprites__.enemies = { e1: { x: 200, y: 200, type: 'goblin' } }
   * ```
   */
  createSpriteRegistry(config) {
    const registry = {};
    for (const [name, managerConfig] of Object.entries(config)) {
      const manager = new SpriteManager(this, {
        ...managerConfig,
        namespace: `__sprites__.${name}`
      });
      this.registerSpriteManager(manager);
      registry[name] = manager;
    }
    return registry;
  }
  /**
   * Create a PlayerUIManager for automatically managed player HUD elements
   */
  createPlayerUIManager(config) {
    return new PlayerUIManager(this, this.scene, config);
  }
  /**
   * Create a CollisionManager for declarative collision rules
   */
  createCollisionManager(config) {
    return new CollisionManager(this, this.scene, config);
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
   * Create a PhysicsManager for automatic physics behaviors
   */
  createPhysicsManager(config) {
    if (config.spriteManager?.namespace && config.syncPositionToState !== false) {
      this.physicsManagedNamespaces.add(config.spriteManager.namespace);
    }
    return new PhysicsManager(this.runtime, config);
  }
  /**
   * Create a StateDrivenSpawner for automatic sprite spawning from state collections
   *
   * Eliminates the manual "check for new players/bullets" loop.
   * Watches a state collection and automatically creates/removes sprites.
   *
   * @example
   * ```ts
   * // Players (uses object keys)
   * const playerSpawner = adapter.createStateDrivenSpawner({
   *   stateKey: 'players',
   *   spriteManager: this.spriteManager,
   *   keyPrefix: 'player-'
   * });
   *
   * // Bullets (uses array with id field)
   * const bulletSpawner = adapter.createStateDrivenSpawner({
   *   stateKey: 'bullets',
   *   spriteManager: this.bulletManager,
   *   keyPrefix: 'bullet-',
   *   keyField: 'id'
   * });
   *
   * // In update():
   * playerSpawner.update(); // HOST only
   * ```
   */
  createStateDrivenSpawner(config) {
    return new StateDrivenSpawner(this, config);
  }
  /**
   * Create a GridClickHelper for robust grid/board click handling
   *
   * Solves the common problem where interactive rectangles don't scale properly
   * with the canvas. Uses pointer.worldX/worldY for accurate coordinate mapping
   * that works in any scale mode (FIT, RESIZE, etc).
   *
   * Perfect for: Connect Four, Chess, Tic-Tac-Toe, Minesweeper, Battleship, etc.
   *
   * @example
   * ```ts
   * const gridHelper = adapter.createClickableGrid({
   *   columns: 7,
   *   rows: 6,
   *   cellWidth: 80,
   *   cellHeight: 80,
   *   offsetX: 100,
   *   offsetY: 100,
   *   onCellClick: (col, row) => {
   *     runtime.submitAction('dropToken', { col });
   *   },
   *   highlightColor: 0xffffff,
   *   highlightAlpha: 0.15,
   *   origin: 'bottom-left' // For Connect Four
   * });
   * ```
   */
  createClickableGrid(config) {
    return new GridClickHelper(this, this.scene, config);
  }
  /**
   * Create a GridCollisionManager for smooth movement with grid-aligned collision
   *
   * ⚠️ NOTE: This provides SMOOTH movement, not grid-locked movement.
   * For cell-to-cell committed movement (classic Bomberman), use createGridLockedMovementManager().
   *
   * @example
   * ```ts
   * const gridCollision = adapter.createGridCollisionManager({
   *   tileSize: 52,
   *   gridWidth: 13,
   *   gridHeight: 13,
   *   collisionCheck: createMultiCollisionCheck(
   *     { name: 'blocks', fn: (x, y) => hasBlock(state.blocks, x, y) },
   *     { name: 'bombs', fn: (x, y) => hasBomb(state.bombs, x, y) }
   *   ),
   *   debug: false // Enable to see grid overlay
   * });
   *
   * // In tick action:
   * gridCollision.moveEntity(player, input, delta);
   * ```
   */
  createGridCollisionManager(config) {
    return new GridCollisionManager(this, config);
  }
  /**
   * Create a GridLockedMovementManager for true grid-locked movement
   *
   * Provides cell-to-cell committed movement where entities:
   * - Align to grid cell centers
   * - Commit to moving one full cell at a time
   * - Can only change direction when aligned
   * - Smoothly animate between cells
   *
   * Perfect for: Classic Bomberman, Pacman, Sokoban, turn-based grid games.
   *
   * @example
   * ```ts
   * const gridLocked = adapter.createGridLockedMovementManager({
   *   tileSize: 52,
   *   gridWidth: 13,
   *   gridHeight: 13,
   *   collisionCheck: createMultiCollisionCheck(
   *     { name: 'blocks', fn: (x, y) => hasBlock(state.blocks, x, y) },
   *     { name: 'bombs', fn: (x, y) => hasBomb(state.bombs, x, y) }
   *   ),
   *   baseSpeed: 3.0 // cells per second
   * });
   *
   * // In tick action:
   * gridLocked.moveEntity(player, input, delta);
   * ```
   */
  createGridLockedMovementManager(config) {
    return new GridLockedMovementManager(this, config);
  }
  /**
   * @deprecated Use createGridCollisionManager instead. GridMovementManager has been renamed to GridCollisionManager for clarity.
   */
  createGridMovementManager(config) {
    return new GridCollisionManager(this, config);
  }
  /**
   * Create a HealthBarManager for automatic health bar management
   *
   * Auto-creates, positions, scales, and colors health bars for all sprites.
   *
   * @example
   * ```ts
   * const healthBars = adapter.createHealthBarManager({
   *   spriteManager: this.spriteManager,
   *   healthKey: 'health',
   *   maxHealth: 100,
   *   offset: { x: 0, y: -30 },
   *   width: 50,
   *   height: 5
   * });
   *
   * // In update():
   * healthBars.update();
   * ```
   */
  createHealthBarManager(config) {
    return new HealthBarManager(this, config);
  }
  /**
   * Create a CameraFollower for automatic camera tracking
   *
   * Eliminates manual camera positioning and fixes initialization timing bugs.
   * Automatically waits for player state, then follows smoothly.
   *
   * @example
   * ```ts
   * // Simplest usage - auto-follows local player
   * this.cameraFollower = adapter.createCameraFollower({
   *   target: 'myPlayer'
   * });
   *
   * // With smooth lerp following
   * this.cameraFollower = adapter.createCameraFollower({
   *   target: 'myPlayer',
   *   mode: 'lerp',
   *   lerpFactor: 0.1
   * });
   *
   * // With world bounds
   * this.cameraFollower = adapter.createCameraFollower({
   *   target: 'myPlayer',
   *   bounds: { width: 1600, height: 1200 }
   * });
   *
   * // No manual camera code needed in update()!
   * // Camera automatically follows and handles all edge cases.
   * ```
   */
  createCameraFollower(config = {}) {
    const { createCameraFollower: createCameraFollower2 } = (init_CameraFollower(), __toCommonJS(CameraFollower_exports));
    return createCameraFollower2(this, this.scene, config);
  }
  /**
   * Submit action ONLY when input changes (10x devtools improvement!)
   *
   * Automatically tracks previous input and only submits when changed.
   * Prevents flooding devtools with 60 identical actions per second.
   *
   * @param actionName - Name of the action to submit
   * @param input - Current input state
   * @param targetId - Optional target player ID
   *
   * @example
   * ```ts
   * // In scene.update()
   * const input = {
   *   left: keys.left.isDown,
   *   right: keys.right.isDown,
   *   up: keys.up.isDown
   * };
   * adapter.submitActionOnChange('move', input); // Only sends when input changes!
   * ```
   */
  submitActionOnChange(actionName, input, targetId) {
    if (!this._previousInputs) {
      this._previousInputs = /* @__PURE__ */ new Map();
    }
    const key = targetId ? `${actionName}:${targetId}` : actionName;
    const inputJson = JSON.stringify(input);
    const previousJson = this._previousInputs.get(key);
    if (inputJson !== previousJson) {
      this._previousInputs.set(key, inputJson);
      this.runtime.submitAction(actionName, input, targetId);
    }
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
    const state = adapter.getState();
    const myPlayer = adapter.getMyPlayer(playersKey);
    if (roleText && config.roleText) {
      roleText.setText(config.roleText(myPlayer, state));
    }
    if (controlsText && config.controlHints) {
      controlsText.setText(config.controlHints(myPlayer, state));
    }
  };
  const unsubscribers = [];
  let lastRoleText;
  let lastControlsText;
  if (roleText && config.roleText) {
    const unsubscribe = adapter.onChange((state) => {
      const players = state?.[playersKey];
      const myPlayer = players ? players[adapter.getMyPlayerId()] : void 0;
      const text = config.roleText(myPlayer, state);
      if (text !== lastRoleText) {
        lastRoleText = text;
        roleText.setText(text);
      }
    });
    unsubscribers.push(unsubscribe);
    const initialState = adapter.getState();
    const initialPlayer = adapter.getMyPlayer(playersKey);
    lastRoleText = config.roleText(initialPlayer, initialState);
    roleText.setText(lastRoleText);
  }
  if (controlsText && config.controlHints) {
    const unsubscribe = adapter.onChange((state) => {
      const players = state?.[playersKey];
      const myPlayer = players ? players[adapter.getMyPlayerId()] : void 0;
      const text = config.controlHints(myPlayer, state);
      if (text !== lastControlsText) {
        lastControlsText = text;
        controlsText.setText(text);
      }
    });
    unsubscribers.push(unsubscribe);
    const initialState = adapter.getState();
    const initialPlayer = adapter.getMyPlayer(playersKey);
    lastControlsText = config.controlHints(initialPlayer, initialState);
    controlsText.setText(lastControlsText);
  }
  return {
    update,
    destroy: () => {
      unsubscribers.forEach((unsub) => unsub());
      titleText?.destroy();
      roleText?.destroy();
      controlsText?.destroy();
    },
    getTitleText: () => titleText,
    getRoleText: () => roleText,
    getControlsText: () => controlsText
  };
}

// src/helpers/PlayerStatsPanel.ts
function createPlayerStatsPanel(adapter, scene, config) {
  const playersKey = config.playersKey || "players";
  const style = {
    backgroundColor: config.style?.backgroundColor || "rgba(0, 0, 0, 0.7)",
    padding: config.style?.padding ?? 8,
    iconSize: config.style?.iconSize ?? 24,
    fontSize: config.style?.fontSize || "16px",
    spacing: config.style?.spacing ?? 6,
    highlightColor: config.style?.highlightColor || "#fbbf24"
  };
  const getPosition = () => {
    if (typeof config.position === "object" && "x" in config.position) {
      return config.position;
    }
    const camera = scene.cameras.main;
    const padding = 20;
    switch (config.position) {
      case "top-left":
        return { x: padding, y: padding };
      case "top-right":
        return { x: camera.width - padding, y: padding };
      case "bottom-left":
        return { x: padding, y: camera.height - padding };
      case "bottom-right":
        return { x: camera.width - padding, y: camera.height - padding };
      default:
        return { x: padding, y: padding };
    }
  };
  const pos = getPosition();
  const container = scene.add.container(pos.x, pos.y);
  const background = scene.add.rectangle(0, 0, 100, 100, 0, 0.7);
  container.add(background);
  const statElements = /* @__PURE__ */ new Map();
  const update = () => {
    const state = adapter.getState();
    const myPlayer = adapter.getMyPlayer(playersKey);
    if (!myPlayer) {
      container.setVisible(false);
      return;
    }
    container.setVisible(true);
    let currentY = style.padding;
    let maxWidth = 0;
    const visibleStats = [];
    for (const [statName, statConfig] of Object.entries(config.stats)) {
      if (statConfig.visible && !statConfig.visible(myPlayer)) {
        const element = statElements.get(statName);
        if (element) {
          element.iconText.setVisible(false);
          element.valueText.setVisible(false);
          element.highlight?.setVisible(false);
        }
        continue;
      }
      visibleStats.push([statName, statConfig]);
    }
    for (const [statName, statConfig] of visibleStats) {
      let element = statElements.get(statName);
      if (!element) {
        const iconText = scene.add.text(style.padding, currentY, statConfig.icon, {
          fontSize: `${style.iconSize}px`
        });
        const valueText = scene.add.text(
          style.padding + style.iconSize + 4,
          currentY,
          String(statConfig.getValue(myPlayer)),
          {
            fontSize: style.fontSize,
            color: "#ffffff"
          }
        );
        const highlight = scene.add.rectangle(
          0,
          currentY + style.iconSize / 2,
          0,
          style.iconSize + 4,
          parseInt(style.highlightColor.replace("#", "0x"), 16),
          0.3
        );
        highlight.setOrigin(0, 0.5);
        highlight.setVisible(false);
        container.add([highlight, iconText, valueText]);
        element = { iconText, valueText, highlight };
        statElements.set(statName, element);
      }
      element.iconText.setText(statConfig.icon);
      element.valueText.setText(String(statConfig.getValue(myPlayer)));
      element.iconText.setVisible(true);
      element.valueText.setVisible(true);
      element.iconText.setPosition(style.padding, currentY);
      element.valueText.setPosition(style.padding + style.iconSize + 4, currentY);
      const shouldHighlight = statConfig.highlight ? statConfig.highlight(myPlayer) : false;
      if (element.highlight) {
        element.highlight.setVisible(shouldHighlight);
        element.highlight.setPosition(style.padding - 2, currentY + style.iconSize / 2);
        const textWidth = element.valueText.width;
        element.highlight.width = style.iconSize + 4 + textWidth + 4;
      }
      const elementWidth = style.iconSize + 4 + element.valueText.width;
      maxWidth = Math.max(maxWidth, elementWidth);
      currentY += style.iconSize + style.spacing;
    }
    const bgWidth = maxWidth + style.padding * 2;
    const bgHeight = currentY - style.spacing + style.padding;
    background.setSize(bgWidth, bgHeight);
    if (config.position === "top-right" || config.position === "bottom-right") {
      background.setOrigin(1, 0);
      container.x = pos.x;
    } else {
      background.setOrigin(0, 0);
    }
  };
  const unsubscribe = adapter.onChange(() => {
    update();
  });
  update();
  return {
    update,
    destroy: () => {
      unsubscribe();
      container.destroy();
    },
    getContainer: () => container
  };
}

// src/helpers/CollectibleManager.ts
function createCollectibleManager(adapter, scene, config) {
  const runtime = adapter.getRuntime();
  let unsubscribe;
  const checkCollision = (playerPos, itemPos, radius, collisionType) => {
    if (collisionType === "grid") {
      const playerGridX = Math.round(playerPos.x / radius);
      const playerGridY = Math.round(playerPos.y / radius);
      const itemGridX = Math.round(itemPos.x / radius);
      const itemGridY = Math.round(itemPos.y / radius);
      return playerGridX === itemGridX && playerGridY === itemGridY;
    } else {
      const dx = playerPos.x - itemPos.x;
      const dy = playerPos.y - itemPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < radius;
    }
  };
  const showFeedback = (itemPos, feedback) => {
    if (feedback.popup) {
      const text = scene.add.text(itemPos.x, itemPos.y - 20, feedback.popup, {
        fontSize: "16px",
        color: "#fbbf24",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 3
      });
      text.setOrigin(0.5);
      scene.tweens.add({
        targets: text,
        y: itemPos.y - 50,
        alpha: 0,
        duration: 800,
        ease: "Cubic.easeOut",
        onComplete: () => text.destroy()
      });
    }
    if (feedback.sound && scene.sound) {
      try {
        scene.sound.play(feedback.sound);
      } catch (e) {
      }
    }
    if (feedback.particle) {
      for (let i = 0; i < 8; i++) {
        const angle = i / 8 * Math.PI * 2;
        const speed = 50 + Math.random() * 50;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const particle = scene.add.circle(itemPos.x, itemPos.y, 3, 16498468);
        scene.tweens.add({
          targets: particle,
          x: itemPos.x + vx,
          y: itemPos.y + vy,
          alpha: 0,
          scale: 0,
          duration: 400,
          ease: "Cubic.easeOut",
          onComplete: () => particle.destroy()
        });
      }
    }
  };
  const update = () => {
    if (!adapter.isHost()) return;
    const state = runtime.getState();
    const myPlayerId = runtime.getMyPlayerId();
    const myPlayer = state.players?.[myPlayerId];
    if (!myPlayer) return;
    for (const [collectibleType, collectibleConfig] of Object.entries(config)) {
      const items = state[collectibleConfig.stateKey];
      if (!Array.isArray(items)) continue;
      const idField = collectibleConfig.idField || "id";
      const playerPos = collectibleConfig.getPlayerPosition ? collectibleConfig.getPlayerPosition(myPlayer) : { x: myPlayer.x, y: myPlayer.y };
      for (const item of items) {
        const itemPos = collectibleConfig.getPosition(item);
        const collisionType = collectibleConfig.collisionType || "continuous";
        if (checkCollision(playerPos, itemPos, collectibleConfig.radius, collisionType)) {
          const itemId = item[idField];
          const feedback = collectibleConfig.onCollect?.(item, scene);
          if (feedback) {
            showFeedback(itemPos, feedback);
          }
          runtime.submitAction(collectibleConfig.collectAction, { [idField]: itemId });
        }
      }
    }
  };
  const collect = (collectibleType, itemId) => {
    const collectibleConfig = config[collectibleType];
    if (!collectibleConfig) {
      console.warn(`Unknown collectible type: ${collectibleType}`);
      return;
    }
    const idField = collectibleConfig.idField || "id";
    runtime.submitAction(collectibleConfig.collectAction, { [idField]: itemId });
  };
  return {
    update,
    collect,
    destroy: () => {
      unsubscribe?.();
    }
  };
}

// src/helpers/RoundManager.ts
function createRoundManager(adapter, scene, config) {
  const runtime = adapter.getRuntime();
  const timerKey = config.timerStateKey || "roundTimer";
  const roundKey = config.roundStateKey || "round";
  const playersKey = config.playersKey || "players";
  const gameOverKey = config.gameOverKey || "gameOver";
  const winnerKey = config.winnerKey || "winner";
  let timerText = null;
  let announcementText = null;
  const scoreTexts = [];
  if (config.ui.timer) {
    const timerConfig = config.ui.timer;
    const defaultStyle = {
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold",
      ...timerConfig.style
    };
    timerText = scene.add.text(
      timerConfig.position.x,
      timerConfig.position.y,
      "",
      defaultStyle
    );
    timerText.setOrigin(0.5);
  }
  if (config.ui.announcement) {
    const announcementConfig = config.ui.announcement;
    const camera = scene.cameras.main;
    const pos = announcementConfig.position || { x: camera.width / 2, y: camera.height / 2 };
    const defaultStyle = {
      fontSize: "48px",
      color: "#fbbf24",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 6,
      ...announcementConfig.style
    };
    announcementText = scene.add.text(pos.x, pos.y, "", defaultStyle);
    announcementText.setOrigin(0.5);
    announcementText.setVisible(false);
    announcementText.setDepth(1e3);
  }
  let isFrozen = false;
  let freezeTimer = 0;
  const showAnnouncement = (text, duration) => {
    if (!announcementText) return;
    announcementText.setText(text);
    announcementText.setVisible(true);
    announcementText.setAlpha(0);
    scene.tweens.add({
      targets: announcementText,
      alpha: 1,
      duration: 200,
      ease: "Cubic.easeOut"
    });
    isFrozen = true;
    freezeTimer = duration;
    scene.time.delayedCall(duration, () => {
      if (!announcementText) return;
      scene.tweens.add({
        targets: announcementText,
        alpha: 0,
        duration: 300,
        ease: "Cubic.easeIn",
        onComplete: () => {
          announcementText?.setVisible(false);
          isFrozen = false;
        }
      });
    });
  };
  const update = () => {
    const state = runtime.getState();
    if (timerText && config.ui.timer) {
      const timerValue = state[timerKey] || 0;
      const formatted = config.ui.timer.format(timerValue);
      timerText.setText(formatted);
      const warningAt = config.ui.timer.warningAt ?? 3e4;
      if (timerValue <= warningAt && config.ui.timer.warningStyle) {
        timerText.setStyle(config.ui.timer.warningStyle);
      } else if (config.ui.timer.style) {
        timerText.setStyle(config.ui.timer.style);
      }
    }
    if (config.ui.scoreboard) {
      const scoreConfig = config.ui.scoreboard;
      const players = state[playersKey] || {};
      const playerEntries = Object.entries(players);
      scoreTexts.forEach((text) => text.destroy());
      scoreTexts.length = 0;
      let yOffset = 0;
      const spacing = scoreConfig.spacing ?? 25;
      playerEntries.forEach(([playerId, player], index) => {
        const text = scene.add.text(
          scoreConfig.position.x,
          scoreConfig.position.y + yOffset,
          scoreConfig.format(player, index, playerId),
          scoreConfig.style || { fontSize: "16px", color: "#ffffff" }
        );
        scoreTexts.push(text);
        yOffset += spacing;
      });
    }
    if (adapter.isHost() && !isFrozen && !state[gameOverKey]) {
      const winnerId = config.checkWinner(state);
      if (winnerId !== void 0) {
        const players = state[playersKey] || {};
        if (winnerId === null) {
          if (config.ui.announcement) {
            const text = config.ui.announcement.draw();
            const duration = config.ui.announcement.freezeDuration ?? 3e3;
            showAnnouncement(text, duration);
          }
          runtime.submitAction("endRound", { winnerId: null });
        } else {
          const winner = players[winnerId];
          const score = winner.score || 0;
          const isMatchWin = score + 1 >= config.roundsToWin;
          if (config.ui.announcement) {
            const text = isMatchWin ? config.ui.announcement.matchWin(winner, winnerId) : config.ui.announcement.winner(winner, winnerId);
            const duration = config.ui.announcement.freezeDuration ?? 3e3;
            showAnnouncement(text, duration);
          }
          runtime.submitAction("endRound", { winnerId });
        }
      }
    }
    if (state[gameOverKey] && state[winnerKey]) {
      const players = state[playersKey] || {};
      const winner = players[state[winnerKey]];
      if (winner && config.ui.announcement && announcementText && !announcementText.visible) {
        const text = config.ui.announcement.matchWin(winner, state[winnerKey]);
        announcementText.setText(text);
        announcementText.setVisible(true);
        announcementText.setAlpha(1);
      }
    }
  };
  const unsubscribe = adapter.onChange(() => {
    update();
  });
  update();
  return {
    update,
    destroy: () => {
      unsubscribe();
      timerText?.destroy();
      announcementText?.destroy();
      scoreTexts.forEach((text) => text.destroy());
    },
    getTimerText: () => timerText,
    getAnnouncementText: () => announcementText
  };
}

// src/helpers/SpeedDisplay.ts
function createSpeedDisplay(physicsManager, adapter, scene, config = {}) {
  const position = config.position ?? { x: 400, y: 50 };
  const format = config.format ?? ((v) => `Speed: ${Math.round(v)}`);
  const style = config.style ?? { fontSize: "20px", color: "#fff" };
  const text = scene.add.text(position.x, position.y, format(0), style);
  if (config.origin !== void 0) {
    if (typeof config.origin === "number") {
      text.setOrigin(config.origin);
    } else {
      text.setOrigin(config.origin.x, config.origin.y);
    }
  } else {
    text.setOrigin(0.5);
  }
  if (config.depth !== void 0) {
    text.setDepth(config.depth);
  }
  const unsubscribeVelocity = physicsManager.onVelocityChange((playerId, velocity) => {
    if (playerId === adapter.getLocalPlayerId()) {
      text.setText(format(velocity));
    }
  });
  const unsubscribeState = adapter.onChange((state) => {
    const localPlayerId = adapter.getLocalPlayerId();
    const player = state.players?.[localPlayerId];
    if (player && player.velocity !== void 0) {
      text.setText(format(player.velocity));
    }
  });
  const update = () => {
    const velocity = physicsManager.getVelocity(adapter.getLocalPlayerId());
    text.setText(format(velocity));
  };
  update();
  return {
    update,
    destroy: () => {
      unsubscribeVelocity();
      unsubscribeState();
      text.destroy();
    },
    getText: () => text
  };
}

// src/helpers/SpriteAttachment.ts
function createSpriteAttachment(scene, sprite, attachment, config = {}) {
  const autoUpdate = config.autoUpdate ?? true;
  let isDestroyed = false;
  const originalDestroy = attachment.destroy;
  const wrappedDestroy = () => {
    if (isDestroyed) return;
    isDestroyed = true;
    if (updateHandler) {
      scene.events.off("update", updateHandler);
      updateHandler = null;
    }
    originalDestroy();
  };
  let updateHandler = null;
  if (autoUpdate) {
    attachment.update();
    updateHandler = () => {
      if (!isDestroyed) {
        attachment.update();
      }
    };
    scene.events.on("update", updateHandler);
    if (sprite.once) {
      sprite.once("destroy", () => {
        wrappedDestroy();
      });
    }
    scene.events.once("shutdown", () => {
      if (updateHandler) {
        scene.events.off("update", updateHandler);
        updateHandler = null;
      }
    });
  } else {
    attachment.update();
  }
  return {
    update: attachment.update,
    destroy: wrappedDestroy,
    getGameObject: attachment.getGameObject
  };
}
function createSpriteAttachments(scene, sprite, attachments, config = {}) {
  return attachments.map(
    (attachment) => createSpriteAttachment(scene, sprite, attachment, config)
  );
}
function createCompositeAttachment(scene, sprite, children, config = {}) {
  const wrappedChildren = children.map(
    (child) => createSpriteAttachment(scene, sprite, child, { autoUpdate: false })
  );
  return createSpriteAttachment(
    scene,
    sprite,
    {
      update: () => {
        for (const child of wrappedChildren) {
          child.update();
        }
      },
      destroy: () => {
        for (const child of wrappedChildren) {
          child.destroy();
        }
      },
      getGameObject: () => {
        return wrappedChildren[0]?.getGameObject?.() ?? null;
      }
    },
    config
  );
}

// src/helpers/DirectionalIndicator.ts
function attachDirectionalIndicator(scene, sprite, config = {}) {
  const shape = config.shape ?? "triangle";
  const offset = config.offset ?? 20;
  const color = config.color ?? 16777215;
  const size = config.size ?? 1;
  const autoUpdate = config.autoUpdate ?? true;
  let indicator;
  switch (shape) {
    case "triangle": {
      const triangle = scene.add.triangle(
        sprite.x,
        sprite.y,
        0,
        -5,
        // Top point (tip)
        -4,
        5,
        // Bottom left
        4,
        5,
        // Bottom right
        color
      );
      triangle.setOrigin(0.5);
      if (config.depth !== void 0) {
        triangle.setDepth(config.depth);
      }
      indicator = triangle;
      break;
    }
    case "arrow": {
      const container = scene.add.container(sprite.x, sprite.y);
      const shaft = scene.add.rectangle(-3 * size, 0, 10 * size, 2 * size, color);
      shaft.setOrigin(0.5);
      const head = scene.add.triangle(
        5 * size,
        0,
        0,
        0,
        // Point
        -3 * size,
        -3 * size,
        // Top
        -3 * size,
        3 * size,
        // Bottom
        color
      );
      head.setOrigin(0.5);
      container.add([shaft, head]);
      if (config.depth !== void 0) {
        container.setDepth(config.depth);
      }
      indicator = container;
      break;
    }
    case "chevron": {
      const graphics = scene.add.graphics();
      graphics.lineStyle(2 * size, color);
      graphics.beginPath();
      graphics.moveTo(-4 * size, -4 * size);
      graphics.lineTo(4 * size, 0);
      graphics.lineTo(-4 * size, 4 * size);
      graphics.strokePath();
      graphics.setPosition(sprite.x, sprite.y);
      if (config.depth !== void 0) {
        graphics.setDepth(config.depth);
      }
      indicator = graphics;
      break;
    }
  }
  const update = () => {
    const indicatorX = sprite.x + Math.cos(sprite.rotation) * offset;
    const indicatorY = sprite.y + Math.sin(sprite.rotation) * offset;
    indicator.setPosition?.(indicatorX, indicatorY);
    indicator.setRotation?.(sprite.rotation + Math.PI / 2);
  };
  return createSpriteAttachment(
    scene,
    sprite,
    {
      update,
      destroy: () => {
        indicator.destroy();
      },
      getGameObject: () => indicator
    },
    { autoUpdate }
  );
}

// src/index.ts
init_CameraFollower();

// src/helpers/DualRuntimeFactory.ts
import { GameRuntime } from "@martini-kit/core";
import { LocalTransport } from "@martini-kit/transport-local";
function createDualRuntimePreview(config) {
  try {
    const roomId = config.roomId || `dual-preview-${Math.random().toString(36).substring(2, 8)}`;
    const hostTransport = new LocalTransport({
      roomId,
      isHost: true
    });
    const clientTransport = new LocalTransport({
      roomId,
      isHost: false
    });
    const hostPlayerId = hostTransport.getPlayerId();
    const clientPlayerId = clientTransport.getPlayerId();
    const hostRuntime = new GameRuntime(config.game, hostTransport, {
      isHost: true,
      playerIds: [hostPlayerId, clientPlayerId]
    });
    config.onHostReady?.();
    const clientRuntime = new GameRuntime(config.game, clientTransport, {
      isHost: false,
      playerIds: [hostPlayerId, clientPlayerId]
    });
    config.onClientReady?.();
    const cleanup = () => {
    };
    return {
      hostRuntime,
      clientRuntime,
      hostTransport,
      clientTransport,
      hostPlayerId,
      clientPlayerId,
      roomId,
      cleanup
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Failed to create dual runtime preview");
    config.onError?.(error);
    throw error;
  }
}

// src/helpers/LobbyUI.ts
var LobbyUI = class {
  constructor(adapter, scene, config = {}) {
    this.adapter = adapter;
    this.scene = scene;
    __publicField(this, "container");
    __publicField(this, "titleText");
    __publicField(this, "subtitleText");
    __publicField(this, "playerListText");
    __publicField(this, "readyButton");
    __publicField(this, "readyButtonText");
    __publicField(this, "startButton");
    __publicField(this, "startButtonText");
    __publicField(this, "instructionsText");
    __publicField(this, "statusText");
    __publicField(this, "isReady", false);
    __publicField(this, "config");
    this.config = {
      title: config.title || "Lobby",
      subtitle: config.subtitle || "Waiting for players...",
      position: config.position || { x: 400, y: 200 },
      titleStyle: config.titleStyle || {
        fontSize: "48px",
        color: "#ffffff",
        fontStyle: "bold"
      },
      subtitleStyle: config.subtitleStyle || {
        fontSize: "24px",
        color: "#aaaaaa"
      },
      playerStyle: config.playerStyle || {
        fontSize: "20px",
        color: "#ffffff"
      },
      buttonStyle: config.buttonStyle || {
        fill: 5164484,
        textColor: "#ffffff",
        fontSize: "20px"
      },
      showInstructions: config.showInstructions !== false
    };
    this.container = this.scene.add.container(
      this.config.position.x,
      this.config.position.y
    );
    this.container.setDepth(1e3);
    this.createUI();
  }
  createUI() {
    let yOffset = 0;
    if (this.config.title) {
      this.titleText = this.scene.add.text(0, yOffset, this.config.title, this.config.titleStyle);
      this.titleText.setOrigin(0.5, 0);
      this.container.add(this.titleText);
      yOffset += 60;
    }
    if (this.config.subtitle) {
      this.subtitleText = this.scene.add.text(0, yOffset, this.config.subtitle, this.config.subtitleStyle);
      this.subtitleText.setOrigin(0.5, 0);
      this.container.add(this.subtitleText);
      yOffset += 40;
    }
    this.statusText = this.scene.add.text(0, yOffset, "", {
      fontSize: "18px",
      color: "#ffff00"
    });
    this.statusText.setOrigin(0.5, 0);
    this.container.add(this.statusText);
    yOffset += 30;
    this.playerListText = this.scene.add.text(0, yOffset, "", this.config.playerStyle);
    this.playerListText.setOrigin(0.5, 0);
    this.playerListText.setAlign("center");
    this.container.add(this.playerListText);
    yOffset += 150;
    this.readyButton = this.createButton(0, yOffset, "Ready", () => {
      this.toggleReady();
    });
    this.container.add(this.readyButton);
    yOffset += 60;
    this.startButton = this.createButton(0, yOffset, "Start Game", () => {
      this.startGame();
    });
    this.startButton.setVisible(false);
    this.container.add(this.startButton);
    yOffset += 60;
    if (this.config.showInstructions) {
      this.instructionsText = this.scene.add.text(
        0,
        yOffset,
        "Click Ready when you are ready to play",
        {
          fontSize: "16px",
          color: "#888888",
          align: "center"
        }
      );
      this.instructionsText.setOrigin(0.5, 0);
      this.container.add(this.instructionsText);
    }
  }
  createButton(x, y, text, onClick) {
    const buttonContainer = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, 200, 50, this.config.buttonStyle.fill);
    bg.setStrokeStyle(2, 16777215);
    bg.setInteractive({ useHandCursor: true });
    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: this.config.buttonStyle.fontSize,
      color: this.config.buttonStyle.textColor,
      fontStyle: "bold"
    });
    buttonText.setOrigin(0.5);
    if (text === "Ready") {
      this.readyButtonText = buttonText;
    } else if (text === "Start Game") {
      this.startButtonText = buttonText;
    }
    bg.on("pointerover", () => {
      bg.setFillStyle(this.config.buttonStyle.fill, 0.8);
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(this.config.buttonStyle.fill, 1);
    });
    bg.on("pointerdown", onClick);
    buttonContainer.add([bg, buttonText]);
    return buttonContainer;
  }
  toggleReady() {
    this.isReady = !this.isReady;
    const runtime = this.adapter.runtime;
    runtime.submitAction("__lobbyReady", { ready: this.isReady });
    if (this.readyButtonText) {
      this.readyButtonText.setText(this.isReady ? "Not Ready" : "Ready");
    }
  }
  startGame() {
    const runtime = this.adapter.runtime;
    runtime.submitAction("__lobbyStart");
  }
  /**
   * Update the lobby UI based on current state
   * Call this in your scene's update() or onChange() callback
   */
  update(lobbyState) {
    this.updatePlayerList(lobbyState);
    this.updateStatusText(lobbyState);
    if (this.startButton) {
      const isHost = this.adapter.isHost();
      const canStart = this.canStartGame(lobbyState);
      this.startButton.setVisible(isHost && !lobbyState.config.requireAllReady);
      if (this.startButtonText) {
        this.startButtonText.setAlpha(canStart ? 1 : 0.5);
      }
    }
  }
  updatePlayerList(lobbyState) {
    if (!this.playerListText) return;
    const players = Object.values(lobbyState.players);
    const myId = this.adapter.getMyPlayerId();
    const lines = ["Players:"];
    players.forEach((player, index) => {
      const isMe = player.playerId === myId;
      const readyIndicator = player.ready ? "\u2713" : "\u25CB";
      const namePrefix = isMe ? "You" : `Player ${index + 1}`;
      lines.push(`${readyIndicator} ${namePrefix}`);
    });
    this.playerListText.setText(lines.join("\n"));
  }
  updateStatusText(lobbyState) {
    if (!this.statusText) return;
    const playerCount = Object.keys(lobbyState.players).length;
    const minPlayers = lobbyState.config.minPlayers;
    const readyCount = Object.values(lobbyState.players).filter((p) => p.ready).length;
    let status = "";
    if (playerCount < minPlayers) {
      status = `Waiting for players (${playerCount}/${minPlayers})`;
    } else {
      status = `${playerCount} players`;
    }
    if (lobbyState.config.requireAllReady) {
      status += ` | Ready: ${readyCount}/${playerCount}`;
    }
    if (lobbyState.config.autoStartTimeout && playerCount >= minPlayers) {
      status += " | Auto-start enabled";
    }
    this.statusText.setText(status);
  }
  canStartGame(lobbyState) {
    const playerCount = Object.keys(lobbyState.players).length;
    const minPlayers = lobbyState.config.minPlayers;
    if (playerCount < minPlayers) {
      return false;
    }
    if (lobbyState.config.requireAllReady) {
      const allReady = Object.values(lobbyState.players).every((p) => p.ready);
      return allReady;
    }
    return true;
  }
  /**
   * Show the lobby UI
   */
  show() {
    this.container.setVisible(true);
  }
  /**
   * Hide the lobby UI
   */
  hide() {
    this.container.setVisible(false);
  }
  /**
   * Destroy the lobby UI
   */
  destroy() {
    this.container.destroy();
  }
  /**
   * Check if lobby UI is visible
   */
  isVisible() {
    return this.container.visible;
  }
};
function attachLobbyUI(adapter, scene, config) {
  return new LobbyUI(adapter, scene, config);
}

// src/runtime.ts
import { GameRuntime as GameRuntime2 } from "@martini-kit/core";
import { LocalTransport as LocalTransport2 } from "@martini-kit/transport-local";
import { TrysteroTransport } from "@martini-kit/transport-trystero";
import { IframeBridgeTransport } from "@martini-kit/transport-iframe-bridge";
import Phaser from "phaser";
var GLOBAL_GAME_KEY = "__martini-kit_CURRENT_GAME__";
function getExistingCleanup() {
  if (typeof globalThis === "undefined") return null;
  const existing = globalThis[GLOBAL_GAME_KEY];
  return typeof existing?.cleanup === "function" ? existing.cleanup : null;
}
function setGlobalCleanup(cleanup) {
  if (typeof globalThis === "undefined") return;
  globalThis[GLOBAL_GAME_KEY] = { cleanup };
}
function clearGlobalCleanup() {
  if (typeof globalThis === "undefined") return;
  delete globalThis[GLOBAL_GAME_KEY];
}
async function initializeGame(config) {
  const hot = typeof import.meta !== "undefined" ? import.meta.hot : void 0;
  const previousCleanup = getExistingCleanup();
  if (previousCleanup) {
    previousCleanup();
  }
  const leakedTransport = globalThis["__martini-kit_TRANSPORT__"];
  if (leakedTransport) {
    console.debug("[Martini] Found leaked transport, cleaning up...", leakedTransport);
    if (typeof leakedTransport.disconnect === "function") {
      leakedTransport.disconnect();
    } else if (typeof leakedTransport.destroy === "function") {
      leakedTransport.destroy();
    }
    delete globalThis["__martini-kit_TRANSPORT__"];
    console.debug("[Martini] Transport cleanup complete, global cleared");
  }
  const platformConfig = window["__martini-kit_CONFIG__"];
  if (!platformConfig) {
    throw new Error(
      "Missing __martini-kit_CONFIG__. The platform must inject this before running user code."
    );
  }
  const transport = createTransport(platformConfig.transport);
  if (typeof transport.waitForReady === "function") {
    await transport.waitForReady();
  }
  const initialPlayerIds = [transport.getPlayerId()];
  const runtime = new GameRuntime2(
    config.game,
    transport,
    {
      isHost: platformConfig.transport.isHost,
      playerIds: initialPlayerIds
    }
  );
  const hasLobby = config.game.lobby !== void 0;
  const minPlayers = platformConfig.minPlayers && platformConfig.minPlayers > 0 ? platformConfig.minPlayers : 1;
  if (!hasLobby && minPlayers > 1) {
    try {
      await runtime.waitForPlayers(minPlayers, { timeoutMs: 1e4 });
    } catch (err) {
      console.warn("[Martini] waitForPlayers timed out:", err);
    }
  }
  const PhaserLib = Phaser ?? (typeof window !== "undefined" ? window.Phaser : void 0);
  if (!PhaserLib) {
    throw new Error("Phaser failed to load. Ensure the Phaser script is available in the sandbox.");
  }
  const defaultScale = {
    mode: PhaserLib.Scale.FIT,
    autoCenter: PhaserLib.Scale.CENTER_BOTH,
    width: config.phaserConfig?.width || 800,
    height: config.phaserConfig?.height || 600
  };
  const defaultInput = {
    activePointers: 3
    // Enable mouse + 2 touch pointers by default
  };
  const phaserConfig = {
    type: PhaserLib.AUTO,
    parent: "game",
    scale: defaultScale,
    input: defaultInput,
    ...config.phaserConfig,
    scene: config.scene(runtime)
  };
  const phaserGame = new PhaserLib.Game(phaserConfig);
  if (typeof window !== "undefined" && window["__martini-kit_IDE__"]) {
    window["__martini-kit_IDE__"].registerRuntime(runtime);
  }
  const disconnectTransport = () => {
    if ("disconnect" in transport && typeof transport.disconnect === "function") {
      transport.disconnect();
    } else if ("destroy" in transport && typeof transport.destroy === "function") {
      transport.destroy();
    }
  };
  const handleIdeDisconnect = (event) => {
    if (event.data?.type === "martini-kit:transport:disconnect") {
      disconnectTransport();
    }
  };
  const handleBeforeUnload = () => {
    disconnectTransport();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("message", handleIdeDisconnect);
    window.addEventListener("beforeunload", handleBeforeUnload);
  }
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearGlobalCleanup();
    if (typeof window !== "undefined") {
      window.removeEventListener("message", handleIdeDisconnect);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }
    runtime.destroy();
    disconnectTransport();
    phaserGame.destroy(true);
  };
  setGlobalCleanup(cleanup);
  if (hot?.dispose) {
    hot.dispose(() => {
      cleanup();
    });
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
      return new LocalTransport2({
        roomId: config.roomId,
        isHost: config.isHost
      });
    case "trystero":
      return new TrysteroTransport({
        appId: config.appId || "martini-kit",
        roomId: config.roomId,
        isHost: config.isHost,
        rtcConfig: config.rtcConfig,
        relayUrls: config.relayUrls
      });
    default:
      throw new Error(`Unknown transport type: ${config.type}. Only 'local', 'iframe-bridge', and 'trystero' are supported in IDE mode.`);
  }
}
export {
  BUILT_IN_PROFILES,
  CollisionManager,
  GridClickHelper,
  GridCollisionManager,
  GridLockedMovementManager,
  GridMovementManager,
  HealthBarManager,
  InputManager,
  LobbyUI,
  PhaserAdapter,
  PhysicsManager,
  PlayerUIManager,
  SpriteManager,
  StateDrivenSpawner,
  attachDirectionalIndicator,
  attachLobbyUI,
  createCameraFollower,
  createCollectibleManager,
  createCompositeAttachment,
  createDualRuntimePreview,
  createPlayerHUD,
  createPlayerStatsPanel,
  createRoundManager,
  createSpeedDisplay,
  createSpriteAttachment,
  createSpriteAttachments,
  getProfile,
  initializeGame,
  listProfiles,
  registerProfile
};
//# sourceMappingURL=browser.js.map
