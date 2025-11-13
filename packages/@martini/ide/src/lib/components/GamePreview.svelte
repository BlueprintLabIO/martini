<script lang="ts">
	import { onMount } from 'svelte';
	import { Sandbox, type GameError } from '../core/Sandbox';
	import DevToolsPanel from './DevToolsPanel.svelte';
	import type { EngineAdapter } from '../adapters/PhaserEngine';

	interface Props {
		engine: EngineAdapter;
		code: string;
		role: 'host' | 'client';
		transportType: 'local' | 'trystero' | 'iframe-bridge';
		onError?: (error: GameError) => void;
		onReady?: () => void;
	}

	let { engine, code, role, transportType, onError, onReady }: Props = $props();

	let container: HTMLDivElement;
	let sandbox: Sandbox | null = null;
	let sandboxReady = $state(false); // Track when sandbox is fully created
	let status = $state<'initializing' | 'ready' | 'running' | 'error'>('initializing');
	let error = $state<GameError | null>(null);

	// DevTools state
	let showDevTools = $state(true); // Open by default
	let consoleLogs = $state<Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error'; channel?: string }>>([]);
	let connectionStatus = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');

	// Generate a room ID for this IDE session
	const roomId = `ide-room-${Date.now()}`;

	onMount(async () => {
		// Create sandbox
		sandbox = new Sandbox({
			container,
			role,
			onError: (err) => {
				status = 'error';
				error = err;
				onError?.(err);
			},
			onReady: () => {
				// Don't set status to ready here - wait for code to load
			},
			onConsoleLog: (log) => {
				consoleLogs = [...consoleLogs, log];
			},
			onConnectionStatus: (newStatus) => {
				connectionStatus = newStatus;
			}
		});

		await sandbox.create();
		sandboxReady = true;

		return () => {
			sandbox?.destroy();
		};
	});

	// Run code when it changes (only after sandbox is ready)
	$effect(() => {
		if (sandboxReady && sandbox && code) {
			status = 'running';
			error = null;

			// Send code to sandbox
			sandbox.run(code, roomId, transportType).catch((err) => {
				status = 'error';
				error = {
					type: 'runtime',
					message: err.message,
					stack: err.stack
				};
			});
		}
	});
</script>

<div class="game-preview">
	<div class="preview-header">
		<h4>{role === 'host' ? 'Player 1 (Host)' : 'Player 2 (Client)'}</h4>
		<div class="header-actions">
			<button class="devtools-toggle" class:active={showDevTools} onclick={() => (showDevTools = !showDevTools)} title="Toggle DevTools">
				🛠️
			</button>
			<span class="status {status}">
				{#if status === 'initializing'}
					Initializing...
				{:else if status === 'ready'}
					Ready
				{:else if status === 'running'}
					Running
				{:else if status === 'error'}
					Error
				{/if}
			</span>
		</div>
	</div>

	<div bind:this={container} class="preview-container">
		<!-- DevTools Overlay -->
		{#if showDevTools}
			<DevToolsPanel {role} logs={consoleLogs} status={connectionStatus} onClose={() => (showDevTools = false)} />
		{/if}
	</div>

	{#if error}
		<div class="error-display">
			<strong>Error:</strong> {error.message}
			{#if error.stack}
				<pre>{error.stack}</pre>
			{/if}
		</div>
	{/if}

	<div class="controls-hint">
		{role === 'host' ? 'Controls: WASD + Space' : 'Controls: Arrow Keys + Enter'}
	</div>
</div>

<style>
	.game-preview {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.preview-header h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1f2937;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.devtools-toggle {
		padding: 0.25rem 0.5rem;
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.devtools-toggle:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
	}

	.devtools-toggle.active {
		background: #3b82f6;
		border-color: #3b82f6;
		filter: grayscale(0);
	}

	.status {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-weight: 500;
	}

	.status.initializing {
		background: #f3f4f6;
		color: #6b7280;
	}

	.status.ready {
		background: #d1fae5;
		color: #065f46;
	}

	.status.running {
		background: #dbeafe;
		color: #1e40af;
	}

	.status.error {
		background: #fee2e2;
		color: #991b1b;
	}

	.preview-container {
		flex: 1;
		position: relative;
		background: #000;
		overflow: hidden;
	}

	.error-display {
		padding: 1rem;
		background: #fef2f2;
		color: #991b1b;
		font-size: 0.75rem;
		border-top: 1px solid #fecaca;
	}

	.error-display pre {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: #ffffff;
		border: 1px solid #fecaca;
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.625rem;
		color: #7f1d1d;
	}

	.controls-hint {
		padding: 0.5rem 1rem;
		background: #f9fafb;
		border-top: 1px solid #e5e7eb;
		color: #6b7280;
		font-size: 0.75rem;
		text-align: center;
	}
</style>
