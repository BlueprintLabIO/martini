<script lang="ts">
	/**
	 * ToolReadFile - Renders readFile tool results
	 *
	 * Simple read-only tool that doesn't require approval.
	 * Just shows success/error output.
	 */

	type ToolInput = {
		path?: string;
	};

	type ToolOutput = {
		lines?: number;
		size?: number;
		error?: string;
	};

	let { part }: { part: any } = $props();

	const input = $derived(part.input as ToolInput);
	const output = $derived(part.output as ToolOutput);
</script>

<div class="tool-name">📖 Reading {input?.path || 'file'}</div>

{#if output}
	<div class="tool-result">
		{#if output.error}
			<span class="error">❌ {output.error}</span>
		{:else}
			<span class="success">✅ Read {output.lines} lines ({output.size} bytes)</span>
		{/if}
	</div>
{/if}

<style>
	.tool-name {
		color: hsl(var(--muted-foreground));
		font-weight: 500;
		font-size: 0.75rem;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
	}

	.tool-result {
		margin-top: 4px;
		font-size: 0.7rem;
	}

	.tool-result .success {
		color: hsl(142 76% 36%);
	}

	.tool-result .error {
		color: hsl(0 84% 60%);
	}
</style>
