<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { DocsPage } from '$lib/docs/navigation';

	let { prev, next }: { prev: DocsPage | null; next: DocsPage | null } = $props();
</script>

{#if prev || next}
	<nav class="prev-next">
		{#if prev}
			<a href={prev.href} class="prev-link">
				<ChevronLeft size={20} />
				<div class="link-content">
					<span class="label">Previous</span>
					<span class="title">{prev.title}</span>
				</div>
			</a>
		{:else}
			<div></div>
		{/if}

		{#if next}
			<a href={next.href} class="next-link">
				<div class="link-content">
					<span class="label">Next</span>
					<span class="title">{next.title}</span>
				</div>
				<ChevronRight size={20} />
			</a>
		{/if}
	</nav>
{/if}

<style>
	.prev-next {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border-color);
	}

	.prev-link,
	.next-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		text-decoration: none;
		color: var(--text-primary);
		transition: all 0.2s;
	}

	.prev-link {
		justify-content: flex-start;
	}

	.next-link {
		justify-content: flex-end;
		text-align: right;
		grid-column: 2;
	}

	.prev-link:hover,
	.next-link:hover {
		background: var(--bg-tertiary);
		border-color: var(--link-color);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.link-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
	}

	.title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	@media (max-width: 640px) {
		.prev-next {
			grid-template-columns: 1fr;
		}

		.next-link {
			grid-column: 1;
			justify-content: flex-start;
			text-align: left;
		}
	}
</style>
