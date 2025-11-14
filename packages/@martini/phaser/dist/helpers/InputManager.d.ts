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
export type KeyBinding = ActionBinding | string;
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
export declare class InputManager {
    private runtime;
    private scene;
    private keyBindings;
    private cursorBindings?;
    private cursors?;
    private pressedKeys;
    constructor(adapter: PhaserAdapter, scene: any);
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
    bindKeys(bindings: KeyBindings): void;
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
    bindCursors(cursors: any, bindings: CursorBindings): void;
    /**
     * Update input (call this in scene.update())
     */
    update(): void;
    /**
     * Manually submit an action (useful for pointer/touch input)
     */
    submitAction(action: string, input?: any, targetId?: string): void;
    /**
     * Clear all bindings
     */
    clear(): void;
    /**
     * Get runtime for advanced usage
     */
    getRuntime(): GameRuntime;
    private normalizeBinding;
    private submitBinding;
}
//# sourceMappingURL=InputManager.d.ts.map