<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let activeId = $state('');
	let observer: IntersectionObserver | null = null;

	onMount(() => {
		// Find all h2 and h3 elements in the article
		const article = document.querySelector('.prose');
		if (!article) return;

		const headings = article.querySelectorAll('h2, h3');

		// Create IntersectionObserver for scroll spy
		observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
					}
				});
			},
			{
				rootMargin: '-20% 0px -35% 0px',
				threshold: 1.0
			}
		);

		// Observe all headings
		headings.forEach((heading) => {
			if (heading.id && observer) {
				observer.observe(heading);
			}
		});
	});

	onDestroy(() => {
		if (observer) {
			observer.disconnect();
		}
	});

	// Extract headings on mount
	let headings = $state<Array<{ id: string; text: string; level: number }>>([]);

	onMount(() => {
		const article = document.querySelector('.prose');
		if (!article) return;

		const headingElements = article.querySelectorAll('h2, h3');
		headings = Array.from(headingElements).map((el) => ({
			id: el.id,
			text: el.textContent || '',
			level: parseInt(el.tagName[1])
		}));
	});
</script>

{#if headings.length > 0}
	<nav class="toc">
		<h2 class="toc-title">On this page</h2>
		<ul class="toc-list">
			{#each headings as heading}
				<li
					class="toc-item"
					class:active={activeId === heading.id}
					class:level-2={heading.level === 2}
					class:level-3={heading.level === 3}
				>
					<a href="#{heading.id}" class="toc-link">
						{heading.text}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.toc {
		position: sticky;
		top: 2rem;
		max-height: calc(100vh - 4rem);
		overflow-y: auto;
		padding: 1.5rem;
		background: var(--bg-secondary, #f9fafb);
		border-radius: 8px;
		border: 1px solid var(--border-color, #e5e5e5);
	}

	.toc-title {
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-primary, #0b0a08);
		margin: 0 0 1rem 0;
	}

	.toc-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.toc-item {
		margin: 0;
	}

	.toc-item.level-2 {
		padding-left: 0;
	}

	.toc-item.level-3 {
		padding-left: 1rem;
	}

	.toc-link {
		display: block;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		color: var(--text-secondary, #525252);
		text-decoration: none;
		border-left: 2px solid transparent;
		margin-left: -0.75rem;
		transition: all 0.2s;
		border-radius: 4px;
	}

	.toc-link:hover {
		color: var(--text-primary, #0b0a08);
		background: rgba(0, 0, 0, 0.05);
	}

	.toc-item.active .toc-link {
		color: #3b82f6;
		border-left-color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
		font-weight: 500;
	}

	/* Hide scrollbar but keep functionality */
	.toc {
		scrollbar-width: thin;
		scrollbar-color: var(--border-color, #e5e5e5) transparent;
	}

	.toc::-webkit-scrollbar {
		width: 4px;
	}

	.toc::-webkit-scrollbar-track {
		background: transparent;
	}

	.toc::-webkit-scrollbar-thumb {
		background: var(--border-color, #e5e5e5);
		border-radius: 2px;
	}

	@media (max-width: 1280px) {
		.toc {
			display: none;
		}
	}
</style>
