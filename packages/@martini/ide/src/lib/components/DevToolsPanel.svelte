<script lang="ts">
	import { onMount } from 'svelte';
	import type { StateSnapshot, ActionRecord } from '@martini/devtools';

	interface Props {
		role: 'host' | 'client';
		logs?: Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error'; channel?: string }>;
		status?: 'disconnected' | 'connecting' | 'connected';
		stateSnapshots?: StateSnapshot[];
		actionHistory?: ActionRecord[];
		onClose?: () => void;
	}

	let { role, logs = [], status = 'disconnected', stateSnapshots = [], actionHistory = [], onClose }: Props = $props();

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
					{#if stateSnapshots.length === 0}
						<div class="empty-state">
							<p>No state snapshots yet</p>
						</div>
					{:else}
						{@const latestSnapshot = stateSnapshots[stateSnapshots.length - 1]}
						<div class="state-viewer">
							<div class="state-header">
								<span class="state-label">Current State</span>
								<span class="state-timestamp">{formatTimestamp(latestSnapshot.timestamp)}</span>
							</div>
							<div class="state-content">
								<pre class="state-json">{JSON.stringify(latestSnapshot.state, null, 2)}</pre>
							</div>
							<div class="state-footer">
								<span class="state-count">{stateSnapshots.length} snapshot{stateSnapshots.length === 1 ? '' : 's'}</span>
							</div>
						</div>
					{/if}
				</div>
			{:else if activeTab === 'actions'}
				<div class="actions-panel">
					{#if actionHistory.length === 0}
						<div class="empty-state">
							<p>No actions recorded yet</p>
						</div>
					{:else}
						<div class="actions-list">
							{#each actionHistory.slice().reverse() as action, index (`${action.timestamp}-${index}`)}
								<div class="action-entry">
									<span class="action-timestamp">{formatTimestamp(action.timestamp)}</span>
									<span class="action-name">{action.actionName}</span>
									{#if action.playerId}
										<span class="action-player" title="Player ID">{action.playerId.substring(0, 8)}</span>
									{/if}
									{#if action.targetId}
										<span class="action-target" title="Target ID">→ {action.targetId.substring(0, 8)}</span>
									{/if}
									{#if action.input && Object.keys(action.input).length > 0}
										<div class="action-input">
											<pre>{JSON.stringify(action.input, null, 2)}</pre>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
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

	/* State Panel Styles */
	.state-viewer {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: 100%;
	}

	.state-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: rgba(37, 37, 38, 0.5);
		border-radius: 4px;
		border: 1px solid rgba(62, 62, 66, 0.5);
	}

	.state-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: #4ec9b0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.state-timestamp {
		font-size: 0.625rem;
		color: #6e6e6e;
	}

	.state-content {
		flex: 1;
		overflow: auto;
		background: rgba(20, 20, 20, 0.5);
		border-radius: 4px;
		border: 1px solid rgba(62, 62, 66, 0.3);
		padding: 0.5rem;
		min-height: 0;
	}

	.state-json {
		margin: 0;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 0.6875rem;
		line-height: 1.5;
		color: #d4d4d4;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.state-footer {
		display: flex;
		justify-content: flex-end;
		padding: 0.25rem 0.5rem;
	}

	.state-count {
		font-size: 0.625rem;
		color: #6e6e6e;
	}

	/* Actions Panel Styles */
	.actions-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.action-entry {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		background: rgba(37, 37, 38, 0.5);
		border-radius: 4px;
		border: 1px solid rgba(62, 62, 66, 0.3);
		transition: background 0.15s;
	}

	.action-entry:hover {
		background: rgba(42, 42, 42, 0.8);
	}

	.action-entry > :first-child {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.action-timestamp {
		color: #6e6e6e;
		font-size: 0.625rem;
	}

	.action-name {
		color: #dcdcaa;
		font-weight: 600;
		font-size: 0.6875rem;
	}

	.action-player {
		padding: 0.0625rem 0.375rem;
		border-radius: 3px;
		font-size: 0.625rem;
		background: rgba(78, 201, 176, 0.15);
		color: #4ec9b0;
		border: 1px solid rgba(78, 201, 176, 0.25);
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.action-target {
		padding: 0.0625rem 0.375rem;
		border-radius: 3px;
		font-size: 0.625rem;
		background: rgba(206, 145, 120, 0.15);
		color: #ce9178;
		border: 1px solid rgba(206, 145, 120, 0.25);
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.action-input {
		margin-top: 0.25rem;
		padding: 0.375rem;
		background: rgba(20, 20, 20, 0.5);
		border-radius: 3px;
		border: 1px solid rgba(62, 62, 66, 0.3);
	}

	.action-input pre {
		margin: 0;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 0.625rem;
		line-height: 1.4;
		color: #d4d4d4;
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>
