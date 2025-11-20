/**
 * HUD Helper - Unified player HUD/UI for multiplayer games
 *
 * Eliminates the manual HUD boilerplate by automatically creating and managing
 * title, role, and control hint text based on the current player state.
 *
 * @example
 * ```ts
 * import { createPlayerHUD } from '@martini/phaser';
 *
 * // In scene.create()
 * this.hud = createPlayerHUD(this.adapter, this, {
 *   title: 'Fire & Ice - Cooperative Platformer',
 *
 *   roleText: (myPlayer) => {
 *     if (!myPlayer) return 'Spectator';
 *     return myPlayer.role === 'fire' ? 'Fire Player' : 'Ice Player';
 *   },
 *
 *   controlHints: (myPlayer) => {
 *     if (!myPlayer) return '';
 *     return 'Arrow Keys + SPACE to Jump';
 *   }
 * });
 * ```
 */
/**
 * Create a player HUD with automatic role/control updates
 *
 * @param adapter - PhaserAdapter instance
 * @param scene - Phaser scene
 * @param config - HUD configuration
 * @returns PlayerHUD instance
 */
export function createPlayerHUD(adapter, scene, config) {
    const playersKey = config.playersKey || 'players';
    // Default layout
    const layout = {
        title: config.layout?.title || { x: 400, y: 20 },
        role: config.layout?.role || { x: 400, y: 50 },
        controls: config.layout?.controls || { x: 400, y: 75 }
    };
    // Default styles
    const titleStyle = {
        fontSize: config.titleStyle?.fontSize || '24px',
        color: config.titleStyle?.color || '#000',
        fontStyle: config.titleStyle?.fontStyle || 'bold',
        backgroundColor: config.titleStyle?.backgroundColor,
        padding: config.titleStyle?.padding
    };
    const roleStyle = {
        fontSize: config.roleStyle?.fontSize || '16px',
        color: config.roleStyle?.color || '#000',
        fontStyle: config.roleStyle?.fontStyle,
        backgroundColor: config.roleStyle?.backgroundColor,
        padding: config.roleStyle?.padding
    };
    const controlsStyle = {
        fontSize: config.controlsStyle?.fontSize || '14px',
        color: config.controlsStyle?.color || '#333',
        fontStyle: config.controlsStyle?.fontStyle,
        backgroundColor: config.controlsStyle?.backgroundColor,
        padding: config.controlsStyle?.padding
    };
    // Create text objects
    let titleText = null;
    let roleText = null;
    let controlsText = null;
    // Create title (static)
    if (config.title) {
        titleText = scene.add.text(layout.title.x, layout.title.y, config.title, titleStyle);
        titleText.setOrigin(0.5);
    }
    // Create role text (dynamic)
    if (config.roleText) {
        roleText = scene.add.text(layout.role.x, layout.role.y, 'Loading...', roleStyle);
        roleText.setOrigin(0.5);
    }
    // Create controls text (dynamic)
    if (config.controlHints) {
        controlsText = scene.add.text(layout.controls.x, layout.controls.y, '', controlsStyle);
        controlsText.setOrigin(0.5);
    }
    // Update function
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
    // Subscribe to state changes to reactively update HUD
    // Uses onChange instead of watchMyPlayer to get full state access
    const unsubscribers = [];
    // Track last values to avoid unnecessary updates
    let lastRoleText;
    let lastControlsText;
    // Watch roleText changes (reactive to both player and state changes)
    if (roleText && config.roleText) {
        const unsubscribe = adapter.onChange((state) => {
            const players = state?.[playersKey];
            const myPlayer = players ? players[adapter.getMyPlayerId()] : undefined;
            const text = config.roleText(myPlayer, state);
            // Only update if text changed
            if (text !== lastRoleText) {
                lastRoleText = text;
                roleText.setText(text);
            }
        });
        unsubscribers.push(unsubscribe);
        // Initial update
        const initialState = adapter.getState();
        const initialPlayer = adapter.getMyPlayer(playersKey);
        lastRoleText = config.roleText(initialPlayer, initialState);
        roleText.setText(lastRoleText);
    }
    // Watch controlHints changes (reactive to both player and state changes)
    if (controlsText && config.controlHints) {
        const unsubscribe = adapter.onChange((state) => {
            const players = state?.[playersKey];
            const myPlayer = players ? players[adapter.getMyPlayerId()] : undefined;
            const text = config.controlHints(myPlayer, state);
            // Only update if text changed
            if (text !== lastControlsText) {
                lastControlsText = text;
                controlsText.setText(text);
            }
        });
        unsubscribers.push(unsubscribe);
        // Initial update
        const initialState = adapter.getState();
        const initialPlayer = adapter.getMyPlayer(playersKey);
        lastControlsText = config.controlHints(initialPlayer, initialState);
        controlsText.setText(lastControlsText);
    }
    // Return HUD interface
    return {
        update,
        destroy: () => {
            // Unsubscribe from all watchers
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
//# sourceMappingURL=HUDHelper.js.map