<script lang="ts">
	/**
	 * ChatMessageList - Renders the messages container with all chat messages
	 *
	 * Includes:
	 * - Welcome placeholder when no messages
	 * - Message list with ChatMessage components
	 * - Typing indicator during streaming
	 */

	import type { Chat } from '@ai-sdk/svelte';
	import ChatMessage from './ChatMessage.svelte';

	let {
		chat,
		isStreaming,
		originalContentCache,
		onFileCreateRequested
	}: {
		chat: Chat | null;
		isStreaming: boolean;
		originalContentCache: Map<string, string>;
		onFileCreateRequested?: (
			path: string,
			content: string,
			approvalId: string,
			onApprove: () => void,
			onDeny: () => void
		) => void;
	} = $props();

	let messagesContainer: HTMLDivElement | null = $state(null);

	// Expose scroll to bottom method
	export function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}
</script>

<div class="messages" bind:this={messagesContainer}>
	{#if chat}
		<!-- Welcome placeholder when no messages -->
		{#if chat.messages.length === 0}
			<div class="welcome-placeholder">
				<h3 class="welcome-title">AI Coding Assistant</h3>
				<p class="welcome-subtitle">I can help you build your Phaser game!</p>
				<div class="welcome-suggestions">
					<p class="suggestions-title">Try asking me:</p>
					<ul class="suggestions-list">
						<li>"Show me the current game code"</li>
						<li>"List all the files in this project"</li>
						<li>"How do I add a jumping animation?"</li>
						<li>"Make the player move faster"</li>
					</ul>
				</div>
			</div>
		{/if}

		<!-- Messages -->
		{#each chat.messages as message, messageIndex (messageIndex)}
			<ChatMessage {message} {chat} {originalContentCache} {onFileCreateRequested} />
		{/each}

		<!-- Typing indicator -->
		{#if isStreaming}
			<div class="message assistant">
				<div class="typing-indicator">
					<span></span>
					<span></span>
					<span></span>
				</div>
			</div>
		{/if}
	{:else}
		<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
			Loading chat...
		</div>
	{/if}
</div>

<style>
	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		background: hsl(var(--muted) / 0.3);
		min-height: 0;
	}

	/* Scrollbar styling */
	.messages::-webkit-scrollbar {
		width: 8px;
	}

	.messages::-webkit-scrollbar-track {
		background: hsl(var(--muted) / 0.3);
	}

	.messages::-webkit-scrollbar-thumb {
		background: hsl(var(--muted-foreground) / 0.3);
		border-radius: 4px;
	}

	.messages::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--muted-foreground) / 0.5);
	}

	/* Welcome placeholder */
	.welcome-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 32px 24px;
		text-align: center;
		height: 100%;
	}

	.welcome-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		margin-bottom: 8px;
	}

	.welcome-subtitle {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		margin-bottom: 24px;
	}

	.welcome-suggestions {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 20px;
		max-width: 400px;
	}

	.suggestions-title {
		font-size: 0.8rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		margin-bottom: 12px;
	}

	.suggestions-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		text-align: left;
	}

	.suggestions-list li {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		padding: 8px 12px;
		background: hsl(var(--muted) / 0.3);
		border-radius: 6px;
		transition: all 0.2s;
		cursor: default;
	}

	.suggestions-list li:hover {
		background: hsl(var(--muted) / 0.5);
		color: hsl(var(--foreground));
	}

	/* Typing indicator */
	.message {
		max-width: 80%;
		padding: 12px 16px;
		border-radius: 12px;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.message.assistant {
		align-self: flex-start;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
	}

	.typing-indicator {
		display: flex;
		gap: 4px;
		padding: 4px 0;
	}

	.typing-indicator span {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: hsl(var(--muted-foreground));
		animation: typing 1.4s infinite;
	}

	.typing-indicator span:nth-child(2) {
		animation-delay: 0.2s;
	}

	.typing-indicator span:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes typing {
		0%,
		60%,
		100% {
			opacity: 0.3;
			transform: translateY(0);
		}
		30% {
			opacity: 1;
			transform: translateY(-8px);
		}
	}
</style>
