<script lang="ts">
	import { goto } from '$app/navigation';
	import { gameMetadata } from '$lib/games/ide-configs-map';

	const curatedGameIds = Object.keys(gameMetadata);
	const defaultGame = curatedGameIds[0] ?? '';

	let code = $state('');
	let selectedGameId = $state(defaultGame);

	function submitJoin() {
		if (!code) return;
		const params = new URLSearchParams({ game: selectedGameId }).toString();
		goto(`/play/room/${code}?${params}`);
	}
</script>

<svelte:head>
	<title>Join Room - martini-kit</title>
	<link rel="icon" type="image/png" href="/image.png" />
</svelte:head>

<div class="join-page">
	<div class="panel">
		<div class="panel-header">
			<div>
				<p class="eyebrow">Join a room</p>
				<h1>Enter a room code to play</h1>
				<p class="hint">Room code is the last part of the shared URL (e.g. play-xxxxxx).</p>
			</div>
			<a class="ghost" href="/play">← Back to games</a>
		</div>

		<div class="inputs">
			<input
				placeholder="Room code"
				bind:value={code}
				onkeydown={(e) => e.key === 'Enter' && submitJoin()}
			/>
			<select bind:value={selectedGameId} aria-label="Select game to join">
				{#each curatedGameIds as id}
					<option value={id}>{gameMetadata[id]?.title ?? id}</option>
				{/each}
			</select>
			<button class="primary" onclick={submitJoin} disabled={!code}>Join room</button>
		</div>
	</div>
</div>

<style>
	.join-page {
		min-height: 100vh;
		display: grid;
		place-items: center;
		background: var(--bg-page);
		color: var(--text);
		padding: 2.5rem 1.5rem;
	}

	.panel {
		width: 100%;
		max-width: 520px;
		padding: 1.6rem;
		border-radius: 16px;
		border: 1px solid var(--border);
		background: #ffffff;
		box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.eyebrow {
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-2);
		font-weight: 700;
		font-size: 0.8rem;
		margin: 0;
	}

	h1 {
		margin: 0;
		letter-spacing: -0.01em;
	}

	.hint {
		margin: 0 0 0.25rem 0;
		color: var(--muted);
	}

	.inputs {
		display: flex;
		gap: 0.5rem;
	}

	input,
	select {
		border-radius: 10px;
		border: 1px solid var(--border);
		background: #f8fafc;
		color: var(--text);
		padding: 0.75rem 0.85rem;
		font-size: 1rem;
	}

	select {
		min-width: 160px;
	}

	.primary {
		background: linear-gradient(135deg, var(--accent), var(--accent-2));
		color: #fff;
		border: none;
		border-radius: 12px;
		padding: 0.75rem 1.1rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 10px 30px rgba(37, 99, 235, 0.25);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 14px 34px rgba(37, 99, 235, 0.28);
	}

	.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.ghost {
		align-self: flex-start;
		border: 1px solid var(--border);
		color: var(--muted-2);
		background: #ffffff;
		border-radius: 10px;
		padding: 0.55rem 0.95rem;
		text-decoration: none;
		font-weight: 600;
		transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
	}

	.ghost:hover {
		border-color: var(--border-strong);
		color: var(--text);
		transform: translateY(-1px);
	}

	@media (max-width: 720px) {
		.inputs {
			flex-direction: column;
		}

		.panel {
			padding: 1.25rem;
		}
	}
</style>
