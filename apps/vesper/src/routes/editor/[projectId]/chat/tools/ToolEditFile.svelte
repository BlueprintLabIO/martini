<script lang="ts">
	/**
	 * ToolEditFile - Renders editFile tool in all states
	 *
	 * Edit File Approval Pattern (Pre-AI SDK v6):
	 * ==========================================
	 * Unlike createFile which uses AI SDK v6's native approval system,
	 * editFile uses a parent component callback pattern for historical reasons.
	 *
	 * This component shows a streaming diff preview, but actual approval happens
	 * in the parent component which manages the full diff view in the code editor.
	 *
	 * Flow:
	 * 1. AI generates edit → state becomes 'approval-requested'
	 * 2. This component shows a notice to "Review changes in code editor above"
	 * 3. Parent component (via onFileEditRequested) shows full diff in editor
	 * 4. User approves/denies in parent's diff view
	 * 5. Parent calls onFileEditCompleted to finalize
	 *
	 * Why different from createFile?
	 * - EditFile pre-dates AI SDK v6 approval system
	 * - EditFile needs full editor integration for diff view
	 * - Changing would require refactoring parent component's diff system
	 * - Both patterns work fine, just different architectural choices
	 */

	import DiffPreview from '../DiffPreview.svelte';
	import { extractDiffPreview } from '$lib/ai/tool-helpers';

	type ToolInput = {
		path?: string;
		edits?: Array<{ old_text: string; new_text: string }>;
	};

	type ToolOutput = {
		success?: boolean;
		path?: string;
		changes?: {
			old_lines: number;
			new_lines: number;
		};
		diff?: string;
		error?: string;
	};

	let {
		part,
		originalContentCache
	}: {
		part: any;
		originalContentCache: Map<string, string>;
	} = $props();

	// Extract typed data from part
	const input = $derived(part.input as ToolInput);
	const output = $derived(part.output as ToolOutput);
	const state = $derived('state' in part ? (part as any).state : null);

	// Compute diff preview for streaming state
	const diffPreview = $derived(() => {
		if (state !== 'input-streaming' || !input?.path || !input?.edits) return null;
		const originalContent = originalContentCache.get(input.path) || '';
		if (!originalContent) return null;
		return extractDiffPreview(originalContent, input.edits);
	});
</script>

<!-- Tool name header -->
<div class="tool-name">
	✏️ Editing {input?.path || 'file'}
	{#if state === 'input-streaming'}
		<span class="text-xs text-muted-foreground ml-2">
			<span class="streaming-indicator">●</span> Streaming...
		</span>
	{/if}
</div>

<!-- Streaming diff preview (while AI is generating edits) -->
{#if state === 'input-streaming' && input}
	{@const preview = diffPreview()}
	{#if preview}
		<DiffPreview before={preview.before} after={preview.after} lineStart={preview.lineStart} />
	{:else}
		<div class="streaming-preview">
			<div class="streaming-preview-label">Preparing changes...</div>
		</div>
	{/if}

	<!-- Approval state (auto-approved by $effect, just show brief notice) -->
{:else if state === 'approval-requested' && !output}
	<div class="approval-notice">
		<div class="approval-label">Auto-approving...</div>
		<div class="file-path">{input?.path || 'Unknown file'}</div>
	</div>

	<!-- Success/error output -->
{:else if output}
	<div class="tool-result">
		{#if output.error}
			<span class="error">❌ {output.error}</span>
		{:else}
			<span class="success"
				>✅ File updated ({output.changes?.old_lines} → {output.changes?.new_lines} lines)</span
			>
			{#if output.diff}
				<details class="diff-details">
					<summary>View diff</summary>
					<pre class="diff-content">{output.diff}</pre>
				</details>
			{/if}
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

	.streaming-indicator {
		color: hsl(var(--primary));
		animation: pulse 1s infinite;
		font-size: 1rem;
		line-height: 0;
		display: inline-block;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	.streaming-preview {
		margin-top: 8px;
		padding: 8px 10px;
		background: hsl(var(--muted) / 0.3);
		border-left: 3px solid hsl(var(--primary));
		border-radius: 4px;
		font-size: 0.7rem;
		max-height: 200px;
		overflow-y: auto;
	}

	.streaming-preview-label {
		font-weight: 600;
		color: hsl(var(--primary));
		margin-bottom: 4px;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.approval-notice {
		margin-top: 8px;
		padding: 8px 12px;
		background: hsl(var(--primary) / 0.1);
		border-left: 3px solid hsl(var(--primary));
		border-radius: 4px;
	}

	.approval-label {
		font-size: 0.7rem;
		color: hsl(var(--primary));
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
	}

	.file-path {
		font-weight: 600;
		color: hsl(var(--foreground));
		font-size: 0.75rem;
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

	.diff-details {
		margin-top: 8px;
		font-size: 0.7rem;
	}

	.diff-details summary {
		cursor: pointer;
		color: hsl(var(--primary));
		font-weight: 500;
	}

	.diff-details summary:hover {
		text-decoration: underline;
	}

	.diff-content {
		margin-top: 8px;
		padding: 8px;
		background: hsl(var(--muted));
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.65rem;
		line-height: 1.4;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
	}
</style>
