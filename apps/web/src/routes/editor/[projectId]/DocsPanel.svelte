<script lang="ts">
	/**
	 * DocsPanel - In-app documentation viewer
	 *
	 * Shows concise API docs and examples that users can:
	 * - Read while coding
	 * - Click to copy code snippets
	 * - Filter by category (multiplayer, scenes, utilities)
	 */

	import { BookOpen, Copy, Check } from 'lucide-svelte';

	let { onInsertCode }: { onInsertCode?: (code: string) => void } = $props();

	let activeCategory = $state<'multiplayer' | 'scenes' | 'utilities'>('multiplayer');
	let copiedSnippet = $state<string | null>(null);

	const docs = {
		multiplayer: [
			{
				title: 'Fire Boy & Water Girl (Co-op)',
				description: 'Auto-sync players in a platformer',
				code: `// In create()
this.myPlayer = scene.physics.add.sprite(100, 100, 'player');

gameAPI.multiplayer.trackPlayer(this.myPlayer, {
  role: gameAPI.multiplayer.isHost() ? 'fireboy' : 'watergirl'
});

if (gameAPI.multiplayer.isHost()) {
  this.createLevel(scene); // Only host spawns
}

// In update() - just standard Phaser code!
const cursors = scene.input.keyboard.createCursorKeys();
if (cursors.left.isDown) this.myPlayer.setVelocityX(-160);`
			},
			{
				title: 'Collect Coins (Events)',
				description: 'Broadcast game events to all players',
				code: `// In create()
gameAPI.multiplayer.on('coin-collected', (peerId, data) => {
  const coin = this.coins.find(c => c.id === data.coinId);
  if (coin) coin.destroy();
  this.updateScore(peerId, data.score);
});

// When player collects coin
collectCoin(coinId) {
  this.score += 10;
  gameAPI.multiplayer.broadcast('coin-collected', {
    coinId,
    score: this.score
  });
}`
			},
			{
				title: 'Pokemon Battle (Turn-Based)',
				description: 'Low update rate for turn-based games',
				code: `// In create()
this.myTrainer = scene.add.sprite(100, 100, 'trainer');

gameAPI.multiplayer.trackPlayer(this.myTrainer, {
  sync: ['x', 'y', 'frame'], // No velocity
  updateRate: 10 // Slow update for turn-based
});

gameAPI.multiplayer.on('attack', (peerId, data) => {
  this.playAnimation(data.move, data.target);
});

// Execute move
executeMove() {
  gameAPI.multiplayer.broadcast('attack', {
    move: 'fireball',
    target: this.selectedEnemy
  });
}`
			},
			{
				title: 'Spawn Same Level (Deterministic)',
				description: 'Use gameAPI.random() for synced randomness',
				code: `// In create()
if (gameAPI.multiplayer.isHost()) {
  gameAPI.random.setSeed(12345); // Same seed on all clients

  for (let i = 0; i < 10; i++) {
    const x = gameAPI.random() * 800; // Same values everywhere
    const y = gameAPI.random() * 600;
    scene.add.platform(x, y);
  }
}`
			}
		],
		scenes: [
			{
				title: 'Basic Scene',
				description: 'Minimal scene setup',
				code: `window.scenes = {
  Game: {
    create(scene) {
      scene.add.text(400, 300, 'Hello World!', {
        fontSize: '48px',
        color: '#ffffff'
      }).setOrigin(0.5);
    }
  }
};`
			},
			{
				title: 'Scene with Update Loop',
				description: 'Moving player example',
				code: `window.scenes = {
  Game: {
    create(scene) {
      this.player = scene.add.circle(400, 300, 20, 0x00ff00);
      this.speed = 5;
    },

    update(scene, time, delta) {
      const cursors = scene.input.keyboard.createCursorKeys();

      if (cursors.left.isDown) this.player.x -= this.speed;
      if (cursors.right.isDown) this.player.x += this.speed;
    }
  }
};`
			},
			{
				title: 'Switch Between Scenes',
				description: 'Menu to Game transition',
				code: `window.scenes = {
  Menu: {
    create(scene) {
      const startBtn = scene.add.text(400, 300, 'START', {
        fontSize: '32px'
      }).setOrigin(0.5).setInteractive();

      startBtn.on('pointerdown', () => {
        gameAPI.switchScene('Game', { level: 1 });
      });
    }
  },

  Game: {
    create(scene, data) {
      gameAPI.log(\`Starting level \${data.level}\`);
    }
  }
};

window.startScene = 'Menu';`
			}
		],
		utilities: [
			{
				title: 'Console Logging',
				description: 'Debug your game',
				code: `create(scene) {
  gameAPI.log('Game started!');
  gameAPI.log(\`Player at \${this.player.x}, \${this.player.y}\`);
}`
			},
			{
				title: 'Frame-Based Logic',
				description: 'Spawn enemy every 60 frames (~1 sec)',
				code: `update(scene) {
  if (gameAPI.getFrame() % 60 === 0) {
    this.spawnEnemy(scene);
  }
}`
			},
			{
				title: 'Pause/Resume Scene',
				description: 'Pause menu functionality',
				code: `create(scene) {
  scene.input.keyboard.on('keydown-ESC', () => {
    gameAPI.pauseScene();
    this.showPauseMenu();
  });
}

resumeGame() {
  gameAPI.resumeScene();
}`
			}
		]
	};

	async function copySnippet(code: string, title: string) {
		await navigator.clipboard.writeText(code);
		copiedSnippet = title;
		setTimeout(() => {
			copiedSnippet = null;
		}, 2000);
	}

	function insertSnippet(code: string) {
		onInsertCode?.(code);
	}
</script>

<div class="docs-panel">
	<!-- Header -->
	<div class="header">
		<div class="title">
			<BookOpen size={18} />
			<span>Quick Reference</span>
		</div>
	</div>

	<!-- Category Tabs -->
	<div class="tabs">
		<button
			class="tab"
			class:active={activeCategory === 'multiplayer'}
			onclick={() => (activeCategory = 'multiplayer')}
		>
			Multiplayer
		</button>
		<button
			class="tab"
			class:active={activeCategory === 'scenes'}
			onclick={() => (activeCategory = 'scenes')}
		>
			Scenes
		</button>
		<button
			class="tab"
			class:active={activeCategory === 'utilities'}
			onclick={() => (activeCategory = 'utilities')}
		>
			Utilities
		</button>
	</div>

	<!-- Examples -->
	<div class="examples">
		{#each docs[activeCategory] as example}
			<div class="example">
				<div class="example-header">
					<div class="example-title">
						<span class="title-text">{example.title}</span>
						<span class="description">{example.description}</span>
					</div>
					<button
						class="copy-btn"
						onclick={() => copySnippet(example.code, example.title)}
						title="Copy to clipboard"
					>
						{#if copiedSnippet === example.title}
							<Check size={16} class="text-green-500" />
						{:else}
							<Copy size={16} />
						{/if}
					</button>
				</div>
				<pre class="code"><code>{example.code}</code></pre>
				{#if onInsertCode}
					<button class="insert-btn" onclick={() => insertSnippet(example.code)}>
						Insert into editor
					</button>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Footer -->
	<div class="footer">
		<a
			href="https://docs.claude.com/en/docs/claude-code"
			target="_blank"
			class="full-docs-link"
		>
			View Full Documentation →
		</a>
	</div>
</div>

<style>
	.docs-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #1e1e1e;
		color: #d4d4d4;
	}

	.header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #333;
		background: #252526;
	}

	.title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
		padding: 0.5rem;
		border-bottom: 1px solid #333;
		background: #252526;
	}

	.tab {
		flex: 1;
		padding: 0.5rem 1rem;
		border: none;
		background: transparent;
		color: #999;
		font-size: 0.75rem;
		cursor: pointer;
		border-radius: 0.25rem;
		transition: all 0.2s;
	}

	.tab:hover {
		background: #2d2d2d;
		color: #d4d4d4;
	}

	.tab.active {
		background: #0e639c;
		color: white;
		font-weight: 600;
	}

	.examples {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.example {
		margin-bottom: 1.5rem;
		border: 1px solid #333;
		border-radius: 0.375rem;
		background: #252526;
		overflow: hidden;
	}

	.example-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 0.75rem;
		background: #2d2d2d;
		border-bottom: 1px solid #333;
	}

	.example-title {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.title-text {
		font-size: 0.875rem;
		font-weight: 600;
		color: #e0e0e0;
	}

	.description {
		font-size: 0.75rem;
		color: #999;
	}

	.copy-btn {
		padding: 0.25rem;
		background: transparent;
		border: 1px solid #444;
		border-radius: 0.25rem;
		color: #d4d4d4;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.copy-btn:hover {
		background: #333;
		border-color: #666;
	}

	.code {
		margin: 0;
		padding: 0.75rem;
		background: #1e1e1e;
		overflow-x: auto;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		color: #d4d4d4;
	}

	.code code {
		display: block;
		white-space: pre;
	}

	.insert-btn {
		width: 100%;
		padding: 0.5rem;
		background: #0e639c;
		border: none;
		color: white;
		font-size: 0.75rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.insert-btn:hover {
		background: #1177bb;
	}

	.footer {
		padding: 0.75rem 1rem;
		border-top: 1px solid #333;
		background: #252526;
	}

	.full-docs-link {
		display: block;
		text-align: center;
		font-size: 0.75rem;
		color: #0e639c;
		text-decoration: none;
		transition: color 0.2s;
	}

	.full-docs-link:hover {
		color: #1177bb;
		text-decoration: underline;
	}

	/* Scrollbar styling */
	.examples::-webkit-scrollbar {
		width: 8px;
	}

	.examples::-webkit-scrollbar-track {
		background: #1e1e1e;
	}

	.examples::-webkit-scrollbar-thumb {
		background: #444;
		border-radius: 4px;
	}

	.examples::-webkit-scrollbar-thumb:hover {
		background: #555;
	}
</style>
