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
    const syncInterval = this.config.sync?.interval;
    this.adapter.trackSprite(sprite, key, {
      properties: syncProperties,
      syncInterval,
      namespace: this.namespace
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
   */
  update() {
    if (!this.adapter.isHost()) {
      this.adapter.updateInterpolation();
    }
    this.updateLabels();
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

// src/PhaserAdapter.ts
var PhaserAdapter = class {
  // Track all registered SpriteManagers
  constructor(runtime, scene, config = {}) {
    this.runtime = runtime;
    this.scene = scene;
    __publicField(this, "trackedSprites", /* @__PURE__ */ new Map());
    __publicField(this, "remoteSprites", /* @__PURE__ */ new Map());
    // Sprites created for remote players with their namespace
    __publicField(this, "syncIntervalId", null);
    __publicField(this, "spriteNamespace");
    __publicField(this, "autoInterpolate");
    __publicField(this, "lerpFactor");
    __publicField(this, "spriteManagers", /* @__PURE__ */ new Set());
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
    this.trackedSprites.set(key, { sprite, options });
    if (this.isHost() && !this.syncIntervalId) {
      const interval = options.syncInterval || 50;
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
      for (const [key, spriteData] of Object.entries(sprites)) {
        if (this.trackedSprites.has(key)) continue;
        const remoteSpriteData = this.remoteSprites.get(key);
        if (remoteSpriteData && remoteSpriteData.namespace === namespace) {
          const sprite = remoteSpriteData.sprite;
          sprite._targetX = spriteData.x;
          sprite._targetY = spriteData.y;
          sprite._targetRotation = spriteData.rotation;
          if (sprite._targetX !== void 0 && sprite.x === void 0) {
            sprite.x = sprite._targetX;
            sprite.y = sprite._targetY;
            sprite.rotation = sprite._targetRotation || 0;
          }
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
      namespace: namespace || this.spriteNamespace
    });
  }
  /**
   * Call this in your Phaser update() loop to smoothly interpolate remote sprites
   * This should be called every frame (60 FPS) for smooth movement
   *
   * Note: If autoInterpolate is enabled in config, you don't need to call this manually.
   */
  updateInterpolation() {
    if (this.isHost()) return;
    for (const [key, remoteSpriteData] of this.remoteSprites.entries()) {
      const sprite = remoteSpriteData.sprite;
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
    const myPlayer = adapter.getMyPlayer(playersKey);
    if (roleText && config.roleText) {
      roleText.setText(config.roleText(myPlayer));
    }
    if (controlsText && config.controlHints) {
      controlsText.setText(config.controlHints(myPlayer));
    }
  };
  const unsubscribers = [];
  if (roleText && config.roleText) {
    const unsubscribe = adapter.watchMyPlayer(
      (player) => config.roleText(player),
      (text) => {
        roleText.setText(text);
      },
      { playersKey }
    );
    unsubscribers.push(unsubscribe);
  }
  if (controlsText && config.controlHints) {
    const unsubscribe = adapter.watchMyPlayer(
      (player) => config.controlHints(player),
      (text) => {
        controlsText.setText(text);
      },
      { playersKey }
    );
    unsubscribers.push(unsubscribe);
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

// src/helpers/DirectionalIndicator.ts
function attachDirectionalIndicator(scene, sprite, config = {}) {
  const shape = config.shape ?? "triangle";
  const offset = config.offset ?? 20;
  const color = config.color ?? 16777215;
  const size = config.size ?? 1;
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
  update();
  return {
    update,
    destroy: () => {
      indicator.destroy();
    },
    getGameObject: () => indicator
  };
}

// src/index.ts
init_CameraFollower();

// src/helpers/DualRuntimeFactory.ts
import { GameRuntime } from "@martini/core";
import { LocalTransport } from "@martini/transport-local";
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

// src/runtime.ts
import { GameRuntime as GameRuntime2 } from "@martini/core";
import { LocalTransport as LocalTransport2 } from "@martini/transport-local";
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
  const runtime = new GameRuntime2(
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
  const defaultInput = {
    activePointers: 3
    // Enable mouse + 2 touch pointers by default
  };
  const phaserConfig = {
    type: Phaser.AUTO,
    parent: "game",
    scale: defaultScale,
    input: defaultInput,
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
      return new LocalTransport2({
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
  HealthBarManager,
  InputManager,
  PhaserAdapter,
  PhysicsManager,
  PlayerUIManager,
  SpriteManager,
  StateDrivenSpawner,
  attachDirectionalIndicator,
  createCameraFollower,
  createDualRuntimePreview,
  createPlayerHUD,
  createSpeedDisplay,
  getProfile,
  initializeGame,
  listProfiles,
  registerProfile
};
//# sourceMappingURL=browser.js.map
