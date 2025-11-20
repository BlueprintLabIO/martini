import type { MartiniIDEConfig } from '@martini/ide';

// Platformer starter - cooperative platformer with jumping and platforms
const config: MartiniIDEConfig = {
	engine: 'phaser',
	transport: { type: 'local' },
	files: {
		'/src/game.ts': `import { defineGame, createPlayerManager, createInputAction } from '@martini/core';

const playerManager = createPlayerManager({
  factory: (playerId, index) => ({
    x: index === 0 ? 200 : 600,
    y: 400,
    vx: 0,
    vy: 0
  })
});

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    inputs: {}
  }),

  actions: {
    move: createInputAction('inputs')
  },

  onPlayerJoin: (state, playerId) => {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave: (state, playerId) => {
    playerManager.handleLeave(state.players, playerId);
  }
});
`,

		'/src/scene.ts': `import Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';

export function createScene(runtime: GameRuntime) {
  return class PlatformerScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;
    private spriteManager: any;
    private physicsManager: any;
    private inputManager: any;
    private platform?: Phaser.Physics.Arcade.StaticGroup;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Background
      this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

      // Create platforms
      this.platform = this.physics.add.staticGroup();
      this.platform.add(this.add.rectangle(400, 550, 600, 20, 0x8b4513));
      this.platform.add(this.add.rectangle(200, 450, 150, 15, 0x8b4513));
      this.platform.add(this.add.rectangle(600, 400, 150, 15, 0x8b4513));
      this.platform.add(this.add.rectangle(400, 300, 200, 15, 0x8b4513));

      // SpriteManager for players
      this.spriteManager = this.adapter.createSpriteManager({
        onCreate: (key: string, data: any) => {
          return this.add.circle(data.x, data.y, 15, 0xff6b6b);
        },
        onCreatePhysics: (sprite: any) => {
          this.physics.add.existing(sprite);
          const body = sprite.body as Phaser.Physics.Arcade.Body;
          body.setCollideWorldBounds(true);
          body.setBounce(0.2);
        }
      });

      // Input handling
      this.inputManager = this.adapter.createInputManager();
      this.inputManager.useProfile('platformer');

      // Physics
      this.physicsManager = this.adapter.createPhysicsManager({
        spriteManager: this.spriteManager,
        inputKey: 'inputs'
      });
      this.physicsManager.addBehavior('platformer', {
        speed: 200,
        jumpPower: 350
      });

      // Collisions
      if (this.adapter.isHost()) {
        this.physics.add.collider(this.spriteManager.group, this.platform);
      }

      // Create initial players
      if (this.adapter.isHost()) {
        const state = runtime.getState();
        for (const [playerId, playerData] of Object.entries(state.players)) {
          this.spriteManager.add(\`player-\${playerId}\`, playerData);
        }
      }
    }

    update() {
      // New player check
      if (this.adapter.isHost()) {
        const state = runtime.getState();
        for (const [playerId, playerData] of Object.entries(state.players)) {
          const key = \`player-\${playerId}\`;
          if (!this.spriteManager.get(key)) {
            this.spriteManager.add(key, playerData);
          }
        }
      }

      this.inputManager.update();
      this.spriteManager.update();
      this.physicsManager.update();

      // Host: submit input
      if (this.adapter.isHost()) {
        const state = this.inputManager.getState();
        const runtime = this.game as any;
        runtime.submitAction?.('move', state.move);
      }
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
        gravity: { x: 0, y: 400 },
        debug: false
      }
    },
    backgroundColor: '#87ceeb'
  }
});
`
	}
};

export default config;
