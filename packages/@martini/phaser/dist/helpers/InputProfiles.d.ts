/**
 * Input Profiles - Pre-defined control schemes
 *
 * Eliminates manual key binding boilerplate by providing standard control patterns.
 */
import type { KeyBindings } from './InputManager.js';
export interface AggregatedProfileConfig {
    /** Profile type */
    type: 'aggregated';
    /** Action name to submit */
    action: string;
    /** Map of field names to key codes */
    keys: Record<string, string>;
    /** Continuous or oneshot mode */
    mode?: 'continuous' | 'oneshot';
}
export interface PerKeyProfileConfig {
    /** Profile type */
    type: 'per-key';
    /** Key bindings for this profile */
    bindings: KeyBindings;
}
export interface InputProfile {
    /** Profile name */
    name: string;
    /** Profile configuration (aggregated or per-key) */
    config: AggregatedProfileConfig | PerKeyProfileConfig;
    /** Description of the control scheme */
    description?: string;
}
export interface ProfileOptions {
    /** Override specific keys */
    overrides?: Partial<KeyBindings>;
    /** Player number (1-based). Changes arrow keys to WASD for player 2 */
    player?: 1 | 2;
    /** Override action names */
    action?: string;
}
/**
 * Built-in input profiles
 */
export declare const BUILT_IN_PROFILES: Record<string, InputProfile>;
/**
 * Register a custom input profile
 *
 * @param name - Profile name
 * @param profile - Profile configuration
 *
 * @example
 * ```ts
 * registerProfile('custom-platformer', {
 *   name: 'custom-platformer',
 *   bindings: {
 *     'A': { action: 'move', input: { left: true }, mode: 'continuous' },
 *     'D': { action: 'move', input: { right: true }, mode: 'continuous' },
 *     'W': { action: 'jump', mode: 'oneshot' },
 *   }
 * });
 * ```
 */
export declare function registerProfile(name: string, profile: InputProfile): void;
/**
 * Get a profile by name (checks custom profiles first, then built-in)
 *
 * @param name - Profile name
 * @returns Profile or undefined if not found
 */
export declare function getProfile(name: string): InputProfile | undefined;
/**
 * Apply profile options to a profile config
 *
 * @param profile - Original profile
 * @param options - Profile options
 * @returns Modified profile config
 */
export declare function applyProfileOptions(profile: InputProfile, options?: ProfileOptions): AggregatedProfileConfig | PerKeyProfileConfig;
/**
 * Merge multiple profiles into one
 *
 * @param profileNames - Array of profile names to merge
 * @returns Merged bindings (only works with per-key profiles)
 *
 * @example
 * ```ts
 * const bindings = mergeProfiles(['shooter', 'twinStick']);
 * // Combines multiple per-key profiles
 * ```
 */
export declare function mergeProfiles(profileNames: string[]): KeyBindings;
/**
 * List all available profiles
 *
 * @returns Array of profile names
 */
export declare function listProfiles(): string[];
//# sourceMappingURL=InputProfiles.d.ts.map