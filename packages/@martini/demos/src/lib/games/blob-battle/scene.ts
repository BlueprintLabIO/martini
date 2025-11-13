/**
 * Blob Battle Phaser Scene
 *
 * Renders the Agar.io-style multiplayer game using Phaser 3
 */

import Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;

export function createBlobBattleScene(runtime: GameRuntime, keyState?: any) {
  return class BlobBattleScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;
    private playerSprites = new Map<string, Phaser.GameObjects.Arc>();
    private playerNameTexts = new Map<string, Phaser.GameObjects.Text>();
    private foodSprites = new Map<string, Phaser.GameObjects.Arc>();
    private lastMoveTime = 0;

    constructor() {
      super({ key: 'BlobBattleScene' });
    }

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Set up world bounds
      this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Run tick action ONLY on host
      if (this.adapter.isHost()) {
        this.time.addEvent({
          delay: 16, // ~60 FPS
          callback: () => {
            runtime.submitAction('tick', { delta: 16 });
          },
          loop: true,
        });
      }

      // Subscribe to state changes
      this.adapter.onChange((state: any) => {
        this.renderState(state);
      });

      // Initial render
      this.renderState(runtime.getState());
    }

    update() {
      // Throttle movement updates to avoid spam
      const now = this.time.now;
      if (now - this.lastMoveTime < 50) return; // 20 updates per second max

      const player = runtime.getState().players[this.adapter.myId];
      if (!player) return;

      let moveX = 0;
      let moveY = 0;

      // Use shared keyState if available (dual-view mode)
      if (keyState) {
        const isHost = this.adapter.isHost();
        const keys = isHost ? keyState.host : keyState.client;

        if (keys.left) moveX = -1;
        if (keys.right) moveX = 1;
        if (keys.up) moveY = -1;
        if (keys.down) moveY = 1;
      }

      if (moveX !== 0 || moveY !== 0) {
        const speed = 100;
        const targetX = player.x + moveX * speed;
        const targetY = player.y + moveY * speed;
        runtime.submitAction('move', { x: targetX, y: targetY });
        this.lastMoveTime = now;
      }
    }

    private renderState(state: any) {
      const { players, food } = state;

      // Render players
      const currentPlayerIds = new Set(Object.keys(players));

      // Remove sprites for players who left
      for (const [playerId, sprite] of this.playerSprites) {
        if (!currentPlayerIds.has(playerId)) {
          sprite.destroy();
          this.playerSprites.delete(playerId);

          const nameText = this.playerNameTexts.get(playerId);
          if (nameText) {
            nameText.destroy();
            this.playerNameTexts.delete(playerId);
          }
        }
      }

      // Update or create player sprites
      for (const [playerId, player] of Object.entries(players) as Array<[string, any]>) {
        let sprite = this.playerSprites.get(playerId);
        let nameText = this.playerNameTexts.get(playerId);

        if (!sprite) {
          // Create new player sprite
          const isLocal = playerId === this.adapter.myId;
          const color = isLocal ? 0x00ff00 : this.getPlayerColor(playerId);

          sprite = this.add.circle(player.x, player.y, player.size / 2, color, 0.8);
          this.playerSprites.set(playerId, sprite);

          // Add player name
          nameText = this.add.text(player.x, player.y, playerId.substring(0, 8), {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
          });
          nameText.setOrigin(0.5, 0.5);
          this.playerNameTexts.set(playerId, nameText);
        }

        // Update position and size
        sprite.x = player.x;
        sprite.y = player.y;
        sprite.setRadius(player.size / 2);

        if (nameText) {
          nameText.x = player.x;
          nameText.y = player.y;
        }
      }

      // Render food
      const currentFoodIds = new Set(food.map((f: any) => f.id));

      // Remove sprites for eaten food
      for (const [foodId, sprite] of this.foodSprites) {
        if (!currentFoodIds.has(foodId)) {
          sprite.destroy();
          this.foodSprites.delete(foodId);
        }
      }

      // Update or create food sprites
      for (const foodItem of food) {
        let sprite = this.foodSprites.get(foodItem.id);

        if (!sprite) {
          // Create new food sprite
          sprite = this.add.circle(foodItem.x, foodItem.y, 5, 0xffaa00, 1);
          this.foodSprites.set(foodItem.id, sprite);
        }

        // Update position (food doesn't move, but just in case)
        sprite.x = foodItem.x;
        sprite.y = foodItem.y;
      }

      // Follow local player with camera
      const localPlayer = players[this.adapter.myId];
      if (localPlayer) {
        this.cameras.main.scrollX = localPlayer.x - WORLD_WIDTH / 2;
        this.cameras.main.scrollY = localPlayer.y - WORLD_HEIGHT / 2;
      }
    }

    private getPlayerColor(playerId: string): number {
      // Generate consistent color for each player based on their ID
      let hash = 0;
      for (let i = 0; i < playerId.length; i++) {
        hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
      }

      const colors = [
        0xff6b6b, // red
        0x4ecdc4, // cyan
        0x95e1d3, // mint
        0xfeca57, // yellow
        0xee5a6f, // pink
        0xc56cf0, // purple
        0x48dbfb, // light blue
        0xff9ff3, // light pink
      ];

      return colors[Math.abs(hash) % colors.length];
    }
  };
}
