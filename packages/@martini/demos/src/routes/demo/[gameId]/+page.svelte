<script lang="ts">
	import { page } from '$app/stores';
	import { demoGames } from '$lib/games';
	import { gameSources } from '$lib/games/source';
	import DualViewDemo from '$lib/components/DualViewDemo.svelte';
	import { ArrowLeft, Code2 } from 'lucide-svelte';

	const gameId = $derived($page.params.gameId);
	const game = $derived(demoGames.find((g) => g.id === gameId));
	const sourceFiles = $derived(game ? gameSources[game.id] : null);

	let showCode = $state(false);
	let selectedFile = $state<string>('game.ts');
</script>

<svelte:head>
	<title>{game?.name || 'Demo'} - Martini</title>
</svelte:head>

{#if game}
	<div class="demo-page">
		<div class="demo-header">
			<div class="container">
				<a href="/" class="back-link">
					<ArrowLeft size={16} />
					Back to Home
				</a>

				<div class="demo-title-section">
					<h1>{game.name}</h1>
					<p class="demo-subtitle">{game.description}</p>
				</div>

				<div class="demo-info">
					<div class="info-grid">
						<div class="info-item">
							<span class="info-label">Players</span>
							<span class="info-value">{game.players}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Type</span>
							<span class="info-value">{game.type}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Difficulty</span>
							<span class="info-value difficulty-{game.difficulty}">{game.difficulty}</span>
						</div>
					</div>
				</div>

				<div class="controls-info">
					<h3>Controls</h3>
					<ul>
						{#each game.controls as control}
							<li>{control}</li>
						{/each}
					</ul>
				</div>

				<button class="code-toggle" onclick={() => (showCode = !showCode)}>
					<Code2 size={16} />
					{showCode ? 'Hide' : 'View'} Source Code
				</button>
			</div>
		</div>

		{#if showCode && sourceFiles}
			<div class="code-section">
				<div class="container">
					<div class="code-preview">
						<div class="code-header">
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
						</div>
						<pre class="code-content"><code>{sourceFiles[selectedFile]}</code></pre>
					</div>
				</div>
			</div>
		{/if}

		<div class="demo-content">
			<div class="container-wide">
				<DualViewDemo {game} />
			</div>
		</div>
	</div>
{:else}
	<div class="error-page">
		<div class="container">
			<h1>Demo Not Found</h1>
			<p>The demo "{gameId}" does not exist.</p>
			<a href="/" class="btn">Back to Home</a>
		</div>
	</div>
{/if}

<style>
	.demo-page {
		min-height: 100vh;
		background: #ffffff;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.container-wide {
		max-width: 1800px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.demo-header {
		background: linear-gradient(to bottom, #fafafa 0%, #ffffff 100%);
		border-bottom: 1px solid #e5e5e5;
		padding: 2rem 0;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #171717;
		text-decoration: none;
		margin-bottom: 2rem;
		transition: opacity 0.2s;
	}

	.back-link:hover {
		opacity: 0.7;
	}

	.demo-title-section {
		margin-bottom: 2rem;
	}

	.demo-title-section h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		color: #171717;
	}

	.demo-subtitle {
		font-size: 1.125rem;
		color: #525252;
		margin: 0;
	}

	.demo-info {
		margin-bottom: 2rem;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1.5rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.info-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #737373;
		font-weight: 600;
	}

	.info-value {
		font-size: 1rem;
		color: #171717;
		font-weight: 500;
		text-transform: capitalize;
	}

	.info-value.difficulty-beginner {
		color: #166534;
	}

	.info-value.difficulty-intermediate {
		color: #92400e;
	}

	.info-value.difficulty-advanced {
		color: #991b1b;
	}

	.controls-info {
		background: #fafafa;
		border: 1px solid #e5e5e5;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.controls-info h3 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: #171717;
	}

	.controls-info ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.controls-info li {
		font-size: 0.9375rem;
		color: #525252;
		padding-left: 1.5rem;
		position: relative;
	}

	.controls-info li::before {
		content: '•';
		position: absolute;
		left: 0.5rem;
		color: #171717;
	}

	.code-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: #171717;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 500;
		font-size: 0.9375rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.code-toggle:hover {
		background: #262626;
	}

	.code-section {
		background: #fafafa;
		border-bottom: 1px solid #e5e5e5;
		padding: 2rem 0;
	}

	.code-preview {
		background: white;
		border: 1px solid #e5e5e5;
		border-radius: 12px;
		overflow: hidden;
	}

	.code-header {
		background: #f5f5f5;
		border-bottom: 1px solid #e5e5e5;
	}

	.file-tabs {
		display: flex;
		gap: 0;
		overflow-x: auto;
	}

	.file-tab {
		padding: 0.75rem 1.25rem;
		background: transparent;
		border: none;
		font-size: 0.875rem;
		color: #737373;
		font-weight: 500;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.file-tab:hover {
		background: #e5e5e5;
		color: #171717;
	}

	.file-tab.active {
		color: #171717;
		border-bottom-color: #171717;
		background: white;
	}

	.code-content {
		margin: 0;
		padding: 1.5rem;
		overflow-x: auto;
	}

	.code-content code {
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
			monospace;
		font-size: 0.875rem;
		line-height: 1.7;
		color: #171717;
	}

	.demo-content {
		padding: 3rem 0;
	}

	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.error-page h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
		color: #171717;
	}

	.error-page p {
		font-size: 1.125rem;
		color: #525252;
		margin: 0 0 2rem 0;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: #171717;
		color: white;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.2s;
	}

	.btn:hover {
		background: #262626;
	}

	@media (max-width: 768px) {
		.demo-title-section h1 {
			font-size: 2rem;
		}

		.info-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
