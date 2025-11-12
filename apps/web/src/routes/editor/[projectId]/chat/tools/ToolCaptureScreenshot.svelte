<script lang="ts">
	/**
	 * ToolCaptureScreenshot - Display captured game screenshot
	 */

	let { part }: { part: any } = $props();

	const output = $derived(part.output);
	const hasError = $derived(part.state === 'output-error');
</script>

<div class="tool-capture-screenshot">
	<div class="tool-header">
		<span class="tool-icon">📸</span>
		<span class="tool-name">Screenshot Captured</span>
		{#if output?.width && output?.height}
			<span class="tool-badge">{output.width}×{output.height}</span>
		{/if}
	</div>

	{#if hasError}
		<div class="tool-error">
			<span class="error-icon">❌</span>
			<span>{part.errorText || 'Failed to capture screenshot'}</span>
		</div>
	{:else if output?.image}
		<div class="screenshot-container">
			<img src={output.image} alt="Game screenshot" class="screenshot-image" />
		</div>
		<div class="screenshot-info">
			<span class="info-text">Screenshot captured at {new Date(output.timestamp).toLocaleTimeString()}</span>
		</div>
	{/if}
</div>

<style>
	.tool-capture-screenshot {
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 0.75rem;
	}

	.tool-header {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 500;
		color: hsl(var(--foreground) / 0.8);
	}

	.tool-icon {
		font-size: 1rem;
	}

	.tool-badge {
		padding: 2px 6px;
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
		border-radius: 4px;
		font-size: 0.7rem;
	}

	.tool-error {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px;
		background: hsl(var(--destructive) / 0.1);
		color: hsl(var(--destructive));
		border-radius: 6px;
	}

	.screenshot-container {
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		overflow: hidden;
		background: hsl(var(--background));
	}

	.screenshot-image {
		width: 100%;
		height: auto;
		display: block;
	}

	.screenshot-info {
		display: flex;
		align-items: center;
		gap: 6px;
		color: hsl(var(--muted-foreground));
		font-size: 0.7rem;
	}

	.info-text {
		font-style: italic;
	}
</style>
