<script lang="ts">
	import MartiniIDE from '@martini/ide';
	import type { MartiniIDEConfig } from '@martini/ide';

	// Key Counter Sync Test - Two player key counters
	const config: MartiniIDEConfig = {
		files: {
			'/src/game.ts': `import { defineGame } from '@martini/core';

export const game = defineGame({
	setup: ({ playerIds }) => ({
		playerACount: 0,
		playerBCount: 0,
		playerAId: playerIds[0] || null,
		playerBId: playerIds[1] || null
	}),

	actions: {
		pressKey: {
			apply: (state, context) => {
				// Increment counter for the player who pressed the key
				// context.playerId is who submitted the action
				if (context.playerId === state.playerAId) {
					state.playerACount++;
				} else if (context.playerId === state.playerBId) {
					state.playerBCount++;
				}
			}
		}
	},

	onPlayerJoin: (state, playerId) => {
		// Assign player A or B
		if (!state.playerAId) {
			state.playerAId = playerId;
		} else if (!state.playerBId) {
			state.playerBId = playerId;
		}
	},

	onPlayerLeave: (state, playerId) => {
		if (state.playerAId === playerId) {
			state.playerAId = null;
		} else if (state.playerBId === playerId) {
			state.playerBId = null;
		}
	}
});
`,

			'/src/scene.ts': `import type { GameRuntime } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';
import Phaser from 'phaser';

export function createScene(runtime: GameRuntime) {
	return class GameScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private inputManager: any;
		private counterAText?: Phaser.GameObjects.Text;
		private counterBText?: Phaser.GameObjects.Text;
		private labelAText?: Phaser.GameObjects.Text;
		private labelBText?: Phaser.GameObjects.Text;

		create() {
			// Initialize adapter
			this.adapter = new PhaserAdapter(runtime, this);

			// Title
			this.add.text(400, 50, 'Key Counter Sync Test', {
				fontSize: '28px',
				color: '#fff',
				fontStyle: 'bold'
			}).setOrigin(0.5);

			// Instructions
			this.add.text(400, 100, 'Press SPACE to increment your counter', {
				fontSize: '16px',
				color: '#aaa'
			}).setOrigin(0.5);

			this.add.text(400, 130, 'Both previews should show identical counts', {
				fontSize: '14px',
				color: '#888'
			}).setOrigin(0.5);

			// Player A Section
			this.add.rectangle(250, 300, 300, 200, 0x1e3a8a, 0.3);
			this.labelAText = this.add.text(250, 220, 'Player A', {
				fontSize: '20px',
				color: '#60a5fa',
				fontStyle: 'bold'
			}).setOrigin(0.5);

			this.counterAText = this.add.text(250, 300, '0', {
				fontSize: '72px',
				color: '#3b82f6',
				fontStyle: 'bold'
			}).setOrigin(0.5);

			// Player B Section
			this.add.rectangle(550, 300, 300, 200, 0x7c2d12, 0.3);
			this.labelBText = this.add.text(550, 220, 'Player B', {
				fontSize: '20px',
				color: '#fb923c',
				fontStyle: 'bold'
			}).setOrigin(0.5);

			this.counterBText = this.add.text(550, 300, '0', {
				fontSize: '72px',
				color: '#f97316',
				fontStyle: 'bold'
			}).setOrigin(0.5);

			// Role indicator at bottom
			const myPlayerId = runtime.getTransport().getPlayerId();
			const state = runtime.getState();
			let role = 'Spectator';
			if (myPlayerId === state.playerAId) {
				role = 'You are Player A (Left)';
			} else if (myPlayerId === state.playerBId) {
				role = 'You are Player B (Right)';
			}

			this.add.text(400, 500, role, {
				fontSize: '18px',
				color: '#fff',
				backgroundColor: '#333',
				padding: { x: 20, y: 10 }
			}).setOrigin(0.5);

			// InputManager - bind SPACE key
			this.inputManager = this.adapter.createInputManager();
			this.inputManager.bindKeys({
				'Space': { action: 'pressKey', input: {}, mode: 'trigger' }
			});
		}

		update() {
			// Update counter displays from game state
			const state = runtime.getState();
			if (this.counterAText) {
				this.counterAText.setText(state.playerACount.toString());
			}
			if (this.counterBText) {
				this.counterBText.setText(state.playerBCount.toString());
			}

			// Update input manager
			this.inputManager.update();
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
    backgroundColor: '#0f172a'
  }
});
`
		},
		engine: 'phaser',
		transport: { type: 'iframe-bridge' },
		layout: 'dual'
	};
</script>

<div class="demo-page">
	<header>
		<h1>Key Counter Sync Test</h1>
		<p>Test multiplayer sync with dual preview panes - each player increments their own counter</p>
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
		padding: 1.5rem;
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
