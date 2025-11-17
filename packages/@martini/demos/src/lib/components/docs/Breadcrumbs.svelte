<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronRight } from 'lucide-svelte';

	let breadcrumbs = $derived(() => {
		const path = $page.url.pathname;
		const segments = path.split('/').filter(Boolean);

		// Filter out version segments and aliases (e.g., 'latest', 'next', 'v0.1', 'v1.0')
		const isVersionSegment = (segment: string) => /^(latest|next|v\d+\.\d+)$/.test(segment);
		const filteredSegments = segments.filter((seg) => !isVersionSegment(seg));

		const crumbs = filteredSegments.map((segment, index) => {
			const href = '/' + filteredSegments.slice(0, index + 1).join('/');
			const title = segment
				.split('-')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');

			// Disable links for intermediate segments (api, guides, etc.) - only final pages should be clickable
			const isLastSegment = index === filteredSegments.length - 1;
			const isFirstSegment = index === 0; // "docs" segment
			const clickable = isFirstSegment || isLastSegment;

			return { title, href: clickable ? href : null };
		});

		return [{ title: 'Home', href: '/' }, ...crumbs];
	});
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
	{#each breadcrumbs() as crumb, i}
		{#if i > 0}
			<ChevronRight size={14} class="separator" />
		{/if}
		{#if i === breadcrumbs().length - 1}
			<span class="current">{crumb.title}</span>
		{:else if crumb.href}
			<a href={crumb.href}>{crumb.title}</a>
		{:else}
			<span>{crumb.title}</span>
		{/if}
	{/each}
</nav>

<style>
	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 2rem;
		padding: 0.75rem 0;
		font-size: 0.875rem;
		color: var(--text-tertiary, #737373);
		border-bottom: 1px solid var(--border-color, #e5e5e5);
	}

	.breadcrumbs a {
		color: var(--text-tertiary, #737373);
		text-decoration: none;
		transition: color 0.15s;
	}

	.breadcrumbs a:hover {
		color: #3b82f6;
	}

	.breadcrumbs :global(.separator) {
		color: var(--text-tertiary, #737373);
		opacity: 0.5;
	}

	.current {
		color: var(--text-primary, #0b0a08);
		font-weight: 500;
	}
</style>
