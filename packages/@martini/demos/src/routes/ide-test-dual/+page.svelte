<script lang="ts">
	import MartiniIDE from '@martini/ide';
	import type { MartiniIDEConfig } from '@martini/ide';
	import mainTemplate from './main.ts.template?raw';

	// Same game as /ide but simplified for testing
	const config: MartiniIDEConfig = {
		files: {
			'/src/main.ts': mainTemplate
		},
		engine: 'phaser',
		transport: { type: 'iframe-bridge' },
		layout: 'dual' // KEY DIFFERENCE: dual layout like /ide
	};
</script>

<svelte:head>
	<title>IDE Test - Dual Layout</title>
</svelte:head>

<div class="test-page">
	<header>
		<h1>IDE Test - Dual Layout (Player 1 + Player 2)</h1>
		<p>Same dual-player layout as /ide page</p>
		<p class="hint">⚠️ Open browser console (F12) to see keyboard event logs</p>
	</header>

	<div class="ide-container">
		<MartiniIDE {config} />
	</div>
</div>

<style>
	.test-page {
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
		font-size: 1.75rem;
		font-weight: 700;
	}

	header p {
		margin: 0.25rem 0;
		color: #888;
		font-size: 0.95rem;
	}

	header p.hint {
		color: #ff9800;
		font-weight: 600;
		margin-top: 0.75rem;
	}

	.ide-container {
		flex: 1;
		min-height: 0;
		padding: 1rem;
	}
</style>
