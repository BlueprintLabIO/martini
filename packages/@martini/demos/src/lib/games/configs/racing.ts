import type { MartiniIDEConfig } from '@martini/ide';

const config: MartiniIDEConfig = {
	engine: 'phaser',
	transport: { type: 'local' },
	files: {
		'/src/game.ts': `import { defineGame } from '@martini/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, i) => [
        id,
        {
          x: 150 + i * 150,
          y: 500,
          rotation: 0,
          laps: 0
        }
      ])
    ),
    inputs: {},
    lapMarked: false
  }),

  actions: {
    move: {
      apply: (state, context, input) => {
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      }
    },

    lap: {
      apply: (state, context) => {
        state.players[context.targetId].laps += 1;
      }
    }
  },

  onPlayerJoin: (state, playerId) => {
    const index = Object.keys(state.players).length;
    state.players[playerId] = {
      x: 150 + index * 150,
      y: 500,
      rotation: 0,
      laps: 0
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  }
});
`,

		'/src/scene.ts': `import Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import { PhaserAdapter, createPlayerHUD } from '@martini/phaser';

export function createScene(runtime: GameRuntime) {
  return class RacingScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;
    private spriteManager: any;
    private inputManager: any;
    private physicsManager: any;
    private track?: Phaser.Physics.Arcade.StaticGroup;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Track
      this.add.rectangle(400, 300, 800, 600, 0x2a5c2a);

      // Track boundaries
      this.track = this.physics.add.staticGroup();
      this.track.add(this.add.rectangle(400, 50, 700, 20, 0x4a4a4a)); // Top wall
      this.track.add(this.add.rectangle(400, 550, 700, 20, 0x4a4a4a)); // Bottom
      this.track.add(this.add.rectangle(50, 300, 20, 500, 0x4a4a4a)); // Left
      this.track.add(this.add.rectangle(750, 300, 20, 500, 0x4a4a4a)); // Right

      // Lap line
      for (let i = 0; i < 600; i += 30) {
        this.add.rectangle(400, i, 5, 15, 0xffff00).setOrigin(0.5);
      }

      // SpriteManager for cars
      this.spriteManager = this.adapter.createSpriteManager({
        onCreate: (key: string, data: any) => {
          const car = this.add.rectangle(data.x, data.y, 20, 30, 0xff6b6b);
          return car;
        },
        onCreatePhysics: (sprite: any) => {
          this.physics.add.existing(sprite);
          sprite.body.setDrag(0.95);
          sprite.body.setMaxSpeed(300);
        }
      });

      // Input
      this.inputManager = this.adapter.createInputManager();
      this.inputManager.useProfile('racing');

      // Physics
      this.physicsManager = this.adapter.createPhysicsManager({
        spriteManager: this.spriteManager,
        inputKey: 'inputs'
      });
      this.physicsManager.addBehavior('racing', {
        maxSpeed: 300,
        acceleration: 100,
        deceleration: 80,
        turnSpeed: 0.1
      });

      // HUD
      createPlayerHUD(this.adapter, this, {
        title: 'Circuit Racer',
        roleText: (myPlayer: any) => {
          return \`Laps: \${myPlayer?.laps || 0}\`;
        },
        controlHints: () => 'WASD to Drive'
      });

      // Create initial players
      if (this.adapter.isHost()) {
        const state = runtime.getState();
        for (const [playerId, playerData] of Object.entries(state.players)) {
          this.spriteManager.add(\`car-\${playerId}\`, playerData);
        }
      }
    }

    update() {
      // New players
      if (this.adapter.isHost()) {
        const state = runtime.getState();
        for (const [playerId] of Object.entries(state.players)) {
          const key = \`car-\${playerId}\`;
          if (!this.spriteManager.get(key)) {
            this.spriteManager.add(key, state.players[playerId]);
          }
        }
      }

      this.inputManager.update();
      const input = this.inputManager.getState();

      runtime.submitAction('move', input.move);

      this.spriteManager.update();
      this.physicsManager.update();
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
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    backgroundColor: '#1a1a2e'
  }
});
`
	}
};

export default config;
