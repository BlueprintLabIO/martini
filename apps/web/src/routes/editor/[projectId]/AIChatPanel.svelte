<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Chat } from '@ai-sdk/svelte';
	import { ChevronDown, ChevronUp, Zap, ZapOff, Check, X } from 'lucide-svelte';
	import { applyEdits } from '$lib/utils/diff';

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

	// Track processed approvals to avoid duplicate triggers
	let processedApprovals = $state<Set<string>>(new Set());

	/**
	 * Determine when to automatically send to continue the conversation.
	 *
	 * According to AI SDK v6, after calling addToolApprovalResponse(), we need
	 * sendAutomaticallyWhen to return true to trigger the actual send.
	 *
	 * Return true ONLY when:
	 * - There are tool parts with state 'approval-responded' (user just approved/denied)
	 *
	 * Return false when:
	 * - Tool parts have state 'approval-requested' (still waiting for user)
	 * - No tool calls at all (normal conversation flow)
	 */
	function shouldAutoSend(chat: Chat): boolean {
		const lastMessage = chat.messages[chat.messages.length - 1];
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

		// Auto-send when we have responded approvals and no pending ones
		const shouldSend = hasApprovalResponses && !hasPendingApprovals;
		console.log('🤔 shouldAutoSend:', shouldSend, { hasApprovalResponses, hasPendingApprovals });
		return shouldSend;
	}

	function toggleQuickMode() {
		quickMode = !quickMode;
	}

	// Initialize chat
	console.log('🔗 Initializing chat with projectId:', projectId);
	chat = new Chat({
		api: '/api/chat',
		// No initial messages - welcome will be shown as UI placeholder
		sendAutomaticallyWhen: shouldAutoSend,
		onError: (error) => {
			console.error('Chat error:', error);
		}
	});

	// Svelte 5 reactive effect to handle approval requests
	// Watch for changes in message parts, not just message array
	$effect(() => {
		console.log('💡 $effect running - chat:', !!chat, 'onFileEditRequested:', !!onFileEditRequested);
		if (!chat || !onFileEditRequested) {
			console.log('❌ $effect early return - missing chat or callback');
			return;
		}

		// Track all messages and their parts to detect new approval requests
		const messages = chat.messages;
		console.log('📨 Processing', messages.length, 'messages');

		// Create a deep reactive dependency on message parts by accessing them
		const allParts = messages.flatMap(m => m.parts);
		console.log('🔍 Total parts across all messages:', allParts.length);

		// Use untrack to prevent infinite loops when calling triggerDiffView
		untrack(() => {
			for (const message of messages) {
				if (message.role !== 'assistant') continue;

				console.log('👀 Assistant message with', message.parts.length, 'parts:', message.parts.map(p => p.type));

				for (const part of message.parts) {
					// Check for editFile tool with approval-requested state
					if (part.type === 'tool-editFile') {
						console.log('🔧 Found tool-editFile part:', {
							hasState: 'state' in part,
							state: (part as any).state,
							hasApproval: 'approval' in part,
							approvalId: (part as any).approval?.id
						});
					}

					if (
						part.type === 'tool-editFile' &&
						'state' in part &&
						(part as any).state === 'approval-requested' &&
						'approval' in part &&
						(part as any).approval?.id
					) {
						const approvalId = (part as any).approval.id;

						// Only trigger once per approval ID
						if (!processedApprovals.has(approvalId)) {
							console.log('🔔 New approval request detected:', approvalId);
							processedApprovals.add(approvalId);

							// Quick Mode: Auto-approve without showing diff
							if (quickMode) {
								console.log('⚡ Quick Mode: Auto-approving edit');
								handleApproval(approvalId, true);
							} else {
								// Safe Mode: Show diff for manual approval
								console.log('🛡️ Safe Mode: Showing diff for approval');
								triggerDiffView(part);
							}
						} else {
							console.log('⏭️ Skipping already processed approval:', approvalId);
						}
					}
				}
			}
		});
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!chat || !input.trim() || chat.status === 'loading') return;

		// Send message with projectId metadata (server searches all messages for it)
		chat.sendMessage({
			text: input,
			metadata: { projectId }
		});
		input = '';
	}

	function handleApproval(approvalId: string, approved: boolean) {
		if (!chat) return;
		console.log(approved ? '✅ Sending approval' : '❌ Sending denial', approvalId);

		// According to AI SDK v6, addToolApprovalResponse should automatically trigger
		// a continuation request to the server. The state changes to 'approval-responded'
		// and then the SDK should send the approval to continue the conversation.
		chat.addToolApprovalResponse({
			id: approvalId,
			approved
		});

		console.log('✅ Approval response added - AI SDK should auto-continue');
	}

	/**
	 * Handle editFile approval - called when user clicks approve/deny in CodeMirror
	 */
	function handleEditFileApproval(part: any, approved: boolean) {
		const approvalId = part.approval?.id;
		if (!approvalId) {
			console.error('Missing approval ID in part:', part);
			return;
		}

		handleApproval(approvalId, approved);

		// Notify parent of completion if approved
		if (approved && part.input?.path) {
			onFileEditCompleted?.(part.input.path);
		}
	}

	/**
	 * Trigger diff view for editFile approval
	 */
	function triggerDiffView(part: any) {
		console.log('🎬 triggerDiffView called');

		if (!chat || !onFileEditRequested) {
			console.error('❌ triggerDiffView: Missing chat or callback');
			return;
		}

		const input = part.input;
		if (!input || !input.path || !input.edits) {
			console.warn('❌ triggerDiffView: Missing input data', { input, hasPath: !!input?.path, hasEdits: !!input?.edits });
			return;
		}

		console.log('📂 Looking for original content for:', input.path);

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
					console.log('✅ Found original content:', originalContent.length, 'chars');
					break;
				}
			}
			if (originalContent) break;
		}

		if (!originalContent) {
			console.warn('❌ triggerDiffView: Could not find original content for file:', input.path);
			return;
		}

		// Apply edits to get new content
		const newContent = applyEdits(originalContent, input.edits);
		console.log('✏️ Applied edits - old:', originalContent.length, 'new:', newContent.length);

		const approvalId = part.approval?.id;
		if (!approvalId) {
			console.error('❌ triggerDiffView: Missing approval ID');
			return;
		}

		console.log('🚀 Calling onFileEditRequested with approvalId:', approvalId);

		// Trigger parent's diff view
		onFileEditRequested(
			input.path,
			originalContent,
			newContent,
			approvalId,
			// On approve
			() => handleEditFileApproval(part, true),
			// On deny
			() => handleEditFileApproval(part, false)
		);
	}
</script>

<div class="ai-chat-panel">
	<!-- Header -->
	<div class="header">
		<div class="title">
			<span class="icon">🤖</span>
			<span class="text">AI Assistant</span>
			{#if chat?.status === 'loading'}
				<span class="loading-indicator">●</span>
			{/if}
		</div>

		<button
			class="quick-mode-btn"
			class:active={quickMode}
			onclick={toggleQuickMode}
			title={quickMode
				? 'Quick Mode: Auto-approve all edits without review'
				: 'Safe Mode: Review and approve each edit manually'}
		>
			{#if quickMode}
				<Zap class="h-4 w-4" />
				<span>⚡ Quick Mode</span>
			{:else}
				<ZapOff class="h-4 w-4" />
				<span>🛡️ Safe Mode</span>
			{/if}
		</button>
	</div>

	<div class="chat-content">
		<!-- Messages -->
		<div class="messages">
			{#if chat}
				<!-- Welcome placeholder when no messages -->
				{#if chat.messages.length === 0}
					<div class="welcome-placeholder">
						<div class="welcome-icon">🤖</div>
						<h3 class="welcome-title">Hi! I'm your AI coding assistant</h3>
						<p class="welcome-subtitle">I can help you build your Phaser game!</p>
						<div class="welcome-suggestions">
							<p class="suggestions-title">Try asking me:</p>
							<ul class="suggestions-list">
								<li>"Show me the current game code"</li>
								<li>"Explain how the Player.js works"</li>
								<li>"What files are in this project?"</li>
								<li>"How do I add a jumping animation?"</li>
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
								<div class="tool-call">
									<div class="tool-name">
										{#if part.type === 'tool-readFile'}
											📖 Reading {part.input && 'path' in part.input ? part.input.path : 'file'}
										{:else if part.type === 'tool-listFiles'}
											📂 Listing files...
										{:else if part.type === 'tool-editFile'}
											✏️ Editing {part.input && 'path' in part.input ? part.input.path : 'file'}
											{#if 'state' in part}
												<span class="text-xs text-muted-foreground ml-2">(State: {part.state})</span>
											{/if}
										{/if}
									</div>

									{#if part.type === 'tool-editFile' && 'state' in part && part.state === 'approval-requested'}
										<!-- Show approval UI in chat panel (diff view triggered by $effect) -->
										<div class="approval-request">
											<div class="approval-details">
												<div class="file-path">{part.input?.path || 'Unknown file'}</div>
												<div class="edits-count">
													{part.input?.edits?.length || 0} change(s) requested
												</div>
												<div class="diff-notice">
													👉 <strong>Review changes in the code editor above</strong>
												</div>
											</div>
										</div>
									{:else if part.output}
										<div class="tool-result">
											{#if part.output.error}
												<span class="error">❌ {part.output.error}</span>
											{:else if part.type === 'tool-readFile'}
												<span class="success">✅ Read {part.output.lines} lines ({part.output.size} bytes)</span>
											{:else if part.type === 'tool-listFiles'}
												<span class="success">✅ Found {part.output.total} files</span>
											{:else if part.type === 'tool-editFile'}
												<span class="success">✅ File updated ({part.output.changes?.old_lines} → {part.output.changes?.new_lines} lines)</span>
												{#if part.output.diff}
													<details class="diff-details">
														<summary>View diff</summary>
														<pre class="diff-content">{part.output.diff}</pre>
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

				{#if chat.status === 'loading'}
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

		<!-- Input -->
		{#if chat}
			<form class="input-form" onsubmit={handleSubmit}>
				<input
					bind:value={input}
					placeholder="Ask me about your game code..."
					disabled={chat.status === 'loading'}
					autocomplete="off"
				/>
				<button type="submit" disabled={chat.status === 'loading' || !input.trim()}>
					{chat.status === 'loading' ? 'Thinking...' : 'Send'}
				</button>
			</form>
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

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.quick-mode-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-right: 12px;
		padding: 6px 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		background: hsl(var(--background));
		color: hsl(var(--muted-foreground));
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.quick-mode-btn:hover {
		border-color: hsl(var(--primary));
		color: hsl(var(--foreground));
	}

	.quick-mode-btn.active {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border-color: hsl(var(--primary));
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

	.tool-calls {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid hsl(var(--border) / 0.5);
		display: flex;
		flex-direction: column;
		gap: 6px;
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

	.input-form {
		display: flex;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid hsl(var(--border));
		background: hsl(var(--background));
		flex-shrink: 0;
	}

	.input-form input {
		flex: 1;
		padding: 10px 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 0.875rem;
		transition: border-color 0.2s;
	}

	.input-form input:focus {
		outline: none;
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
	}

	.input-form input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input-form button {
		padding: 10px 20px;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.input-form button:hover:not(:disabled) {
		background: hsl(var(--primary) / 0.9);
		transform: translateY(-1px);
	}

	.input-form button:active:not(:disabled) {
		transform: translateY(0);
	}

	.input-form button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
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

	.edits-preview {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.7rem;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		margin-top: 8px;
	}

	.edit-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.edit-old {
		color: hsl(0 84% 60%);
		background: hsl(0 84% 60% / 0.1);
		padding: 2px 4px;
		border-radius: 3px;
	}

	.edit-new {
		color: hsl(142 76% 36%);
		background: hsl(142 76% 36% / 0.1);
		padding: 2px 4px;
		border-radius: 3px;
	}

	.approval-buttons {
		display: flex;
		gap: 8px;
	}

	.approve-btn,
	.deny-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		border: none;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.approve-btn {
		background: hsl(142 76% 36%);
		color: white;
	}

	.approve-btn:hover {
		background: hsl(142 76% 30%);
		transform: translateY(-1px);
	}

	.deny-btn {
		background: hsl(0 84% 60%);
		color: white;
	}

	.deny-btn:hover {
		background: hsl(0 84% 54%);
		transform: translateY(-1px);
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
</style>
