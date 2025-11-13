<script lang="ts">
	/**
	 * ChatMessage - Renders a single chat message
	 *
	 * Handles both user and assistant messages.
	 * Delegates tool parts to MessagePartTool component.
	 */

	import type { Chat } from '@ai-sdk/svelte';
	import MessagePartTool from './MessagePartTool.svelte';

	let {
		message,
		chat,
		originalContentCache,
		onFileCreateRequested
	}: {
		message: any; // UIMessage type
		chat: Chat;
		originalContentCache: Map<string, string>;
		onFileCreateRequested?: (
			path: string,
			content: string,
			approvalId: string,
			onApprove: () => void,
			onDeny: () => void
		) => void;
	} = $props();

	const isUser = $derived(message.role === 'user');
	const isAssistant = $derived(message.role === 'assistant');
</script>

<div class="message" class:user={isUser} class:assistant={isAssistant}>
	{#each message.parts as part, partIndex (partIndex)}
		{#if part.type === 'file' && part.mediaType?.startsWith('image/')}
			<!-- Display image file attachments -->
			<div class="image-attachments">
				<img src={part.url} alt={part.filename || 'Attached image'} class="attached-image" />
			</div>
		{:else if part.type === 'text'}
			<div class="content">
				{part.text}
			</div>
		{:else if part.type.startsWith('tool-')}
			<MessagePartTool {part} {chat} {originalContentCache} {onFileCreateRequested} />
		{/if}
	{/each}
</div>

<style>
	.message {
		max-width: 80%;
		padding: 12px 16px;
		border-radius: 12px;
		font-size: 0.875rem;
		line-height: 1.5;
		animation: slideIn 0.2s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.message.user {
		align-self: flex-end;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	.message.assistant {
		align-self: flex-start;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
	}

	.content {
		white-space: pre-wrap;
		word-break: break-word;
	}

	.image-attachments {
		margin-bottom: 8px;
	}

	.attached-image {
		max-width: 200px;
		max-height: 200px;
		border-radius: 8px;
		border: 1px solid hsl(var(--border));
		object-fit: contain;
		background: hsl(var(--muted));
	}
</style>
