import type { MartiniIDEConfig } from '@martini/ide';

// Blank starter template - minimal setup for experimenting
const config: MartiniIDEConfig = {
	engine: 'phaser',
	transport: { type: 'local' },
	files: {
		'/src/game.ts': `import { defineGame } from '@martini/core';

export interface GameState {
  players: Record<string, { x: number; y: number }>;
  inputs: Record<string, { up: boolean; down: boolean }>;
}

export const game = defineGame<GameState>({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map(id => [
        id,
        { x: 400, y: 300 }
      ])
    ),
    inputs: {}
  }),

  actions: {
    move: {
      apply: (state, context, input) => {
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      }
    }
  },

  onPlayerJoin: (state, playerId) => {
    state.players[playerId] = { x: 400, y: 300 };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  }
});
`,

		'/src/scene.ts': `import Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';

export function createScene(runtime: GameRuntime) {
  return class BlankScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Add your game here
      this.add.text(400, 300, 'Your Game Here', {
        fontSize: '32px',
        color: '#fff'
      }).setOrigin(0.5);
    }

    update() {
      // Game logic here
    }
  };
}
`,

		'/src/main.ts': `import { initializeGame } from '@martini/phaser';
import { game } from './game';
import { createScene } from './scene';

initializeGame({
  game,
  scene: createScene,
  phaserConfig: {
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 } }
    },
    backgroundColor: '#0a0a0a'
  }
});
`
	}
};

export default config;
