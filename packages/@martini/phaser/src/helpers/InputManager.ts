/**
 * InputManager - Simplified input handling for multiplayer games
 *
 * Automatically maps keyboard/pointer input to game actions.
 * Handles debouncing, continuous vs one-shot inputs, and more.
 *
 * Usage:
 * ```ts
 * const input = adapter.createInputManager();
 *
 * // Map keys to actions
 * input.bindKeys({
 *   'ArrowLeft': { action: 'move', input: { x: -1 } },
 *   'ArrowRight': { action: 'move', input: { x: 1 } },
 *   'Space': 'jump' // Shorthand for action with no input
 * });
 *
 * // Or use Phaser cursor keys
 * input.bindCursors(this.input.keyboard.createCursorKeys(), {
 *   left: { action: 'move', input: { x: -1 } },
 *   right: { action: 'move', input: { x: 1 } },
 *   up: 'jump'
 * });
 *
 * // Call in update loop
 * input.update();
 * ```
 */

import type { PhaserAdapter } from '../PhaserAdapter.js';
import type { GameRuntime } from '@martini/core';
import { getProfile, applyProfileOptions, mergeProfiles as mergeProfileBindings, type ProfileOptions } from './InputProfiles.js';

export interface ActionBinding {
  /** Action name to submit */
  action: string;

  /** Input data to send with action */
  input?: any;

  /** Continuous (fires every frame while held) or one-shot (fires once on press) */
  mode?: 'continuous' | 'oneshot';

  /** Target player ID (defaults to self) */
  targetId?: string;
}

export type KeyBinding = ActionBinding | string; // string is shorthand for { action: string }

export interface KeyBindings {
  [key: string]: KeyBinding;
}

export interface CursorBindings {
  left?: KeyBinding;
  right?: KeyBinding;
  up?: KeyBinding;
  down?: KeyBinding;
  space?: KeyBinding;
  shift?: KeyBinding;
}

export interface AggregatedBinding {
  keyMap: Record<string, string>;
  state: Record<string, any>;
  mode: 'continuous' | 'oneshot';
  targetId?: string;
}

export class InputManager {
  private runtime: GameRuntime;
  private scene: any; // Phaser.Scene
  private keyBindings = new Map<string, ActionBinding>();
  private cursorBindings?: CursorBindings;
  private cursors?: any; // Phaser.Types.Input.Keyboard.CursorKeys
  private pressedKeys = new Set<string>(); // Track one-shot keys
  private aggregatedBindings = new Map<string, AggregatedBinding>(); // NEW: Track aggregated state

  constructor(adapter: PhaserAdapter, scene: any) {
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
  bindKeys(bindings: KeyBindings): void {
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
  bindKeysAggregated(
    action: string,
    keyMap: Record<string, string>,
    options?: {
      initialState?: Record<string, any>;
      mode?: 'continuous' | 'oneshot';
      targetId?: string;
    }
  ): void {
    // Build initial state (default to false for each field)
    const state = options?.initialState ||
      Object.fromEntries(
        Object.keys(keyMap).map(field => [field, false])
      );

    this.aggregatedBindings.set(action, {
      keyMap,
      state,
      mode: options?.mode || 'continuous',
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
  bindCursors(cursors: any, bindings: CursorBindings): void {
    this.cursors = cursors;
    this.cursorBindings = bindings;
  }

  /**
   * Update input (call this in scene.update())
   */
  update(): void {
    // Debug: Check if keyboard is available
    if (!this.scene.input?.keyboard) {
      console.warn('[InputManager] No keyboard input available! Phaser keyboard may not be initialized.');
      return;
    }

    // Handle regular key bindings
    for (const [key, binding] of this.keyBindings.entries()) {
      const keyObj = this.scene.input.keyboard?.addKey(key, false);
      if (!keyObj) {
        console.warn(`[InputManager] Failed to create key object for: ${key}`);
        continue;
      }

      if (binding.mode === 'oneshot') {
        // One-shot: fire once when pressed
        if (keyObj.isDown && !this.pressedKeys.has(key)) {
          this.submitBinding(binding);
          this.pressedKeys.add(key);
        } else if (keyObj.isUp) {
          this.pressedKeys.delete(key);
        }
      } else {
        // Continuous: fire every frame while held
        if (keyObj.isDown) {
          this.submitBinding(binding);
        }
      }
    }

    // Handle cursor bindings
    if (this.cursors && this.cursorBindings) {
      const mappings: [any, KeyBinding | undefined][] = [
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

        if (normalized.mode === 'oneshot') {
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

    // Handle aggregated bindings (multi-key state tracking)
    for (const [action, binding] of this.aggregatedBindings.entries()) {
      let stateChanged = false;

      // Check each key in the map and update state
      for (const [field, keyCode] of Object.entries(binding.keyMap)) {
        // IMPORTANT: Convert user-friendly key names to Phaser's internal key codes
        // Phaser uses uppercase constants (e.g., 'LEFT' not 'ArrowLeft')
        // This mapping allows users to use standard DOM key names while Phaser expects its own format
        // See: https://photonstorm.github.io/phaser3-docs/Phaser.Input.Keyboard.KeyCodes.html
        let phaserKeyCode = keyCode;
        const keyCodeMap: Record<string, string> = {
          'ArrowLeft': 'LEFT',
          'ArrowRight': 'RIGHT',
          'ArrowUp': 'UP',
          'ArrowDown': 'DOWN',
          'Space': 'SPACE'
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

        // Update state if changed
        if (binding.state[field] !== pressed) {
          binding.state[field] = pressed;
          stateChanged = true;
        }
      }

      // Submit aggregated state
      if (binding.mode === 'continuous') {
        // Submit every frame (spread to avoid mutation)
        this.runtime.submitAction(
          action,
          { ...binding.state },
          binding.targetId
        );
      } else if (binding.mode === 'oneshot' && stateChanged) {
        // Submit only when state changes
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
  submitAction(action: string, input?: any, targetId?: string): void {
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
  useProfile(profileName: string, options?: ProfileOptions): void {
    const profile = getProfile(profileName);

    if (!profile) {
      console.warn(`[InputManager] Profile "${profileName}" not found. Available profiles:`, [
        'platformer', 'platformerWASD', 'topDown', 'topDownWASD', 'shooter', 'twinStick'
      ]);
      return;
    }

    const config = applyProfileOptions(profile, options);

    if (config.type === 'aggregated') {
      // Use aggregated binding for multi-key state tracking
      this.bindKeysAggregated(config.action, config.keys, {
        mode: config.mode
      });
    } else {
      // Use per-key binding for separate actions
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
  mergeProfiles(profileNames: string[]): void {
    const merged = mergeProfileBindings(profileNames);
    this.bindKeys(merged);
  }

  /**
   * Clear all bindings
   */
  clear(): void {
    this.keyBindings.clear();
    this.cursorBindings = undefined;
    this.cursors = undefined;
    this.pressedKeys.clear();
  }

  /**
   * Get runtime for advanced usage
   */
  getRuntime(): GameRuntime {
    return this.runtime;
  }

  // Private helpers

  private normalizeBinding(binding: KeyBinding): ActionBinding {
    if (typeof binding === 'string') {
      return { action: binding, mode: 'oneshot' };
    }
    return {
      ...binding,
      mode: binding.mode || 'oneshot'
    };
  }

  private submitBinding(binding: ActionBinding): void {
    this.runtime.submitAction(binding.action, binding.input, binding.targetId);
  }
}
