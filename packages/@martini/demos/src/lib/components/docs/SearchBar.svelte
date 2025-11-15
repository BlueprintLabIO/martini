<script lang="ts">
	import { onMount } from 'svelte';
	import { Search, X } from '@lucide/svelte';
	import { getSearchIndex } from '$lib/search';
	import type Fuse from 'fuse.js';
	import type { SearchDoc } from '$lib/search';

	let query = $state('');
	let isOpen = $state(false);
	let searchIndex: Fuse<SearchDoc> | null = null;
	let results = $state<Array<{ item: SearchDoc }>>([]);
	let inputElement = $state<HTMLInputElement>();

	onMount(() => {
		// Load search index
		getSearchIndex().then((index) => {
			searchIndex = index;
		});

		// Keyboard shortcut for Cmd+K / Ctrl+K
		function handleKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				isOpen = !isOpen;
				if (isOpen) {
					setTimeout(() => inputElement?.focus(), 100);
				}
			}

			// Escape to close
			if (e.key === 'Escape' && isOpen) {
				isOpen = false;
				query = '';
			}
		}

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	$effect(() => {
		if (searchIndex && query.length > 1) {
			results = searchIndex.search(query).slice(0, 8);
		} else {
			results = [];
		}
	});

	function closeSearch() {
		isOpen = false;
		query = '';
		results = [];
	}

	function handleResultClick() {
		closeSearch();
	}
</script>

<!-- Search button/input trigger -->
<button class="search-trigger" onclick={() => (isOpen = true)}>
	<Search size={18} />
	<span>Search docs...</span>
	<kbd class="shortcut">⌘K</kbd>
</button>

<!-- Search modal -->
{#if isOpen}
	<div class="search-overlay" role="dialog" aria-modal="true" onclick={closeSearch}>
		<div class="search-modal" onclick={(e) => e.stopPropagation()}>
			<div class="search-header">
				<Search size={20} />
				<input
					bind:this={inputElement}
					type="text"
					bind:value={query}
					placeholder="Search documentation..."
					class="search-input"
					autofocus
				/>
				<button class="close-btn" onclick={closeSearch} aria-label="Close search">
					<X size={20} />
				</button>
			</div>

			{#if results.length > 0}
				<div class="search-results">
					{#each results as result}
						<a
							href={result.item.path}
							class="result-item"
							onclick={handleResultClick}
						>
							<div class="result-content">
								<strong class="result-title">{result.item.title}</strong>
								{#if result.item.description}
									<p class="result-description">{result.item.description}</p>
								{/if}
							</div>
							<span class="result-section">{result.item.section}</span>
						</a>
					{/each}
				</div>
			{:else if query.length > 1}
				<div class="no-results">
					<p>No results found for "{query}"</p>
				</div>
			{:else}
				<div class="search-hint">
					<p>Type to search documentation...</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.search-trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.875rem;
		width: 100%;
		max-width: 300px;
	}

	.search-trigger:hover {
		background: var(--bg-secondary);
		border-color: var(--link-color);
	}

	.search-trigger span {
		flex: 1;
		text-align: left;
	}

	.shortcut {
		padding: 0.125rem 0.375rem;
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 3px;
		font-size: 0.75rem;
		font-family: monospace;
	}

	.search-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 9999;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 10vh;
		animation: fadeIn 0.2s;
	}

	.search-modal {
		width: 100%;
		max-width: 640px;
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		overflow: hidden;
		animation: slideDown 0.3s;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.search-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		font-size: 1rem;
		color: var(--text-primary);
		outline: none;
	}

	.search-input::placeholder {
		color: var(--text-tertiary);
	}

	.close-btn {
		padding: 0.25rem;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.search-results {
		max-height: 400px;
		overflow-y: auto;
	}

	.result-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.875rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
		text-decoration: none;
		color: var(--text-primary);
		transition: background 0.15s;
	}

	.result-item:hover {
		background: var(--bg-secondary);
	}

	.result-item:last-child {
		border-bottom: none;
	}

	.result-content {
		flex: 1;
		min-width: 0;
	}

	.result-title {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.25rem;
		color: var(--text-primary);
	}

	.result-description {
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-section {
		padding: 0.25rem 0.5rem;
		background: var(--bg-tertiary);
		border-radius: 4px;
		font-size: 0.75rem;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.no-results,
	.search-hint {
		padding: 3rem 1.5rem;
		text-align: center;
		color: var(--text-tertiary);
	}

	@media (max-width: 768px) {
		.search-overlay {
			padding-top: 2rem;
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.search-trigger {
			max-width: none;
		}
	}
</style>
