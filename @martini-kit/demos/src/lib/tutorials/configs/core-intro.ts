import type { MartiniKitIDEConfig } from '@martini-kit/ide';

/**
 * Core intro tutorial scaffold:
 * - Game state with players/inputs
 * - TODOs for createInputAction + onTick movement
 * - Simple Phaser scene that renders squares from state
 */
const coreIntroConfig: MartiniKitIDEConfig = {
	files: {
		'/src/game.ts': `import { defineGame, createInputAction } from '@martini-kit/core';

type Input = { x?: number; y?: number };

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [id, { x: 200 + index * 200, y: 300 }])
    ),
    inputs: {} as Record<string, Input>
  }),

  actions: {
    // TODO: Replace this with createInputAction('inputs')
    move: {
      apply: (state, context, input: Input) => {
        state.inputs[context.playerId] = input;
      }
    }
  },

  onTick: (state) => {
    // TODO: Read inputs and move players here (host only)
  }
});
`,

		'/src/scene.ts': `import Phaser from 'phaser';
import type { GameRuntime } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';

export function createScene(runtime: GameRuntime<any>) {
  return class IntroScene extends Phaser.Scene {
    adapter!: PhaserAdapter;
    inputManager: any;
    sprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();

    create() {
      this.adapter = new PhaserAdapter(runtime, this);
      this.cameras.main.setBackgroundColor('#0b1021');

      this.inputManager = this.adapter.createInputManager();
      this.inputManager.bindKeys({
        W: { action: 'move', input: { y: -1 }, mode: 'continuous' },
        S: { action: 'move', input: { y: 1 }, mode: 'continuous' },
        A: { action: 'move', input: { x: -1 }, mode: 'continuous' },
        D: { action: 'move', input: { x: 1 }, mode: 'continuous' }
      });
    }

    update() {
      const state = runtime.getState() as any;

      // Create or update sprites from state
      for (const [playerId, player] of Object.entries(state.players ?? {})) {
        if (!this.sprites.has(playerId)) {
          const color = this.adapter.isHost() ? 0x4ade80 : 0x60a5fa;
          const rect = this.add.rectangle(player.x, player.y, 32, 32, color);
          this.sprites.set(playerId, rect);
        }
        const sprite = this.sprites.get(playerId)!;
        sprite.setPosition(player.x, player.y);
      }

      // Remove sprites for players that left
      for (const key of Array.from(this.sprites.keys())) {
        if (!state.players?.[key]) {
          this.sprites.get(key)?.destroy();
          this.sprites.delete(key);
        }
      }

      // Capture input (host/client)
      this.inputManager?.update();
    }
  };
}
`,

		'/src/main.ts': `import { initializeGame } from '@martini-kit/phaser';
import { game } from './game';
import { createScene } from './scene';

initializeGame({
  game,
  scene: createScene,
  phaserConfig: {
    width: 800,
    height: 600,
    backgroundColor: '#0f172a',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    }
  }
});
`
	},
	engine: 'phaser',
	transport: { type: 'iframe-bridge' },
	layout: 'dual'
};

export default coreIntroConfig;
