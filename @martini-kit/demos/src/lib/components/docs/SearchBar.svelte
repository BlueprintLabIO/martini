<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Search, X } from '@lucide/svelte';
	import type Fuse from 'fuse.js';
	import {
		SEARCH_ENDPOINT,
		SEARCH_OPTIONS,
		type SearchDoc,
		type SearchIndexPayload,
		type SearchResult
	} from '$lib/search/config';

	let query = $state('');
	let isOpen = $state(false);
	let results = $state<SearchResult[]>([]);
	let inputElement = $state<HTMLInputElement>();
	let dialogElement = $state<HTMLDialogElement>();
	let isLoading = $state(false);
	let loadError = $state<string | null>(null);
	let fuse: Fuse<SearchDoc> | null = null;
	let bodyScrollLocked = false;
	let previousBodyOverflow: string | null = null;

	onMount(() => {
		function handleKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				isOpen ? closeSearch() : openSearch();
			}

			if (e.key === 'Escape' && isOpen) {
				closeSearch();
			}
		}

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	onDestroy(() => {
		unlockBodyScroll();
	});

	$effect(() => {
		const text = query.trim();
		if (fuse && text.length > 1) {
			results = fuse.search(text).slice(0, 10);
		} else {
			results = [];
		}
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		if (isOpen) {
			lockBodyScroll();
		} else {
			unlockBodyScroll();
		}
	});

	function openSearch() {
		if (isOpen) return;
		isOpen = true;
		dialogElement?.showModal();
		void ensureSearchReady();
		requestAnimationFrame(() => inputElement?.focus());
	}

	function closeSearch() {
		if (!isOpen) return;
		isOpen = false;
		dialogElement?.close();
		query = '';
		results = [];
	}

	function handleResultClick() {
		closeSearch();
	}

	async function ensureSearchReady() {
		if (fuse || isLoading) return;
		isLoading = true;
		loadError = null;

		try {
			const [{ default: Fuse }, payload] = await Promise.all([
				import('fuse.js'),
				loadSearchPayload()
			]);

			const parsedIndex = Fuse.parseIndex(payload.index);
			fuse = new Fuse(payload.docs, SEARCH_OPTIONS, parsedIndex);
		} catch (error) {
			console.error('Failed to load search index', error);
			loadError =
				error instanceof Error ? error.message : 'Failed to load search index. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function loadSearchPayload(): Promise<SearchIndexPayload> {
		const response = await fetch(SEARCH_ENDPOINT, {
			headers: {
				accept: 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`Unable to load search index (${response.status})`);
		}

		return response.json();
	}

	function retryLoading() {
		void ensureSearchReady();
	}

	function lockBodyScroll() {
		if (typeof document === 'undefined' || bodyScrollLocked) return;
		bodyScrollLocked = true;
		previousBodyOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	}

	function unlockBodyScroll() {
		if (typeof document === 'undefined' || !bodyScrollLocked) return;
		document.body.style.overflow = previousBodyOverflow ?? '';
		bodyScrollLocked = false;
	}
</script>

<!-- Search button/input trigger -->
<button class="search-trigger" onclick={openSearch}>
	<Search size={18} />
	<span>Search docs...</span>
	<kbd class="shortcut">⌘K</kbd>
</button>

<!-- Search modal -->
<dialog
	bind:this={dialogElement}
	class="search-dialog"
	oncancel={closeSearch}
	onclose={closeSearch}
>
	<div class="search-modal">
		<div class="search-header">
			<Search size={20} />
			<input
				bind:this={inputElement}
				type="text"
				bind:value={query}
				placeholder="Search documentation..."
				class="search-input"
			/>
			<button class="close-btn" onclick={closeSearch} aria-label="Close search">
				<X size={20} />
			</button>
		</div>

		{#if isLoading}
			<div class="search-status">
				<p>Loading search index…</p>
			</div>
		{:else if loadError}
			<div class="search-status error">
				<p>{loadError}</p>
				<button class="retry-btn" onclick={retryLoading}>Retry</button>
			</div>
		{:else if results.length > 0}
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
		{:else if query.trim().length > 1}
			<div class="no-results">
				<p>No results found for "{query}"</p>
			</div>
		{:else}
			<div class="search-hint">
				<p>Type to search documentation...</p>
			</div>
		{/if}
	</div>
</dialog>

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

	dialog::backdrop {
		background: rgba(7, 10, 18, 0.65);
		backdrop-filter: blur(2px);
	}

	.search-dialog {
		padding: 0;
		border: none;
		background: transparent;
		width: min(640px, 90vw);
		margin: auto;
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

	.search-status {
		padding: 2.5rem 1.5rem;
		text-align: center;
		color: var(--text-secondary);
	}

	.search-status.error {
		color: #b91c1c;
	}

	.retry-btn {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		border: 1px solid var(--border-color);
		background: transparent;
		cursor: pointer;
		color: var(--text-primary);
	}

	.retry-btn:hover {
		border-color: var(--link-color);
		color: var(--link-color);
	}

	@media (max-width: 768px) {
		.search-trigger {
			max-width: none;
		}
	}
</style>
