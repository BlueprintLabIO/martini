<script lang="ts">
	import DocNav from '$lib/components/docs/DocNav.svelte';
	import Breadcrumbs from '$lib/components/docs/Breadcrumbs.svelte';
	import TableOfContents from '$lib/components/docs/TableOfContents.svelte';
	import { Menu, X } from '@lucide/svelte';

	let { children } = $props();
	let mobileMenuOpen = $state(false);

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<!-- Skip to main content for accessibility -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Mobile menu toggle button -->
<button
	class="mobile-menu-toggle"
	onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
	aria-label="Toggle mobile menu"
>
	{#if mobileMenuOpen}
		<X size={24} />
	{:else}
		<Menu size={24} />
	{/if}
</button>

<!-- Mobile menu backdrop -->
{#if mobileMenuOpen}
	<div
		class="mobile-menu-backdrop"
		role="button"
		tabindex="0"
		onclick={closeMobileMenu}
		onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}
	></div>
{/if}

<div class="docs-layout">
	<aside class="sidebar" class:mobile-open={mobileMenuOpen}>
		<DocNav />
	</aside>

	<main id="main-content" class="content">
		<Breadcrumbs />
		<article class="prose">
			{@render children?.()}
		</article>
	</main>

	<aside class="toc-sidebar">
		<TableOfContents />
	</aside>
</div>

<style>
	/* Skip link for accessibility */
	.skip-link {
		position: absolute;
		top: -40px;
		left: 0;
		background: #000;
		color: #fff;
		padding: 0.5rem 1rem;
		text-decoration: none;
		border-radius: 0 0 4px 0;
		z-index: 9999;
		transition: top 0.2s;
	}

	.skip-link:focus {
		top: 0;
	}

	/* Mobile menu toggle button */
	.mobile-menu-toggle {
		display: none;
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 1001;
		width: 44px;
		height: 44px;
		padding: 0.5rem;
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		color: var(--text-primary);
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition: all 0.2s;
	}

	.mobile-menu-toggle:hover {
		background: var(--bg-secondary);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.mobile-menu-toggle:active {
		transform: translateY(0);
	}

	/* Mobile menu backdrop */
	.mobile-menu-backdrop {
		display: none;
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
		animation: fadeIn 0.2s;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.docs-layout {
		display: grid;
		grid-template-columns: 280px 1fr 280px;
		gap: 3rem;
		max-width: 1600px;
		margin: 0 auto;
		padding: 2rem;
		min-height: calc(100vh - 64px);
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #0b0a08);
	}

	.sidebar {
		position: sticky;
		top: calc(64px + 2rem);
		height: fit-content;
		max-height: calc(100vh - 64px - 4rem);
		overflow-y: auto;
	}

	.toc-sidebar {
		position: sticky;
		top: calc(64px + 2rem);
		height: fit-content;
		max-height: calc(100vh - 64px - 4rem);
		overflow-y: auto;
	}

	.content {
		min-width: 0;
		max-width: 900px;
	}

	.prose {
		font-size: 1rem;
		line-height: 1.75;
	}

	/* Markdown styling */
	.prose :global(h1) {
		font-size: 2.5rem;
		font-weight: 700;
		line-height: 1.2;
		margin: 0 0 1.5rem 0;
		color: var(--text-primary, #0b0a08);
	}

	.prose :global(h2) {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1.3;
		margin: 3rem 0 1rem 0;
		color: var(--text-primary, #0b0a08);
		border-bottom: 1px solid var(--border-color, #e5e5e5);
		padding-bottom: 0.5rem;
		scroll-margin-top: 5rem;
		position: relative;
	}

	.prose :global(h3) {
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.4;
		margin: 2rem 0 1rem 0;
		color: var(--text-primary, #0b0a08);
		scroll-margin-top: 5rem;
		position: relative;
	}

	/* Anchor links on headings */
	.prose :global(h2 a),
	.prose :global(h3 a) {
		color: inherit;
		border: none;
		text-decoration: none;
	}

	.prose :global(h2 a):hover,
	.prose :global(h3 a):hover {
		border: none;
	}

	.prose :global(h2 a::before),
	.prose :global(h3 a::before) {
		content: '#';
		position: absolute;
		left: -1.5rem;
		opacity: 0;
		color: #9ca3af;
		font-weight: 400;
		transition: opacity 0.2s;
	}

	.prose :global(h2:hover a::before),
	.prose :global(h3:hover a::before) {
		opacity: 1;
	}

	.prose :global(h4) {
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.5;
		margin: 1.5rem 0 0.75rem 0;
		color: var(--text-primary, #0b0a08);
	}

	.prose :global(p) {
		margin: 1rem 0;
		color: var(--text-secondary, #525252);
	}

	.prose :global(a) {
		color: var(--link-color);
		text-decoration: none;
		border-bottom: 1px solid transparent;
		transition: border-color 0.2s;
	}

	.prose :global(a:hover) {
		border-bottom-color: var(--link-hover);
	}

	.prose :global(code) {
		background: var(--bg-tertiary, #f5f5f5);
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-size: 0.875em;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		color: var(--text-primary, #0b0a08);
	}

	/* Shiki-generated code blocks */
	.prose :global(pre.shiki) {
		padding: 1.5rem;
		border-radius: 8px;
		overflow-x: auto;
		margin: 1.5rem 0;
		border: 1px solid var(--border-color, #e5e5e5);
	}

	.prose :global(pre.shiki code) {
		background: transparent;
		padding: 0;
		font-size: 0.875rem;
		line-height: 1.7;
		display: block;
	}

	/* Remove extra spacing from Shiki lines */
	.prose :global(pre.shiki .line) {
		line-height: 1.7;
	}

	/* Styles for @rehype-pretty/transformers copy button */
	.prose :global(pre.shiki) {
		position: relative;
	}

	.prose :global(button.rehype-pretty-copy) {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 6px;
		cursor: pointer;
		opacity: 1 !important;
		transition: all 0.2s;
		display: flex !important;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
	}

	.prose :global(button.rehype-pretty-copy:hover) {
		background: rgba(0, 0, 0, 0.15);
	}

	.prose :global(button.rehype-pretty-copy span) {
		width: 100%;
		height: 100%;
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center;
	}

	/* Fallback for non-Shiki code blocks */
	.prose :global(pre:not(.shiki)) {
		background: #282a36;
		padding: 1.5rem;
		border-radius: 8px;
		overflow-x: auto;
		margin: 1.5rem 0;
	}

	.prose :global(pre:not(.shiki) code) {
		background: transparent;
		padding: 0;
		color: #f8f8f2;
		font-size: 0.875rem;
		line-height: 1.7;
	}

	.prose :global(ul),
	.prose :global(ol) {
		margin: 1rem 0;
		padding-left: 2rem;
	}

	.prose :global(li) {
		margin: 0.5rem 0;
		color: var(--text-secondary, #525252);
	}

	/* Enhanced styling for feature lists (list items with bold labels) */
	.prose :global(li strong) {
		color: var(--text-primary, #0b0a08);
		font-weight: 600;
	}

	/* Custom bullet styling for main content lists */
	.prose :global(ul) {
		list-style-type: disc;
	}

	.prose :global(ul li::marker) {
		color: var(--link-color, #3b82f6);
	}

	.prose :global(blockquote) {
		border-left: 4px solid var(--border-color, #e5e5e5);
		padding-left: 1rem;
		margin: 1.5rem 0;
		color: var(--text-tertiary, #737373);
		font-style: italic;
	}

	.prose :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.5rem 0;
	}

	.prose :global(th),
	.prose :global(td) {
		border: 1px solid var(--border-color, #e5e5e5);
		padding: 0.75rem;
		text-align: left;
	}

	.prose :global(th) {
		background: var(--bg-tertiary, #f5f5f5);
		font-weight: 600;
	}

	.prose :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		margin: 1.5rem 0;
	}

	.prose :global(hr) {
		border: none;
		border-top: 1px solid var(--border-color, #e5e5e5);
		margin: 3rem 0;
	}

	@media (max-width: 1280px) {
		.docs-layout {
			grid-template-columns: 280px 1fr;
			gap: 2rem;
		}

		.toc-sidebar {
			display: none;
		}
	}

	@media (max-width: 1024px) {
		.mobile-menu-toggle {
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.mobile-menu-backdrop {
			display: block;
		}

		.docs-layout {
			grid-template-columns: 1fr;
			gap: 2rem;
			padding: 1rem;
			padding-top: 4rem; /* Account for fixed mobile menu button */
		}

		.sidebar {
			position: fixed;
			left: -280px;
			top: 0;
			height: 100vh;
			width: 280px;
			background: var(--bg-primary);
			z-index: 1000;
			transition: left 0.3s ease-in-out;
			padding: 1rem;
			overflow-y: auto;
			box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
		}

		.sidebar.mobile-open {
			left: 0;
		}

		.toc-sidebar {
			display: none;
		}
	}
</style>
