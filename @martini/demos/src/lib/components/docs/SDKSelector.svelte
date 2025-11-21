<script lang="ts">
	import { selectedSDK, SDK_LABELS, SDK_AVAILABLE, type SDK } from '$lib/stores/sdkPreference';
	import { ChevronDown } from '@lucide/svelte';

	let isOpen = $state(false);
	let dropdownRef: HTMLDivElement | null = null;

	const sdkOptions: SDK[] = ['phaser', 'core', 'unity', 'unreal', 'godot'];

	function selectSDK(sdk: SDK) {
		if (!SDK_AVAILABLE[sdk]) return;
		selectedSDK.set(sdk);
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<div class="sdk-selector" bind:this={dropdownRef}>
	<label class="sdk-label">SDK:</label>

	<button
		class="sdk-dropdown-trigger"
		onclick={() => isOpen = !isOpen}
		aria-label="Select SDK"
		aria-expanded={isOpen}
	>
		<span class="sdk-current">{SDK_LABELS[$selectedSDK]}</span>
		<ChevronDown size={16} class={isOpen ? 'rotated' : ''} />
	</button>

	{#if isOpen}
		<div class="sdk-dropdown">
			{#each sdkOptions as sdk}
				{@const available = SDK_AVAILABLE[sdk]}
				<button
					class="sdk-option"
					class:active={$selectedSDK === sdk}
					class:disabled={!available}
					onclick={() => selectSDK(sdk)}
					disabled={!available}
				>
					<span class="sdk-name">{SDK_LABELS[sdk]}</span>
					{#if !available}
						<span class="coming-soon">Coming Soon</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.sdk-selector {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 0;
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--border-color, #e5e5e5);
	}

	.sdk-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary, #525252);
	}

	.sdk-dropdown-trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e5e5);
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 160px;
		justify-content: space-between;
	}

	.sdk-dropdown-trigger:hover {
		border-color: var(--link-color, #3b82f6);
		background: var(--bg-secondary, #f9fafb);
	}

	.sdk-current {
		font-weight: 500;
		color: var(--text-primary, #0b0a08);
	}

	.sdk-dropdown-trigger :global(svg) {
		transition: transform 0.2s;
		color: var(--text-tertiary, #737373);
	}

	.sdk-dropdown-trigger :global(svg.rotated) {
		transform: rotate(180deg);
	}

	.sdk-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.25rem;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e5e5);
		border-radius: 6px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		z-index: 50;
		overflow: hidden;
	}

	.sdk-option {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem;
		background: transparent;
		border: none;
		text-align: left;
		cursor: pointer;
		transition: background 0.2s;
		font-size: 0.875rem;
	}

	.sdk-option:hover:not(.disabled) {
		background: var(--bg-secondary, #f9fafb);
	}

	.sdk-option.active {
		background: var(--bg-tertiary, #f5f5f5);
	}

	.sdk-option.active .sdk-name {
		font-weight: 600;
		color: var(--link-color, #3b82f6);
	}

	.sdk-option.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.sdk-name {
		color: var(--text-primary, #0b0a08);
	}

	.coming-soon {
		font-size: 0.75rem;
		color: var(--text-tertiary, #737373);
		background: var(--bg-tertiary, #f5f5f5);
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
	}

	@media (max-width: 1024px) {
		.sdk-selector {
			margin-top: 1rem;
		}
	}
</style>
