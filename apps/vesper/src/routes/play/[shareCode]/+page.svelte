<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Loader, AlertCircle, Users } from 'lucide-svelte';

	let { data } = $props();

	// Game state
	let iframeEl = $state<HTMLIFrameElement | null>(null);
	let gameError = $state<{ message: string; stack?: string } | null>(null);
	let isGameLoading = $state(false);
	let isGameReady = $state(false);


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

			// Send code to iframe with multiplayer config
			// If roomCode is provided, join that multiplayer session
			// Otherwise, single-player mode
			const roomId = data.roomCode ? `room-${data.roomCode}` : data.project.shareCode;
			const isHost = false; // /play is always a client (host is in editor)

			if (iframeEl?.contentWindow) {
				iframeEl.contentWindow.postMessage(
					{
						type: 'LOAD_CODE',
						payload: {
							code,
							roomId,
							isHost,
							assets
						}
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
	 * Handle messages from sandbox iframe
	 */
	function handleSandboxMessage(event: MessageEvent) {
		if (!event.data?.type) return;

		const { type, payload } = event.data;

		switch (type) {
			case 'READY':
				console.log('[Play] Game ready');
				isGameReady = true;
				isGameLoading = false;
				gameError = null;
				break;

			case 'ERROR':
				gameError = payload;
				isGameLoading = false;
				break;
		}
	}

	onMount(() => {
		window.addEventListener('message', handleSandboxMessage);

		// Auto-load game if joining multiplayer session
		if (data.roomCode) {
			loadGame();
		}

		return () => {
			window.removeEventListener('message', handleSandboxMessage);
		};
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
			<div class="flex items-center gap-2 text-sm text-gray-400">
				{#if data.isTestingMode}
					<span class="rounded bg-yellow-600/20 px-2 py-0.5 text-yellow-400">Testing Mode</span>
				{:else}
					<span>Share Code: {data.project.shareCode}</span>
				{/if}
				{#if data.roomCode}
					<span>•</span>
					<span class="flex items-center gap-1">
						<Users class="h-3 w-3" />
						Multiplayer Room: {data.roomCode}
					</span>
				{/if}
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="relative flex-1">
		{#if gameError}
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
