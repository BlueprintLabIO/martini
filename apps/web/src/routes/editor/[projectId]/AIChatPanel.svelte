<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Chat, type UIMessage } from '@ai-sdk/svelte';
	import { ChevronDown, ChevronUp, Zap, ZapOff, Check, X, Plus, Edit2, Pause, Play, StopCircle } from 'lucide-svelte';
	import { applyEdits } from '$lib/utils/diff';

	// Chat status enum type from AI SDK
	type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

	type Conversation = {
		id: string;
		projectId: string;
		title: string;
		isArchived: boolean;
		createdAt: string;
		updatedAt: string;
	};

	type ToolInput = {
		path?: string;
		edits?: Array<any>;
	};

	type ToolOutput = {
		error?: string;
		lines?: number;
		size?: number;
		total?: number;
		changes?: {
			old_lines: number;
			new_lines: number;
		};
		diff?: string;
	};

	let {
		projectId,
		onFileEditRequested,
		onFileEditCompleted
	} = $props<{
		projectId: string;
		onFileEditRequested?: (
			path: string,
			oldContent: string,
			newContent: string,
			approvalId: string,
			onApprove: () => void,
			onDeny: () => void
		) => void;
		onFileEditCompleted?: (path: string) => void;
	}>();

	let input = $state('');
	let chat: Chat | null = $state(null);
	let quickMode = $state(false);
	let planMode = $state(false);
	let textareaElement: HTMLTextAreaElement | null = $state(null);

	// Derive chat status from chat instance
	let chatStatus = $derived<ChatStatus>((chat as any)?.status ?? 'ready');

	// Derive isStreaming from chatStatus for convenience
	let isStreaming = $derived<boolean>(chatStatus === 'submitted' || chatStatus === 'streaming');

	// Conversation management state
	let conversations = $state<Conversation[]>([]);
	let currentConversationId = $state<string | null>(null);
	let isLoadingConversations = $state(true);
	let isSavingMessages = $state(false);
	let showConversationDropdown = $state(false);

	// Track processed approvals to avoid duplicate triggers
	let processedApprovals = $state<Set<string>>(new Set());

	// Debounce timer for auto-save
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	function toggleQuickMode() {
		quickMode = !quickMode;
	}

	function togglePlanMode() {
		planMode = !planMode;
	}

	// Auto-expand textarea as user types
	function handleTextareaInput() {
		if (textareaElement) {
			textareaElement.style.height = 'auto';
			textareaElement.style.height = Math.min(textareaElement.scrollHeight, 200) + 'px';
		}
	}

	// Handle Enter key to send (Shift+Enter for new line)
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (!isStreaming && input.trim()) {
				handleSubmit(e);
			}
		}
	}

	/**
	 * Load all conversations for the project
	 */
	async function loadConversations() {
		try {
			isLoadingConversations = true;
			const res = await fetch(`/api/projects/${projectId}/conversations`);
			if (!res.ok) throw new Error('Failed to load conversations');
			const data = await res.json();
			conversations = data.conversations || [];

			// Auto-select first conversation or create one if none exist
			if (conversations.length === 0) {
				await createNewConversation('New Conversation');
			} else {
				// Select most recent conversation
				currentConversationId = conversations[0].id;
				await loadMessages(conversations[0].id);
			}
		} catch (error) {
			console.error('Failed to load conversations:', error);
		} finally {
			isLoadingConversations = false;
		}
	}

	/**
	 * Create a new conversation
	 */
	async function createNewConversation(title?: string) {
		try {
			const res = await fetch(`/api/projects/${projectId}/conversations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: title || 'New Conversation' })
			});

			if (!res.ok) throw new Error('Failed to create conversation');
			const data = await res.json();
			const newConversation = data.conversation;

			// Add to list and select
			conversations = [newConversation, ...conversations];
			currentConversationId = newConversation.id;

			// Reset chat with empty messages
			if (chat) {
				chat.messages = [];
			}
		} catch (error) {
			console.error('Failed to create conversation:', error);
		}
	}

	/**
	 * Load messages for a conversation
	 */
	async function loadMessages(conversationId: string) {
		try {
			const res = await fetch(`/api/conversations/${conversationId}/messages`);
			if (!res.ok) throw new Error('Failed to load messages');
			const data = await res.json();

			// Update chat messages
			if (chat) {
				chat.messages = data.messages || [];
			}
		} catch (error) {
			console.error('Failed to load messages:', error);
		}
	}

	/**
	 * Save messages to database (debounced)
	 */
	function debouncedSaveMessages() {
		if (saveTimer) clearTimeout(saveTimer);

		saveTimer = setTimeout(async () => {
			await saveMessages();
		}, 2000); // Save 2 seconds after last change
	}

	/**
	 * Save messages immediately
	 */
	async function saveMessages() {
		if (!chat || !currentConversationId) return;

		try {
			isSavingMessages = true;
			const res = await fetch(`/api/conversations/${currentConversationId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: chat.messages })
			});

			if (!res.ok) throw new Error('Failed to save messages');
			console.log('💾 Messages saved successfully');

			// Auto-generate title from first user message if still "New Conversation"
			const currentConv = conversations.find(c => c.id === currentConversationId);
			if (currentConv && currentConv.title === 'New Conversation' && chat.messages.length > 0) {
				const firstUserMessage = chat.messages.find(m => m.role === 'user');
				if (firstUserMessage) {
					const text = firstUserMessage.parts.find(p => p.type === 'text')?.text || '';
					const autoTitle = text.slice(0, 50).trim() || 'New Conversation';
					await updateConversationTitle(currentConversationId, autoTitle);
				}
			}
		} catch (error) {
			console.error('Failed to save messages:', error);
		} finally {
			isSavingMessages = false;
		}
	}

	/**
	 * Update conversation title
	 */
	async function updateConversationTitle(conversationId: string, title: string) {
		try {
			const res = await fetch(`/api/conversations/${conversationId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title })
			});

			if (!res.ok) throw new Error('Failed to update title');

			// Update local state
			conversations = conversations.map(c =>
				c.id === conversationId ? { ...c, title } : c
			);
		} catch (error) {
			console.error('Failed to update title:', error);
		}
	}

	/**
	 * Switch to a different conversation
	 */
	async function switchConversation(conversationId: string) {
		if (conversationId === currentConversationId) return;

		// Save current conversation first
		await saveMessages();

		// Switch to new conversation
		currentConversationId = conversationId;
		await loadMessages(conversationId);

		showConversationDropdown = false;
	}

	/**
	 * Determine when to automatically send to continue the conversation.
	 */
	function shouldAutoSend({ messages }: { messages: UIMessage[] }): boolean {
		const lastMessage = messages[messages.length - 1];
		if (!lastMessage || lastMessage.role !== 'assistant') return false;

		let hasApprovalResponses = false;
		let hasPendingApprovals = false;

		for (const part of lastMessage.parts) {
			if (part.type.startsWith('tool-') && 'state' in part) {
				const state = (part as any).state;
				if (state === 'approval-responded') {
					hasApprovalResponses = true;
				}
				if (state === 'approval-requested') {
					hasPendingApprovals = true;
				}
			}
		}

		return hasApprovalResponses && !hasPendingApprovals;
	}

	// Initialize chat
	chat = new Chat({
		sendAutomaticallyWhen: shouldAutoSend
	});

	/**
	 * Programmatically send a message to the AI
	 * Used by parent components (e.g., error overlay "Fix with AI" button)
	 */
	export function sendMessage(message: string) {
		if (!chat) return;

		input = message;
		chat.sendMessage({
			text: message,
			metadata: { projectId }
		});
		input = ''; // Clear input after sending

		// Auto-save after sending
		debouncedSaveMessages();
	}

	// Load conversations on mount
	onMount(async () => {
		await loadConversations();
	});

	// Auto-save when messages change
	$effect(() => {
		if (chat && chat.messages.length > 0) {
			debouncedSaveMessages();
		}
	});

	// Svelte 5 reactive effect to handle approval requests
	// CLIENT-SIDE EXECUTION: We execute editFile locally, then send result back to AI
	// This enables:
	// - Instant UI updates (no server round-trip)
	// - Y.js/CRDT compatibility (client owns mutations)
	// - No race conditions between DB writes and UI refreshes
	$effect(() => {
		if (!chat || !onFileEditRequested) return;

		const messages = chat.messages;
		const allParts = messages.flatMap(m => m.parts);

		untrack(() => {
			for (const message of messages) {
				if (message.role !== 'assistant') continue;

				for (const part of message.parts) {
					if (
						part.type === 'tool-editFile' &&
						'state' in part &&
						(part as any).state === 'approval-requested' &&
						'approval' in part &&
						(part as any).approval?.id
					) {
						const approvalId = (part as any).approval.id;

						if (!processedApprovals.has(approvalId)) {
							processedApprovals.add(approvalId);

							if (quickMode) {
								// Quick Mode: Auto-execute locally and approve
								executeEditFileClientSide(part, approvalId, true);
							} else {
								// Safe Mode: Show diff for manual approval, wait for user
								executeEditFileClientSide(part, approvalId, false);
							}
						}
					}
				}
			}
		});
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!chat || !input.trim() || isStreaming) return;

		chat.sendMessage({
			text: input,
			metadata: { projectId, planMode }
		});
		input = '';
	}

	async function handleStop() {
		if (!chat) return;
		await chat.stop();
	}

	/**
	 * Execute editFile tool client-side (for Y.js/CRDT compatibility)
	 *
	 * Flow:
	 * 1. Apply edits locally to client state (instant UI update)
	 * 2. Send result back to AI via addToolResult
	 * 3. Trigger onFileEditCompleted to persist to server
	 */
	function executeEditFileClientSide(part: any, approvalId: string, autoApprove: boolean) {
		if (!chat) return;

		const input = part.input;
		if (!input || !input.path || !input.edits) {
			console.error('[Client-Side Edit] Missing input data:', input);
			return;
		}

		// Plan Mode validation: Only allow editing /docs/ files
		if (planMode && !input.path.startsWith('/docs/')) {
			console.error('[Plan Mode] Cannot edit non-docs file:', input.path);

			// Auto-deny and send error to AI
			chat.addToolApprovalResponse({
				id: approvalId,
				approved: false
			});

			chat.addToolResult({
				state: 'output-error',
				tool: 'editFile',
				toolCallId: part.toolCallId,
				errorText: `Plan mode can only edit files in /docs/ folder. To edit ${input.path}, please switch to Act mode.`
			});
			return;
		}

		// Find original content from previous readFile
		let originalContent = '';
		for (let i = chat.messages.length - 1; i >= 0; i--) {
			const msg = chat.messages[i];
			for (const msgPart of msg.parts) {
				if (
					msgPart.type === 'tool-readFile' &&
					'output' in msgPart &&
					(msgPart as any).output?.path === input.path
				) {
					originalContent = (msgPart as any).output.content || '';
					break;
				}
			}
			if (originalContent) break;
		}

		if (!originalContent) {
			console.error('[Client-Side Edit] Could not find original content for:', input.path);
			return;
		}

		try {
			// Apply edits locally (client-side mutation)
			const newContent = applyEdits(originalContent, input.edits);

			if (autoApprove) {
				// Quick Mode: Apply immediately, send success result to AI
				console.log('[Client-Side Edit] Auto-applying edits to:', input.path);

				// Immediately approve in Quick Mode
				chat.addToolApprovalResponse({
					id: approvalId,
					approved: true
				});

				// Trigger UI update + server persistence
				onFileEditRequested?.(
					input.path,
					originalContent,
					newContent,
					approvalId,
					() => {
						// On approve: Send success result to AI
						chat.addToolResult({
							tool: 'editFile',
							toolCallId: part.toolCallId,
							output: {
								success: true,
								path: input.path,
								changes: {
									old_lines: originalContent.split('\n').length,
									new_lines: newContent.split('\n').length
								}
							}
						});
						onFileEditCompleted?.(input.path);
					},
					() => {
						// On deny: Send error result to AI (should never happen in Quick Mode)
						chat.addToolResult({
							state: 'output-error',
							tool: 'editFile',
							toolCallId: part.toolCallId,
							errorText: 'Edit denied by user'
						});
					}
				);
			} else {
				// Safe Mode: Show diff, wait for user approval
				onFileEditRequested?.(
					input.path,
					originalContent,
					newContent,
					approvalId,
					() => {
						// User approved: First approve, then send result
						chat.addToolApprovalResponse({
							id: approvalId,
							approved: true
						});
						chat.addToolResult({
							tool: 'editFile',
							toolCallId: part.toolCallId,
							output: {
								success: true,
								path: input.path,
								changes: {
									old_lines: originalContent.split('\n').length,
									new_lines: newContent.split('\n').length
								}
							}
						});
						onFileEditCompleted?.(input.path);
					},
					() => {
						// User denied: First deny, then send error
						chat.addToolApprovalResponse({
							id: approvalId,
							approved: false
						});
						chat.addToolResult({
							state: 'output-error',
							tool: 'editFile',
							toolCallId: part.toolCallId,
							errorText: 'Edit denied by user'
						});
					}
				);
			}
		} catch (error) {
			console.error('[Client-Side Edit] Failed to apply edits:', error);
			chat.addToolResult({
				state: 'output-error',
				tool: 'editFile',
				toolCallId: part.toolCallId,
				errorText: `Failed to apply edits: ${error instanceof Error ? error.message : String(error)}`
			});
		}
	}

	function handleApproval(approvalId: string, approved: boolean) {
		if (!chat) return;
		chat.addToolApprovalResponse({
			id: approvalId,
			approved
		});
	}

	function handleEditFileApproval(part: any, approved: boolean) {
		const approvalId = part.approval?.id;
		if (!approvalId) {
			console.error('Missing approval ID in part:', part);
			return;
		}

		handleApproval(approvalId, approved);

		if (approved && part.input?.path) {
			onFileEditCompleted?.(part.input.path);
		}
	}

	/**
	 * OLD FUNCTION - Now unused, kept for reference
	 * Safe Mode now uses executeEditFileClientSide(part, approvalId, false)
	 */
	function triggerDiffView(part: any) {
		// This function is deprecated - executeEditFileClientSide handles both modes
		console.warn('[Deprecated] triggerDiffView called - use executeEditFileClientSide instead');
	}
</script>

<div class="ai-chat-panel">
	<!-- Header -->
	<div class="header">
		<div class="title">
			{#if isLoadingConversations}
				<span class="text">Loading...</span>
			{:else if currentConversationId}
				<!-- Conversation Selector -->
				<div class="conversation-selector">
					<button
						class="conversation-btn"
						onclick={() => showConversationDropdown = !showConversationDropdown}
						disabled={isStreaming}
						title={isStreaming ? "Cannot switch conversations while AI is thinking" : "Switch conversation"}
					>
						<span class="conversation-title">
							{conversations.find(c => c.id === currentConversationId)?.title || 'Select conversation'}
						</span>
						<ChevronDown class="h-4 w-4" />
					</button>

					{#if showConversationDropdown}
						<div class="conversation-dropdown">
							{#each conversations.filter(c => !c.isArchived) as conv}
								<button
									class="conversation-item"
									class:active={conv.id === currentConversationId}
									onclick={() => switchConversation(conv.id)}
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
					onclick={() => createNewConversation()}
					disabled={isStreaming}
					title={isStreaming ? "Cannot create new conversation while AI is thinking" : "New conversation"}
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

	<div class="chat-content">
		<!-- Messages -->
		<div class="messages">
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

				{#each chat.messages as message, messageIndex (messageIndex)}
					<div class="message" class:user={message.role === 'user'} class:assistant={message.role === 'assistant'}>
						{#each message.parts as part, partIndex (partIndex)}
							{#if part.type === 'text'}
								<div class="content">
									{part.text}
								</div>
							{:else if part.type === 'tool-readFile' || part.type === 'tool-listFiles' || part.type === 'tool-editFile'}
								{@const input = part.input as ToolInput}
								<div class="tool-call">
									<div class="tool-name">
										{#if part.type === 'tool-readFile'}
											📖 Reading {input?.path || 'file'}
										{:else if part.type === 'tool-listFiles'}
											📂 Listing files...
										{:else if part.type === 'tool-editFile'}
											✏️ Editing {input?.path || 'file'}
											{#if 'state' in part && part.state === 'input-streaming'}
												<span class="text-xs text-muted-foreground ml-2">
													<span class="streaming-indicator">●</span> Streaming...
												</span>
											{/if}
										{/if}
									</div>

									{#if part.type === 'tool-editFile' && 'state' in part && part.state === 'input-streaming' && input}
										<div class="streaming-preview">
											<div class="streaming-preview-label">Preview:</div>
											<pre class="streaming-preview-content">{JSON.stringify(input, null, 2)}</pre>
										</div>
									{:else if part.type === 'tool-editFile' && 'state' in part && part.state === 'approval-requested'}
										<div class="approval-request">
											<div class="approval-details">
												<div class="file-path">{input?.path || 'Unknown file'}</div>
												<div class="edits-count">
													{input?.edits?.length || 0} change(s) requested
												</div>
												<div class="diff-notice">
													👉 <strong>Review changes in the code editor above</strong>
												</div>
											</div>
										</div>
									{:else if part.output}
										{@const output = part.output as ToolOutput}
										<div class="tool-result">
											{#if output.error}
												<span class="error">❌ {output.error}</span>
											{:else if part.type === 'tool-readFile'}
												<span class="success">✅ Read {output.lines} lines ({output.size} bytes)</span>
											{:else if part.type === 'tool-listFiles'}
												<span class="success">✅ Found {output.total} files</span>
											{:else if part.type === 'tool-editFile'}
												<span class="success">✅ File updated ({output.changes?.old_lines} → {output.changes?.new_lines} lines)</span>
												{#if output.diff}
													<details class="diff-details">
														<summary>View diff</summary>
														<pre class="diff-content">{output.diff}</pre>
													</details>
												{/if}
											{/if}
										</div>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				{/each}

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

		<!-- Input Area -->
		{#if chat}
			<div class="input-area">
				<form class="input-form" onsubmit={handleSubmit}>
					<textarea
						bind:value={input}
						bind:this={textareaElement}
						oninput={handleTextareaInput}
						onkeydown={handleKeyDown}
						placeholder={isStreaming ? "AI is thinking... (type to queue next message)" : "Press Enter to send, Shift+Enter for new line"}
						autocomplete="off"
						rows="1"
					></textarea>
				</form>

				<!-- Controls Row -->
				<div class="controls-row">
					<div class="mode-toggles">
						<button
							class="mode-toggle-btn"
							class:active={planMode}
							onclick={togglePlanMode}
							title={planMode
								? 'Plan Mode: Generate game specs and documentation'
								: 'Act Mode: Generate and edit game code'}
							type="button"
						>
							{#if planMode}
								<Pause class="h-4 w-4" />
								<span>Plan</span>
							{:else}
								<Play class="h-4 w-4" />
								<span>Act</span>
							{/if}
						</button>

						<button
							class="mode-toggle-btn"
							class:active={quickMode}
							onclick={toggleQuickMode}
							title={quickMode
								? 'Quick Mode: Auto-approve all edits without review'
								: 'Safe Mode: Review and approve each edit manually'}
							type="button"
						>
							{#if quickMode}
								<Zap class="h-4 w-4" />
								<span>Quick</span>
							{:else}
								<ZapOff class="h-4 w-4" />
								<span>Safe</span>
							{/if}
						</button>
					</div>

					{#if isStreaming}
						<button
							class="stop-btn"
							onclick={handleStop}
							type="button"
						>
							<StopCircle class="h-4 w-4" />
							<span>Stop</span>
						</button>
					{:else}
						<button
							class="send-btn"
							onclick={handleSubmit}
							disabled={!input.trim()}
							type="button"
						>
							Send
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.ai-chat-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: hsl(var(--background));
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		border-bottom: 1px solid hsl(var(--border));
		min-height: 48px;
		flex-shrink: 0;
	}

	.chat-content {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.icon {
		font-size: 1.25rem;
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
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
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
		background: hsl(var(--background));
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

	.tool-call {
		font-size: 0.75rem;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		background: hsl(var(--muted) / 0.5);
		padding: 6px 8px;
		border-radius: 6px;
	}

	.tool-name {
		color: hsl(var(--muted-foreground));
		font-weight: 500;
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
		0%, 60%, 100% {
			opacity: 0.3;
			transform: translateY(0);
		}
		30% {
			opacity: 1;
			transform: translateY(-8px);
		}
	}

	/* Input Area */
	.input-area {
		border-top: 1px solid hsl(var(--border));
		background: hsl(var(--background));
		flex-shrink: 0;
	}

	.input-form {
		padding: 12px 16px 0 16px;
	}

	.input-form textarea {
		width: 100%;
		min-height: 42px;
		max-height: 200px;
		padding: 10px 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 0.875rem;
		font-family: inherit;
		line-height: 1.5;
		resize: none;
		overflow-y: auto;
		transition: border-color 0.2s;
	}

	.input-form textarea:focus {
		outline: none;
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
	}

	.input-form textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Controls Row */
	.controls-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 16px 12px 16px;
		gap: 8px;
		flex-wrap: wrap;
	}

	.mode-toggles {
		display: flex;
		gap: 6px;
	}

	.mode-toggle-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.mode-toggle-btn:hover {
		background: hsl(var(--muted) / 0.8);
		border-color: hsl(var(--primary) / 0.5);
	}

	.mode-toggle-btn.active {
		background: hsl(var(--primary) / 0.15);
		color: hsl(var(--primary));
		border-color: hsl(var(--primary));
		font-weight: 600;
	}

	.mode-toggle-btn :global(svg) {
		flex-shrink: 0;
	}

	.send-btn,
	.stop-btn {
		padding: 8px 24px;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.send-btn {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	.send-btn:hover:not(:disabled) {
		background: hsl(var(--primary) / 0.9);
		transform: translateY(-1px);
	}

	.send-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.stop-btn {
		background: hsl(0 84% 60%);
		color: white;
	}

	.stop-btn:hover {
		background: hsl(0 84% 50%);
		transform: translateY(-1px);
	}

	.stop-btn:active {
		transform: translateY(0);
	}

	.stop-btn :global(svg) {
		flex-shrink: 0;
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

	/* Approval UI Styles */
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
	}

	.edits-count {
		font-size: 0.7rem;
		color: hsl(var(--muted-foreground));
		margin-bottom: 8px;
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

	/* Welcome Placeholder Styles */
	.welcome-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 32px 24px;
		text-align: center;
		height: 100%;
	}

	.welcome-icon {
		font-size: 3rem;
		margin-bottom: 16px;
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

	/* Streaming Preview Styles */
	.streaming-indicator {
		color: hsl(var(--primary));
		animation: pulse 1s infinite;
		font-size: 1rem;
		line-height: 0;
		display: inline-block;
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

	.streaming-preview-content {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		white-space: pre-wrap;
		word-break: break-word;
		color: hsl(var(--foreground));
		margin: 0;
		line-height: 1.4;
		font-size: 0.65rem;
	}
</style>
