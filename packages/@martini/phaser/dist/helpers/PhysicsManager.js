/**
 * PhysicsManager - Automates physics behavior based on inputs
 *
 * Eliminates manual physics loops by automatically reading inputs from state
 * and applying pre-defined or custom physics behaviors.
 *
 * @example
 * ```ts
 * // In scene.create()
 * this.physicsManager = this.adapter.createPhysicsManager({
 *   spriteManager: this.spriteManager,
 *   inputKey: 'inputs'
 * });
 *
 * this.physicsManager.addBehavior('platformer', {
 *   speed: 200,
 *   jumpPower: 350
 * });
 *
 * // In scene.update()
 * this.physicsManager.update();
 * ```
 */
export class PhysicsManager {
    runtime;
    spriteManager;
    inputKey;
    spriteKeyPrefix;
    behaviorType = null;
    behaviorConfig = null;
    constructor(runtime, config) {
        this.runtime = runtime;
        this.spriteManager = config.spriteManager;
        this.inputKey = config.inputKey || 'inputs';
        this.spriteKeyPrefix = config.spriteKeyPrefix || 'player-';
    }
    addBehavior(type, config) {
        this.behaviorType = type;
        this.behaviorConfig = config || {};
    }
    /**
     * Update physics for all sprites (call in scene.update())
     * Only runs on host.
     */
    update() {
        // Only host applies physics
        const transport = this.runtime.getTransport();
        if (!transport.isHost())
            return;
        const state = this.runtime.getState();
        const inputs = state[this.inputKey];
        if (!inputs)
            return;
        // Apply physics to each player based on their input
        for (const [playerId, playerInput] of Object.entries(inputs)) {
            const sprite = this.spriteManager.get(`${this.spriteKeyPrefix}${playerId}`);
            if (!sprite || !sprite.body)
                continue;
            const body = sprite.body;
            if (this.behaviorType === 'platformer') {
                this.applyPlatformerBehavior(body, playerInput, this.behaviorConfig);
            }
            else if (this.behaviorType === 'topDown') {
                this.applyTopDownBehavior(body, playerInput, this.behaviorConfig);
            }
            else if (this.behaviorType === 'custom' && this.behaviorConfig) {
                const customConfig = this.behaviorConfig;
                customConfig.apply(sprite, playerInput, body);
            }
        }
    }
    applyPlatformerBehavior(body, input, config) {
        const speed = config.speed || 200;
        const jumpPower = config.jumpPower || 350;
        const keys = config.keys || { left: 'left', right: 'right', jump: 'up' };
        // Horizontal movement
        if (input[keys.left]) {
            body.setVelocityX(-speed);
        }
        else if (input[keys.right]) {
            body.setVelocityX(speed);
        }
        else {
            body.setVelocityX(0);
        }
        // Jumping (only if on ground)
        if (input[keys.jump] && body.touching.down) {
            body.setVelocityY(-jumpPower);
        }
    }
    applyTopDownBehavior(body, input, config) {
        const speed = config.speed || 200;
        const keys = config.keys || { left: 'left', right: 'right', up: 'up', down: 'down' };
        let vx = 0;
        let vy = 0;
        if (input[keys.left])
            vx = -speed;
        if (input[keys.right])
            vx = speed;
        if (input[keys.up])
            vy = -speed;
        if (input[keys.down])
            vy = speed;
        body.setVelocity(vx, vy);
    }
}
//# sourceMappingURL=PhysicsManager.js.map