<script lang="ts">
	import MartiniIDE from '@martini/ide';
	import type { MartiniIDEConfig } from '@martini/ide';

	// Sample Fire & Ice game files
	const config: MartiniIDEConfig = {
		files: {
			'/src/game.ts': `import { defineGame } from '@martini/core';

export const game = defineGame({
	setup: ({ playerIds }) => ({
		players: Object.fromEntries(
			playerIds.map((id, index) => [
				id,
				{
					x: index === 0 ? 200 : 600,
					y: 300,
					role: index === 0 ? 'fire' : 'ice'
				}
			])
		),
		inputs: {}
	}),

	actions: {
		move: {
			apply: (state, context, input: { x: number; y: number }) => {
				if (!state.inputs) state.inputs = {};
				state.inputs[context.targetId] = input;
			}
		}
	},

	onPlayerJoin: (state, playerId) => {
		const existingCount = Object.keys(state.players).length;
		state.players[playerId] = {
			x: existingCount === 0 ? 200 : 600,
			y: 300,
			role: existingCount === 0 ? 'fire' : 'ice'
		};
	},

	onPlayerLeave: (state, playerId) => {
		delete state.players[playerId];
	}
});
`,

			'/src/scene.ts': `import type { GameRuntime } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';
import Phaser from 'phaser';

export function createScene(runtime: GameRuntime) {
	return class GameScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private platforms?: Phaser.Physics.Arcade.StaticGroup;
		private spriteManager: any;
		private inputManager: any;
		private playerLabels = new Map<string, Phaser.GameObjects.Text>();

		create() {
			// Initialize adapter
			this.adapter = new PhaserAdapter(runtime, this);

			// Title
			this.add.text(400, 20, 'Fire & Ice Demo', {
				fontSize: '20px',
				color: '#fff'
			}).setOrigin(0.5);

			// Instructions
			this.add.text(400, 45, 'Arrow Keys: Move & Jump', {
				fontSize: '12px',
				color: '#aaa'
			}).setOrigin(0.5);

			// Create platforms
			this.platforms = this.physics.add.staticGroup();
			this.platforms.add(this.add.rectangle(400, 580, 800, 40, 0x4a5568));
			this.platforms.add(this.add.rectangle(200, 450, 200, 20, 0x4a5568));
			this.platforms.add(this.add.rectangle(600, 350, 200, 20, 0x4a5568));
			this.platforms.add(this.add.rectangle(400, 250, 150, 20, 0x4a5568));

			// ✨ NEW: SpriteManager - handles all host/client sprite logic automatically
			this.spriteManager = this.adapter.createSpriteManager({
				onCreate: (key: string, data: any) => {
					// Create sprite (runs on both host and client)
					const color = data.role === 'fire' ? 0xff4444 : 0x4488ff;
					const sprite = this.add.rectangle(data.x, data.y, 32, 32, color);

					// Add label (both host + client)
					const label = this.add.text(0, 0, data.role === 'fire' ? 'Fire' : 'Ice', {
						fontSize: '10px',
						color: '#fff'
					}).setOrigin(0.5);
					this.playerLabels.set(key, label);

					return sprite;
				},
				// ✨ Physics setup (HOST ONLY - automatic!)
				onCreatePhysics: (sprite: any) => {
					this.physics.add.existing(sprite);
					const body = sprite.body as Phaser.Physics.Arcade.Body;
					body.setCollideWorldBounds(true);
					body.setBounce(0.2);
					this.physics.add.collider(sprite, this.platforms!);
				}
			});

			// ✨ NEW: InputManager - handles keyboard input automatically
			this.inputManager = this.adapter.createInputManager();
			this.inputManager.bindKeys({
				'ArrowLeft': { action: 'move', input: { x: -1, y: 0 }, mode: 'continuous' },
				'ArrowRight': { action: 'move', input: { x: 1, y: 0 }, mode: 'continuous' },
				'ArrowUp': { action: 'move', input: { x: 0, y: -1 }, mode: 'continuous' }
			});

			// HOST: Create initial players
			if (this.adapter.isHost()) {
				const state = runtime.getState();
				for (const [playerId, playerData] of Object.entries(state.players)) {
					this.spriteManager.add(\`player-\${playerId}\`, playerData);
				}
			}
		}

		update() {
			// Update labels to follow sprites
			for (const [key, sprite] of this.spriteManager.getAll().entries()) {
				const label = this.playerLabels.get(key);
				if (label) {
					label.setPosition(sprite.x, sprite.y - 25);
				}
			}

			// ✨ SpriteManager handles interpolation automatically
			this.spriteManager.update();

			// ✨ InputManager handles keyboard input automatically
			this.inputManager.update();

			// HOST: Apply physics based on inputs
			if (!this.adapter.isHost()) return;

			const state = runtime.getState();
			if (!state?.players || !state?.inputs) return;

			for (const [playerId, inputData] of Object.entries(state.inputs)) {
				const sprite = this.spriteManager.get(\`player-\${playerId}\`);
				if (!sprite || !sprite.body) continue;

				const body = sprite.body as Phaser.Physics.Arcade.Body;
				const speed = 200;
				const jumpPower = 330;

				body.setVelocityX(inputData.x * speed);

				// Jumping (only if on ground)
				if (inputData.y === -1 && body.touching.down) {
					body.setVelocityY(-jumpPower);
				}
			}
		}
	};
}
`,

			'/src/main.ts': `import { initializeGame } from '@martini/phaser';
import { game } from './game';
import { createScene } from './scene';

// Initialize game - transport is handled automatically by the platform
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
    backgroundColor: '#1a1a2e'
  }
});
`
		},
		engine: 'phaser',
		transport: { type: 'local' },
		layout: 'dual'
	};
</script>

<div class="demo-page">
	<header>
		<h1>@martini/ide Demo</h1>
		<p>Embeddable multiplayer game IDE with dual-player testing</p>
	</header>

	<div class="ide-container">
		<MartiniIDE {config} />
	</div>
</div>

<style>
	.demo-page {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: #0a0a0a;
		color: #fff;
	}

	header {
		padding: 2rem;
		text-align: center;
		background: linear-gradient(180deg, #1e1e1e 0%, #0a0a0a 100%);
		border-bottom: 1px solid #333;
	}

	header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		font-weight: 700;
	}

	header p {
		margin: 0;
		color: #888;
		font-size: 1.125rem;
	}

	.ide-container {
		flex: 1;
		min-height: 0; /* Important for flex layout */
		padding: 1rem;
	}
</style>
