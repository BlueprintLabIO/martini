<script lang="ts">
	/**
	 * MultiplayerManager - Manages P2P multiplayer via Trystero
	 *
	 * Features:
	 * - Host/client roles
	 * - Lobby approval system
	 * - Game sandbox communication
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

	// App ID for Trystero
	const appId = 'martini-game-platform-v1';

	// Action sender/receivers
	let sendJoinRequest: ((data: any, peerId?: string) => void) | null = null;
	let sendApprovalResponse: ((data: any, peerId: string) => void) | null = null;
	let sendGameData: ((data: any, peerId?: string) => void) | null = null;

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

			// Create multiplayer instance
			multiplayer = new Multiplayer({ appId, roomId: shareCode });

			// Set up actions for approval flow
			[sendJoinRequest, receiveJoinRequest] = multiplayer.room.makeAction('join-req');
			[sendApprovalResponse, receiveApprovalResponse] = multiplayer.room.makeAction('approval');
			[sendGameData, receiveGameData] = multiplayer.room.makeAction('game-data');

			// Host: Listen for join requests
			receiveJoinRequest((data: any, peerId: string) => {
				console.log('[Host] Join request from:', peerId, data);
				if (!pendingClients.includes(peerId)) {
					pendingClients = [...pendingClients, peerId];
				}
			});

			// Host: Listen for game data from clients
			receiveGameData((data: any, peerId: string) => {
				sendToSandbox({
					type: 'MULTIPLAYER_DATA',
					payload: { from: peerId, data }
				});
			});

			// Host: Handle peer leave
			multiplayer.room.onPeerLeave((peerId: string) => {
				console.log('[Host] Peer left:', peerId);
				pendingClients = pendingClients.filter((id) => id !== peerId);
				connectedClients = connectedClients.filter((id) => id !== peerId);

				// Update sandbox
				updateSandboxPlayers();
				sendToSandbox({
					type: 'MULTIPLAYER_PLAYER_LEFT',
					payload: { playerId: peerId }
				});
			});

			mode = 'host';
			connectionStatus = 'connected';
			showLobby = true;

			// Inject multiplayer API into sandbox
			injectMultiplayerAPI(true, shareCode, multiplayer.selfId);

			console.log('[Host] Started with code:', shareCode);
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

			const code = joinCode.toUpperCase();

			// Create multiplayer instance
			multiplayer = new Multiplayer({ appId, roomId: code });

			// Set up actions
			[sendJoinRequest, receiveJoinRequest] = multiplayer.room.makeAction('join-req');
			[sendApprovalResponse, receiveApprovalResponse] = multiplayer.room.makeAction('approval');
			[sendGameData, receiveGameData] = multiplayer.room.makeAction('game-data');

			// Client: Listen for approval response
			receiveApprovalResponse((data: any, peerId: string) => {
				console.log('[Client] Approval response:', data);
				if (data.approved) {
					connectionStatus = 'connected';
					injectMultiplayerAPI(false, code, multiplayer!.selfId);
				} else {
					errorMessage = 'Host denied your request';
					stop();
				}
			});

			// Client: Listen for game data from host
			receiveGameData((data: any) => {
				sendToSandbox({
					type: 'MULTIPLAYER_DATA',
					payload: { from: 'host', data }
				});
			});

			// Client: Send join request when NEW peer joins
			multiplayer.room.onPeerJoin((peerId: string) => {
				console.log('[Client] Peer joined (host):', peerId);
				connectionStatus = 'pending';
				sendJoinRequest?.({ clientId: multiplayer!.selfId });
			});

			// Client: Handle host disconnect
			multiplayer.room.onPeerLeave(() => {
				errorMessage = 'Host disconnected';
				connectionStatus = 'disconnected';
			});

			mode = 'client';

			console.log('[Client] Joining room:', code);

			// IMPORTANT: Check if host is already in room
			// onPeerJoin only fires for peers that join AFTER us
			const existingPeers = Object.keys(multiplayer.room.getPeers());
			console.log('[Client] Existing peers in room:', existingPeers);

			if (existingPeers.length > 0) {
				// Host is already here, send join request immediately
				console.log('[Client] Host already in room, sending join request');
				connectionStatus = 'pending';
				sendJoinRequest?.({ clientId: multiplayer.selfId });
			}
		} catch (error) {
			handleError(error as Error);
		}
	}

	// Action receivers (declared at component level for reactivity)
	let receiveJoinRequest: (callback: (data: any, peerId: string) => void) => void;
	let receiveApprovalResponse: (callback: (data: any, peerId: string) => void) => void;
	let receiveGameData: (callback: (data: any, peerId: string) => void) => void;

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
		sendJoinRequest = null;
		sendApprovalResponse = null;
		sendGameData = null;
	}

	/**
	 * Approve pending client (host only)
	 */
	function approveClient(clientId: string) {
		console.log('[Host] Approving client:', clientId);

		// Remove from pending, add to connected
		pendingClients = pendingClients.filter((id) => id !== clientId);
		if (!connectedClients.includes(clientId)) {
			connectedClients = [...connectedClients, clientId];
		}

		// Send approval
		sendApprovalResponse?.({ approved: true }, clientId);

		// Update sandbox
		updateSandboxPlayers();
		sendToSandbox({
			type: 'MULTIPLAYER_PLAYER_JOINED',
			payload: { playerId: clientId }
		});
	}

	/**
	 * Deny pending client (host only)
	 */
	function denyClient(clientId: string) {
		console.log('[Host] Denying client:', clientId);
		pendingClients = pendingClients.filter((id) => id !== clientId);
		sendApprovalResponse?.({ approved: false }, clientId);
	}

	/**
	 * Update sandbox with current player list
	 */
	function updateSandboxPlayers() {
		if (!iframeEl?.contentWindow || !multiplayer) return;

		const allPlayers = [multiplayer.selfId, ...connectedClients];
		sendToSandbox({
			type: 'MULTIPLAYER_STATE',
			payload: { _players: allPlayers }
		});
	}

	function handleError(error: Error) {
		console.error('[MultiplayerManager] Error:', error);
		errorMessage = error.message;
		connectionStatus = 'disconnected';
		onError(error);
	}

	/**
	 * Initialize multiplayer API in sandbox iframe
	 */
	function injectMultiplayerAPI(isHost: boolean, roomCode: string, playerId: string) {
		if (!iframeEl?.contentWindow) {
			console.error('[MultiplayerManager] Iframe not ready');
			return;
		}

		console.log('[MultiplayerManager] Initializing multiplayer API');

		sendToSandbox({
			type: 'MULTIPLAYER_STATE',
			payload: {
				_enabled: true,
				_isHost: isHost,
				_myId: playerId,
				_players: isHost ? [playerId, ...connectedClients] : [playerId]
			}
		});
	}

	/**
	 * Send message to sandbox iframe
	 */
	function sendToSandbox(message: any) {
		iframeEl?.contentWindow?.postMessage(message, '*');
	}

	/**
	 * Listen for messages from sandbox
	 */
	function handleSandboxMessage(event: MessageEvent) {
		if (!event.data?.type || event.data.type !== 'MULTIPLAYER_SEND') return;

		const { data } = event.data.payload;

		if (mode === 'host') {
			// Broadcast to all connected clients
			connectedClients.forEach((peerId) => {
				sendGameData?.(data, peerId);
			});
		} else if (mode === 'client') {
			// Send to host (broadcast to all)
			sendGameData?.(data);
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
