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
        const myPlayer = adapter.getMyPlayer(playersKey);
        if (roleText && config.roleText) {
            roleText.setText(config.roleText(myPlayer));
        }
        if (controlsText && config.controlHints) {
            controlsText.setText(config.controlHints(myPlayer));
        }
    };
    // Subscribe to player changes
    const unsubscribe = adapter.onMyPlayerChange((myPlayer) => {
        if (roleText && config.roleText) {
            roleText.setText(config.roleText(myPlayer));
        }
        if (controlsText && config.controlHints) {
            controlsText.setText(config.controlHints(myPlayer));
        }
    }, playersKey);
    // Ensure HUD shows correct values immediately
    update();
    // Return HUD interface
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
//# sourceMappingURL=HUDHelper.js.map