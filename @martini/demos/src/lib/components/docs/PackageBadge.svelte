<script lang="ts">
	import { Package } from 'lucide-svelte';

	interface Props {
		package: string;
		version?: string;
	}

	let { package: packageName, version }: Props = $props();

	// Extract package type for styling
	const packageType = packageName.includes('transport')
		? 'transport'
		: packageName.includes('core')
			? 'core'
			: packageName.includes('phaser')
				? 'phaser'
				: packageName.includes('devtools')
					? 'devtools'
					: packageName.includes('ide')
						? 'ide'
						: 'default';
</script>

<div class="package-badge package-{packageType}">
	<Package size={14} />
	<code>{packageName}</code>
	{#if version}
		<span class="version">v{version}</span>
	{/if}
</div>

<style>
	.package-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		margin: 0.5rem 0;
		border: 1px solid;
		width: fit-content;
	}

	.package-badge code {
		background: transparent;
		padding: 0;
		font-size: inherit;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
	}

	.version {
		opacity: 0.7;
		font-size: 0.75rem;
	}

	/* Package-specific colors */
	.package-core {
		background: #eff6ff;
		border-color: #3b82f6;
		color: #1e40af;
	}

	.package-phaser {
		background: #f0fdf4;
		border-color: #22c55e;
		color: #166534;
	}

	.package-transport {
		background: #fef3c7;
		border-color: #f59e0b;
		color: #92400e;
	}

	.package-devtools {
		background: #f3e8ff;
		border-color: #a855f7;
		color: #6b21a8;
	}

	.package-ide {
		background: #fce7f3;
		border-color: #ec4899;
		color: #9f1239;
	}

	.package-default {
		background: var(--bg-tertiary, #f5f5f5);
		border-color: var(--border-color, #e5e5e5);
		color: var(--text-secondary, #525252);
	}
</style>
