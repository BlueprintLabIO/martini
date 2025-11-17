<script lang="ts">
	import type { Patch } from '@martini/core';

	interface StateSnapshot {
		id: number;
		timestamp: number;
		state?: any;
		diff?: Patch[];
		lastActionId?: number;
	}

	interface Props {
		snapshots: StateSnapshot[];
	}

	let { snapshots = [] }: Props = $props();

	let selectedIndex = $state(snapshots.length - 1);
	let viewMode = $state<'diff' | 'full'>('diff');

	$effect(() => {
		// Auto-select latest snapshot when new data arrives
		selectedIndex = Math.max(0, snapshots.length - 1);
	});

	// Reconstruct full state by applying diffs sequentially
	function getFullStateAtIndex(index: number): any {
		if (index < 0 || index >= snapshots.length) return null;

		let state: any = null;

		for (let i = 0; i <= index; i++) {
			const snapshot = snapshots[i];
			if (snapshot.state) {
				// First snapshot with full state
				state = JSON.parse(JSON.stringify(snapshot.state));
			} else if (snapshot.diff && state) {
				// Apply diff
				applyPatches(state, snapshot.diff);
			}
		}

		return state;
	}

	function applyPatches(obj: any, patches: Patch[]): void {
		for (const patch of patches) {
			applyPatch(obj, patch);
		}
	}

	function applyPatch(obj: any, patch: Patch): void {
		const { op, path, value } = patch;
		let current = obj;

		// Navigate to parent
		for (let i = 0; i < path.length - 1; i++) {
			current = current[path[i]];
			if (!current) return;
		}

		const lastKey = path[path.length - 1];

		if (op === 'replace' || op === 'add') {
			current[lastKey] = value;
		} else if (op === 'remove') {
			delete current[lastKey];
		}
	}

	function formatTimestamp(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	}

	function formatRelativeTime(timestamp: number): string {
		if (snapshots.length === 0) return '';
		const first = snapshots[0].timestamp;
		const elapsed = timestamp - first;
		return `+${(elapsed / 1000).toFixed(3)}s`;
	}

	function formatPath(path: string[]): string {
		return path.join('.');
	}

	function formatValue(value: any): string {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'object') {
			return JSON.stringify(value);
		}
		return String(value);
	}

	function getOperationColor(op: string): string {
		switch (op) {
			case 'add':
				return '#4ade80'; // green
			case 'remove':
				return '#f87171'; // red
			case 'replace':
				return '#fbbf24'; // yellow
			default:
				return '#d4d4d4';
		}
	}

	let currentSnapshot = $derived(snapshots[selectedIndex]);
	let fullState = $derived(viewMode === 'full' ? getFullStateAtIndex(selectedIndex) : null);
</script>

{#if snapshots.length === 0}
	<div class="empty-state">
		<p>No state snapshots yet</p>
		<p class="hint">Run the game to start capturing state</p>
	</div>
{:else}
	<div class="state-viewer">
		<!-- Timeline Controls -->
		<div class="timeline-controls">
			<button
				class="timeline-btn"
				onclick={() => (selectedIndex = Math.max(0, selectedIndex - 1))}
				disabled={selectedIndex === 0}
			>
				◀ Prev
			</button>

			<input
				type="range"
				min="0"
				max={snapshots.length - 1}
				bind:value={selectedIndex}
				class="timeline-slider"
			/>

			<button
				class="timeline-btn"
				onclick={() => (selectedIndex = Math.min(snapshots.length - 1, selectedIndex + 1))}
				disabled={selectedIndex === snapshots.length - 1}
			>
				Next ▶
			</button>

			<span class="timeline-info">
				{selectedIndex + 1} / {snapshots.length}
			</span>

			<!-- View Mode Toggle -->
			<button class="view-toggle" onclick={() => (viewMode = viewMode === 'diff' ? 'full' : 'diff')}>
				{viewMode === 'diff' ? '📊 Diff' : '📄 Full'}
			</button>
		</div>

		<!-- Snapshot Metadata -->
		<div class="snapshot-header">
			<span class="snapshot-time">
				{formatTimestamp(currentSnapshot.timestamp)}
			</span>
			<span class="snapshot-relative">
				{formatRelativeTime(currentSnapshot.timestamp)}
			</span>
			{#if currentSnapshot.lastActionId !== undefined}
				<span class="snapshot-action-link" title="Linked to action #{currentSnapshot.lastActionId}">
					🔗 Action #{currentSnapshot.lastActionId}
				</span>
			{/if}
		</div>

		<!-- Content -->
		<div class="state-content">
			{#if viewMode === 'diff'}
				{#if currentSnapshot.state}
					<!-- First snapshot - show full state -->
					<div class="diff-notice">Initial state snapshot (full)</div>
					<pre class="state-json">{JSON.stringify(currentSnapshot.state, null, 2)}</pre>
				{:else if currentSnapshot.diff && currentSnapshot.diff.length > 0}
					<!-- Show diffs -->
					<div class="diff-list">
						{#each currentSnapshot.diff as patch}
							<div class="diff-entry" style="border-left-color: {getOperationColor(patch.op)}">
								<div class="diff-header">
									<span class="diff-op" style="color: {getOperationColor(patch.op)}">
										{patch.op.toUpperCase()}
									</span>
									<span class="diff-path">{formatPath(patch.path)}</span>
								</div>
								{#if patch.value !== undefined}
									<div class="diff-value">
										<pre>{formatValue(patch.value)}</pre>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<div class="diff-notice">No changes in this snapshot</div>
				{/if}
			{:else}
				<!-- Full state view -->
				{#if fullState}
					<pre class="state-json">{JSON.stringify(fullState, null, 2)}</pre>
				{:else}
					<div class="diff-notice">Unable to reconstruct state</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.state-viewer {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: 0.5rem;
	}

	.timeline-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: rgba(37, 37, 38, 0.5);
		border-radius: 4px;
	}

	.timeline-btn {
		padding: 0.25rem 0.75rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		font-size: 0.75rem;
	}

	.timeline-btn:disabled {
		background: #4a5568;
		cursor: not-allowed;
		opacity: 0.5;
	}

	.view-toggle {
		padding: 0.25rem 0.75rem;
		background: rgba(78, 201, 176, 0.2);
		color: #4ec9b0;
		border: 1px solid rgba(78, 201, 176, 0.3);
		border-radius: 3px;
		cursor: pointer;
		font-size: 0.75rem;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		transition: background 0.15s;
	}

	.view-toggle:hover {
		background: rgba(78, 201, 176, 0.3);
	}

	.timeline-slider {
		flex: 1;
		height: 4px;
		background: #4a5568;
		border-radius: 2px;
		outline: none;
		cursor: pointer;
	}

	.timeline-slider::-webkit-slider-thumb {
		appearance: none;
		width: 12px;
		height: 12px;
		background: #3b82f6;
		border-radius: 50%;
		cursor: pointer;
	}

	.timeline-info {
		font-size: 0.625rem;
		color: #a0a0a0;
		white-space: nowrap;
	}

	.snapshot-header {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem;
		background: rgba(37, 37, 38, 0.5);
		border-radius: 4px;
		font-size: 0.6875rem;
	}

	.snapshot-time {
		color: #4ec9b0;
		font-weight: 600;
	}

	.snapshot-relative {
		color: #6e6e6e;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.snapshot-action-link {
		padding: 0.125rem 0.5rem;
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
		border: 1px solid rgba(59, 130, 246, 0.25);
		border-radius: 3px;
		font-size: 0.625rem;
		cursor: pointer;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.snapshot-action-link:hover {
		background: rgba(59, 130, 246, 0.25);
	}

	.state-content {
		flex: 1;
		overflow: auto;
		background: rgba(20, 20, 20, 0.5);
		border-radius: 4px;
		padding: 0.5rem;
	}

	.state-json {
		margin: 0;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 0.6875rem;
		line-height: 1.5;
		color: #d4d4d4;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #6e6e6e;
		text-align: center;
	}

	.empty-state p {
		margin: 0.25rem 0;
	}

	.hint {
		font-size: 0.6875rem;
		color: #4a5568;
	}

	.diff-notice {
		padding: 1rem;
		text-align: center;
		color: #6e6e6e;
		font-size: 0.6875rem;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.diff-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.diff-entry {
		background: rgba(37, 37, 38, 0.5);
		border-radius: 4px;
		border-left: 3px solid;
		padding: 0.5rem;
	}

	.diff-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.diff-op {
		font-weight: 700;
		font-size: 0.625rem;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.diff-path {
		color: #dcdcaa;
		font-size: 0.6875rem;
		font-weight: 600;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.diff-value {
		margin-top: 0.25rem;
		padding: 0.375rem;
		background: rgba(20, 20, 20, 0.5);
		border-radius: 3px;
	}

	.diff-value pre {
		margin: 0;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 0.625rem;
		line-height: 1.4;
		color: #d4d4d4;
	}
</style>
