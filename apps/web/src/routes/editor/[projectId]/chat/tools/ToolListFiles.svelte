<script lang="ts">
	/**
	 * ToolListFiles - Renders listFiles tool results
	 *
	 * Simple read-only tool that doesn't require approval.
	 * Just shows success/error output.
	 */

	type ToolOutput = {
		total?: number;
		error?: string;
	};

	let { part }: { part: any } = $props();

	const output = $derived(part.output as ToolOutput);
</script>

<div class="tool-name">📂 Listing files...</div>

{#if output}
	<div class="tool-result">
		{#if output.error}
			<span class="error">❌ {output.error}</span>
		{:else}
			<span class="success">✅ Found {output.total} files</span>
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
