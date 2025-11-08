<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertCircle, Terminal } from 'lucide-svelte';
	import MultiplayerManager from '$lib/multiplayer/MultiplayerManager.svelte';

	let { projectId, onRunGame } = $props<{
		projectId: string;
		onRunGame: () => Promise<void>;
	}>();

	let iframeEl: HTMLIFrameElement;
	let gameError = $state<{ message: string; stack?: string } | null>(null);
	let consoleLogs = $state<Array<{ message: string; frame: number }>>([]);
	let showConsole = $state(false);
	let isReady = $state(false);
	let isLoading = $state(false);
	let lastHeartbeat = $state(Date.now());

	function handleMultiplayerError(error: Error) {
		gameError = {
			message: `Multiplayer Error: ${error.message}`
		};
	}

	onMount(() => {
		// Listen for messages from iframe
		const handleMessage = (event: MessageEvent) => {
			if (!event.data || !event.data.type) return;

			const { type, payload } = event.data;

			switch (type) {
				case 'READY':
					isReady = true;
					isLoading = false;
					gameError = null;
					break;

				case 'ERROR':
					gameError = payload;
					isLoading = false;
					break;

				case 'LOG':
					consoleLogs = [...consoleLogs, payload];
					// Keep only last 100 logs
					if (consoleLogs.length > 100) {
						consoleLogs = consoleLogs.slice(-100);
					}
					break;

				case 'HEARTBEAT':
					lastHeartbeat = Date.now();
					break;
			}
		};

		window.addEventListener('message', handleMessage);

		// Watchdog - check for frozen game
		const watchdogInterval = setInterval(() => {
			const elapsed = Date.now() - lastHeartbeat;
			if (elapsed > 5000 && isReady) {
				gameError = {
					message: 'Game froze (no heartbeat for 5 seconds)',
					stack: 'The game may have an infinite loop or blocking operation.'
				};
				isReady = false;
			}
		}, 2000);

		return () => {
			window.removeEventListener('message', handleMessage);
			clearInterval(watchdogInterval);
		};
	});

	async function runGame() {
		isLoading = true;
		gameError = null;
		consoleLogs = [];

		try {
			// Fetch bundled code from server
			const response = await fetch(`/api/projects/${projectId}/bundle`, {
				method: 'POST'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.details || error.error || 'Failed to bundle code');
			}

			const { code } = await response.json();

			// Send bundled code to iframe
			if (iframeEl && iframeEl.contentWindow) {
				iframeEl.contentWindow.postMessage(
					{
						type: 'LOAD_CODE',
						payload: { code }
					},
					'*'
				);
			}

			// Call parent callback
			await onRunGame();
		} catch (error) {
			gameError = {
				message: error instanceof Error ? error.message : String(error)
			};
			isLoading = false;
		}
	}

	function clearConsole() {
		consoleLogs = [];
	}

	// Expose runGame to parent
	export { runGame };
</script>

<div class="flex h-full flex-col border-l bg-muted/20">
	<!-- Preview Header -->
	<div class="flex items-center justify-between border-b bg-background px-4 py-2">
		<h3 class="text-sm font-semibold">Game Preview</h3>
		<div class="flex gap-2">
			<button
				onclick={() => (showConsole = !showConsole)}
				class="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted"
				title="Toggle console"
			>
				<Terminal class="h-3 w-3" />
				Console {#if consoleLogs.length > 0}({consoleLogs.length}){/if}
			</button>
		</div>
	</div>

	<!-- Multiplayer Controls -->
	<div class="border-b bg-background px-4 py-2">
		<MultiplayerManager {projectId} {iframeEl} onError={handleMultiplayerError} />
	</div>

	<!-- Game Container -->
	<div class="relative flex-1 overflow-hidden">
		{#if gameError}
			<!-- Error Overlay -->
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-black/90 p-6">
				<div class="max-w-md text-center">
					<AlertCircle class="mx-auto mb-4 h-12 w-12 text-red-500" />
					<h4 class="mb-2 text-lg font-bold text-white">Game Error</h4>
					<p class="mb-4 font-mono text-sm text-red-300">{gameError.message}</p>
					{#if gameError.stack}
						<pre
							class="mb-4 max-h-40 overflow-auto rounded bg-black/50 p-3 text-left text-xs text-gray-400">{gameError.stack}</pre>
					{/if}
					<div class="flex gap-2 justify-center">
						<button
							onclick={runGame}
							class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
						>
							Retry
						</button>
						<button
							onclick={() => (gameError = null)}
							class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if isLoading}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
				<div class="text-center">
					<div class="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto"></div>
					<p class="text-sm text-white">Bundling & loading game...</p>
				</div>
			</div>
		{/if}

		<!-- Sandboxed iframe -->
		<iframe
			bind:this={iframeEl}
			src="/sandbox-runtime.html"
			sandbox="allow-scripts"
			title="Game Preview"
			class="h-full w-full border-0"
		></iframe>
	</div>

	<!-- Console Panel -->
	{#if showConsole}
		<div class="flex h-48 flex-col border-t bg-black">
			<div class="flex items-center justify-between border-b border-gray-700 px-3 py-1">
				<span class="text-xs font-semibold text-gray-400">Console Output</span>
				<button
					onclick={clearConsole}
					class="text-xs text-gray-500 hover:text-gray-300"
				>
					Clear
				</button>
			</div>
			<div class="flex-1 overflow-auto p-2 font-mono text-xs">
				{#if consoleLogs.length === 0}
					<p class="text-gray-600">No logs yet. Use gameAPI.log() in your game code.</p>
				{:else}
					{#each consoleLogs as log}
						<div class="text-gray-300">
							<span class="text-gray-600">[{log.frame}]</span> {log.message}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
