<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Loader, AlertCircle, Users } from 'lucide-svelte';
	import { Multiplayer } from '$lib/multiplayer/Multiplayer';

	let { data } = $props();

	// Game state
	let iframeEl = $state<HTMLIFrameElement | null>(null);
	let gameError = $state<{ message: string; stack?: string } | null>(null);
	let isGameLoading = $state(false);
	let isGameReady = $state(false);

	// Multiplayer state
	let multiplayer: Multiplayer | null = $state(null);
	let connectionStatus = $state<'disconnected' | 'connecting' | 'pending' | 'connected'>('disconnected');
	let statusMessage = $state('');

	// Action senders/receivers
	let sendJoinRequest: ((data: any, peerId?: string) => void) | null = null;
	let sendGameData: ((data: any, peerId?: string) => void) | null = null;
	let receiveApprovalResponse: (callback: (data: any, peerId: string) => void) => void;
	let receiveGameData: (callback: (data: any, peerId: string) => void) => void;

	/**
	 * Load and start the game
	 */
	async function loadGame() {
		isGameLoading = true;
		gameError = null;

		try {
			// Fetch bundled code and assets
			const [codeResponse, assetsResponse] = await Promise.all([
				fetch(`/api/play/${data.project.shareCode}/bundle`),
				fetch(`/api/play/${data.project.shareCode}/assets`)
			]);

			if (!codeResponse.ok) {
				const error = await codeResponse.json();
				throw new Error(error.details || error.error || 'Failed to load game');
			}

			const { code } = await codeResponse.json();

			// Get assets (may fail if not set up yet)
			let assets: Array<{ filename: string; fileType: string; url: string }> = [];
			if (assetsResponse.ok) {
				const assetsData = await assetsResponse.json();
				assets = assetsData.assets || [];
			}

			// Send code to iframe
			if (iframeEl?.contentWindow) {
				iframeEl.contentWindow.postMessage(
					{
						type: 'LOAD_CODE',
						payload: { code, assets }
					},
					'*'
				);
			}
		} catch (error) {
			gameError = {
				message: error instanceof Error ? error.message : String(error)
			};
			isGameLoading = false;
		}
	}

	/**
	 * Join multiplayer session
	 */
	async function joinMultiplayer() {
		try {
			connectionStatus = 'connecting';
			statusMessage = 'Connecting to game...';

			const shareCode = data.project.shareCode;

			// Create multiplayer instance
			multiplayer = new Multiplayer({ roomId: shareCode });

			// Set up actions
			[sendJoinRequest, ] = multiplayer.room.makeAction('join-req');
			[, receiveApprovalResponse] = multiplayer.room.makeAction('approval');
			[sendGameData, receiveGameData] = multiplayer.room.makeAction('game-data');

			// Listen for approval response
			receiveApprovalResponse((approvalData: any, peerId: string) => {
				console.log('[Guest] Approval response:', approvalData);
				if (approvalData.approved) {
					connectionStatus = 'connected';
					statusMessage = 'Connected! Starting game...';

					// Inject multiplayer API into sandbox
					injectMultiplayerAPI(false, shareCode, multiplayer!.selfId);

					// Load the game
					loadGame();
				} else {
					statusMessage = 'Host denied your request';
					connectionStatus = 'disconnected';
				}
			});

			// Listen for game data from host
			receiveGameData((data: any) => {
				sendToSandbox({
					type: 'MULTIPLAYER_DATA',
					payload: { from: 'host', data }
				});
			});

			// Send join request when peer (host) is found
			multiplayer.room.onPeerJoin((peerId: string) => {
				console.log('[Guest] Host found:', peerId);
				connectionStatus = 'pending';
				statusMessage = 'Waiting for host approval...';
				sendJoinRequest?.({ clientId: multiplayer!.selfId });
			});

			// Handle host disconnect
			multiplayer.room.onPeerLeave(() => {
				statusMessage = 'Host disconnected';
				connectionStatus = 'disconnected';
			});

			console.log('[Guest] Joining room:', shareCode);
		} catch (error) {
			console.error('[Guest] Error:', error);
			statusMessage = error instanceof Error ? error.message : String(error);
			connectionStatus = 'disconnected';
		}
	}

	/**
	 * Initialize multiplayer API in sandbox iframe
	 */
	function injectMultiplayerAPI(isHost: boolean, roomCode: string, playerId: string) {
		sendToSandbox({
			type: 'MULTIPLAYER_STATE',
			payload: {
				_enabled: true,
				_isHost: isHost,
				_myId: playerId,
				_players: [playerId]
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
	 * Handle messages from sandbox iframe
	 */
	function handleSandboxMessage(event: MessageEvent) {
		if (!event.data?.type) return;

		const { type, payload } = event.data;

		switch (type) {
			case 'READY':
				console.log('[Guest] Game ready');
				isGameReady = true;
				isGameLoading = false;
				gameError = null;
				break;

			case 'ERROR':
				gameError = payload;
				isGameLoading = false;
				break;

			case 'MULTIPLAYER_SEND':
				// Send data to host
				sendGameData?.(payload.data);
				break;
		}
	}

	onMount(() => {
		window.addEventListener('message', handleSandboxMessage);
	});

	onDestroy(() => {
		window.removeEventListener('message', handleSandboxMessage);
		if (multiplayer) {
			multiplayer.disconnect();
		}
	});
</script>

<svelte:head>
	<title>{data.project.name} - Play</title>
</svelte:head>

<div class="flex h-screen flex-col bg-gray-900">
	<!-- Header -->
	<header class="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-6 py-4">
		<div>
			<h1 class="text-xl font-bold text-white">{data.project.name}</h1>
			<p class="text-sm text-gray-400">Share Code: {data.project.shareCode}</p>
		</div>

		<!-- Connection Status -->
		{#if connectionStatus !== 'disconnected'}
			<div class="flex items-center gap-2 rounded-md bg-blue-900/30 px-4 py-2 border border-blue-700">
				<Users class="h-4 w-4 text-blue-400" />
				<span class="text-sm text-blue-300">{statusMessage}</span>
			</div>
		{/if}
	</header>

	<!-- Main Content -->
	<div class="relative flex-1">
		{#if connectionStatus === 'disconnected'}
			<!-- Join Screen -->
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="max-w-md text-center">
					<Users class="mx-auto mb-4 h-16 w-16 text-blue-500" />
					<h2 class="mb-2 text-2xl font-bold text-white">Join Multiplayer Game</h2>
					<p class="mb-6 text-gray-400">Click below to join {data.project.name}</p>
					<button
						onclick={joinMultiplayer}
						class="rounded-lg bg-blue-600 px-8 py-3 text-lg font-medium text-white hover:bg-blue-700 transition"
					>
						Join Game
					</button>
				</div>
			</div>
		{:else if connectionStatus === 'connecting' || connectionStatus === 'pending'}
			<!-- Loading/Pending Screen -->
			<div class="absolute inset-0 flex items-center justify-center bg-black/50">
				<div class="text-center">
					<Loader class="mx-auto mb-3 h-8 w-8 animate-spin text-white" />
					<p class="text-white">{statusMessage}</p>
				</div>
			</div>
		{:else if gameError}
			<!-- Error Screen -->
			<div class="absolute inset-0 flex items-center justify-center bg-black/90 p-6">
				<div class="max-w-md text-center">
					<AlertCircle class="mx-auto mb-4 h-12 w-12 text-red-500" />
					<h4 class="mb-2 text-lg font-bold text-white">Game Error</h4>
					<p class="mb-4 font-mono text-sm text-red-300">{gameError.message}</p>
					<button
						onclick={loadGame}
						class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
					>
						Retry
					</button>
				</div>
			</div>
		{:else if isGameLoading}
			<!-- Loading Game -->
			<div class="absolute inset-0 flex items-center justify-center bg-black/50">
				<div class="text-center">
					<Loader class="mx-auto mb-3 h-8 w-8 animate-spin text-white" />
					<p class="text-white">Loading game...</p>
				</div>
			</div>
		{/if}

		<!-- Game Iframe -->
		<iframe
			bind:this={iframeEl}
			src="/sandbox-runtime.html"
			sandbox="allow-scripts"
			title="Game"
			class="h-full w-full border-0"
		></iframe>
	</div>
</div>
