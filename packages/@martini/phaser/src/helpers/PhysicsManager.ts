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

import type { GameRuntime } from '@martini/core';
import type { SpriteManager } from './SpriteManager.js';

export interface PlatformerBehaviorConfig {
  speed?: number;
  jumpPower?: number;
  keys?: {
    left?: string;
    right?: string;
    jump?: string;
  };
}

export interface TopDownBehaviorConfig {
  speed?: number;
  keys?: {
    left?: string;
    right?: string;
    up?: string;
    down?: string;
  };
}

export interface CustomBehaviorConfig {
  apply: (sprite: any, input: any, body: Phaser.Physics.Arcade.Body) => void;
}

export type BehaviorConfig = PlatformerBehaviorConfig | TopDownBehaviorConfig | CustomBehaviorConfig;

export interface PhysicsManagerConfig {
  /** SpriteManager to get sprites from */
  spriteManager: SpriteManager;

  /** Key in state to read inputs from (e.g., 'inputs') */
  inputKey?: string;

  /** Key prefix for sprite keys (defaults to 'player-') */
  spriteKeyPrefix?: string;
}

export class PhysicsManager {
  private runtime: GameRuntime;
  private spriteManager: SpriteManager;
  private inputKey: string;
  private spriteKeyPrefix: string;
  private behaviorType: 'platformer' | 'topDown' | 'custom' | null = null;
  private behaviorConfig: BehaviorConfig | null = null;

  constructor(runtime: GameRuntime, config: PhysicsManagerConfig) {
    this.runtime = runtime;
    this.spriteManager = config.spriteManager;
    this.inputKey = config.inputKey || 'inputs';
    this.spriteKeyPrefix = config.spriteKeyPrefix || 'player-';
  }

  /**
   * Add a physics behavior
   *
   * @param type - Behavior type ('platformer', 'topDown', 'custom')
   * @param config - Behavior configuration
   */
  addBehavior(
    type: 'platformer',
    config?: PlatformerBehaviorConfig
  ): void;
  addBehavior(
    type: 'topDown',
    config?: TopDownBehaviorConfig
  ): void;
  addBehavior(
    type: 'custom',
    config: CustomBehaviorConfig
  ): void;
  addBehavior(
    type: 'platformer' | 'topDown' | 'custom',
    config?: BehaviorConfig
  ): void {
    this.behaviorType = type;
    this.behaviorConfig = config || {};
  }

  /**
   * Update physics for all sprites (call in scene.update())
   * Only runs on host.
   */
  update(): void {
    // Only host applies physics
    const transport = this.runtime.getTransport();
    if (!transport.isHost()) return;

    const state = this.runtime.getState() as any;
    const inputs = state[this.inputKey];
    if (!inputs) return;

    // Apply physics to each player based on their input
    for (const [playerId, playerInput] of Object.entries(inputs)) {
      const sprite = this.spriteManager.get(`${this.spriteKeyPrefix}${playerId}`);
      if (!sprite || !sprite.body) continue;

      const body = sprite.body as Phaser.Physics.Arcade.Body;

      if (this.behaviorType === 'platformer') {
        this.applyPlatformerBehavior(body, playerInput as any, this.behaviorConfig as PlatformerBehaviorConfig);
      } else if (this.behaviorType === 'topDown') {
        this.applyTopDownBehavior(body, playerInput as any, this.behaviorConfig as TopDownBehaviorConfig);
      } else if (this.behaviorType === 'custom' && this.behaviorConfig) {
        const customConfig = this.behaviorConfig as CustomBehaviorConfig;
        customConfig.apply(sprite, playerInput, body);
      }
    }
  }

  private applyPlatformerBehavior(
    body: Phaser.Physics.Arcade.Body,
    input: any,
    config: PlatformerBehaviorConfig
  ): void {
    const speed = config.speed || 200;
    const jumpPower = config.jumpPower || 350;
    const keys = config.keys || { left: 'left', right: 'right', jump: 'up' };

    // Horizontal movement
    if (input[keys.left!]) {
      body.setVelocityX(-speed);
    } else if (input[keys.right!]) {
      body.setVelocityX(speed);
    } else {
      body.setVelocityX(0);
    }

    // Jumping (only if on ground)
    if (input[keys.jump!] && body.touching.down) {
      body.setVelocityY(-jumpPower);
    }
  }

  private applyTopDownBehavior(
    body: Phaser.Physics.Arcade.Body,
    input: any,
    config: TopDownBehaviorConfig
  ): void {
    const speed = config.speed || 200;
    const keys = config.keys || { left: 'left', right: 'right', up: 'up', down: 'down' };

    let vx = 0;
    let vy = 0;

    if (input[keys.left!]) vx = -speed;
    if (input[keys.right!]) vx = speed;
    if (input[keys.up!]) vy = -speed;
    if (input[keys.down!]) vy = speed;

    body.setVelocity(vx, vy);
  }
}
