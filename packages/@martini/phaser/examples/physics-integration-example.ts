/**
 * Example: Using StateDrivenSpawner with Automatic Physics Integration
 *
 * This example demonstrates how to use the new `physics` config option
 * to automatically update entity positions from velocity in state.
 *
 * **BEFORE (Manual physics updates - 30+ lines):**
 * ```ts
 * // In scene.update():
 * const deltaSeconds = delta / 1000;
 * for (let i = state.bullets.length - 1; i >= 0; i--) {
 *   const bullet = state.bullets[i];
 *   bullet.x += bullet.velocityX * deltaSeconds; // Manual update
 *   bullet.y += bullet.velocityY * deltaSeconds; // Manual update
 *
 *   // Collision detection, lifetime management, etc.
 * }
 * ```
 *
 * **AFTER (Automatic physics - 5 lines):**
 * ```ts
 * // In scene.create():
 * const bulletSpawner = adapter.createStateDrivenSpawner({
 *   stateKey: 'bullets',
 *   spriteManager: bulletManager,
 *   keyField: 'id',
 *   physics: {
 *     velocityFromState: { x: 'velocityX', y: 'velocityY' }
 *   }
 * });
 *
 * // In scene.update():
 * bulletSpawner.update(delta); // Automatically updates positions!
 * ```
 */

import Phaser from 'phaser';
import { defineGame, GameRuntime } from '@martini/core';
import { PhaserAdapter } from '../PhaserAdapter.js';
import type { LocalTransport } from '@martini/transport-local';

// Define a simple shooting game
const shootingGame = defineGame({
  setup: ({ playerIds }) => ({
    bullets: [] as Array<{
      id: number;
      x: number;
      y: number;
      velocityX: number;
      velocityY: number;
      lifetime: number;
    }>,
    nextBulletId: 0,
  }),

  actions: {
    shoot: {
      apply: (state, context, input: { x: number; y: number; angle: number }) => {
        const BULLET_SPEED = 300;
        state.bullets.push({
          id: state.nextBulletId++,
          x: input.x,
          y: input.y,
          velocityX: Math.cos(input.angle) * BULLET_SPEED,
          velocityY: Math.sin(input.angle) * BULLET_SPEED,
          lifetime: 3000, // 3 seconds
        });
      },
    },
  },
});

// Example scene using automatic physics integration
export class PhysicsIntegrationScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private runtime!: GameRuntime;
  private bulletSpawner: any;

  constructor(runtime: GameRuntime) {
    super({ key: 'PhysicsIntegrationScene' });
    this.runtime = runtime;
  }

  create() {
    this.adapter = new PhaserAdapter(this.runtime, this);

    // Create bullet sprite manager
    const bulletManager = this.adapter.createSpriteManager({
      onCreate: (key: string, data: any) => {
        return this.add.circle(data.x, data.y, 4, 0xffff00);
      },
    });

    // ✨ NEW: Create spawner with automatic physics integration
    this.bulletSpawner = this.adapter.createStateDrivenSpawner({
      stateKey: 'bullets',
      spriteManager: bulletManager,
      keyField: 'id',

      // 🎯 This is the new feature!
      physics: {
        velocityFromState: { x: 'velocityX', y: 'velocityY' }
      },

      // Optional: Filter out expired bullets
      filter: (bullet: any) => bullet.lifetime > 0,
    });

    // Initial sync
    this.bulletSpawner.sync();

    // Click to shoot
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const angle = Math.random() * Math.PI * 2; // Random direction
      this.runtime.submitAction('shoot', {
        x: pointer.x,
        y: pointer.y,
        angle: angle,
      });
    });
  }

  update(time: number, delta: number) {
    // Update bullet lifetimes (host only)
    if (this.adapter.isHost()) {
      const state = this.runtime.getState();
      if (state.bullets) {
        for (let i = state.bullets.length - 1; i >= 0; i--) {
          const bullet = state.bullets[i];
          bullet.lifetime -= delta;

          // Remove expired bullets
          if (bullet.lifetime <= 0) {
            state.bullets.splice(i, 1);
          }
        }
      }
    }

    // ✨ Automatic physics update - positions updated from velocity!
    this.bulletSpawner.update(delta);
  }
}

/**
 * Benefits of automatic physics integration:
 *
 * ✅ 80% less boilerplate code
 * ✅ No manual delta time calculations
 * ✅ Consistent mental model with PhysicsManager
 * ✅ Positions automatically sync to sprites
 * ✅ Works seamlessly with state sync (clients see smooth movement)
 *
 * Performance:
 * - Same performance as manual updates (no overhead)
 * - Updates only run on HOST (clients receive state sync)
 * - Physics calculation is O(n) where n = number of entities
 */
