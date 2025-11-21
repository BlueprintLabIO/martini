<script lang="ts">
	import martini-kitIDE from '@martini-kit/ide';
	import type { martini-kitIDEConfig } from '@martini-kit/ide';

	interface Props {
		title: string;
		description?: string;
		code: martini-kitIDEConfig;
		layout?: 'dual' | 'side-by-side' | 'tabs';
		height?: string;
	}

	let { title, description, code, layout = 'dual', height = '600px' }: Props = $props();
</script>

<div class="live-example">
	<header>
		<h3>{title}</h3>
		{#if description}
			<p>{description}</p>
		{/if}
	</header>

	<div class="ide-wrapper" style="height: {height}">
		<martini-kitIDE config={code} />
	</div>
</div>

<style>
	.live-example {
		margin: 2rem 0;
		border: 1px solid var(--border-color, #e5e5e5);
		border-radius: 8px;
		overflow: hidden;
		background: var(--bg-secondary, #fafafa);
	}

	header {
		padding: 1.5rem;
		background: var(--bg-primary, #ffffff);
		border-bottom: 1px solid var(--border-color, #e5e5e5);
	}

	header h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #0b0a08);
	}

	header p {
		margin: 0;
		color: var(--text-secondary, #666);
		font-size: 0.9375rem;
		line-height: 1.5;
	}

	.ide-wrapper {
		padding: 1rem;
		background: var(--bg-primary, #ffffff);
	}
</style>
