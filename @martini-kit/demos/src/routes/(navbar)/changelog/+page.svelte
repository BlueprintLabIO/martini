<script lang="ts">
	import { Copy, Check } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	let copiedMarkdown = $state(false);
	let copyButtonContainer = $state<HTMLElement | null>(null);
	let articleElement = $state<HTMLElement | null>(null);

	async function copyAsMarkdown() {
		try {
			await navigator.clipboard.writeText(data.rawMarkdown);
			copiedMarkdown = true;
			setTimeout(() => {
				copiedMarkdown = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy markdown:', err);
		}
	}

	// Move copy button next to h1 on mount
	onMount(() => {
		if (articleElement && copyButtonContainer) {
			const h1 = articleElement.querySelector('h1');

			if (h1) {
				const wrapper = document.createElement('div');
				wrapper.className = 'page-header';
				h1.parentNode?.insertBefore(wrapper, h1);
				wrapper.appendChild(h1);
				const buttonClone = copyButtonContainer.cloneNode(true);
				wrapper.appendChild(buttonClone);
			}
		}
	});
</script>

<svelte:head>
	<title>{data.metadata.title || 'Changelog'} | martini-kit</title>
	{#if data.metadata.description}
		<meta name="description" content={data.metadata.description} />
	{/if}
</svelte:head>

{#key data.metadata.title}
	<div bind:this={copyButtonContainer} class="copy-button-container">
		<button onclick={copyAsMarkdown} class="copy-markdown-btn">
			{#if copiedMarkdown}
				<Check size={18} />
				<span>Copied!</span>
			{:else}
				<Copy size={18} />
				<span>Copy Markdown</span>
			{/if}
		</button>
	</div>

	<article class="doc-content" bind:this={articleElement}>
		{@render data.component()}
	</article>
{/key}

<style>
	.doc-content {
		max-width: 100%;
	}

	:global(.page-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	:global(.page-header h1) {
		margin: 0;
		flex: 1;
		min-width: 0;
	}

	.copy-button-container {
		display: none;
	}

	:global(.page-header .copy-button-container) {
		display: block;
	}

	.copy-markdown-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: #3b82f6;
		color: white;
		border: 1px solid #2563eb;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.copy-markdown-btn:hover {
		background: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.copy-markdown-btn:active {
		transform: translateY(0);
	}

	@media (max-width: 640px) {
		:global(.page-header) {
			flex-direction: column;
			align-items: flex-start;
		}

		.copy-markdown-btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
