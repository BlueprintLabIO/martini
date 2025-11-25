<script lang="ts">
	import { Copy, Check, PencilLine, FileText } from "@lucide/svelte";
	import { onMount } from "svelte";
	import PrevNextNav from "$lib/components/docs/PrevNextNav.svelte";

	let { data } = $props();

	let copiedMarkdown = $state(false);
	let copyButtonContainer = $state<HTMLElement | null>(null);
	let articleElement = $state<HTMLElement | null>(null);
	let versionNotice = $derived.by(() => null);
	let scopeLabel = $derived.by(() => {
		const scope = data.metadata.scope;
		if (scope === "phaser") return "Phaser";
		if (scope === "agnostic") return "Engine-agnostic";
		return null;
	});

	async function copyAsMarkdown() {
		try {
			await navigator.clipboard.writeText(data.rawMarkdown);
			copiedMarkdown = true;
			setTimeout(() => {
				copiedMarkdown = false;
			}, 2000);
		} catch (err) {
			console.error("Failed to copy markdown:", err);
		}
	}

	// Move copy button next to h1 on mount
	onMount(() => {
		if (articleElement && copyButtonContainer) {
			const h1 = articleElement.querySelector("h1");

			if (h1) {
				// Create a wrapper for h1 + button
				const wrapper = document.createElement("div");
				wrapper.className = "page-header";

				// Insert wrapper before h1
				h1.parentNode?.insertBefore(wrapper, h1);

				// Move h1 into wrapper
				wrapper.appendChild(h1);

				// Clone and append button container
				const buttonClone = copyButtonContainer.cloneNode(true);
				wrapper.appendChild(buttonClone);
			}
		}
	});
</script>

<svelte:head>
	<title>{data.metadata.title || "Documentation"} | martini-kit</title>
	{#if data.metadata.description}
		<meta name="description" content={data.metadata.description} />
	{/if}
</svelte:head>

{#key data.slug}
	<!-- Copy button that will be moved next to h1 -->
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
		{#if scopeLabel}
			<div class="scope-badge">{scopeLabel}</div>
		{/if}
		{@render data.component()}
	</article>

	<PrevNextNav prev={data.prev} next={data.next} />

	<footer class="doc-footer">
		<div class="footer-actions">
			<a
				href={`https://github.com/BlueprintLabIO/martini-kit/edit/main/@martini-kit/demos/src/content/docs/${data.slug}.md`}
				target="_blank"
				rel="noopener noreferrer"
				class="footer-link"
			>
				<PencilLine size={16} />
				<span>Edit this page on GitHub</span>
			</a>

			<button onclick={copyAsMarkdown} class="footer-link footer-button">
				{#if copiedMarkdown}
					<Check size={16} />
					<span>Copied!</span>
				{:else}
					<FileText size={16} />
					<span>Copy as Markdown</span>
				{/if}
			</button>
		</div>
	</footer>
{/key}

<style>
	.doc-content {
		max-width: 100%;
	}

	/* Page header with title and copy button */
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
		display: none; /* Hidden until moved by JavaScript */
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
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.copy-markdown-btn:active {
		transform: translateY(0);
	}

	.doc-footer {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
	}

	.footer-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.footer-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #6b7280;
		text-decoration: none;
		font-size: 0.875rem;
		transition: all 0.2s;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
	}

	.footer-link:hover {
		color: #111827;
		background: rgba(0, 0, 0, 0.05);
	}

	.scope-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.6rem;
		margin-bottom: 0.5rem;
		border-radius: 999px;
		background: #eef2ff;
		color: #312e81;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.02em;
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
