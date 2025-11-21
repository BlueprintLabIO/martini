/**
 * Input Profiles - Pre-defined control schemes
 *
 * Eliminates manual key binding boilerplate by providing standard control patterns.
 */
/**
 * Built-in input profiles
 */
export const BUILT_IN_PROFILES = {
    platformer: {
        name: 'platformer',
        description: 'Side-scrolling platformer controls (Arrow keys + Space for jump)',
        config: {
            type: 'aggregated',
            action: 'move',
            keys: {
                left: 'ArrowLeft',
                right: 'ArrowRight',
                up: 'Space'
            },
            mode: 'continuous'
        }
    },
    platformerWASD: {
        name: 'platformerWASD',
        description: 'Platformer controls with WASD',
        config: {
            type: 'aggregated',
            action: 'move',
            keys: {
                left: 'A',
                right: 'D',
                up: 'W'
            },
            mode: 'continuous'
        }
    },
    topDown: {
        name: 'topDown',
        description: '4-directional movement (Arrow keys)',
        config: {
            type: 'aggregated',
            action: 'move',
            keys: {
                left: 'ArrowLeft',
                right: 'ArrowRight',
                up: 'ArrowUp',
                down: 'ArrowDown'
            },
            mode: 'continuous'
        }
    },
    topDownWASD: {
        name: 'topDownWASD',
        description: '4-directional movement (WASD)',
        config: {
            type: 'aggregated',
            action: 'move',
            keys: {
                left: 'A',
                right: 'D',
                up: 'W',
                down: 'S'
            },
            mode: 'continuous'
        }
    },
    shooter: {
        name: 'shooter',
        description: 'Top-down shooter (WASD for move, Space for shoot)',
        config: {
            type: 'per-key',
            bindings: {
                'W': { action: 'move', input: { y: -1 }, mode: 'continuous' },
                'A': { action: 'move', input: { x: -1 }, mode: 'continuous' },
                'S': { action: 'move', input: { y: 1 }, mode: 'continuous' },
                'D': { action: 'move', input: { x: 1 }, mode: 'continuous' },
                'Space': { action: 'shoot', mode: 'oneshot' },
            }
        }
    },
    twinStick: {
        name: 'twinStick',
        description: 'Twin-stick shooter (WASD for move, Arrow keys for aim)',
        config: {
            type: 'per-key',
            bindings: {
                'W': { action: 'move', input: { y: -1 }, mode: 'continuous' },
                'A': { action: 'move', input: { x: -1 }, mode: 'continuous' },
                'S': { action: 'move', input: { y: 1 }, mode: 'continuous' },
                'D': { action: 'move', input: { x: 1 }, mode: 'continuous' },
                'ArrowLeft': { action: 'aim', input: { x: -1 }, mode: 'continuous' },
                'ArrowRight': { action: 'aim', input: { x: 1 }, mode: 'continuous' },
                'ArrowUp': { action: 'aim', input: { y: -1 }, mode: 'continuous' },
                'ArrowDown': { action: 'aim', input: { y: 1 }, mode: 'continuous' },
            }
        }
    }
};
/**
 * Custom profile registry
 */
const customProfiles = new Map();
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
export function registerProfile(name, profile) {
    customProfiles.set(name, profile);
}
/**
 * Get a profile by name (checks custom profiles first, then built-in)
 *
 * @param name - Profile name
 * @returns Profile or undefined if not found
 */
export function getProfile(name) {
    return customProfiles.get(name) || BUILT_IN_PROFILES[name];
}
/**
 * Apply profile options to a profile config
 *
 * @param profile - Original profile
 * @param options - Profile options
 * @returns Modified profile config
 */
export function applyProfileOptions(profile, options) {
    if (!options)
        return profile.config;
    const config = profile.config;
    // For aggregated profiles
    if (config.type === 'aggregated') {
        let keys = { ...config.keys };
        // Apply player number (swap arrow keys for WASD)
        if (options.player === 2) {
            const keyMap = {
                'ArrowLeft': 'A',
                'ArrowRight': 'D',
                'ArrowUp': 'W',
                'ArrowDown': 'S',
                'Space': 'Space', // Keep Space unchanged
            };
            const newKeys = {};
            for (const [field, key] of Object.entries(keys)) {
                newKeys[field] = keyMap[key] || key;
            }
            keys = newKeys;
        }
        return {
            type: 'aggregated',
            action: options.action || config.action,
            keys,
            mode: config.mode
        };
    }
    // For per-key profiles
    let bindings = { ...config.bindings };
    // Apply player number (swap arrow keys for WASD)
    if (options.player === 2) {
        const keyMap = {
            'ArrowLeft': 'A',
            'ArrowRight': 'D',
            'ArrowUp': 'W',
            'ArrowDown': 'S',
        };
        const newBindings = {};
        for (const [key, binding] of Object.entries(bindings)) {
            const newKey = keyMap[key] || key;
            newBindings[newKey] = binding;
        }
        bindings = newBindings;
    }
    // Apply action override
    if (options.action) {
        for (const key of Object.keys(bindings)) {
            const binding = bindings[key];
            if (typeof binding === 'object') {
                bindings[key] = { ...binding, action: options.action };
            }
        }
    }
    // Apply key overrides
    if (options.overrides) {
        for (const [key, binding] of Object.entries(options.overrides)) {
            if (binding !== undefined) {
                bindings[key] = binding;
            }
        }
    }
    return {
        type: 'per-key',
        bindings
    };
}
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
export function mergeProfiles(profileNames) {
    const merged = {};
    for (const name of profileNames) {
        const profile = getProfile(name);
        if (profile && profile.config.type === 'per-key') {
            Object.assign(merged, profile.config.bindings);
        }
    }
    return merged;
}
/**
 * List all available profiles
 *
 * @returns Array of profile names
 */
export function listProfiles() {
    return [
        ...Object.keys(BUILT_IN_PROFILES),
        ...Array.from(customProfiles.keys())
    ];
}
//# sourceMappingURL=InputProfiles.js.map