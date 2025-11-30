<script lang="ts">
	import { goto } from "$app/navigation";
	import { gameMetadata } from "$lib/games/ide-configs-map";

	const curatedGameIds = Object.keys(gameMetadata);
	const defaultGame = curatedGameIds[0] ?? "";

	let manualRoomCode = $state("");
	let manualGameId = $state(defaultGame);

	function generateRoomId(gameId: string) {
		return Math.random().toString(36).slice(2, 8);
	}

	function hostGame(gameId: string) {
		const roomId = generateRoomId(gameId);
		const search = new URLSearchParams({
			game: gameId,
			role: "host",
		}).toString();
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
				<h1>Play with friends</h1>
				<p class="lead">
					Host a game or join a room. Peer-to-peer, no setup needed.
				</p>
			</div>

			<div class="join-row">
				<input
					placeholder="Enter room code"
					bind:value={manualRoomCode}
					onkeydown={(e) => e.key === "Enter" && joinManual()}
				/>
				<button
					class="primary"
					onclick={joinManual}
					disabled={!manualRoomCode}>Join</button
				>
				<span class="or-divider">or</span>
				<select
					bind:value={manualGameId}
					aria-label="Select game to host"
				>
					{#each curatedGameIds as id}
						<option value={id}
							>{gameMetadata[id]?.title ?? id}</option
						>
					{/each}
				</select>
				<button class="secondary" onclick={() => hostGame(manualGameId)}
					>Host Game</button
				>
			</div>
		</header>

		<section class="gallery">
			<div class="section-header">
				<div>
					<p class="eyebrow">Curated demos</p>
					<h2>Host any martini-kit sample</h2>
					<p class="muted">
						Start a fresh room or preview the experience first.
						These samples mirror the ones in /preview.
					</p>
				</div>
			</div>
			<div class="cards">
				{#each curatedGameIds as id}
					<div class="card">
						<div class="card-header">
							<div>
								<p class="eyebrow">
									{gameMetadata[id]?.difficulty ??
										"multiplayer"}
								</p>
								<h3>{gameMetadata[id]?.title ?? id}</h3>
							</div>
							<span class="badge"
								>{gameMetadata[id]?.difficulty ??
									"ready to play"}</span
							>
						</div>
						<p class="description">
							{gameMetadata[id]?.tagline ??
								gameMetadata[id]?.description ??
								"Playable martini-kit game"}
						</p>
						<div class="actions">
							<button class="primary" onclick={() => hostGame(id)}
								>Host room</button
							>
							<a
								class="ghost"
								href={`/editor/${id}`}
								target="_blank"
								rel="noreferrer">Preview</a
							>
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
		background: radial-gradient(
				circle at 18% 18%,
				#f3f6ff 0,
				transparent 30%
			),
			radial-gradient(circle at 82% 12%, #eef7ff 0, transparent 30%),
			#fbfcff;
		color: var(--text);
		padding: 3.5rem 1.5rem 4rem;
	}

	.page-container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 2rem;
		padding: 3rem 1rem 4rem;
	}

	.hero-copy h1 {
		margin: 0 0 1rem 0;
		font-size: clamp(2.6rem, 4.4vw, 3.9rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text);
	}

	.join-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 800px;
	}

	.or-divider {
		color: var(--muted-2);
		font-weight: 500;
		font-size: 0.9rem;
		padding: 0 0.5rem;
	}

	input,
	select {
		padding: 0.75rem 1rem;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: #ffffff;
		font-size: 1rem;
		min-width: 200px;
	}

	.primary {
		background: linear-gradient(135deg, var(--accent), var(--accent-2));
		color: #fff;
		border: none;
		border-radius: 10px;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease,
			opacity 0.15s;
	}

	.primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
		opacity: 1;
	}

	.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.secondary {
		background: #ffffff;
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.secondary:hover {
		background: #f8fafc;
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
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			transform 0.15s ease;
	}

	.ghost:hover {
		border-color: var(--border-strong);
		color: var(--text);
		transform: translateY(-1px);
	}

	.eyebrow {
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-2);
		font-weight: 700;
		font-size: 0.78rem;
		margin: 0;
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
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease,
			border-color 0.15s ease;
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
	}
</style>
