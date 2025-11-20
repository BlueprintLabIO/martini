<script lang="ts">
	import { selectedSDK, SDK_LABELS, type SDK } from '$lib/stores/sdkPreference';
	import type { Snippet } from 'svelte';

	interface Props {
		tabs: SDK[];
		defaultTab?: SDK;
		phaser?: Snippet;
		core?: Snippet;
		unity?: Snippet;
		unreal?: Snippet;
		godot?: Snippet;
	}

	let { tabs, defaultTab, phaser, core, unity, unreal, godot }: Props = $props();

	// Use global SDK preference if available, otherwise use defaultTab or first tab
	let activeTab = $derived(
		tabs.includes($selectedSDK) ? $selectedSDK : (defaultTab || tabs[0])
	);

	function selectTab(tab: SDK) {
		selectedSDK.set(tab);
	}

	// Map tabs to their snippets
	const tabContent: Record<SDK, Snippet | undefined> = {
		phaser,
		core,
		unity,
		unreal,
		godot
	};
</script>

<div class="code-tabs">
	<div class="tabs-header">
		{#each tabs as tab}
			<button
				class="tab-button"
				class:active={activeTab === tab}
				onclick={() => selectTab(tab)}
			>
				{SDK_LABELS[tab]}
			</button>
		{/each}
	</div>

	<div class="tabs-content">
		{#if tabContent[activeTab]}
			<div class="tab-panel" data-tab={activeTab}>
				{@render tabContent[activeTab]?.()}
			</div>
		{/if}
	</div>
</div>

<style>
	.code-tabs {
		margin: 1.5rem 0;
		border: 1px solid var(--border-color, #e5e5e5);
		border-radius: 8px;
		overflow: hidden;
		background: var(--bg-primary, #ffffff);
	}

	.tabs-header {
		display: flex;
		gap: 0;
		background: var(--bg-tertiary, #f5f5f5);
		border-bottom: 1px solid var(--border-color, #e5e5e5);
		padding: 0.25rem;
	}

	.tab-button {
		flex: 1;
		padding: 0.5rem 1rem;
		background: transparent;
		border: none;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary, #525252);
		cursor: pointer;
		transition: all 0.2s;
		border-radius: 4px;
		position: relative;
	}

	.tab-button:hover {
		color: var(--text-primary, #0b0a08);
		background: var(--bg-secondary, #f9fafb);
	}

	.tab-button.active {
		color: var(--link-color, #3b82f6);
		background: var(--bg-primary, #ffffff);
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.tab-button.active::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--link-color, #3b82f6);
	}

	.tabs-content {
		padding: 0;
	}

	.tab-panel {
		animation: fadeIn 0.2s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Remove extra spacing from nested code blocks */
	.tab-panel :global(pre) {
		margin: 0 !important;
		border: none !important;
		border-radius: 0 !important;
	}

	.tab-panel :global(> *:first-child) {
		margin-top: 0;
	}

	.tab-panel :global(> *:last-child) {
		margin-bottom: 0;
	}

	/* Handle nested content spacing */
	.tab-panel :global(> p),
	.tab-panel :global(> ul),
	.tab-panel :global(> ol),
	.tab-panel :global(> blockquote) {
		padding: 1rem 1.5rem;
		margin: 0;
	}

	.tab-panel :global(> h3),
	.tab-panel :global(> h4) {
		padding: 1rem 1.5rem 0;
		margin: 0;
	}
</style>
