<script lang="ts">
	import { onMount } from 'svelte';
	import { ESBuildManager } from '../core/ESBuildManager.js';
	import type { VirtualFileSystem } from '../core/VirtualFS.js';
	import type { StateSnapshot, ActionRecord } from '@martini-kit/devtools';
	import type { GameError } from '../types.js';

	type NetworkPacket = {
		timestamp: number;
		direction: 'send' | 'receive';
		type: string;
		size: number;
		payload: unknown;
	};

	type LogEntry = { message: string; timestamp: number; level: 'log' | 'warn' | 'error' };
	type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

	interface Props {
		vfs: VirtualFileSystem;
		vfsVersion?: number;
		entryPoint: string;
		role: 'host' | 'client';
		transportType: 'local' | 'iframe-bridge';
		onError?: (error: GameError) => void;
		onReady?: () => void;
		consoleLogs?: Array<LogEntry>;
		connectionStatus?: ConnectionStatus;
		stateSnapshots?: StateSnapshot[];
		actionHistory?: ActionRecord[];
		actionExcludedCount?: number;
		networkPackets?: Array<NetworkPacket>;
		hideDevTools?: boolean;
		roomId?: string;
		enableDevTools?: boolean;
	}

	let {
		vfs,
		vfsVersion = 0,
		entryPoint,
		role,
		transportType,
		onError,
		onReady,
		consoleLogs = $bindable([]),
		connectionStatus = $bindable('disconnected'),
		stateSnapshots = $bindable<StateSnapshot[]>([]),
		actionHistory = $bindable<ActionRecord[]>([]),
		actionExcludedCount = $bindable(0),
		networkPackets = $bindable([]),
		hideDevTools = false,
		roomId,
		enableDevTools = false
	}: Props = $props();

	let container: HTMLDivElement;
		let esbuildManager: ESBuildManager | null = null;
		let status = $state<'initializing' | 'ready' | 'running' | 'error'>('initializing');
		let error = $state<GameError | null>(null);
		let isReady = $state(false);
		let isPointerOver = $state(false);

	/**
	 * Dynamically enable or disable DevTools
	 */
	export function setDevToolsEnabled(enabled: boolean): void {
		esbuildManager?.setDevToolsEnabled(enabled);
	}

	/**
	 * Pause/resume Inspector capturing
	 */
	export function setInspectorPaused(paused: boolean): void {
		esbuildManager?.setInspectorPaused(paused);
	}

	function generateRoomId() {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return `ide-room-${crypto.randomUUID()}`;
		}
		return `ide-room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	}

	function upsertById<T extends { id?: number }>(items: T[], item: T, limit: number): T[] {
		if (!item.id) {
			const appended = [...items, item];
			return appended.length > limit ? appended.slice(-limit) : appended;
		}

		const index = items.findIndex((existing) => existing.id === item.id);
		if (index !== -1) {
			const clone = [...items];
			clone[index] = item;
			return clone;
		}

		const updated = [...items, item];
		if (updated.length > limit) {
			updated.shift();
		}
		return updated;
	}

	const sessionRoomId = roomId ?? generateRoomId();

	onMount(() => {
		let destroyed = false;

		const preventScroll = (event: Event) => {
			if (isPointerOver) {
				event.preventDefault();
			}
		};

		const blockScrollKeys = (event: KeyboardEvent) => {
			if (!isPointerOver) return;
			const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'PageUp', 'PageDown'];
			if (keys.includes(event.key)) {
				event.preventDefault();
			}
		};

		const onEnter = () => (isPointerOver = true);
		const onLeave = () => (isPointerOver = false);

		// Global error handler to catch unhandled errors
		const handleGlobalError = (event: ErrorEvent) => {
			const errorMessage = event.message || event.error?.message || 'Unknown error occurred';
			const errorStack = event.error?.stack;

			console.error('[GamePreview] Global error:', errorMessage);
			if (errorStack) console.error(errorStack);

			status = 'error';
			error = {
				type: 'runtime',
				message: errorMessage,
				stack: errorStack
			};
		};

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			const reason = event.reason;
			const errorMessage = reason?.message || String(reason) || 'Unhandled promise rejection';
			const errorStack = reason?.stack;

			console.error('[GamePreview] Unhandled rejection:', errorMessage);
			if (errorStack) console.error(errorStack);

			status = 'error';
			error = {
				type: 'runtime',
				message: errorMessage,
				stack: errorStack
			};
		};

		// Lock scroll interactions around the preview container
		container?.addEventListener('wheel', preventScroll, { passive: false });
		container?.addEventListener('touchmove', preventScroll, { passive: false });
		container?.addEventListener('mouseenter', onEnter);
		container?.addEventListener('mouseleave', onLeave);
		window.addEventListener('keydown', blockScrollKeys, { passive: false });
		window.addEventListener('error', handleGlobalError);
		window.addEventListener('unhandledrejection', handleUnhandledRejection);

		// Common options for both managers
		const commonOptions = {
			container,
			role,
			roomId: sessionRoomId,
			transportType,
			enableDevTools,
			onError: (err: GameError) => {
				if (destroyed) return;

				console.error(`[GamePreview] ${err.type} error:`, err.message);
				if (err.stack) console.error(err.stack);

				status = 'error';
				error = err;
				onError?.(err);
			},
			onReady: () => {
				if (destroyed) return;

				status = 'running';
				isReady = true;
				error = null;
				onReady?.();
			},
			onConsoleLog: (log: LogEntry) => {
				if (destroyed) return;
				consoleLogs = [...consoleLogs, log];
			},
			onConnectionStatus: (newStatus: ConnectionStatus) => {
				if (destroyed) return;
				connectionStatus = newStatus;
			},
			onStateSnapshot: (snapshot: StateSnapshot) => {
				if (destroyed) return;
				stateSnapshots = upsertById(stateSnapshots, snapshot, 500);
			},
			onAction: (action: ActionRecord) => {
				if (destroyed) return;
				actionHistory = upsertById(actionHistory, action, 2000);
				if (typeof action.excludedActionsTotal === 'number') {
					actionExcludedCount = action.excludedActionsTotal;
				}
			},
			onNetworkPacket: (packet: NetworkPacket) => {
				if (destroyed) return;
				networkPackets = [...networkPackets, packet];

				// Enforce max packets limit
				if (networkPackets.length > 1000) {
					networkPackets.shift();
				}
			}
		};

		(async () => {
			try {
				esbuildManager = new ESBuildManager(commonOptions);
				await esbuildManager.initialize();
				await esbuildManager.run(vfs, entryPoint);
			} catch (err) {
				console.error('[GamePreview] Initialization failed:', err instanceof Error ? err.message : String(err));
				if (err instanceof Error && err.stack) {
					console.error(err.stack);
				}

				if (destroyed) return;

				status = 'error';
				error = {
					type: 'runtime',
					message: err instanceof Error ? err.message : 'Failed to initialize ESBuild',
					stack: err instanceof Error ? err.stack : undefined
				};
			}
		})();

		return () => {
			destroyed = true;
			esbuildManager?.destroy();
			container?.removeEventListener('wheel', preventScroll);
			container?.removeEventListener('touchmove', preventScroll);
			container?.removeEventListener('mouseenter', onEnter);
			container?.removeEventListener('mouseleave', onLeave);
			window.removeEventListener('keydown', blockScrollKeys);
			window.removeEventListener('error', handleGlobalError);
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		};
	});

	// Push code updates when files change
		$effect(() => {
			if (!esbuildManager || !isReady) return;
			if (status === 'initializing' || status === 'error') return;

			// Touch dependency to trigger on version bump
			const version = vfsVersion;
			if (version >= 0) {
				esbuildManager.updateCode(vfs, entryPoint).catch((err: unknown) => {
					const message = err instanceof Error ? err.message : String(err);
					const stack = err instanceof Error ? err.stack : undefined;
					console.error('[GamePreview] Code update failed:', message);
					if (stack) console.error(stack);

					status = 'error';
					error = {
						type: 'runtime',
						message,
						stack
					};
				});
			}
		});

	// Sync enableDevTools prop changes to manager
	$effect(() => {
		if (esbuildManager) {
			esbuildManager.setDevToolsEnabled(enableDevTools);
		}
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
	>
		{#if error}
			<div class="error-overlay">
				<div class="error-content">
					<div class="error-icon">⚠️</div>
					<h3 class="error-title">{error.type === 'syntax' ? 'Syntax Error' : 'Runtime Error'}</h3>
					<div class="error-message">{error.message}</div>
					{#if error.stack}
						<details class="error-stack">
							<summary>Stack Trace</summary>
							<pre>{error.stack}</pre>
						</details>
					{/if}
				</div>
			</div>
		{/if}
	</div>

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

	.error-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.error-content {
		background: #1f2937;
		border: 2px solid #ef4444;
		border-radius: 12px;
		padding: 2rem;
		max-width: 600px;
		width: 100%;
		box-shadow: 0 20px 60px rgba(239, 68, 68, 0.3);
	}

	.error-icon {
		font-size: 3rem;
		text-align: center;
		margin-bottom: 1rem;
	}

	.error-title {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #fca5a5;
		text-align: center;
	}

	.error-message {
		color: #f3f4f6;
		font-size: 1rem;
		line-height: 1.6;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 6px;
		border-left: 4px solid #ef4444;
		font-family: 'Consolas', 'Monaco', monospace;
		word-break: break-word;
	}

	.error-stack {
		margin-top: 1rem;
		border-top: 1px solid #374151;
		padding-top: 1rem;
	}

	.error-stack summary {
		cursor: pointer;
		font-size: 0.875rem;
		color: #9ca3af;
		font-weight: 600;
		margin-bottom: 0.5rem;
		user-select: none;
	}

	.error-stack summary:hover {
		color: #d1d5db;
	}

	.error-stack pre {
		background: rgba(0, 0, 0, 0.4);
		padding: 1rem;
		border-radius: 6px;
		overflow-x: auto;
		font-size: 0.75rem;
		line-height: 1.5;
		color: #fca5a5;
		font-family: 'Consolas', 'Monaco', monospace;
		margin: 0;
	}
</style>
