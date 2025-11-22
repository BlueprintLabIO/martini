<script lang="ts">
	interface Action {
		timestamp: number;
		actionName: string;
		input: any;
		playerId?: string;
		targetId?: string;
		count?: number;
		duration?: number;
		snapshotId?: number;
	}

	interface Props {
		actions: Action[];
		excludedCount?: number;
	}

	let { actions = [], excludedCount = 0 }: Props = $props();

	let filter = $state('');
	let selectedActionIndex = $state<number | null>(null);

	let filteredActions = $derived(
		filter
			? actions.filter((a) => a.actionName.toLowerCase().includes(filter.toLowerCase()))
			: actions
	);

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
</script>

{#if actions.length === 0 && excludedCount === 0}
	<div class="empty-state">
		<p>No actions recorded yet</p>
		<p class="hint">Interact with the game to record actions</p>
	</div>
{:else}
	<div class="action-timeline">
		<!-- Filter Bar -->
		<div class="filter-bar">
			<input
				type="text"
				placeholder="Filter actions..."
				bind:value={filter}
				class="filter-input"
			/>
			<span class="filter-count">
				{filteredActions.length} / {actions.length}
			</span>
			{#if excludedCount > 0}
				<span class="excluded-count" title="{excludedCount} actions filtered out">
					🚫 {excludedCount}
				</span>
			{/if}
		</div>

		<!-- Action List -->
		<div class="actions-list">
			{#each filteredActions.slice().reverse() as action, index}
				{@const actualIndex = filteredActions.length - 1 - index}
				<button
					type="button"
					class="action-entry"
					class:selected={selectedActionIndex === actualIndex}
					onclick={() => (selectedActionIndex = actualIndex)}
				>
					<div class="action-header">
						<span class="action-timestamp">{formatTimestamp(action.timestamp)}</span>
						<span class="action-name">{action.actionName}</span>
						{#if action.count && action.count > 1}
							<span class="action-count" title="Aggregated {action.count} times over {action.duration}ms">
								×{action.count} ({(action.duration ?? 0).toFixed(0)}ms)
							</span>
						{/if}
						{#if action.playerId}
							<span class="action-player" title="Player ID">
								{action.playerId.substring(0, 8)}
							</span>
						{/if}
						{#if action.targetId}
							<span class="action-target" title="Target ID">
								→ {action.targetId.substring(0, 8)}
							</span>
						{/if}
						{#if action.snapshotId !== undefined}
							<span class="action-snapshot-link" title="Linked to snapshot #{action.snapshotId}">
								📊 #{action.snapshotId}
							</span>
						{/if}
					</div>

					{#if action.input && Object.keys(action.input).length > 0}
						<div class="action-input">
							<pre>{JSON.stringify(action.input, null, 2)}</pre>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.action-timeline {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: 0.5rem;
	}

	.filter-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: rgba(37, 37, 38, 0.5);
		border-radius: 4px;
	}

	.filter-input {
		flex: 1;
		padding: 0.375rem 0.5rem;
		background: rgba(20, 20, 20, 0.5);
		border: 1px solid rgba(62, 62, 66, 0.5);
		border-radius: 3px;
		color: #d4d4d4;
		font-size: 0.6875rem;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.filter-input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.filter-count {
		font-size: 0.625rem;
		color: #6e6e6e;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.excluded-count {
		padding: 0.125rem 0.5rem;
		border-radius: 3px;
		font-size: 0.625rem;
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.25);
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.actions-list {
		flex: 1;
		overflow-y: auto;
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
		cursor: pointer;
		transition: background 0.15s;
	}

	.action-entry:hover {
		background: rgba(42, 42, 42, 0.8);
	}

	.action-entry.selected {
		border-color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
	}

	.action-header {
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
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.action-count {
		padding: 0.0625rem 0.375rem;
		border-radius: 3px;
		font-size: 0.625rem;
		background: rgba(251, 191, 36, 0.15);
		color: #fbbf24;
		border: 1px solid rgba(251, 191, 36, 0.25);
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-weight: 600;
	}

	.action-snapshot-link {
		padding: 0.0625rem 0.375rem;
		border-radius: 3px;
		font-size: 0.625rem;
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
		border: 1px solid rgba(59, 130, 246, 0.25);
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		cursor: pointer;
	}

	.action-snapshot-link:hover {
		background: rgba(59, 130, 246, 0.25);
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
</style>
