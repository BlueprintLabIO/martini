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

export class InputManager {
  private runtime: GameRuntime;
  private scene: any; // Phaser.Scene
  private keyBindings = new Map<string, ActionBinding>();
  private cursorBindings?: CursorBindings;
  private cursors?: any; // Phaser.Types.Input.Keyboard.CursorKeys
  private pressedKeys = new Set<string>(); // Track one-shot keys

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
    console.log('[InputManager] bindKeys called with:', bindings);
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
          console.log(`[InputManager] Key pressed (oneshot): ${key}`, binding);
          this.submitBinding(binding);
          this.pressedKeys.add(key);
        } else if (keyObj.isUp) {
          this.pressedKeys.delete(key);
        }
      } else {
        // Continuous: fire every frame while held
        if (keyObj.isDown) {
          console.log(`[InputManager] Key held (continuous): ${key}`, binding);
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
  submitAction(action: string, input?: any, targetId?: string): void {
    this.runtime.submitAction(action, input, targetId);
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
    console.log(`[InputManager] submitAction('${binding.action}', ${JSON.stringify(binding.input)}, ${binding.targetId || 'self'})`);
    this.runtime.submitAction(binding.action, binding.input, binding.targetId);
  }
}
