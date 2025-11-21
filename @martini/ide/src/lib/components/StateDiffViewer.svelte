<script lang="ts">
	import type { Patch } from '@martini-kit/core';
	import { untrack } from 'svelte';

	interface StateSnapshot {
		id: number;
		timestamp: number;
		state?: any;
		diff?: Patch[];
	}

	interface Props {
		hostSnapshots: StateSnapshot[];
		clientSnapshots: StateSnapshot[];
	}

	let { hostSnapshots = [], clientSnapshots = [] }: Props = $props();

	interface Divergence {
		path: string;
		hostValue: any;
		clientValue: any;
		severity: 'critical' | 'warning' | 'info';
	}

	let divergences = $derived(untrack(() =>
		detectDivergences(getLatestState(hostSnapshots), getLatestState(clientSnapshots))
	));

	// Creates a plain object copy that Svelte's reactivity won't track
	function getLatestState(snapshots: StateSnapshot[]): any {
		if (!snapshots || snapshots.length === 0) return null;

		let state: any = null;

		for (const snapshot of snapshots) {
			if (snapshot.state) {
				// Deep clone via JSON - creates a non-reactive plain object
				state = JSON.parse(JSON.stringify(snapshot.state));
			} else if (snapshot.diff && state) {
				// Apply diff mutations to the plain object
				// Since it's a plain object (not $state), mutations won't be tracked
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

		for (let i = 0; i < path.length - 1; i++) {
			current = current[path[i]];
			if (!current) return;
		}

		const lastKey = path[path.length - 1];

		if (op === 'replace' || op === 'add') {
			current[lastKey] = value;
		} else if (op === 'remove') {
			if (Array.isArray(current)) {
				current.splice(Number(lastKey), 1);
			} else {
				delete current[lastKey];
			}
		}
	}

	function detectDivergences(hostState: any, clientState: any): Divergence[] {
		if (!hostState || !clientState) return [];

		const diffs: Divergence[] = [];

		function compareObjects(obj1: any, obj2: any, path: string = ''): void {
			if (obj1 === obj2) return;

			if (typeof obj1 !== typeof obj2) {
				diffs.push({
					path,
					hostValue: obj1,
					clientValue: obj2,
					severity: 'critical'
				});
				return;
			}

			if (typeof obj1 !== 'object' || obj1 === null) {
				// Primitive value difference
				if (typeof obj1 === 'number') {
					const diff = Math.abs(obj1 - obj2);
					const severity = diff > 10 ? 'critical' : diff > 1 ? 'warning' : 'info';
					diffs.push({ path, hostValue: obj1, clientValue: obj2, severity });
				} else {
					diffs.push({
						path,
						hostValue: obj1,
						clientValue: obj2,
						severity: 'warning'
					});
				}
				return;
			}

			// Object comparison
			const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

			for (const key of allKeys) {
				const newPath = path ? `${path}.${key}` : key;

				if (!(key in obj1)) {
					diffs.push({
						path: newPath,
						hostValue: undefined,
						clientValue: obj2[key],
						severity: 'warning'
					});
				} else if (!(key in obj2)) {
					diffs.push({
						path: newPath,
						hostValue: obj1[key],
						clientValue: undefined,
						severity: 'warning'
					});
				} else {
					compareObjects(obj1[key], obj2[key], newPath);
				}
			}
		}

		compareObjects(hostState, clientState);
		return diffs;
	}

	function getSeverityColor(severity: string): string {
		switch (severity) {
			case 'critical':
				return '#ef4444';
			case 'warning':
				return '#f59e0b';
			case 'info':
				return '#3b82f6';
			default:
				return '#6e6e6e';
		}
	}

	function getSeverityIcon(severity: string): string {
		switch (severity) {
			case 'critical':
				return '🔴';
			case 'warning':
				return '⚠️';
			case 'info':
				return 'ℹ️';
			default:
				return '';
		}
	}

	function formatValue(value: any): string {
		if (value === undefined) return 'undefined';
		if (value === null) return 'null';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}
</script>

<div class="diff-viewer">
	{#if divergences.length === 0}
		<div class="no-divergence">
			<span class="success-icon">✅</span>
			<p>States are in sync</p>
			<p class="hint">No divergences detected</p>
		</div>
	{:else}
		{@const hasPositionDivergences = divergences.some(d => d.path.includes('.x') || d.path.includes('.y') || d.path.includes('._sprites'))}

		{#if hasPositionDivergences}
			<div class="info-banner">
				<span class="info-icon">ℹ️</span>
				<div class="info-content">
					<strong>Position divergences are normal</strong>
					<p>Client state lags behind network sync due to latency, but sprites are correctly interpolated visually.</p>
				</div>
			</div>
		{/if}

		<div class="divergence-header">
			<span class="divergence-count">
				{divergences.length} divergence{divergences.length === 1 ? '' : 's'} detected
			</span>
		</div>

		<div class="divergence-list">
			{#each divergences as divergence}
				<div
					class="divergence-item"
					style="border-left-color: {getSeverityColor(divergence.severity)}"
				>
					<div class="divergence-header-row">
						<span class="severity-icon">{getSeverityIcon(divergence.severity)}</span>
						<span class="divergence-path">{divergence.path}</span>
						<span
							class="severity-badge"
							style="background-color: {getSeverityColor(divergence.severity)}"
						>
							{divergence.severity}
						</span>
					</div>

					<div class="divergence-values">
						<div class="value-row host-value">
							<span class="value-label">HOST:</span>
							<span class="value-content">{formatValue(divergence.hostValue)}</span>
						</div>
						<div class="value-row client-value">
							<span class="value-label">CLIENT:</span>
							<span class="value-content">{formatValue(divergence.clientValue)}</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.diff-viewer {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.no-divergence {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #10b981;
		text-align: center;
	}

	.success-icon {
		font-size: 3rem;
		margin-bottom: 0.5rem;
	}

	.no-divergence p {
		margin: 0.25rem 0;
	}

	.hint {
		font-size: 0.6875rem;
		color: #6e6e6e;
	}

	.info-banner {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}

	.info-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.info-content {
		flex: 1;
	}

	.info-content strong {
		display: block;
		color: #3b82f6;
		font-size: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.info-content p {
		margin: 0;
		font-size: 0.6875rem;
		color: #d4d4d4;
		line-height: 1.4;
	}

	.divergence-header {
		padding: 0.5rem;
		background: rgba(37, 37, 38, 0.5);
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}

	.divergence-count {
		font-size: 0.6875rem;
		color: #f59e0b;
		font-weight: 600;
	}

	.divergence-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.divergence-item {
		padding: 0.5rem;
		background: rgba(37, 37, 38, 0.5);
		border-radius: 4px;
		border-left: 3px solid;
	}

	.divergence-header-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.severity-icon {
		font-size: 1rem;
	}

	.divergence-path {
		flex: 1;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 0.6875rem;
		color: #dcdcaa;
		font-weight: 600;
	}

	.severity-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 3px;
		font-size: 0.625rem;
		color: white;
		text-transform: uppercase;
		font-weight: 600;
	}

	.divergence-values {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		background: rgba(20, 20, 20, 0.5);
		border-radius: 3px;
	}

	.value-row {
		display: flex;
		gap: 0.5rem;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 0.6875rem;
	}

	.value-label {
		font-weight: 600;
		min-width: 60px;
	}

	.host-value .value-label {
		color: #4ec9b0;
	}

	.client-value .value-label {
		color: #ce9178;
	}

	.value-content {
		color: #d4d4d4;
	}
</style>
