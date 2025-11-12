<script lang="ts">
	/**
	 * ChatHeader - Conversation management and status display
	 *
	 * Includes:
	 * - Conversation selector dropdown
	 * - New conversation button
	 * - Status indicators (streaming, saving)
	 */

	import { ChevronDown, Plus } from 'lucide-svelte';

	type Conversation = {
		id: string;
		projectId: string;
		title: string;
		isArchived: boolean;
		createdAt: string;
		updatedAt: string;
	};

	let {
		conversations,
		currentConversationId,
		isLoadingConversations,
		isStreaming,
		isSavingMessages,
		showConversationDropdown = $bindable(),
		onConversationSwitch,
		onNewConversation
	}: {
		conversations: Conversation[];
		currentConversationId: string | null;
		isLoadingConversations: boolean;
		isStreaming: boolean;
		isSavingMessages: boolean;
		showConversationDropdown: boolean;
		onConversationSwitch: (id: string) => void;
		onNewConversation: () => void;
	} = $props();

	const currentTitle = $derived(
		conversations.find((c) => c.id === currentConversationId)?.title || 'Select conversation'
	);
</script>

<div class="header">
	<div class="title">
		{#if isLoadingConversations}
			<span class="text">Loading...</span>
		{:else if currentConversationId}
			<!-- Conversation Selector -->
			<div class="conversation-selector">
				<button
					class="conversation-btn"
					onclick={() => (showConversationDropdown = !showConversationDropdown)}
					disabled={isStreaming}
					title={isStreaming
						? 'Cannot switch conversations while AI is thinking'
						: 'Switch conversation'}
				>
					<span class="conversation-title">
						{currentTitle}
					</span>
					<ChevronDown class="h-4 w-4" />
				</button>

				{#if showConversationDropdown}
					<div class="conversation-dropdown">
						{#each conversations.filter((c) => !c.isArchived) as conv}
							<button
								class="conversation-item"
								class:active={conv.id === currentConversationId}
								onclick={() => onConversationSwitch(conv.id)}
							>
								{conv.title}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- New Conversation Button -->
			<button
				class="new-conversation-btn"
				onclick={onNewConversation}
				disabled={isStreaming}
				title={isStreaming
					? 'Cannot create new conversation while AI is thinking'
					: 'New conversation'}
			>
				<Plus class="h-4 w-4" />
			</button>
		{/if}

		{#if isStreaming}
			<span class="loading-indicator">●</span>
		{/if}
		{#if isSavingMessages}
			<span class="saving-indicator" title="Saving...">💾</span>
		{/if}
	</div>
</div>

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		border-bottom: 1px solid hsl(var(--border));
		min-height: 48px;
		flex-shrink: 0;
	}

	.title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.loading-indicator {
		color: hsl(var(--primary));
		animation: pulse 1s infinite;
		font-size: 1.5rem;
		line-height: 0;
	}

	.saving-indicator {
		font-size: 0.875rem;
		opacity: 0.6;
		animation: pulse 1s infinite;
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

	/* Conversation Selector */
	.conversation-selector {
		position: relative;
	}

	.conversation-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		max-width: 300px;
	}

	.conversation-btn:hover:not(:disabled) {
		border-color: hsl(var(--primary));
		background: hsl(var(--muted) / 0.3);
	}

	.conversation-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.conversation-title {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.conversation-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		min-width: 200px;
		max-width: 400px;
		max-height: 300px;
		overflow-y: auto;
		background: white;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		z-index: 100;
	}

	.conversation-item {
		display: block;
		width: 100%;
		padding: 10px 14px;
		text-align: left;
		border: none;
		background: transparent;
		color: hsl(var(--foreground));
		font-size: 0.875rem;
		cursor: pointer;
		transition: background 0.2s;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.conversation-item:hover {
		background: hsl(var(--muted) / 0.5);
	}

	.conversation-item.active {
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
		font-weight: 600;
	}

	.new-conversation-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		cursor: pointer;
		transition: all 0.2s;
	}

	.new-conversation-btn:hover:not(:disabled) {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
	}

	.new-conversation-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
