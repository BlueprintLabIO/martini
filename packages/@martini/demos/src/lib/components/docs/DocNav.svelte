<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronDown, ChevronRight } from 'lucide-svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import SearchBar from '$lib/components/docs/SearchBar.svelte';

	interface NavItem {
		title: string;
		href?: string;
		items?: NavItem[];
	}

	const navigation: NavItem[] = [
		{
			title: 'Getting Started',
			items: [
				{ title: 'Installation', href: '/docs/getting-started/installation' },
				{ title: 'Quick Start', href: '/docs/getting-started/quick-start' }
			]
		},
		{
			title: 'API Reference',
			items: [
				{ title: '@martini/core', href: '/docs/api/core' },
				{ title: '@martini/phaser', href: '/docs/api/phaser' },
				{ title: 'Transports', href: '/docs/api/transports' }
			]
		}
	];

	let expandedSections = $state<Set<string>>(new Set(['Getting Started', 'API Reference']));

	function toggleSection(title: string) {
		if (expandedSections.has(title)) {
			expandedSections.delete(title);
		} else {
			expandedSections.add(title);
		}
		expandedSections = new Set(expandedSections);
	}
</script>

<nav class="doc-nav">
	<div class="nav-header">
		<a href="/docs" class="nav-home">Documentation</a>
		<ThemeToggle />
	</div>

	<div class="search-container">
		<SearchBar />
	</div>

	{#each navigation as section}
		<div class="nav-section">
			<button class="section-header" onclick={() => toggleSection(section.title)}>
				{#if expandedSections.has(section.title)}
					<ChevronDown size={16} />
				{:else}
					<ChevronRight size={16} />
				{/if}
				{section.title}
			</button>

			{#if expandedSections.has(section.title) && section.items}
				<ul class="section-items">
					{#each section.items as item}
						<li>
							{#if item.items}
								<!-- Nested subsection -->
								<button
									class="subsection-header"
									onclick={() => toggleSection(item.title)}
								>
									{#if expandedSections.has(item.title)}
										<ChevronDown size={14} />
									{:else}
										<ChevronRight size={14} />
									{/if}
									{item.title}
								</button>
								{#if expandedSections.has(item.title)}
									<ul class="subsection-items">
										{#each item.items as subitem}
											<li>
												<a
													href={subitem.href}
													class:active={$page.url.pathname === subitem.href}
												>
													{subitem.title}
												</a>
											</li>
										{/each}
									</ul>
								{/if}
							{:else}
								<a href={item.href} class:active={$page.url.pathname === item.href}>
									{item.title}
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/each}
</nav>

<style>
	.doc-nav {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.nav-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0 1rem 0;
		border-bottom: 1px solid var(--border-color, #e5e5e5);
		margin-bottom: 0.5rem;
	}

	.nav-home {
		font-weight: 600;
		font-size: 1.125rem;
		color: var(--text-primary, #0b0a08);
		text-decoration: none;
		flex: 1;
	}

	.nav-home:hover {
		color: var(--link-color, #3b82f6);
	}

	.search-container {
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color, #e5e5e5);
	}

	.nav-section {
		margin-bottom: 0.25rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		width: 100%;
		padding: 0.5rem;
		background: transparent;
		border: none;
		font-weight: 600;
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
		border-radius: 4px;
		color: var(--text-secondary, #525252);
		transition: all 0.15s;
	}

	.section-header:hover {
		background: var(--bg-secondary, #fafafa);
		color: var(--text-primary, #0b0a08);
	}

	.section-items {
		list-style: none;
		padding: 0;
		margin: 0.25rem 0 0.5rem 1rem;
	}

	.section-items a {
		display: block;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		color: var(--text-secondary, #525252);
		text-decoration: none;
		border-radius: 4px;
		transition: all 0.15s;
	}

	.section-items a:hover {
		background: var(--bg-secondary, #fafafa);
		color: var(--text-primary, #0b0a08);
	}

	.section-items a.active {
		background: #3b82f6;
		color: white;
		font-weight: 500;
	}

	/* Nested subsections */
	.subsection-header {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		width: 100%;
		padding: 0.375rem 0.75rem;
		background: transparent;
		border: none;
		font-size: 0.8125rem;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
		border-radius: 4px;
		color: var(--text-secondary, #525252);
		transition: all 0.15s;
	}

	.subsection-header:hover {
		background: var(--bg-tertiary, #f5f5f5);
		color: var(--text-primary, #0b0a08);
	}

	.subsection-items {
		list-style: none;
		padding: 0;
		margin: 0.25rem 0 0.5rem 1.25rem;
	}

	.subsection-items a {
		display: block;
		padding: 0.25rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--text-tertiary, #737373);
		text-decoration: none;
		border-radius: 4px;
		transition: all 0.15s;
	}

	.subsection-items a:hover {
		background: var(--bg-secondary, #fafafa);
		color: var(--text-primary, #0b0a08);
	}

	.subsection-items a.active {
		background: #3b82f6;
		color: white;
		font-weight: 500;
	}
</style>
