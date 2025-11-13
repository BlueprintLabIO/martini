<script lang="ts">
	/**
	 * AIChatPanel - AI chat interface orchestrator
	 *
	 * This is the main container component that coordinates:
	 * - Chat instance (AI SDK v6)
	 * - Conversation persistence (load, create, switch, save)
	 * - Edit file tool execution (client-side for Y.js/CRDT compatibility)
	 * - Props interface with parent component
	 *
	 * Component Architecture:
	 * - ChatHeader: Conversation selector, status indicators
	 * - ChatMessageList: Messages container with welcome placeholder
	 * - ChatInputArea: Textarea, mode toggles, send/stop controls
	 *
	 * Child components handle their own rendering and styling.
	 * This orchestrator manages state and coordinates data flow.
	 */

	import { onMount, onDestroy, untrack } from 'svelte';
	import { Chat, type UIMessage } from '@ai-sdk/svelte';
	import { applyEdits } from '$lib/utils/diff';
	import ChatHeader from './chat/ChatHeader.svelte';
	import ChatMessageList from './chat/ChatMessageList.svelte';
	import ChatInputArea from './chat/ChatInputArea.svelte';

	// Chat status type from AI SDK
	type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

	type Conversation = {
		id: string;
		projectId: string;
		title: string;
		isArchived: boolean;
		createdAt: string;
		updatedAt: string;
	};

	// Props interface with parent component
	let {
		projectId,
		onFileEditCompleted,
		onFileCreateRequested,
		hideToggles = false
	} = $props<{
		projectId: string;
		onFileEditCompleted?: (path: string, newContent?: string) => void;
		onFileCreateRequested?: (
			path: string,
			content: string,
			approvalId: string,
			onApprove: () => void,
			onDeny: () => void
		) => void;
		hideToggles?: boolean; // Hide Plan/Act toggle
	}>();

	// Core state
	let input = $state('');
	let chat: Chat | null = $state(null);
	let planMode = $state(false);
	let attachedImages = $state<Array<{ url: string; filename: string; id: string; mediaType: string }>>([]);

	// Derive chat status
	let chatStatus = $derived<ChatStatus>((chat as any)?.status ?? 'ready');
	let isStreaming = $derived<boolean>(chatStatus === 'submitted' || chatStatus === 'streaming');

	// Conversation management
	let conversations = $state<Conversation[]>([]);
	let currentConversationId = $state<string | null>(null);
	let isLoadingConversations = $state(true);
	let isSavingMessages = $state(false);
	let showConversationDropdown = $state(false);

	// Track processed approvals to avoid duplicate triggers
	let processedApprovals = $state<Set<string>>(new Set());

	// Cache original content from readFile for diff previews
	let originalContentCache = $state<Map<string, string>>(new Map());

	// Debounce timer for auto-save
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	// Debounce timer for continuation
	let continuationTimer: ReturnType<typeof setTimeout> | null = null;

	// Reference to ChatMessageList for scrolling
	let chatMessageList: any = $state(null);

	// Track the last message we auto-sent for to prevent infinite loops
	let lastAutoSentMessageId = $state<string | null>(null);

	// Load mode settings from localStorage
	function loadModeSettings() {
		if (typeof window === 'undefined') return;
		try {
			const savedPlanMode = localStorage.getItem(`martini_project_${projectId}_planMode`);
			if (savedPlanMode !== null) planMode = savedPlanMode === 'true';
		} catch (error) {
			console.error('Failed to load mode settings:', error);
		}
	}

	// Save mode settings to localStorage
	function saveModeSettings() {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(`martini_project_${projectId}_planMode`, String(planMode));
		} catch (error) {
			console.error('Failed to save mode settings:', error);
		}
	}

	// Mode toggle
	function togglePlanMode() {
		planMode = !planMode;
		saveModeSettings();
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

			// Check if the most recent conversation is empty
			if (conversations.length > 0) {
				const mostRecent = conversations[0];
				const messagesRes = await fetch(`/api/conversations/${mostRecent.id}/messages`);
				if (messagesRes.ok) {
					const messagesData = await messagesRes.json();
					const messages = messagesData.messages || [];
					if (messages.length === 0) {
						// Reuse empty conversation
						currentConversationId = mostRecent.id;
						if (chat) chat.messages = [];
						return;
					}
				}
			}

			// Create new conversation
			await createNewConversation('New Conversation');
		} catch (error) {
			console.error('Failed to load conversations:', error);
		} finally {
			isLoadingConversations = false;
		}
	}

	/**
	 * Create a new conversation (or reuse latest empty one)
	 */
	async function createNewConversation(title?: string) {
		try {
			// Check if the latest conversation (most recent) is empty
			if (conversations.length > 0) {
				const latestConversation = conversations[0]; // Already sorted by updatedAt desc

				// Fetch messages for latest conversation to check if empty
				const messagesRes = await fetch(`/api/conversations/${latestConversation.id}/messages`);
				if (messagesRes.ok) {
					const messagesData = await messagesRes.json();
					const messages = messagesData.messages || [];

					if (messages.length === 0) {
						// Latest conversation is empty - just switch to it
						if (currentConversationId !== latestConversation.id) {
							currentConversationId = latestConversation.id;
							if (chat) chat.messages = [];
						}
						return;
					}
				}
			}

			// No empty conversation found - create a new one
			const res = await fetch(`/api/projects/${projectId}/conversations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: title || 'New Conversation' })
			});
			if (!res.ok) throw new Error('Failed to create conversation');
			const data = await res.json();
			const newConversation = data.conversation;

			conversations = [newConversation, ...conversations];
			currentConversationId = newConversation.id;
			if (chat) chat.messages = [];
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
			if (chat) chat.messages = data.messages || [];
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
		}, 2000);
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

			// Auto-generate title from first user message
			const currentConv = conversations.find((c) => c.id === currentConversationId);
			if (currentConv && currentConv.title === 'New Conversation' && chat.messages.length > 0) {
				const firstUserMessage = chat.messages.find((m) => m.role === 'user');
				if (firstUserMessage) {
					const text = firstUserMessage.parts.find((p) => p.type === 'text')?.text || '';
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
			conversations = conversations.map((c) => (c.id === conversationId ? { ...c, title } : c));
		} catch (error) {
			console.error('Failed to update title:', error);
		}
	}

	/**
	 * Switch to a different conversation
	 */
	async function switchConversation(conversationId: string) {
		if (conversationId === currentConversationId) return;
		await saveMessages();
		currentConversationId = conversationId;
		await loadMessages(conversationId);
		showConversationDropdown = false;
	}

	/**
	 * Determine when to automatically continue the conversation (server-side tools only)
	 *
	 * IMPORTANT: This is ONLY evaluated during server streaming, NOT after client-side addToolResult().
	 *
	 * According to AI SDK v6 docs (line 486-514 of ai-sdk-v6-usage-guide.md):
	 * - Continue when tools complete and no pending approvals
	 * - Don't check hasTextResponse - let AI output thinking text freely
	 * - Don't prevent continuation on errors - let AI respond naturally to errors
	 *
	 * CRITICAL FIX: Track which messages we've already auto-sent for to prevent infinite loops.
	 * The AI SDK calls this function repeatedly, so we must ensure we only return true ONCE per message.
	 */
	function shouldAutoSend({ messages }: { messages: UIMessage[] }): boolean {
		const lastMessage = messages[messages.length - 1];
		if (!lastMessage || lastMessage.role !== 'assistant') return false;

		// Prevent infinite loop: Don't auto-send if we already did for this message
		if (lastMessage.id === lastAutoSentMessageId) return false;

		let hasCompletedTools = false;
		let hasPendingApprovals = false;

		for (const part of lastMessage.parts) {
			if (part.type.startsWith('tool-') && 'state' in part) {
				const state = (part as any).state;
				if (state === 'output-available' || state === 'output-error') {
					hasCompletedTools = true;
				}
				if (state === 'approval-requested') {
					hasPendingApprovals = true;
				}
			}
		}

		const shouldSend = hasCompletedTools && !hasPendingApprovals;

		// Mark this message as auto-sent to prevent repeated sends
		if (shouldSend) {
			lastAutoSentMessageId = lastMessage.id;
		}

		return shouldSend;
	}

	/**
	 * Unified continuation helper for ALL client-side tools (DEBOUNCED)
	 *
	 * CRITICAL: sendAutomaticallyWhen is ONLY evaluated during server streaming,
	 * NOT after client-side addToolResult(). We must manually trigger continuation.
	 *
	 * Uses debounce pattern to prevent duplicate messages when multiple tools
	 * complete simultaneously.
	 *
	 * Pattern from AI SDK v6 docs (line 736-770 of ai-sdk-v6-usage-guide.md):
	 * - Continue if: tools exist AND all are complete
	 * - Don't check hasTextResponse - let AI think out loud
	 * - Don't prevent on errors - let AI respond naturally to errors
	 */
	function triggerContinuationIfNeeded() {
		if (!chat) return;

		// Clear any pending continuation
		if (continuationTimer) clearTimeout(continuationTimer);

		// Debounce: wait 100ms, if another call comes in, restart timer
		continuationTimer = setTimeout(() => {
			const lastMessage = chat.messages[chat.messages.length - 1];
			if (!lastMessage || lastMessage.role !== 'assistant') return;

			let allToolsComplete = true;
			let hasAnyTools = false;

			for (const part of lastMessage.parts) {
				if (part.type.startsWith('tool-')) {
					hasAnyTools = true;
					const state = (part as any).state;
					// Block continuation if ANY tool is still pending
					if (state === 'input-streaming' || state === 'approval-requested') {
						allToolsComplete = false;
						break;
					}
				}
			}

			// Continue if: tools exist AND all are complete (including errors)
			if (hasAnyTools && allToolsComplete) {
				// Send continuation with non-empty text to satisfy Anthropic API requirements
				// The AI will process the tool results and generate a response
				chat.sendMessage({ text: '[Continue]', metadata: { projectId, planMode } });
			}

			continuationTimer = null; // Clear timer reference
		}, 100); // 100ms debounce
	}

	// Initialize chat
	chat = new Chat({
		sendAutomaticallyWhen: shouldAutoSend
	});

	/**
	 * Programmatically send a message (used by parent's "Fix with AI" button)
	 */
	export function sendMessage(message: string) {
		if (!chat) return;
		input = message;
		chat.sendMessage({
			text: message,
			metadata: { projectId }
		});
		input = '';
		debouncedSaveMessages();

		// Scroll to bottom after sending message
		setTimeout(() => {
			chatMessageList?.scrollToBottom();
		}, 100);
	}

	/**
	 * Build message with attachments for AI SDK v6
	 *
	 * Images must be sent as 'files' parameter, not as parts.
	 * Each file needs: type: 'file', mediaType, and url (not data!)
	 */
	function buildMessageWithAttachments() {
		// Convert attached images to FileUIPart format
		const files: Array<{ type: 'file'; mediaType: string; url: string; filename?: string }> = attachedImages.map(img => ({
			type: 'file' as const,
			mediaType: img.mediaType, // Use actual media type from upload
			url: img.url, // Public URL from Supabase - MUST be 'url' not 'data'
			filename: img.filename
		}));

		return {
			text: input.trim() || undefined,
			files: files.length > 0 ? files : undefined,
			metadata: { projectId, planMode }
		};
	}

	// Polling interval for tool approval detection
	let approvalPollingInterval: number;

	// Load conversations on mount
	onMount(async () => {
		loadModeSettings();
		await loadConversations();

		// Start polling for tool approvals every 100ms
		approvalPollingInterval = setInterval(() => {
			if (!chat) return;

			for (const message of chat.messages) {
				if (message.role !== 'assistant') continue;

				for (const part of message.parts) {
					// Check for editFile tool awaiting approval
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
							executeEditFileClientSide(part, approvalId);
						}
					}
				}
			}
		}, 100);
	});

	// Clean up polling interval
	onDestroy(() => {
		if (approvalPollingInterval) {
			clearInterval(approvalPollingInterval);
		}
	});

	// Auto-save when messages change
	$effect(() => {
		if (chat && chat.messages.length > 0) {
			debouncedSaveMessages();
		}
	});

	// Cache original content from readFile tool results
	$effect(() => {
		if (!chat) return;
		for (const message of chat.messages) {
			if (message.role !== 'assistant') continue;
			for (const part of message.parts) {
				if (
					part.type === 'tool-readFile' &&
					'output' in part &&
					(part as any).output?.path &&
					(part as any).output?.content
				) {
					const path = (part as any).output.path;
					const content = (part as any).output.content;
					// Always update to ensure we have the latest readFile content
					// This ensures cache stays fresh if AI re-reads a file
					originalContentCache.set(path, content);
				}
			}
		}
	});


	/**
	 * Handle captureScreenshot tool
	 */
	$effect(() => {
		if (!chat) return;

		const messages = chat.messages;

		// CRITICAL: ALL state mutations must be inside untrack()
		untrack(() => {
			for (const message of messages) {
				if (message.role !== 'assistant') continue;

				for (const part of message.parts) {
					if (
						part.type === 'tool-captureScreenshot' &&
						'state' in part &&
						(part as any).state === 'input-streaming'
					) {
						const toolCallId = (part as any).toolCallId;

						if (!processedApprovals.has(toolCallId)) {
							processedApprovals.add(toolCallId);
							executeCaptureScreenshot(part, toolCallId);
						}
					}
				}
			}
		});
	});

	/**
	 * Execute captureScreenshot tool client-side using postMessage
	 */
	function executeCaptureScreenshot(part: any, toolCallId: string) {
		if (!chat) return;

		// Find the iframe
		const iframe = document.querySelector('iframe[src="/sandbox-runtime.html"]') as HTMLIFrameElement;
		if (!iframe || !iframe.contentWindow) {
			chat.addToolResult({
				state: 'output-error',
				tool: 'captureScreenshot',
				toolCallId,
				errorText: 'Game iframe not found. Make sure the game is running.'
			});
			triggerContinuationIfNeeded();
			return;
		}

		// Set up one-time message listener for screenshot response
		const handleScreenshotResponse = (event: MessageEvent) => {
			if (!event.data || !event.data.type) return;

			const { type, payload } = event.data;

			if (type === 'SCREENSHOT_CAPTURED') {
				// Success - got the screenshot
				window.removeEventListener('message', handleScreenshotResponse);

				if (chat) {
					chat.addToolResult({
						tool: 'captureScreenshot',
						toolCallId,
						output: {
							image: payload.image,
							width: payload.width,
							height: payload.height,
							timestamp: payload.timestamp
						}
					});
					triggerContinuationIfNeeded();
				}
			} else if (type === 'SCREENSHOT_ERROR') {
				// Error from iframe
				window.removeEventListener('message', handleScreenshotResponse);

				if (chat) {
					chat.addToolResult({
						state: 'output-error',
						tool: 'captureScreenshot',
						toolCallId,
						errorText: payload.error || 'Failed to capture screenshot'
					});
					triggerContinuationIfNeeded();
				}
			}
		};

		// Listen for response
		window.addEventListener('message', handleScreenshotResponse);

		// Request screenshot from iframe
		iframe.contentWindow.postMessage({ type: 'CAPTURE_SCREENSHOT' }, '*');

		// Timeout after 5 seconds
		setTimeout(() => {
			window.removeEventListener('message', handleScreenshotResponse);
			if (chat && !processedApprovals.has(`${toolCallId}-timeout`)) {
				processedApprovals.add(`${toolCallId}-timeout`);
				// Only send error if we haven't already processed this toolCallId
				const lastMessage = chat.messages[chat.messages.length - 1];
				const toolPart = lastMessage?.parts.find((p: any) => p.toolCallId === toolCallId);
				if (toolPart && 'state' in toolPart && (toolPart as any).state === 'input-streaming') {
					chat.addToolResult({
						state: 'output-error',
						tool: 'captureScreenshot',
						toolCallId,
						errorText: 'Screenshot timeout - game may not be loaded yet'
					});
					triggerContinuationIfNeeded();
				}
			}
		}, 5000);
	}

	/**
	 * Execute editFile tool client-side - always auto-approve
	 */
	function executeEditFileClientSide(part: any, approvalId: string) {
		if (!chat) return;

		const input = part.input;
		if (!input || !input.path || !input.edits) return;

		// Plan Mode validation: Only allow editing /docs/ files
		if (planMode && !input.path.startsWith('/docs/')) {
			chat.addToolApprovalResponse({ id: approvalId, approved: false });
			chat.addToolResult({
				state: 'output-error',
				tool: 'editFile',
				toolCallId: part.toolCallId,
				errorText: `Plan mode can only edit files in /docs/ folder. To edit ${input.path}, switch to Act mode.`
			});
			triggerContinuationIfNeeded();
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
			chat.addToolApprovalResponse({ id: approvalId, approved: false });
			chat.addToolResult({
				state: 'output-error',
				tool: 'editFile',
				toolCallId: part.toolCallId,
				errorText: `Cannot edit ${input.path}: file content not found. Please use readFile first to load the file content.`
			});
			triggerContinuationIfNeeded();
			return;
		}

		try {
			const newContent = applyEdits(originalContent, input.edits);

			// Auto-approve and apply edit
			chat.addToolApprovalResponse({ id: approvalId, approved: true });

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

			onFileEditCompleted?.(input.path, newContent);

			// Update cache so next edit uses the updated content as baseline
			originalContentCache.set(input.path, newContent);

			// Trigger continuation if all tools are complete
			triggerContinuationIfNeeded();
		} catch (error) {
			chat.addToolResult({
				state: 'output-error',
				tool: 'editFile',
				toolCallId: part.toolCallId,
				errorText: `Failed to apply edits: ${error instanceof Error ? error.message : String(error)}`
			});
			triggerContinuationIfNeeded();
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!chat || (!input.trim() && attachedImages.length === 0) || isStreaming) return;

		// Clear any pending continuation when user sends new message
		if (continuationTimer) {
			clearTimeout(continuationTimer);
			continuationTimer = null;
		}

		// Build message with files (images)
		const message = buildMessageWithAttachments();

		// Send message with files and text
		chat.sendMessage(message as any);

		input = '';
		attachedImages = [];

		// Scroll to bottom after sending message
		setTimeout(() => {
			chatMessageList?.scrollToBottom();
		}, 100);
	}

	async function handleStop() {
		if (!chat) return;
		await chat.stop();
	}
</script>

<div class="ai-chat-panel">
	<ChatHeader
		{conversations}
		{currentConversationId}
		{isLoadingConversations}
		{isStreaming}
		{isSavingMessages}
		bind:showConversationDropdown
		onConversationSwitch={switchConversation}
		onNewConversation={() => createNewConversation()}
	/>

	<div class="chat-content">
		<ChatMessageList
			bind:this={chatMessageList}
			{chat}
			{isStreaming}
			{originalContentCache}
			{onFileCreateRequested}
		/>

		{#if chat}
			<ChatInputArea
				bind:input
				bind:attachedImages
				{projectId}
				{isStreaming}
				{planMode}
				{hideToggles}
				onSubmit={handleSubmit}
				onStop={handleStop}
				onTogglePlanMode={togglePlanMode}
			/>
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

	.chat-content {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}
</style>
