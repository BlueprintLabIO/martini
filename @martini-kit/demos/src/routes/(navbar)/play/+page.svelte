<script lang="ts">
	import { goto } from '$app/navigation';
	import { gameMetadata } from '$lib/games/ide-configs-map';

	const curatedGameIds = Object.keys(gameMetadata);
	const defaultGame = curatedGameIds[0] ?? '';

	let manualRoomCode = $state('');
	let manualGameId = $state(defaultGame);

	function generateRoomId(gameId: string) {
		const seed = gameId || 'martini';
		return `play-${seed}-${Math.random().toString(36).slice(2, 8)}`;
	}

	function hostGame(gameId: string) {
		const roomId = generateRoomId(gameId);
		const search = new URLSearchParams({ game: gameId, role: 'host' }).toString();
		goto(`/play/room/${roomId}?${search}`);
	}

	function joinManual() {
		if (!manualRoomCode) return;
		const search = new URLSearchParams({ game: manualGameId }).toString();
		goto(`/play/room/${manualRoomCode}?${search}`);
	}
</script>

<svelte:head>
	<title>Play with Friends - martini-kit</title>
	<link rel="icon" type="image/png" href="/image.png" />
</svelte:head>

<div class="play-hub">
	<div class="page-container">
		<header class="hero">
			<div class="hero-copy">
				<p class="eyebrow">martini-kit live play</p>
				<h1>Pick a game, host a room, share the link.</h1>
				<p class="lead">
					Host a curated martini-kit game or jump into a friend's room code. Peer-to-peer by default,
					no extra setup needed.
				</p>
				<div class="pill-row">
					<span class="pill">P2P sessions</span>
					<span class="pill">Shareable URLs</span>
					<span class="pill">Curated demos</span>
				</div>
			</div>
			<div class="join-card">
				<div class="card-top">
					<p class="label">Have a room code?</p>
					<p class="hint">Room code is the last part of the shared URL (e.g. play-xxxxxx).</p>
				</div>
				<div class="inputs">
					<input
						placeholder="Enter room code"
						bind:value={manualRoomCode}
						onkeydown={(e) => e.key === 'Enter' && joinManual()}
					/>
					<select bind:value={manualGameId} aria-label="Select game to join">
						{#each curatedGameIds as id}
							<option value={id}>{gameMetadata[id]?.title ?? id}</option>
						{/each}
					</select>
					<button class="primary" onclick={joinManual} disabled={!manualRoomCode}>Join room</button>
				</div>
			</div>
		</header>

		<section class="gallery">
			<div class="section-header">
				<div>
					<p class="eyebrow">Curated demos</p>
					<h2>Host any martini-kit sample</h2>
					<p class="muted">
						Start a fresh room or preview the experience first. These samples mirror the ones in /preview.
					</p>
				</div>
			</div>
			<div class="cards">
				{#each curatedGameIds as id}
					<div class="card">
						<div class="card-header">
							<div>
								<p class="eyebrow">{gameMetadata[id]?.difficulty ?? 'multiplayer'}</p>
								<h3>{gameMetadata[id]?.title ?? id}</h3>
							</div>
							<span class="badge">{gameMetadata[id]?.difficulty ?? 'ready to play'}</span>
						</div>
						<p class="description">{gameMetadata[id]?.description ?? 'Playable martini-kit game'}</p>
						<div class="actions">
							<button class="primary" onclick={() => hostGame(id)}>Host room</button>
							<a class="ghost" href={`/preview/${id}`} target="_blank" rel="noreferrer">Preview</a>
						</div>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<style>
	.play-hub {
		min-height: 100vh;
		background: var(--bg-page);
		color: var(--text);
		padding: 3.5rem 1.5rem 4rem;
	}

	.page-container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.hero {
		display: grid;
		grid-template-columns: 1.2fr 0.9fr;
		gap: 1.5rem;
		align-items: center;
		padding: 2rem;
		border-radius: 18px;
		border: 1px solid var(--border);
		background: linear-gradient(135deg, #ffffff, #f4f7ff);
		box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
		position: relative;
		overflow: hidden;
	}

	.hero::after {
		content: "";
		position: absolute;
		inset: -30% 30% auto auto;
		height: 360px;
		width: 360px;
		background: radial-gradient(circle, rgba(124, 231, 207, 0.2), transparent 60%);
		filter: blur(4px);
		pointer-events: none;
	}

	.hero-copy {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.eyebrow {
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-2);
		font-weight: 700;
		font-size: 0.78rem;
		margin: 0;
	}

	.lead {
		margin: 0;
		color: var(--muted);
		line-height: 1.6;
	}

	.join-card {
		padding: 1.25rem;
		border-radius: 14px;
		border: 1px solid var(--border);
		background: #ffffff;
		box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		position: relative;
	}

	.card-top {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.label {
		margin: 0;
		color: var(--text);
		font-weight: 700;
	}

	.hint {
		margin: 0 0 0.25rem 0;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.inputs {
		display: grid;
		grid-template-columns: 1.2fr 1fr auto;
		gap: 0.65rem;
	}

	input,
	select {
		border-radius: 10px;
		border: 1px solid var(--border);
		background: #f8fafc;
		color: var(--text);
		padding: 0.75rem 0.8rem;
		font-size: 1rem;
	}

	select {
		min-width: 180px;
	}

	.primary {
		background: linear-gradient(135deg, var(--accent), var(--accent-2));
		color: #fff;
		border: none;
		border-radius: 12px;
		padding: 0.65rem 1.2rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 10px 30px rgba(37, 99, 235, 0.25);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 14px 36px rgba(37, 99, 235, 0.28);
	}

	.primary:disabled {
		opacity: 0.55;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.ghost {
		border: 1px solid var(--border);
		color: var(--muted-2);
		background: #ffffff;
		border-radius: 10px;
		padding: 0.6rem 0.95rem;
		cursor: pointer;
		text-decoration: none;
		font-weight: 600;
		transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
	}

	.ghost:hover {
		border-color: var(--border-strong);
		color: var(--text);
		transform: translateY(-1px);
	}

	.pill-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.7rem;
		border-radius: 999px;
		background: #eef2ff;
		color: #1d2753;
		font-weight: 700;
		font-size: 0.9rem;
		border: 1px solid var(--border);
	}

	.gallery {
		margin-top: 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-header h2 {
		margin: 0.2rem 0 0.4rem 0;
		font-size: clamp(1.9rem, 3vw, 2.2rem);
	}

	.section-header .muted {
		margin: 0;
		color: var(--muted);
		line-height: 1.6;
		max-width: 760px;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1.1rem;
	}

	.card {
		background: #ffffff;
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: 100%;
		box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
		transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
	}

	.card:hover {
		transform: translateY(-3px);
		box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
		border-color: var(--border-strong);
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.card h3 {
		margin: 0;
		letter-spacing: -0.01em;
	}

	.badge {
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: #eef2ff;
		color: #1d2753;
		font-weight: 700;
		text-transform: capitalize;
		font-size: 0.88rem;
	}

	.description {
		margin: 0;
		color: var(--muted);
		line-height: 1.55;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: auto;
	}

	@media (max-width: 1024px) {
		.hero {
			grid-template-columns: 1fr;
		}

		.inputs {
			grid-template-columns: 1fr;
		}
	}
</style>
