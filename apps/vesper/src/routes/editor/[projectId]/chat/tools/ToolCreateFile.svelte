<script lang="ts">
	/**
	 * ToolCreateFile - Renders createFile tool in all states
	 *
	 * AI SDK v6 Tool Approval Pattern:
	 * ================================
	 * This component demonstrates the correct way to handle tool approvals in AI SDK v6.
	 *
	 * Server-side (tools.ts):
	 * - Tool has `needsApproval: true`
	 * - Tool has NO `execute` function (client-side execution only)
	 *
	 * Client-side (this component):
	 * - AI SDK automatically sets part.state to 'approval-requested'
	 * - Component renders approval UI
	 * - User clicks approve/deny
	 * - Component calls chat.addToolApprovalResponse({ id, approved })
	 * - Component calls chat.addToolResult({ tool, toolCallId, output })
	 * - Component triggers actual file creation via onFileCreateRequested callback
	 *
	 * Why NO $effect or state management needed:
	 * - The Chat class manages approval state automatically
	 * - Template renders based on part.state changes
	 * - No intermediate storage required
	 *
	 * This is DIFFERENT from editFile which uses parent component callbacks
	 * for historical reasons (editFile pre-dates AI SDK v6 approvals).
	 */

	import { Check, X } from 'lucide-svelte';
	import type { Chat } from '@ai-sdk/svelte';
	import { normalizeFilePath, countLines } from '$lib/ai/tool-helpers';

	type ToolInput = {
		path?: string;
		content?: string;
	};

	type ToolOutput = {
		success?: boolean;
		path?: string;
		lines?: number;
		size?: number;
		error?: string;
	};

	let {
		part,
		chat,
		onFileCreateRequested
	}: {
		part: any; // TODO: Type this properly with AI SDK types
		chat: Chat;
		onFileCreateRequested?: (
			path: string,
			content: string,
			approvalId: string,
			onApprove: () => void,
			onDeny: () => void
		) => void;
	} = $props();

	// Extract typed data from part
	const input = $derived(part.input as ToolInput);
	const output = $derived(part.output as ToolOutput);
	const state = $derived('state' in part ? (part as any).state : null);
	const approvalId = $derived('approval' in part ? (part as any).approval?.id : null);

	/**
	 * Handle approval button click
	 *
	 * Flow:
	 * 1. Tell AI SDK approval was given (updates conversation history)
	 * 2. Send tool result to AI (what would have been returned by execute())
	 * 3. Trigger actual file creation client-side
	 */
	function handleApprove() {
		if (!chat || !approvalId || !input.path || input.content === undefined) return;

		// Safety: Unescape content if AI sent literal \n sequences instead of actual newlines
		// This handles cases where the AI incorrectly escapes the content
		let processedContent = input.content;

		// Only unescape if we detect literal \n but NO actual newlines (means AI used wrong format)
		const hasLiteralBackslashN = processedContent.includes('\\n');
		const hasActualNewlines = processedContent.split('\n').length > 1;

		if (hasLiteralBackslashN && !hasActualNewlines) {
			console.warn('⚠️ [ToolCreateFile] Detected literal \\n sequences, unescaping...');
			processedContent = processedContent
				.replace(/\\n/g, '\n')
				.replace(/\\t/g, '\t')
				.replace(/\\r/g, '\r')
				.replace(/\\\\/g, '\\'); // Unescape backslashes last
		}

		// Step 1: Record approval in AI conversation
		chat.addToolApprovalResponse({
			id: approvalId,
			approved: true
		});

		// Step 2: Send success result to AI (simulates server execute() response)
		chat.addToolResult({
			tool: 'createFile',
			toolCallId: part.toolCallId,
			output: {
				success: true,
				path: input.path,
				lines: countLines(processedContent),
				size: processedContent.length
			}
		});

		// Step 3: Actually create the file (client-side mutation)
		const normalizedPath = normalizeFilePath(input.path);
		onFileCreateRequested?.(
			normalizedPath,
			processedContent,
			approvalId,
			() => {}, // Already approved
			() => {} // Won't be called
		);
	}

	/**
	 * Handle deny button click
	 *
	 * Flow:
	 * 1. Tell AI SDK approval was denied
	 * 2. Send error result to AI
	 * 3. No file creation happens
	 */
	function handleDeny() {
		if (!chat || !approvalId) return;

		// Step 1: Record denial in AI conversation
		chat.addToolApprovalResponse({
			id: approvalId,
			approved: false
		});

		// Step 2: Send error result to AI
		chat.addToolResult({
			state: 'output-error',
			tool: 'createFile',
			toolCallId: part.toolCallId,
			errorText: 'File creation denied by user'
		});
	}
</script>

<!-- Tool name header -->
<div class="tool-name">
	📄 Creating {input?.path || 'file'}
	{#if state === 'input-streaming'}
		<span class="text-xs text-muted-foreground ml-2">
			<span class="streaming-indicator">●</span> Streaming...
		</span>
	{/if}
</div>

<!-- Streaming preview (while AI is generating content) -->
{#if state === 'input-streaming' && input}
	<div class="create-file-preview">
		<div class="create-file-header">
			<span>📄 Creating: {input.path}</span>
		</div>
		{#if input.content}
			<div class="create-file-content">
				<pre><code>{input.content}</code></pre>
			</div>
		{:else}
			<div class="streaming-preview">
				<div class="streaming-preview-label">Preparing file content...</div>
			</div>
		{/if}
	</div>

	<!-- Approval request (AI finished generating, waiting for user) -->
{:else if state === 'approval-requested' && !output}
	<div class="approval-request">
		<div class="approval-details">
			<div class="file-path">{input?.path || 'Unknown file'}</div>
			<div class="file-info">
				New file ({input?.content ? countLines(input.content) : 0} lines)
			</div>
			{#if approvalId}
				<div class="approval-actions">
					<button class="approve-btn" onclick={handleApprove}>
						<Check class="h-4 w-4" />
						<span>Approve</span>
					</button>
					<button class="deny-btn" onclick={handleDeny}>
						<X class="h-4 w-4" />
						<span>Reject</span>
					</button>
				</div>
			{:else}
				<div class="diff-notice">⏳ Waiting for approval...</div>
			{/if}
		</div>
	</div>

	<!-- Success/error output -->
{:else if output}
	<div class="tool-result">
		{#if output.error}
			<span class="error">❌ {output.error}</span>
		{:else}
			<span class="success">✅ File created ({output.lines} lines, {output.size} bytes)</span>
		{/if}
	</div>
{/if}

<style>
	/* Tool styling */
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

	/* Preview styling */
	.create-file-preview {
		margin-top: 8px;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		overflow: hidden;
		background: hsl(var(--background));
	}

	.create-file-header {
		padding: 6px 10px;
		background: hsl(142 76% 36% / 0.1);
		border-bottom: 1px solid hsl(var(--border));
		font-size: 0.7rem;
		font-weight: 600;
		color: hsl(142 76% 36%);
	}

	.create-file-content {
		max-height: 300px;
		overflow-y: auto;
		padding: 8px;
		background: hsl(var(--muted) / 0.3);
	}

	.create-file-content pre {
		margin: 0;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.65rem;
		line-height: 1.4;
	}

	.create-file-content code {
		font-family: inherit;
		font-size: inherit;
		color: hsl(var(--foreground));
		white-space: pre-wrap;
		word-break: break-word;
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

	/* Approval request styling */
	.approval-request {
		margin-top: 8px;
		padding: 12px;
		background: hsl(var(--warning) / 0.1);
		border: 1px solid hsl(var(--warning) / 0.3);
		border-radius: 6px;
	}

	.approval-details {
		margin-bottom: 12px;
	}

	.file-path {
		font-weight: 600;
		color: hsl(var(--foreground));
		margin-bottom: 4px;
		font-size: 0.75rem;
	}

	.file-info {
		font-size: 0.7rem;
		color: hsl(var(--muted-foreground));
		margin-top: 4px;
	}

	.diff-notice {
		margin-top: 12px;
		padding: 8px 12px;
		background: hsl(var(--primary) / 0.1);
		border-left: 3px solid hsl(var(--primary));
		border-radius: 4px;
		font-size: 0.75rem;
		color: hsl(var(--foreground));
	}

	.approval-actions {
		margin-top: 12px;
		display: flex;
		gap: 8px;
	}

	.approval-actions button {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.approve-btn {
		background: hsl(142 76% 36%);
		color: white;
	}

	.approve-btn:hover {
		background: hsl(142 76% 30%);
	}

	.deny-btn {
		background: hsl(0 84% 60%);
		color: white;
	}

	.deny-btn:hover {
		background: hsl(0 84% 54%);
	}

	/* Tool result styling */
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
