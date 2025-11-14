<script lang="ts">
	import { onMount } from 'svelte';
	import { SandpackManager } from '../core/SandpackManager';
	import type { VirtualFileSystem } from '../core/VirtualFS';

	interface Props {
		vfs: VirtualFileSystem;
		entryPoint: string;
		role: 'host' | 'client';
		transportType: 'local' | 'iframe-bridge';
		onError?: (error: { type: 'runtime' | 'syntax'; message: string; stack?: string }) => void;
		onReady?: () => void;
		consoleLogs?: Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error' }>;
		connectionStatus?: 'disconnected' | 'connecting' | 'connected';
		hideDevTools?: boolean;
		roomId?: string;
	}

	let {
		vfs,
		entryPoint,
		role,
		transportType,
		onError,
		onReady,
		consoleLogs = $bindable([]),
		connectionStatus = $bindable('disconnected'),
		hideDevTools = false,
		roomId
	}: Props = $props();

	let container: HTMLDivElement;
	let sandpackManager: SandpackManager | null = null;
	let status = $state<'initializing' | 'ready' | 'running' | 'error'>('initializing');
	let error = $state<{ type: 'runtime' | 'syntax'; message: string; stack?: string } | null>(null);

	function generateRoomId() {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return `ide-room-${crypto.randomUUID()}`;
		}
		return `ide-room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	}

	const sessionRoomId = roomId ?? generateRoomId();

	onMount(async () => {
		console.log('[GamePreview] Component mounted, container:', container);

		// Create Sandpack manager
		sandpackManager = new SandpackManager({
			container,
			role,
			roomId: sessionRoomId,
			transportType,
			onError: (err) => {
				status = 'error';
				error = err;
				onError?.(err);
			},
			onReady: () => {
				status = 'running';
				error = null;
				onReady?.();
			},
			onConsoleLog: (log) => {
				consoleLogs = [...consoleLogs, log];
			},
			onConnectionStatus: (newStatus) => {
				connectionStatus = newStatus;
			}
		});

		try {
			// Initialize and run Sandpack once
			await sandpackManager.initialize();
			await sandpackManager.run(vfs, entryPoint);

			// Sandpack will handle HMR automatically from here
		} catch (err) {
			status = 'error';
			error = {
				type: 'runtime',
				message: err instanceof Error ? err.message : 'Failed to initialize Sandpack',
				stack: err instanceof Error ? err.stack : undefined
			};
		}

		return () => {
			sandpackManager?.destroy();
		};
	});
</script>

<div class="game-preview">
	{#if !hideDevTools}
		<div class="preview-header">
			<h4>{role === 'host' ? 'Player 1 (Host)' : 'Player 2 (Client)'}</h4>
			<div class="header-actions">
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
	{/if}

	<div
		bind:this={container}
		class="preview-container"
		class:full-height={hideDevTools}
	></div>

	{#if !hideDevTools}
		<div class="controls-hint">
			Click the game canvas first, then use Arrow Keys to move
		</div>
	{/if}
</div>

<style>
	.game-preview {
		position: relative;
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
		cursor: pointer;
	}

	.preview-container :global(iframe) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: none;
	}

	.preview-container.full-height {
		border-radius: 8px;
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
