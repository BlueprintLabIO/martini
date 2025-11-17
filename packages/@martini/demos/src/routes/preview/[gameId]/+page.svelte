<script lang="ts">
	import { page } from '$app/stores';
	import MartiniIDE from '@martini/ide';
	import { getIDEConfig, getGameMetadata } from '$lib/games/ide-configs-map';

	const gameId = $derived($page.params.gameId);
	const config = $derived(getIDEConfig(gameId));
	const metadata = $derived(getGameMetadata(gameId));
</script>

<svelte:head>
	<title>{metadata?.title || 'Game Preview'} - Martini</title>
</svelte:head>

{#if config && metadata}
	<div class="demo-page">
		<header>
			<h1>{metadata.title}</h1>
			<p>{metadata.description}</p>
		</header>

		<div class="ide-container">
			<MartiniIDE {config} />
		</div>
	</div>
{:else}
	<div class="error-page">
		<div class="container">
			<h1>Game Not Found</h1>
			<p>The game "{gameId}" does not have a preview available.</p>
			<a href="/" class="btn">Back to Home</a>
		</div>
	</div>
{/if}

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
		line-height: 1.6;
	}

	header p :global(strong) {
		color: #4a9eff;
	}

	header p :global(code) {
		background: #1e1e1e;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.95em;
	}

	.ide-container {
		flex: 1;
		min-height: 0;
		padding: 1rem;
	}

	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		background: #0a0a0a;
		color: #fff;
	}

	.container {
		max-width: 600px;
		padding: 2rem;
	}

	.error-page h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
	}

	.error-page p {
		font-size: 1.125rem;
		color: #888;
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
		border: 1px solid #333;
	}

	.btn:hover {
		background: #262626;
		border-color: #444;
	}
</style>
