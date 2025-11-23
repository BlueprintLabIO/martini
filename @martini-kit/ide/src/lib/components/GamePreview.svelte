<script lang="ts">
	import { onMount } from 'svelte';
	import { ESBuildManager } from '../core/ESBuildManager';
	import type { VirtualFileSystem } from '../core/VirtualFS';
	import type { StateSnapshot, ActionRecord } from '@martini-kit/devtools';

	interface Props {
		vfs: VirtualFileSystem;
		vfsVersion?: number;
		entryPoint: string;
		role: 'host' | 'client';
		transportType: 'local' | 'iframe-bridge';
		onError?: (error: { type: 'runtime' | 'syntax'; message: string; stack?: string }) => void;
		onReady?: () => void;
		consoleLogs?: Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error' }>;
		connectionStatus?: 'disconnected' | 'connecting' | 'connected';
		stateSnapshots?: StateSnapshot[];
		actionHistory?: ActionRecord[];
		actionExcludedCount?: number;
		networkPackets?: Array<{
			timestamp: number;
			direction: 'send' | 'receive';
			type: string;
			size: number;
			payload: any;
		}>;
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
	let error = $state<{ type: 'runtime' | 'syntax'; message: string; stack?: string } | null>(null);
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

	onMount(async () => {
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

		// Lock scroll interactions around the preview container
		container?.addEventListener('wheel', preventScroll, { passive: false });
		container?.addEventListener('touchmove', preventScroll, { passive: false });
		container?.addEventListener('mouseenter', onEnter);
		container?.addEventListener('mouseleave', onLeave);
		window.addEventListener('keydown', blockScrollKeys, { passive: false });

		// Common options for both managers
		const commonOptions = {
			container,
			role,
			roomId: sessionRoomId,
			transportType,
			enableDevTools,
			onError: (err) => {
				status = 'error';
				error = err;
				onError?.(err);
			},
			onReady: () => {
				status = 'running';
				isReady = true;
				error = null;
				onReady?.();
			},
			onConsoleLog: (log) => {
				consoleLogs = [...consoleLogs, log];
			},
			onConnectionStatus: (newStatus) => {
				connectionStatus = newStatus;
			},
			onStateSnapshot: (snapshot) => {
				stateSnapshots = upsertById(stateSnapshots, snapshot, 500);
			},
			onAction: (action) => {
				actionHistory = upsertById(actionHistory, action, 2000);
				if (typeof action.excludedActionsTotal === 'number') {
					actionExcludedCount = action.excludedActionsTotal;
				}
			},
			onNetworkPacket: (packet) => {
				networkPackets = [...networkPackets, packet];

				// Enforce max packets limit
				if (networkPackets.length > 1000) {
					networkPackets.shift();
				}
			}
		};

		try {
			console.log('[GamePreview] Using ESBuild-WASM bundler');
			esbuildManager = new ESBuildManager(commonOptions);
			await esbuildManager.initialize();
			await esbuildManager.run(vfs, entryPoint);
		} catch (err) {
			status = 'error';
			error = {
				type: 'runtime',
				message: err instanceof Error ? err.message : 'Failed to initialize ESBuild',
				stack: err instanceof Error ? err.stack : undefined
			};
		}

		return () => {
			esbuildManager?.destroy();
			container?.removeEventListener('wheel', preventScroll);
			container?.removeEventListener('touchmove', preventScroll);
			container?.removeEventListener('mouseenter', onEnter);
			container?.removeEventListener('mouseleave', onLeave);
			window.removeEventListener('keydown', blockScrollKeys);
		};
	});

	// Push code updates when files change
	$effect(() => {
		if (!esbuildManager || !isReady) return;
		if (status === 'initializing' || status === 'error') return;

		// Touch dependency to trigger on version bump
		const version = vfsVersion;
		if (version >= 0) {
			esbuildManager.updateCode(vfs, entryPoint).catch((err) => {
				console.error('[GamePreview] Failed to update code', err);
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
