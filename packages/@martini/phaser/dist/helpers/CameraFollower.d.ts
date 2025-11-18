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
 * import { createCameraFollower } from '@martini/phaser';
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
import type { PhaserAdapter } from '../PhaserAdapter.js';
import type Phaser from 'phaser';
export interface CameraFollowerTarget {
    /**
     * State key where the player/entity lives (default: 'players')
     */
    stateKey?: string;
    /**
     * Player ID to follow (if not specified, follows local player)
     */
    playerId?: string;
}
export interface CameraFollowerConfig {
    /**
     * Target to follow
     * - 'myPlayer': Follow local player (default)
     * - { stateKey: 'players', playerId: 'id' }: Follow specific player
     */
    target?: 'myPlayer' | CameraFollowerTarget;
    /**
     * Follow mode
     * - 'instant': Camera snaps directly to target (default)
     * - 'lerp': Camera smoothly interpolates to target
     * - 'deadzone': Camera only moves when target leaves deadzone
     */
    mode?: 'instant' | 'lerp' | 'deadzone';
    /**
     * Lerp factor for smooth following (0-1)
     * Lower = smoother but laggier
     * Higher = snappier but jerkier
     * Default: 0.1
     * Only used when mode = 'lerp'
     */
    lerpFactor?: number;
    /**
     * Camera offset from target center
     * Default: { x: 0, y: 0 }
     */
    offset?: {
        x: number;
        y: number;
    };
    /**
     * World bounds for camera
     * If specified, sets camera bounds to prevent showing outside world
     */
    bounds?: {
        width: number;
        height: number;
    };
    /**
     * Deadzone dimensions (only used when mode = 'deadzone')
     * Camera only moves when target leaves this rectangle
     * Default: { width: 200, height: 150 }
     */
    deadzone?: {
        width: number;
        height: number;
    };
    /**
     * Whether to center camera on target
     * If true, camera centers on target position
     * If false, target position is used as-is
     * Default: true
     */
    centerOnTarget?: boolean;
}
export interface CameraFollower {
    /**
     * Manually update camera position (automatically called each frame)
     */
    update: () => void;
    /**
     * Clean up and stop following
     */
    destroy: () => void;
    /**
     * Change the target being followed
     */
    setTarget: (playerId: string) => void;
    /**
     * Get current target player ID
     */
    getTarget: () => string | null;
}
/**
 * Create a camera follower that automatically tracks a player
 *
 * @param adapter - PhaserAdapter instance
 * @param scene - Phaser scene
 * @param config - Camera follower configuration
 * @returns CameraFollower instance
 */
export declare function createCameraFollower(adapter: PhaserAdapter, scene: Phaser.Scene, config?: CameraFollowerConfig): CameraFollower;
//# sourceMappingURL=CameraFollower.d.ts.map