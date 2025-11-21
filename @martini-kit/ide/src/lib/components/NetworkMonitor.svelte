<script lang="ts">
	interface NetworkPacket {
		timestamp: number;
		direction: 'send' | 'receive';
		type: string;
		size: number;
		payload: any;
	}

	interface Props {
		packets: NetworkPacket[];
	}

	let { packets = [] }: Props = $props();

	let filter = $state('');
	let selectedPacketIndex = $state<number | null>(null);

	let filteredPackets = $derived(
		filter
			? packets.filter((p) => p.type.toLowerCase().includes(filter.toLowerCase()))
			: packets
	);

	let stats = $derived({
		totalSent: packets.filter((p) => p.direction === 'send').length,
		totalReceived: packets.filter((p) => p.direction === 'receive').length,
		totalBytes: packets.reduce((sum, p) => sum + p.size, 0),
		avgPacketSize:
			packets.length > 0 ? Math.round(packets.reduce((sum, p) => sum + p.size, 0) / packets.length) : 0,
		packetsPerSecond: calculatePacketsPerSecond(packets)
	});

	function calculatePacketsPerSecond(packets: NetworkPacket[]): number {
		if (packets.length < 2) return 0;
		const timeRange = packets[packets.length - 1].timestamp - packets[0].timestamp;
		return Math.round((packets.length / timeRange) * 1000);
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

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

{#if packets.length === 0}
	<div class="empty-state">
		<p>No network packets captured yet</p>
		<p class="hint">Network activity will appear here</p>
	</div>
{:else}
	<div class="network-monitor">
		<!-- Stats Bar -->
		<div class="stats-bar">
			<div class="stat-item">
				<span class="stat-label">Sent:</span>
				<span class="stat-value">{stats.totalSent}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Received:</span>
				<span class="stat-value">{stats.totalReceived}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Total:</span>
				<span class="stat-value">{formatBytes(stats.totalBytes)}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Avg Size:</span>
				<span class="stat-value">{formatBytes(stats.avgPacketSize)}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Rate:</span>
				<span class="stat-value">{stats.packetsPerSecond}/s</span>
			</div>
		</div>

		<!-- Filter Bar -->
		<div class="filter-bar">
			<input
				type="text"
				placeholder="Filter packets..."
				bind:value={filter}
				class="filter-input"
			/>
			<span class="filter-count">
				{filteredPackets.length} / {packets.length}
			</span>
		</div>

		<!-- Packet List -->
		<div class="packets-list">
			{#each filteredPackets.slice().reverse() as packet, index}
				{@const actualIndex = filteredPackets.length - 1 - index}
				<div
					class="packet-entry"
					class:selected={selectedPacketIndex === actualIndex}
					onclick={() => (selectedPacketIndex = actualIndex)}
				>
					<div class="packet-header">
						<span class="packet-timestamp">{formatTimestamp(packet.timestamp)}</span>
						<span class="packet-direction {packet.direction}">
							{packet.direction === 'send' ? '↑' : '↓'}
							{packet.direction}
						</span>
						<span class="packet-type">{packet.type}</span>
						<span class="packet-size">{formatBytes(packet.size)}</span>
					</div>

					{#if selectedPacketIndex === actualIndex}
						<div class="packet-payload">
							<pre>{JSON.stringify(packet.payload, null, 2)}</pre>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.network-monitor {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: 0.5rem;
	}

	.stats-bar {
		display: flex;
		gap: 1rem;
		padding: 0.5rem;
		background: rgba(37, 37, 38, 0.5);
		border-radius: 4px;
		flex-wrap: wrap;
	}

	.stat-item {
		display: flex;
		gap: 0.25rem;
		font-size: 0.6875rem;
	}

	.stat-label {
		color: #6e6e6e;
	}

	.stat-value {
		color: #4ec9b0;
		font-weight: 600;
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
	}

	.packets-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.packet-entry {
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

	.packet-entry:hover {
		background: rgba(42, 42, 42, 0.8);
	}

	.packet-entry.selected {
		border-color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
	}

	.packet-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6875rem;
	}

	.packet-timestamp {
		color: #6e6e6e;
		font-size: 0.625rem;
	}

	.packet-direction {
		padding: 0.0625rem 0.375rem;
		border-radius: 3px;
		font-size: 0.625rem;
		font-weight: 600;
	}

	.packet-direction.send {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.packet-direction.receive {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.packet-type {
		color: #dcdcaa;
		font-weight: 600;
	}

	.packet-size {
		color: #4ec9b0;
		margin-left: auto;
	}

	.packet-payload {
		margin-top: 0.25rem;
		padding: 0.375rem;
		background: rgba(20, 20, 20, 0.5);
		border-radius: 3px;
		border: 1px solid rgba(62, 62, 66, 0.3);
	}

	.packet-payload pre {
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
