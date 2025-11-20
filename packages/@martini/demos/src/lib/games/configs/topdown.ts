import type { MartiniIDEConfig } from '@martini/ide';

// Top-Down Shooter - arena-style game with movement and shooting
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
          x: i === 0 ? 200 : 600,
          y: 300,
          health: 100
        }
      ])
    ),
    inputs: {},
    projectiles: [] as any[]
  }),

  actions: {
    move: {
      apply: (state, context, input) => {
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      }
    },

    shoot: {
      apply: (state, context, direction: any) => {
        const player = state.players[context.targetId];
        if (player && state.projectiles) {
          state.projectiles.push({
            x: player.x,
            y: player.y,
            vx: direction.x * 300,
            vy: direction.y * 300,
            ownerId: context.targetId
          });
        }
      }
    },

    take_damage: {
      apply: (state, context, damage: number) => {
        const player = state.players[context.targetId];
        if (player) {
          player.health = Math.max(0, player.health - damage);
        }
      }
    }
  },

  onPlayerJoin: (state, playerId) => {
    const index = Object.keys(state.players).length;
    state.players[playerId] = {
      x: index === 0 ? 200 : 600,
      y: 300,
      health: 100
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
  return class TopDownScene extends Phaser.Scene {
    private adapter!: PhaserAdapter;
    private spriteManager: any;
    private inputManager: any;
    private physicsManager: any;
    private spawner: any;

    create() {
      this.adapter = new PhaserAdapter(runtime, this);

      // Arena background
      this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

      // SpriteManager
      this.spriteManager = this.adapter.createSpriteManager({
        onCreate: (key: string, data: any) => {
          return this.add.circle(data.x, data.y, 15, 0x4a9eff);
        },
        onCreatePhysics: (sprite: any) => {
          this.physics.add.existing(sprite);
          sprite.body.setCollideWorldBounds(true);
        }
      });

      // Input manager
      this.inputManager = this.adapter.createInputManager();
      this.inputManager.useProfile('topdown');

      // Physics manager
      this.physicsManager = this.adapter.createPhysicsManager({
        spriteManager: this.spriteManager,
        inputKey: 'inputs'
      });
      this.physicsManager.addBehavior('topdown', {
        speed: 250,
        acceleration: 400
      });

      // Projectile spawner
      this.spawner = this.adapter.createStateDrivenSpawner({
        stateKey: 'projectiles',
        onCreate: (data: any) => {
          return this.add.circle(data.x, data.y, 4, 0xffff00);
        },
        onUpdate: (sprite: any, data: any) => {
          sprite.x = data.x;
          sprite.y = data.y;
        }
      });

      // HUD
      const hud = createPlayerHUD(this.adapter, this, {
        title: 'Arena Blaster',
        roleText: (myPlayer: any) => {
          return \`Health: \${myPlayer?.health || 0}/100\`;
        },
        controlHints: () => 'WASD to Move, Click to Shoot'
      });

      // Create initial players
      if (this.adapter.isHost()) {
        const state = runtime.getState();
        for (const [playerId, playerData] of Object.entries(state.players)) {
          this.spriteManager.add(\`player-\${playerId}\`, playerData);
        }
      }
    }

    update() {
      // New players
      if (this.adapter.isHost()) {
        const state = runtime.getState();
        for (const [playerId] of Object.entries(state.players)) {
          const key = \`player-\${playerId}\`;
          if (!this.spriteManager.get(key)) {
            this.spriteManager.add(key, state.players[playerId]);
          }
        }
      }

      this.inputManager.update();
      const input = this.inputManager.getState();

      // Submit movement
      runtime.submitAction('move', input.move);

      // Handle shooting
      if (input.action?.shoot) {
        const aim = input.aim || { x: 1, y: 0 };
        runtime.submitAction('shoot', aim);
      }

      this.spriteManager.update();
      this.physicsManager.update();
      this.spawner.update();
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
