/**
 * CameraFollower - Automatic camera following for local player
 *
 * Eliminates manual camera positioning code and fixes initialization timing bugs.
 * Automatically waits for player state to be ready, then follows smoothly.
 *
 * ## How it works:
 *
 * - **Initialization:** Uses `waitForMetadata` to wait for player position, then sets initial camera position
 * - **Updates:** Automatically updates camera position every frame based on follow mode
 * - **Modes:**
 *   - `instant`: Camera snaps directly to target (no smoothing)
 *   - `lerp`: Camera smoothly interpolates to target (configurable smoothness)
 *   - `deadzone`: Camera only moves when target leaves deadzone rectangle
 *
 * ## Why this helper exists:
 *
 * Without this helper, games manually set camera position in `update()`, which causes:
 * 1. **Timing bug:** Camera not positioned in `create()`, causing off-screen sprites on navigation
 * 2. **Boilerplate:** Same camera code repeated in every game
 * 3. **Edge cases:** Forgetting to check if player exists, handle player removal, etc.
 *
 * This helper solves all of these automatically.
 *
 * @example
 * ```ts
 * import { createCameraFollower } from '@martini-kit/phaser';
 *
 * // In scene.create() - simplest usage
 * this.cameraFollower = this.adapter.createCameraFollower({
 *   target: 'myPlayer' // Auto-follows local player
 * });
 *
 * // With smooth lerp following
 * this.cameraFollower = this.adapter.createCameraFollower({
 *   target: 'myPlayer',
 *   mode: 'lerp',
 *   lerpFactor: 0.1 // Lower = smoother, higher = snappier
 * });
 *
 * // With deadzone (camera only moves when player leaves center area)
 * this.cameraFollower = this.adapter.createCameraFollower({
 *   target: 'myPlayer',
 *   mode: 'deadzone',
 *   deadzone: { width: 200, height: 150 }
 * });
 *
 * // Follow specific player by ID
 * this.cameraFollower = this.adapter.createCameraFollower({
 *   target: { stateKey: 'players', playerId: 'player-123' }
 * });
 *
 * // Set world bounds
 * this.cameraFollower = this.adapter.createCameraFollower({
 *   target: 'myPlayer',
 *   bounds: { width: 1600, height: 1200 }
 * });
 *
 * // In scene.update() - camera automatically updates, no manual code needed!
 * // But you can manually update if needed:
 * // this.cameraFollower.update();
 *
 * // In scene shutdown/destroy:
 * this.cameraFollower.destroy();
 * ```
 */
/**
 * Create a camera follower that automatically tracks a player
 *
 * @param adapter - PhaserAdapter instance
 * @param scene - Phaser scene
 * @param config - Camera follower configuration
 * @returns CameraFollower instance
 */
export function createCameraFollower(adapter, scene, config = {}) {
    const { target = 'myPlayer', mode = 'instant', lerpFactor = 0.1, offset = { x: 0, y: 0 }, bounds, deadzone = { width: 200, height: 150 }, centerOnTarget = true, } = config;
    // Resolve target player ID
    let targetPlayerId;
    let stateKey;
    if (target === 'myPlayer') {
        targetPlayerId = adapter.getMyPlayerId();
        stateKey = 'players';
    }
    else {
        targetPlayerId = target.playerId || adapter.getMyPlayerId();
        stateKey = target.stateKey || 'players';
    }
    const camera = scene.cameras.main;
    let unsubscribe = null;
    let initialized = false;
    let destroyed = false;
    // Set world bounds if specified
    if (bounds) {
        camera.setBounds(0, 0, bounds.width, bounds.height);
    }
    // Initialize camera position when player is ready
    const initializeCamera = () => {
        const state = adapter['runtime'].getState();
        const players = state?.[stateKey];
        const player = players?.[targetPlayerId];
        if (player && typeof player.x === 'number' && typeof player.y === 'number') {
            // Set initial camera position immediately to prevent off-screen rendering
            setCameraPosition(player.x, player.y, true);
            initialized = true;
        }
    };
    // Wait for player to exist, then initialize camera
    unsubscribe = adapter.waitForMetadata(stateKey, targetPlayerId, ['x', 'y'], (playerData) => {
        if (!initialized && !destroyed) {
            setCameraPosition(playerData.x, playerData.y, true);
            initialized = true;
        }
    });
    // Also try to initialize immediately in case player already exists
    initializeCamera();
    /**
     * Set camera position based on target coordinates
     */
    function setCameraPosition(targetX, targetY, instant = false) {
        if (destroyed)
            return;
        const viewportWidth = camera.width;
        const viewportHeight = camera.height;
        // Calculate desired camera position
        let desiredScrollX;
        let desiredScrollY;
        if (centerOnTarget) {
            // Center camera on target
            desiredScrollX = targetX - viewportWidth / 2 + offset.x;
            desiredScrollY = targetY - viewportHeight / 2 + offset.y;
        }
        else {
            // Use target position directly
            desiredScrollX = targetX + offset.x;
            desiredScrollY = targetY + offset.y;
        }
        // Apply follow mode
        if (instant || mode === 'instant') {
            camera.scrollX = desiredScrollX;
            camera.scrollY = desiredScrollY;
        }
        else if (mode === 'lerp') {
            camera.scrollX += (desiredScrollX - camera.scrollX) * lerpFactor;
            camera.scrollY += (desiredScrollY - camera.scrollY) * lerpFactor;
        }
        else if (mode === 'deadzone') {
            // Calculate target position in screen space
            const targetScreenX = targetX - camera.scrollX;
            const targetScreenY = targetY - camera.scrollY;
            const deadzoneLeft = (viewportWidth - deadzone.width) / 2;
            const deadzoneRight = deadzoneLeft + deadzone.width;
            const deadzoneTop = (viewportHeight - deadzone.height) / 2;
            const deadzoneBottom = deadzoneTop + deadzone.height;
            // Only move camera if target is outside deadzone
            if (targetScreenX < deadzoneLeft) {
                camera.scrollX += targetScreenX - deadzoneLeft;
            }
            else if (targetScreenX > deadzoneRight) {
                camera.scrollX += targetScreenX - deadzoneRight;
            }
            if (targetScreenY < deadzoneTop) {
                camera.scrollY += targetScreenY - deadzoneTop;
            }
            else if (targetScreenY > deadzoneBottom) {
                camera.scrollY += targetScreenY - deadzoneBottom;
            }
        }
    }
    /**
     * Update camera position based on current player position
     */
    function update() {
        if (destroyed || !initialized)
            return;
        const state = adapter['runtime'].getState();
        const players = state?.[stateKey];
        const player = players?.[targetPlayerId];
        if (player && typeof player.x === 'number' && typeof player.y === 'number') {
            setCameraPosition(player.x, player.y);
        }
    }
    /**
     * Auto-update camera every frame
     */
    const updateEvent = scene.events.on('update', update);
    /**
     * Clean up resources
     */
    function destroy() {
        if (destroyed)
            return;
        destroyed = true;
        scene.events.off('update', update);
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    }
    /**
     * Change the target being followed
     */
    function setTarget(newPlayerId) {
        targetPlayerId = newPlayerId;
        initialized = false;
        // Clean up old subscription
        if (unsubscribe) {
            unsubscribe();
        }
        // Wait for new player and reinitialize
        unsubscribe = adapter.waitForMetadata(stateKey, targetPlayerId, ['x', 'y'], (playerData) => {
            if (!initialized && !destroyed) {
                setCameraPosition(playerData.x, playerData.y, true);
                initialized = true;
            }
        });
    }
    /**
     * Get current target player ID
     */
    function getTarget() {
        return targetPlayerId;
    }
    return {
        update,
        destroy,
        setTarget,
        getTarget,
    };
}
//# sourceMappingURL=CameraFollower.js.map