<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronRight } from 'lucide-svelte';

	let breadcrumbs = $derived(() => {
		const path = $page.url.pathname;
		const segments = path.split('/').filter(Boolean);

		const crumbs = segments.map((segment, index) => {
			const href = '/' + segments.slice(0, index + 1).join('/');
			const title = segment
				.split('-')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');

			return { title, href };
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
		{:else}
			<a href={crumb.href}>{crumb.title}</a>
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
