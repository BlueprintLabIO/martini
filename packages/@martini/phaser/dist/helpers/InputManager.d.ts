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
import { type ProfileOptions } from './InputProfiles.js';
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
export interface AggregatedBinding {
    keyMap: Record<string, string>;
    state: Record<string, any>;
    mode: 'continuous' | 'oneshot';
    targetId?: string;
}
export declare class InputManager {
    private runtime;
    private scene;
    private keyBindings;
    private cursorBindings?;
    private cursors?;
    private pressedKeys;
    private aggregatedBindings;
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
    bindKeysAggregated(action: string, keyMap: Record<string, string>, options?: {
        initialState?: Record<string, any>;
        mode?: 'continuous' | 'oneshot';
        targetId?: string;
    }): void;
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
    useProfile(profileName: string, options?: ProfileOptions): void;
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
    mergeProfiles(profileNames: string[]): void;
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
    bindEdgeTrigger(key: string, action: string, input?: any): void;
    /**
     * Bind multiple edge-triggered actions at once
     */
    bindEdgeTriggers(bindings: Record<string, string | {
        action: string;
        input?: any;
    }>): void;
    /**
     * Clear all bindings
     */
    clear(): void;
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
    bridgeToActions(config: Record<string, 'continuous' | 'edge' | {
        type: 'continuous' | 'edge';
        key?: string;
        keys?: Record<string, string>;
    }>): void;
    /**
     * Get runtime for advanced usage
     */
    getRuntime(): GameRuntime;
    private normalizeBinding;
    private submitBinding;
}
//# sourceMappingURL=InputManager.d.ts.map