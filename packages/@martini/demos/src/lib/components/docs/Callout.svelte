<script lang="ts">
	import { Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-svelte';

	interface Props {
		type?: 'info' | 'warning' | 'success' | 'danger';
		title?: string;
		children?: any;
	}

	let { type = 'info', title, children }: Props = $props();

	const icons = {
		info: Info,
		warning: AlertTriangle,
		success: CheckCircle,
		danger: AlertCircle
	};

	const Icon = icons[type];
</script>

<div class="callout callout-{type}">
	<div class="callout-header">
		<svelte:component this={Icon} size={20} />
		{#if title}
			<strong>{title}</strong>
		{/if}
	</div>
	<div class="callout-body">
		{@render children()}
	</div>
</div>

<style>
	.callout {
		margin: 1.5rem 0;
		padding: 1rem 1.25rem;
		border-left: 4px solid;
		border-radius: 4px;
	}

	.callout-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.callout-body {
		font-size: 0.9375rem;
		line-height: 1.6;
	}

	.callout-info {
		background: #eff6ff;
		border-color: #3b82f6;
		color: #1e40af;
	}

	.callout-warning {
		background: #fffbeb;
		border-color: #f59e0b;
		color: #92400e;
	}

	.callout-success {
		background: #f0fdf4;
		border-color: #22c55e;
		color: #166534;
	}

	.callout-danger {
		background: #fef2f2;
		border-color: #ef4444;
		color: #991b1b;
	}
</style>
