<script lang="ts">
	import { page } from '$app/stores';
	import { demoGames } from '$lib/games';
	import { gameSources } from '$lib/games/source';
	import DualViewDemo from '$lib/components/DualViewDemo.svelte';
	import { ArrowLeft, Code2 } from 'lucide-svelte';

	type DemoTheme = {
		accent: string;
		soft: string;
		glow: string;
		gradient: string;
	};

	const demoThemes: Record<string, DemoTheme> = {
		'fire-and-ice': {
			accent: '#ff5f8f',
			soft: '#ffd8e7',
			glow: 'rgba(255, 95, 143, 0.35)',
			gradient: 'linear-gradient(135deg, rgba(255, 95, 143, 0.35), rgba(255, 184, 108, 0.25))',
		},
		'paddle-battle': {
			accent: '#00f5ff',
			soft: '#c6fbff',
			glow: 'rgba(0, 245, 255, 0.4)',
			gradient: 'linear-gradient(135deg, rgba(0, 245, 255, 0.4), rgba(0, 140, 255, 0.25))',
		},
		'tile-matcher': {
			accent: '#b46cff',
			soft: '#e2c7ff',
			glow: 'rgba(180, 108, 255, 0.4)',
			gradient: 'linear-gradient(135deg, rgba(180, 108, 255, 0.35), rgba(64, 13, 165, 0.35))',
		},
		'circuit-racer': {
			accent: '#f8e71c',
			soft: '#fff7a3',
			glow: 'rgba(248, 231, 28, 0.4)',
			gradient: 'linear-gradient(135deg, rgba(248, 231, 28, 0.35), rgba(255, 120, 0, 0.25))',
		},
		'arena-blaster': {
			accent: '#00ffa3',
			soft: '#c8ffe7',
			glow: 'rgba(0, 255, 163, 0.35)',
			gradient: 'linear-gradient(135deg, rgba(0, 255, 163, 0.35), rgba(0, 122, 255, 0.25))',
		},
		default: {
			accent: '#7b61ff',
			soft: '#d5d0ff',
			glow: 'rgba(123, 97, 255, 0.35)',
			gradient: 'linear-gradient(135deg, rgba(123, 97, 255, 0.35), rgba(0, 147, 255, 0.25))',
		},
	};

	const gameId = $derived($page.params.gameId);
	const game = $derived(demoGames.find((g) => g.id === gameId));
	const sourceFiles = $derived(game ? gameSources[game.id] : null);
	const theme = $derived(demoThemes[gameId] ?? demoThemes.default);

	let showCode = $state(false);
	let selectedFile = $state('game.ts');

	$effect(() => {
		if (!sourceFiles) return;
		if (!sourceFiles[selectedFile]) {
			const [first] = Object.keys(sourceFiles);
			if (first) {
				selectedFile = first;
			}
		}
	});

	const heroStats = $derived([
		{ label: 'Players', value: game?.players ?? '—' },
		{ label: 'Mode', value: game?.type ?? '—' },
		{ label: 'Difficulty', value: game ? game.difficulty : '—' },
	]);
</script>

<svelte:head>
	<title>{game?.name || 'Demo'} - Martini</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if game}
	<div
		class="demo-page"
		style={`--demo-accent: ${theme.accent}; --demo-soft: ${theme.soft}; --demo-glow: ${theme.glow}; --demo-panel-gradient: ${theme.gradient};`}
	>
		<div class="cyber-background">
			<div class="grid-layer"></div>
			<div class="glow orbs"></div>
			<div class="scanlines"></div>
		</div>

		<main class="demo-shell">
			<section class="demo-hero animate-on-scroll">
				<div class="hero-top">
					<a href="/" class="back-link">
						<ArrowLeft size={16} />
						Home
					</a>
					<span class="hero-pill">Martini Demo</span>
				</div>

				<div class="hero-grid">
					<div class="hero-copy">
						<p class="eyebrow">Live multiplayer playground</p>
						<h1>{game.name}</h1>
						<p class="lead">{game.description}</p>

						<div class="meta-grid">
							{#each heroStats as stat}
								<div class="meta-card">
									<span class="meta-label">{stat.label}</span>
									<span class="meta-value">{stat.value}</span>
								</div>
							{/each}
						</div>

						<div class="controls-panel">
							<div class="controls-header">
								<h3>Controls</h3>
								<p>Plug in two sets of keys and feel both perspectives instantly.</p>
							</div>
							<div class="control-chips">
								{#each game.controls as control}
									<span class="control-chip">{control}</span>
								{/each}
							</div>
						</div>

						<div class="hero-actions">
							<button
								class="code-toggle"
								onclick={() => (showCode = !showCode)}
								disabled={!sourceFiles}
							>
								<Code2 size={16} />
								{showCode ? 'Hide source' : 'View source'}
							</button>
							<a href="#live-demo" class="cta-anchor">Jump to live demo</a>
						</div>
					</div>

					<div class="hero-visual">
						<div class="hero-card">
							<p class="card-eyebrow">Dual view</p>
							<h3>Instant host + client preview</h3>
							<ul>
								<li>Two Phaser runtimes in sync</li>
								<li>Local transport for instant pairing</li>
								<li>Great for QA + multiplayer tuning</li>
							</ul>
							<div class="card-pill">Use WASD + Arrows</div>
						</div>
					</div>
				</div>
			</section>

			{#if showCode && sourceFiles}
				<section class="code-panel animate-on-scroll" id="source">
					<div class="code-shell">
						<header class="code-header">
							<div>
								<p class="eyebrow">Game source</p>
								<h2>{game.name} files</h2>
							</div>
							<div class="file-tabs">
								{#each Object.keys(sourceFiles) as filename}
									<button
										class="file-tab"
										class:active={selectedFile === filename}
										onclick={() => (selectedFile = filename)}
									>
										{filename}
									</button>
								{/each}
							</div>
						</header>
						<pre class="code-window"><code>{sourceFiles[selectedFile]}</code></pre>
					</div>
				</section>
			{/if}

			<section class="demo-stage animate-on-scroll" id="live-demo">
				<div class="stage-header">
					<p class="eyebrow">Live playground</p>
					<h2>Run both perspectives simultaneously</h2>
					<p>Use the keyboard legends below the canvases to feel the host and client event loops updating side-by-side.</p>
				</div>
				<div class="stage-body">
					<DualViewDemo {game} accentColor={theme.accent} />
				</div>
			</section>
		</main>
	</div>
{:else}
	<div class="error-page">
		<div class="error-card">
			<h1>Demo not found</h1>
			<p>The demo "{gameId}" does not exist.</p>
			<a href="/" class="primary-link">Back to home</a>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		font-family: 'Inter', 'SF Pro Display', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
	}

	.demo-page {
		position: relative;
		min-height: 100vh;
		background: #020409;
		color: #f8fafc;
		overflow: hidden;
		padding: 0 1.5rem;
	}

	.demo-page::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.06), transparent 55%);
		pointer-events: none;
	}

	.cyber-background {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: none;
	}

	.grid-layer {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(transparent 95%, rgba(255, 255, 255, 0.06) 96%),
			linear-gradient(90deg, transparent 95%, rgba(255, 255, 255, 0.06) 96%);
		background-size: 120px 120px;
		opacity: 0.25;
	}

	.glow.orbs {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 20% 20%, var(--demo-glow), transparent 55%),
			radial-gradient(circle at 70% 30%, rgba(0, 255, 255, 0.25), transparent 60%),
			radial-gradient(circle at 40% 70%, rgba(255, 0, 170, 0.25), transparent 65%);
		filter: blur(60px);
	}

	.scanlines {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 3px);
		opacity: 0.4;
	}

	.demo-shell {
		position: relative;
		z-index: 1;
		max-width: 1200px;
		margin: 0 auto;
		padding: clamp(3rem, 5vw, 5rem) 0 clamp(5rem, 8vw, 7rem);
	}

	.animate-on-scroll {
		opacity: 1;
		transform: none;
	}

	.demo-hero {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.hero-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.9rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #f8fafc;
		text-decoration: none;
		font-size: 0.85rem;
	}

	.hero-pill {
		padding: 0.35rem 1rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		font-size: 0.8rem;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.hero-grid {
		display: grid;
		gap: clamp(2rem, 4vw, 3rem);
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	}

	.hero-copy h1 {
		font-family: 'Orbitron', sans-serif;
		font-size: clamp(2.5rem, 6vw, 4.5rem);
		margin: 0;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-size: 0.75rem;
		color: rgba(248, 250, 252, 0.7);
		margin-bottom: 0.5rem;
	}

	.lead {
		font-size: 1.1rem;
		color: rgba(255, 255, 255, 0.85);
		line-height: 1.6;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.meta-card {
		padding: 1rem;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
	}

	.meta-label {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.65);
	}

	.meta-value {
		font-size: 1.1rem;
		font-weight: 600;
		margin-top: 0.35rem;
	}

	.controls-panel {
		padding: 1.5rem;
		border-radius: 24px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.controls-header h3 {
		margin: 0;
		font-size: 1rem;
	}

	.controls-header p {
		margin: 0.25rem 0 1rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.control-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.control-chip {
		padding: 0.5rem 0.85rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		font-size: 0.85rem;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1rem;
	}

	.code-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.4rem;
		border-radius: 999px;
		border: none;
		background: var(--demo-panel-gradient, #111);
		color: #050505;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 15px 40px rgba(0, 0, 0, 0.35);
	}

	.code-toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.cta-anchor {
		align-self: center;
		color: var(--demo-soft);
		text-decoration: none;
		font-weight: 600;
	}

	.hero-visual {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-card {
		width: 100%;
		max-width: 360px;
		padding: 2rem;
		border-radius: 32px;
		background: var(--demo-panel-gradient);
		color: #f8fafc;
		box-shadow:
			0 20px 60px rgba(0, 0, 0, 0.45),
			0 0 80px var(--demo-glow);
	}

	.hero-card h3 {
		margin: 0 0 1rem;
		font-size: 1.5rem;
	}

	.hero-card ul {
		margin: 0;
		padding-left: 1rem;
		color: rgba(248, 250, 252, 0.85);
		line-height: 1.6;
	}

	.card-eyebrow {
		margin: 0 0 0.4rem;
		text-transform: uppercase;
		letter-spacing: 0.3em;
		font-size: 0.75rem;
		color: rgba(248, 250, 252, 0.7);
	}

	.card-pill {
		margin-top: 1.2rem;
		padding: 0.4rem 0.9rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.35);
		width: fit-content;
		font-size: 0.85rem;
		color: #f8fafc;
	}

	.code-panel {
		margin-top: 3rem;
	}

	.code-shell {
		border-radius: 32px;
		background: rgba(3, 7, 18, 0.75);
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(12px);
	}

	.code-header {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.file-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.file-tab {
		padding: 0.5rem 1rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: transparent;
		color: #e2e8f0;
		cursor: pointer;
	}

	.file-tab.active {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}

	.code-window {
		margin: 0;
		padding: 2rem;
		overflow-x: auto;
		font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
		font-size: 0.85rem;
		line-height: 1.7;
		white-space: pre;
	}

	.demo-stage {
		margin-top: 4rem;
	}

	.stage-header h2 {
		margin: 0.25rem 0 0.75rem;
		font-size: clamp(1.8rem, 4vw, 2.5rem);
	}

	.stage-header p {
		color: rgba(255, 255, 255, 0.7);
		max-width: 640px;
	}

	.stage-body {
		margin-top: 2rem;
	}

	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #020409;
	}

	.error-card {
		text-align: center;
		padding: 3rem;
		border-radius: 32px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #fff;
	}

	.primary-link {
		display: inline-flex;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		border-radius: 999px;
		background: #fff;
		color: #050505;
		text-decoration: none;
		font-weight: 600;
	}

	@media (max-width: 768px) {
		.hero-card {
			max-width: 100%;
		}

		.code-window {
			padding: 1.5rem;
		}
	}
</style>
