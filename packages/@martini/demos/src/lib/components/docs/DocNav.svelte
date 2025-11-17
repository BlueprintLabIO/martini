<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ChevronDown, ChevronRight } from 'lucide-svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import SearchBar from '$lib/components/docs/SearchBar.svelte';
	import { versions, defaultVersion } from '$lib/docs/versions';
	import { docsSections } from '$lib/docs/navigation';

	interface NavItem {
		title: string;
		href: string;
	}

	interface NavSection {
		title: string;
		items: NavItem[];
	}

	// Get current version/alias from URL (e.g., 'latest', 'v0.1', 'next')
	let currentVersion = $derived($page.params.version || defaultVersion);

	// Helper to create version-aware href
	// Replace 'latest' with current version/alias for consistent navigation
	function versionHref(path: string): string {
		return path.replace('/latest/', `/${currentVersion}/`);
	}

	// Use the comprehensive navigation structure from navigation.ts
	// Update all hrefs to use current version
	let navigation = $derived<NavSection[]>(
		docsSections.map((section) => ({
			title: section.title,
			items: section.items.map((item) => ({
				title: item.title,
				href: versionHref(item.href)
			}))
		}))
	);

	// Expand Getting Started and API Reference by default
	let expandedSections = $state<Set<string>>(new Set(['Getting Started', 'API Reference']));

	function toggleSection(title: string) {
		if (expandedSections.has(title)) {
			expandedSections.delete(title);
		} else {
			expandedSections.add(title);
		}
		expandedSections = new Set(expandedSections);
	}

	function handleVersionChange(event: Event) {
		const newVersion = (event.target as HTMLSelectElement).value;
		const currentPath = $page.url.pathname;

		// Replace current version/alias with new version
		// e.g., /docs/latest/getting-started -> /docs/v0.1/getting-started
		// e.g., /docs/v0.1/getting-started -> /docs/latest/getting-started
		const newPath = currentPath.replace(
			/\/docs\/(latest|next|v[\d.]+)\//,
			`/docs/${newVersion}/`
		);

		goto(newPath);
	}
</script>

<nav class="doc-nav">
	<div class="nav-header">
		<a href="/docs" class="nav-home">Documentation</a>
		<ThemeToggle />
	</div>

	<!-- Version Selector -->
	<div class="version-selector-container">
		<label for="version-select" class="version-label">Version</label>
		<select
			id="version-select"
			class="version-select"
			value={currentVersion}
			onchange={handleVersionChange}
		>
			<!-- Latest alias option -->
			<option value="latest">latest (v0.1 - alpha)</option>

			<!-- Actual version options -->
			{#each versions as version}
				<option value={version.id}>
					{version.label}
					{#if version.status === 'latest'}(alpha){/if}
					{#if version.status === 'next'}(next){/if}
				</option>
			{/each}
		</select>
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
							<a href={item.href} class:active={$page.url.pathname === item.href}>
								{item.title}
							</a>
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

	.version-selector-container {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border-color, #e5e5e5);
		margin-bottom: 0.75rem;
	}

	.version-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary, #525252);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.version-select {
		padding: 0.5rem 0.75rem;
		background: var(--bg-secondary, #fafafa);
		border: 1px solid var(--border-color, #e5e5e5);
		border-radius: 6px;
		font-size: 0.875rem;
		color: var(--text-primary, #0b0a08);
		cursor: pointer;
		transition: all 0.15s;
		font-weight: 500;
	}

	.version-select:hover {
		border-color: var(--link-color, #3b82f6);
		background: var(--bg-primary, #ffffff);
	}

	.version-select:focus {
		outline: none;
		border-color: var(--link-color, #3b82f6);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
