<script lang="ts">
	/**
	 * ToolGetConsoleLogs - Display console logs from the game
	 */

	let { part }: { part: any } = $props();

	const output = $derived(part.output);
	const hasError = $derived(part.state === 'output-error');
</script>

<div class="tool-get-console-logs">
	<div class="tool-header">
		<span class="tool-icon">📋</span>
		<span class="tool-name">Console Logs</span>
		{#if output?.total}
			<span class="tool-badge">{output.total} logs</span>
		{/if}
	</div>

	{#if hasError}
		<div class="tool-error">
			<span class="error-icon">❌</span>
			<span>{part.errorText || 'Failed to fetch console logs'}</span>
		</div>
	{:else if output}
		{#if output.message}
			<div class="tool-info">{output.message}</div>
		{/if}

		{#if output.logs && output.logs.length > 0}
			<div class="logs-container">
				{#each output.logs as log}
					<div class="log-line">{log}</div>
				{/each}
			</div>
		{:else}
			<div class="tool-info">No logs found</div>
		{/if}

		{#if output.hint}
			<div class="tool-hint">💡 {output.hint}</div>
		{/if}
	{/if}
</div>

<style>
	.tool-get-console-logs {
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

	.tool-info {
		color: hsl(var(--muted-foreground));
		font-style: italic;
	}

	.tool-hint {
		color: hsl(var(--muted-foreground));
		font-size: 0.7rem;
	}

	.logs-container {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 300px;
		overflow-y: auto;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		padding: 8px;
	}

	.log-line {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		color: hsl(var(--foreground) / 0.9);
		white-space: pre-wrap;
		word-break: break-all;
	}

	.logs-container::-webkit-scrollbar {
		width: 6px;
	}

	.logs-container::-webkit-scrollbar-track {
		background: hsl(var(--muted) / 0.3);
		border-radius: 3px;
	}

	.logs-container::-webkit-scrollbar-thumb {
		background: hsl(var(--muted-foreground) / 0.3);
		border-radius: 3px;
	}

	.logs-container::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--muted-foreground) / 0.5);
	}
</style>
