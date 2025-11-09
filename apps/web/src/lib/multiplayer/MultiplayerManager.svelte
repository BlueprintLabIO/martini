<script lang="ts">
	/**
	 * MultiplayerManager - Component to manage multiplayer connections
	 *
	 * Handles:
	 * - Host/client role selection
	 * - P2P peer management via Trystero
	 * - Lobby approval UI
	 * - Communication with game sandbox
	 */

	import { Multiplayer } from './Multiplayer';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { Check, X, Users, Copy, Loader } from 'lucide-svelte';

	let {
		projectId,
		iframeEl,
		onError
	}: {
		projectId: string;
		iframeEl: HTMLIFrameElement | null;
		onError: (error: Error) => void;
	} = $props();

	// State
	let mode: 'idle' | 'host' | 'client' = $state('idle');
	let multiplayer: Multiplayer | null = $state(null);
	let shareCode: string = $state('');
	let joinCode: string = $state('');
	let connectionStatus: 'disconnected' | 'connecting' | 'pending' | 'connected' = $state(
		'disconnected'
	);
	let pendingClients: string[] = $state([]);
	let connectedClients: string[] = $state([]);
	let errorMessage: string | null = $state(null);
	let showLobby: boolean = $state(false);

	// Unique app identifier for Trystero (Nostr strategy)
	const appId = 'martini-game-platform-v1';

	/**
	 * Start as host - generate share code and create room
	 */
	async function startAsHost() {
		try {
			connectionStatus = 'connecting';
			errorMessage = null;

			// Generate share code via API
			const response = await fetch(`/api/projects/${projectId}/multiplayer`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to generate share code');
			}

			const data = await response.json();
			shareCode = data.shareCode;

			// Create multiplayer instance as host
			multiplayer = new Multiplayer({
				shareCode,
				isHost: true,
				appId,
				onError: handleError,
				onClientJoined: handleClientJoined,
				onClientLeft: handleClientLeft,
				onJoinRequest: handleJoinRequest,
				onDataReceived: handleDataFromClient
			});

			await multiplayer.connect();

			mode = 'host';
			connectionStatus = 'connected';
			showLobby = true;

			// Inject multiplayer API into sandbox
			injectMultiplayerAPI(true, shareCode, multiplayer.getPlayerId()!);

			console.log('[MultiplayerManager] Started as host with code:', shareCode);
		} catch (error) {
			handleError(error as Error);
		}
	}

	/**
	 * Start as client - join room with share code
	 */
	async function startAsClient() {
		if (!joinCode || joinCode.length !== 6) {
			errorMessage = 'Please enter a valid 6-digit code';
			return;
		}

		try {
			connectionStatus = 'connecting';
			errorMessage = null;

			// Create multiplayer instance as client
			multiplayer = new Multiplayer({
				shareCode: joinCode.toUpperCase(),
				isHost: false,
				appId,
				onError: handleError,
				onConnected: handleConnectedToHost,
				onDisconnected: handleDisconnected,
				onPending: handlePending,
				onDenied: handleDenied,
				onDataReceived: handleDataFromHost,
				onClientJoined: () => {}, // Not used by client
				onClientLeft: () => {} // Not used by client
			});

			await multiplayer.connect();

			mode = 'client';

			console.log('[MultiplayerManager] Started as client with code:', joinCode);
		} catch (error) {
			handleError(error as Error);
		}
	}

	/**
	 * Stop multiplayer and disconnect
	 */
	function stop() {
		if (multiplayer) {
			multiplayer.disconnect();
			multiplayer = null;
		}

		mode = 'idle';
		connectionStatus = 'disconnected';
		shareCode = '';
		joinCode = '';
		pendingClients = [];
		connectedClients = [];
		showLobby = false;
		errorMessage = null;
	}

	// Event handlers

	function handleError(error: Error) {
		console.error('[MultiplayerManager] Error:', error);
		errorMessage = error.message;
		connectionStatus = 'disconnected';
		onError(error);
	}

	function handleJoinRequest(clientId: string) {
		if (!pendingClients.includes(clientId)) {
			pendingClients = [...pendingClients, clientId];
		}
	}

	function handleClientJoined(clientId: string) {
		// Remove from pending
		pendingClients = pendingClients.filter((id) => id !== clientId);

		// Add to connected
		if (!connectedClients.includes(clientId)) {
			connectedClients = [...connectedClients, clientId];
		}

		// Update players list in sandbox
		if (iframeEl?.contentWindow && multiplayer) {
			const allPlayers = [multiplayer.getPlayerId()!, ...connectedClients];
			sendToSandbox({
				type: 'MULTIPLAYER_STATE',
				payload: {
					_players: allPlayers
				}
			});
		}

		// Notify sandbox of join event
		sendToSandbox({
			type: 'MULTIPLAYER_PLAYER_JOINED',
			payload: { playerId: clientId }
		});
	}

	function handleClientLeft(clientId: string) {
		connectedClients = connectedClients.filter((id) => id !== clientId);

		// Update players list in sandbox
		if (iframeEl?.contentWindow && multiplayer) {
			const allPlayers = [multiplayer.getPlayerId()!, ...connectedClients];
			sendToSandbox({
				type: 'MULTIPLAYER_STATE',
				payload: {
					_players: allPlayers
				}
			});
		}

		// Notify sandbox of leave event
		sendToSandbox({
			type: 'MULTIPLAYER_PLAYER_LEFT',
			payload: { playerId: clientId }
		});
	}

	function handleConnectedToHost() {
		connectionStatus = 'connected';

		// Inject multiplayer API into sandbox
		injectMultiplayerAPI(false, joinCode.toUpperCase(), multiplayer!.getPlayerId()!);
	}

	function handleDisconnected() {
		errorMessage = 'Disconnected from host';
		connectionStatus = 'disconnected';
	}

	function handlePending() {
		connectionStatus = 'pending';
	}

	function handleDenied() {
		errorMessage = 'Host denied your request to join';
		connectionStatus = 'disconnected';
	}

	function handleDataFromClient(clientId: string, data: any) {
		// Forward to sandbox
		sendToSandbox({
			type: 'MULTIPLAYER_DATA',
			payload: { from: clientId, data }
		});
	}

	function handleDataFromHost(data: any) {
		// Forward to sandbox
		sendToSandbox({
			type: 'MULTIPLAYER_DATA',
			payload: { from: 'host', data }
		});
	}

	/**
	 * Approve pending client (host only)
	 */
	function approveClient(clientId: string) {
		if (multiplayer) {
			multiplayer.approveClient(clientId);
		}
	}

	/**
	 * Deny pending client (host only)
	 */
	function denyClient(clientId: string) {
		if (multiplayer) {
			multiplayer.denyClient(clientId);
			pendingClients = pendingClients.filter((id) => id !== clientId);
		}
	}

	/**
	 * Initialize multiplayer API in sandbox iframe
	 * Sends state to the built-in gameAPI.multiplayer in sandbox-runtime.html
	 */
	function injectMultiplayerAPI(isHost: boolean, roomCode: string, playerId: string) {
		if (!iframeEl || !iframeEl.contentWindow) {
			console.error('[MultiplayerManager] Iframe not ready');
			return;
		}

		// Validate required values
		if (!playerId) {
			throw new Error('[MultiplayerManager] Cannot initialize multiplayer without player ID');
		}

		console.log('[MultiplayerManager] Initializing multiplayer:', {
			isHost,
			playerId,
			roomCode
		});

		// Send multiplayer state to built-in API in sandbox-runtime.html
		iframeEl.contentWindow.postMessage(
			{
				type: 'MULTIPLAYER_STATE',
				payload: {
					_enabled: true,
					_isHost: isHost,
					_myId: playerId,
					_players: isHost ? [playerId, ...connectedClients] : [playerId]
				}
			},
			'*'
		);
	}

	/**
	 * Send message to sandbox iframe
	 */
	function sendToSandbox(message: any) {
		if (!iframeEl || !iframeEl.contentWindow) {
			return;
		}

		iframeEl.contentWindow.postMessage(message, '*');
	}

	/**
	 * Listen for messages from sandbox
	 */
	function handleSandboxMessage(event: MessageEvent) {
		if (!event.data || !event.data.type) return;

		if (event.data.type === 'MULTIPLAYER_SEND') {
			const { data } = event.data.payload;

			if (multiplayer) {
				if (mode === 'host') {
					// Broadcast to all clients
					multiplayer.broadcast(data);
				} else if (mode === 'client') {
					// Send to host
					multiplayer.send(data);
				}
			}
		}
	}

	/**
	 * Copy share code to clipboard
	 */
	async function copyShareCode() {
		if (!browser) return;
		try {
			await navigator.clipboard.writeText(shareCode);
		} catch (e) {
			console.error('Failed to copy share code:', e);
		}
	}

	onMount(() => {
		if (browser) {
			window.addEventListener('message', handleSandboxMessage);
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('message', handleSandboxMessage);
		}
		stop();
	});
</script>

<div class="multiplayer-manager">
	{#if mode === 'idle'}
		<!-- Start Multiplayer UI -->
		<div class="flex gap-2">
			<button onclick={startAsHost} class="btn btn-primary">
				<Users size={16} />
				Start Multiplayer
			</button>

			<div class="join-form">
				<input
					type="text"
					bind:value={joinCode}
					placeholder="Enter code"
					maxlength="6"
					class="input input-sm"
					onkeydown={(e) => e.key === 'Enter' && startAsClient()}
				/>
				<button onclick={startAsClient} class="btn btn-secondary btn-sm"> Join </button>
			</div>
		</div>
	{:else if mode === 'host'}
		<!-- Host UI -->
		<div class="host-panel">
			<div class="share-code-display">
				<span class="label">Share Code:</span>
				<span class="code">{shareCode}</span>
				<button onclick={copyShareCode} class="btn-icon" title="Copy to clipboard">
					<Copy size={16} />
				</button>
			</div>

			<div class="status">
				<Users size={16} />
				<span>{connectedClients.length + 1} player{connectedClients.length !== 0 ? 's' : ''}</span>
			</div>

			<button onclick={stop} class="btn btn-sm btn-danger"> Stop </button>
		</div>

		<!-- Lobby (pending approvals) -->
		{#if showLobby && pendingClients.length > 0}
			<div class="lobby-panel">
				<h4>Pending Players</h4>
				{#each pendingClients as clientId}
					<div class="pending-client">
						<span class="client-id">{clientId.substring(0, 8)}</span>
						<div class="actions">
							<button
								onclick={() => approveClient(clientId)}
								class="btn-icon btn-success"
								title="Approve"
							>
								<Check size={16} />
							</button>
							<button
								onclick={() => denyClient(clientId)}
								class="btn-icon btn-danger"
								title="Deny"
							>
								<X size={16} />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{:else if mode === 'client'}
		<!-- Client UI -->
		<div class="client-panel">
			<div class="status">
				{#if connectionStatus === 'connecting'}
					<Loader size={16} class="animate-spin" />
					<span>Connecting...</span>
				{:else if connectionStatus === 'pending'}
					<Loader size={16} class="animate-spin" />
					<span>Waiting for host approval...</span>
				{:else if connectionStatus === 'connected'}
					<div class="connected">
						<Users size={16} />
						<span>Connected to {joinCode}</span>
					</div>
				{/if}
			</div>

			<button onclick={stop} class="btn btn-sm btn-danger"> Leave </button>
		</div>
	{/if}

	{#if errorMessage}
		<div class="error-message">{errorMessage}</div>
	{/if}
</div>

<style>
	.multiplayer-manager {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background: #0e639c;
		color: white;
	}

	.btn-primary:hover {
		background: #1177bb;
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-danger {
		background: #dc2626;
		color: white;
	}

	.btn-sm {
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
	}

	.btn-icon {
		padding: 0.25rem;
		background: transparent;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-icon.btn-success {
		border-color: #10b981;
		color: #10b981;
	}

	.btn-icon.btn-success:hover {
		background: #10b981;
		color: white;
	}

	.btn-icon.btn-danger {
		border-color: #dc2626;
		color: #dc2626;
	}

	.btn-icon.btn-danger:hover {
		background: #dc2626;
		color: white;
	}

	.join-form {
		display: flex;
		gap: 0.5rem;
	}

	.input {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-family: monospace;
		text-transform: uppercase;
	}

	.input-sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
	}

	.host-panel,
	.client-panel {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: #f3f4f6;
		border-radius: 0.5rem;
	}

	.share-code-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.share-code-display .label {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.share-code-display .code {
		font-family: monospace;
		font-size: 1.25rem;
		font-weight: bold;
		letter-spacing: 0.1em;
		color: #0e639c;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #374151;
	}

	.connected {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #10b981;
	}

	.lobby-panel {
		padding: 0.75rem;
		background: #fef3c7;
		border-radius: 0.5rem;
		border: 1px solid #fbbf24;
	}

	.lobby-panel h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		color: #92400e;
	}

	.pending-client {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem;
		background: white;
		border-radius: 0.375rem;
		margin-bottom: 0.5rem;
	}

	.pending-client:last-child {
		margin-bottom: 0;
	}

	.client-id {
		font-family: monospace;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.actions {
		display: flex;
		gap: 0.25rem;
	}

	.error-message {
		padding: 0.75rem;
		background: #fee2e2;
		border: 1px solid #dc2626;
		border-radius: 0.375rem;
		color: #991b1b;
		font-size: 0.875rem;
	}
</style>
