<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		role: 'host' | 'client';
		logs?: Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error'; channel?: string }>;
		status?: 'disconnected' | 'connecting' | 'connected';
		onClose?: () => void;
	}

	let { role, logs = [], status = 'disconnected', onClose }: Props = $props();

	let activeTab = $state<'console' | 'state' | 'actions'>('console');
	let isMinimized = $state(false);
	let isDragging = $state(false);
	let position = $state({ x: 10, y: 10 });
	let dragStart = { x: 0, y: 0, posX: 0, posY: 0 };

	function getStatusColor(status: string): string {
		switch (status) {
			case 'connected':
				return '#10b981'; // green
			case 'connecting':
				return '#f59e0b'; // yellow
			case 'disconnected':
			default:
				return '#ef4444'; // red
		}
	}

	function formatTimestamp(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
	}

	function getLevelIcon(level: string): string {
		switch (level) {
			case 'error':
				return '❌';
			case 'warn':
				return '⚠️';
			default:
				return 'ℹ️';
		}
	}

	function getLevelClass(level: string): string {
		return `log-level-${level}`;
	}

	// Dragging functionality
	function handleMouseDown(e: MouseEvent) {
		if ((e.target as HTMLElement).closest('.tab, button')) return;
		isDragging = true;
		dragStart = {
			x: e.clientX,
			y: e.clientY,
			posX: position.x,
			posY: position.y
		};
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		position = {
			x: dragStart.posX + (e.clientX - dragStart.x),
			y: dragStart.posY + (e.clientY - dragStart.y)
		};
	}

	function handleMouseUp() {
		isDragging = false;
	}

	onMount(() => {
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		};
	});
</script>

<div
	class="devtools-overlay"
	class:minimized={isMinimized}
	class:dragging={isDragging}
	style="left: {position.x}px; top: {position.y}px;"
>
	<!-- Header -->
	<div class="overlay-header" onmousedown={handleMouseDown}>
		<div class="header-left">
			<span class="role-badge role-{role}">{role}</span>
			<span class="status-dot" style="background-color: {getStatusColor(status)};"></span>
			<span class="status-text">{status}</span>
		</div>
		<div class="header-actions">
			<button class="header-btn" onclick={() => (isMinimized = !isMinimized)} title={isMinimized ? 'Maximize' : 'Minimize'}>
				{isMinimized ? '□' : '−'}
			</button>
			<button class="header-btn" onclick={onClose} title="Close">×</button>
		</div>
	</div>

	{#if !isMinimized}
		<!-- Tabs -->
		<div class="tabs">
			<button class="tab" class:active={activeTab === 'console'} onclick={() => (activeTab = 'console')}>
				Console ({logs.length})
			</button>
			<button class="tab" class:active={activeTab === 'state'} onclick={() => (activeTab = 'state')}>
				State
			</button>
			<button class="tab" class:active={activeTab === 'actions'} onclick={() => (activeTab = 'actions')}>
				Actions
			</button>
		</div>

		<!-- Content -->
		<div class="overlay-content">
			{#if activeTab === 'console'}
				<div class="console-panel">
					{#if logs.length === 0}
						<div class="empty-state">
							<p>No console output yet</p>
						</div>
					{:else}
						<div class="logs-list">
							{#each logs as log, index (`${log.timestamp}-${index}`)}
								<div class="log-entry {getLevelClass(log.level)}">
									<span class="log-icon">{getLevelIcon(log.level)}</span>
									<span class="log-timestamp">{formatTimestamp(log.timestamp)}</span>
									{#if log.channel}
										<span class="log-channel">[{log.channel}]</span>
									{/if}
									<span class="log-message">{log.message}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeTab === 'state'}
				<div class="state-panel">
					<div class="empty-state">
						<p>State inspector coming soon</p>
					</div>
				</div>
			{:else if activeTab === 'actions'}
				<div class="actions-panel">
					<div class="empty-state">
						<p>Action history coming soon</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.devtools-overlay {
		position: absolute;
		width: 350px;
		max-height: 400px;
		background: rgba(30, 30, 30, 0.95);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(62, 62, 66, 0.8);
		border-radius: 8px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		color: #d4d4d4;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 0.75rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		user-select: none;
	}

	.devtools-overlay.minimized {
		max-height: none;
		height: auto;
	}

	.devtools-overlay.dragging {
		cursor: move;
		opacity: 0.9;
	}

	.overlay-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background: rgba(37, 37, 38, 0.95);
		border-bottom: 1px solid rgba(62, 62, 66, 0.8);
		border-radius: 8px 8px 0 0;
		cursor: move;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.role-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.role-host {
		background: rgba(78, 201, 176, 0.2);
		color: #4ec9b0;
		border: 1px solid rgba(78, 201, 176, 0.3);
	}

	.role-client {
		background: rgba(206, 145, 120, 0.2);
		color: #ce9178;
		border: 1px solid rgba(206, 145, 120, 0.3);
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.status-text {
		font-size: 0.6875rem;
		color: #a0a0a0;
		text-transform: capitalize;
	}

	.header-actions {
		display: flex;
		gap: 0.25rem;
	}

	.header-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: #cccccc;
		cursor: pointer;
		border-radius: 3px;
		font-size: 1rem;
		line-height: 1;
		padding: 0;
		transition: background 0.15s;
	}

	.header-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.tabs {
		display: flex;
		background: rgba(37, 37, 38, 0.8);
		border-bottom: 1px solid rgba(62, 62, 66, 0.6);
	}

	.tab {
		flex: 1;
		padding: 0.375rem 0.5rem;
		background: transparent;
		border: none;
		color: #969696;
		cursor: pointer;
		font-size: 0.6875rem;
		font-family: inherit;
		transition: all 0.15s;
		border-bottom: 2px solid transparent;
		text-align: center;
	}

	.tab:hover {
		background: rgba(42, 42, 42, 0.8);
		color: #cccccc;
	}

	.tab.active {
		color: #ffffff;
		border-bottom-color: #007acc;
	}

	.overlay-content {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.console-panel,
	.state-panel,
	.actions-panel {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0.5rem;
		min-height: 0;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 100px;
		color: #6e6e6e;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.75rem;
	}

	.logs-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.log-entry {
		display: flex;
		align-items: flex-start;
		gap: 0.375rem;
		padding: 0.25rem 0.375rem;
		border-radius: 3px;
		font-size: 0.6875rem;
		line-height: 1.4;
		transition: background 0.1s;
	}

	.log-entry:hover {
		background: rgba(42, 42, 42, 0.8);
	}

	.log-icon {
		flex-shrink: 0;
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.log-timestamp {
		color: #6e6e6e;
		flex-shrink: 0;
		font-size: 0.625rem;
	}

	.log-channel {
		padding: 0.0625rem 0.375rem;
		border-radius: 3px;
		font-size: 0.625rem;
		font-weight: 500;
		background: rgba(86, 156, 214, 0.15);
		color: #569cd6;
		border: 1px solid rgba(86, 156, 214, 0.25);
		flex-shrink: 0;
		letter-spacing: 0.02em;
	}

	.log-message {
		flex: 1;
		word-break: break-word;
		color: #d4d4d4;
		min-width: 0;
	}

	.log-level-error .log-message {
		color: #f48771;
	}

	.log-level-warn .log-message {
		color: #dcdcaa;
	}

	.log-level-log .log-message {
		color: #d4d4d4;
	}
</style>
