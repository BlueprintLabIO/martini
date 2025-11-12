<script lang="ts">
	/**
	 * DiffPreview - Displays before/after code comparison
	 *
	 * Used during AI tool execution to show what changes will be made.
	 * Renders side-by-side view of original vs modified code with context lines.
	 */

	import { diffLines, type Change } from 'diff';

	let { before, after, lineStart }: { before: string; after: string; lineStart: number } =
		$props();

	// Compute line-by-line diff
	const diffResult = $derived.by(() => {
		return diffLines(before, after);
	});
</script>

<div class="diff-preview">
	<div class="diff-preview-header">Line {lineStart}</div>
	<div class="diff-preview-panels">
		<div class="diff-preview-panel before">
			<div class="diff-preview-label">Before:</div>
			<pre class="diff-preview-code">{#each diffResult as change}<!--
				-->{#if !change.added}<!--
					-->{#each change.value.split('\n').filter(Boolean) as line}<!--
						--><span class:removed={change.removed} class:context={!change.removed && !change.added}>{change.removed ? '- ' : '  '}{line}
</span><!--
					-->{/each}<!--
				-->{/if}<!--
			-->{/each}</pre>
		</div>
		<div class="diff-preview-panel after">
			<div class="diff-preview-label">After:</div>
			<pre class="diff-preview-code">{#each diffResult as change}<!--
				-->{#if !change.removed}<!--
					-->{#each change.value.split('\n').filter(Boolean) as line}<!--
						--><span class:added={change.added} class:context={!change.removed && !change.added}>{change.added ? '+ ' : '  '}{line}
</span><!--
					-->{/each}<!--
				-->{/if}<!--
			-->{/each}</pre>
		</div>
	</div>
</div>

<style>
	.diff-preview {
		margin-top: 8px;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		overflow: hidden;
		background: hsl(var(--background));
	}

	.diff-preview-header {
		padding: 6px 10px;
		background: hsl(var(--muted) / 0.5);
		border-bottom: 1px solid hsl(var(--border));
		font-size: 0.65rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.diff-preview-panels {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
	}

	.diff-preview-panel {
		padding: 8px;
		max-height: 300px;
		overflow-x: auto;
		overflow-y: auto;
	}

	.diff-preview-panel.before {
		background: hsl(0 84% 60% / 0.05);
		border-right: 1px solid hsl(var(--border));
	}

	.diff-preview-panel.after {
		background: hsl(142 76% 36% / 0.05);
	}

	.diff-preview-label {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
		opacity: 0.7;
	}

	.diff-preview-panel.before .diff-preview-label {
		color: hsl(0 84% 60%);
	}

	.diff-preview-panel.after .diff-preview-label {
		color: hsl(142 76% 36%);
	}

	.diff-preview-code {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.65rem;
		line-height: 1.4;
		margin: 0;
		white-space: pre;
		color: hsl(var(--foreground));
	}

	.diff-preview-code span {
		display: block;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.diff-preview-code .context {
		opacity: 0.7;
	}

	.diff-preview-code .removed {
		background: hsl(0 84% 60% / 0.15);
		color: hsl(0 84% 40%);
		font-weight: 500;
	}

	.diff-preview-code .added {
		background: hsl(142 76% 36% / 0.15);
		color: hsl(142 76% 30%);
		font-weight: 500;
	}
</style>
