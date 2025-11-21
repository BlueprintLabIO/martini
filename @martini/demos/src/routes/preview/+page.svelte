<script lang="ts">
	import { goto } from '$app/navigation';
	import { gameMetadata } from '$lib/games/ide-configs-map';

	const games = Object.entries(gameMetadata).map(([id, meta]) => ({ id, ...meta }));
</script>

<svelte:head>
	<title>Games - martini-kit</title>
</svelte:head>

<div class="preview-page">
	<header>
		<div class="container">
			<h1>Interactive Games</h1>
			<p>
				Explore full-featured multiplayer games. All games run in your browser with live code
				editing, dual-player preview, and shareable links.
			</p>
		</div>
	</header>

	<main>
		<div class="container">
			<section class="section">
				<div class="section-header">
					<h2>Example Games</h2>
					<p>Full-featured multiplayer games showcasing martini-kit's capabilities</p>
				</div>

				<div class="games-grid">
					{#each games as game (game.id)}
						<button class="game-card" onclick={() => goto(`/preview/${game.id}`)}>
							<div class="card-header">
								<h3>{game.title}</h3>
								{#if game.difficulty}
									<span class="badge badge-{game.difficulty}">{game.difficulty}</span>
								{/if}
							</div>
							<p class="description">{game.description}</p>
							<div class="action">
								<span class="arrow">Play Demo →</span>
							</div>
						</button>
					{/each}
				</div>
			</section>

			<!-- Info Section -->
			<section class="info-section">
				<h2>What Can You Do Here?</h2>
				<div class="features-grid">
					<div class="feature">
						<div class="feature-icon">🎮</div>
						<h3>Play & Experiment</h3>
						<p>Try full-featured games and edit code to see changes instantly.</p>
					</div>
					<div class="feature">
						<div class="feature-icon">👥</div>
						<h3>Multi-Player Testing</h3>
						<p>Run two game instances side-by-side to test multiplayer interactions in real-time.</p>
					</div>
					<div class="feature">
						<div class="feature-icon">🔗</div>
						<h3>Share Your Work</h3>
						<p>Create shareable links with your modified code. Download as ZIP for local development.</p>
					</div>
					<div class="feature">
						<div class="feature-icon">⚡</div>
						<h3>Hot Reload</h3>
						<p>Changes update instantly without losing game state. Perfect for rapid prototyping.</p>
					</div>
				</div>

				<div class="cta">
					<p>Ready to build your own game?</p>
					<a href="/docs" class="btn btn-primary">Read the Docs</a>
					<a href="https://github.com/anthropics/martini-kit" class="btn btn-secondary" target="_blank">
						View on GitHub
					</a>
				</div>
			</section>
		</div>
	</main>
</div>

<style>
	.preview-page {
		min-height: 100vh;
		background: #0a0a0a;
		color: #fff;
	}

	header {
		background: linear-gradient(135deg, #1e3a5f 0%, #0a0a0a 100%);
		border-bottom: 1px solid #333;
		padding: 3rem 1.5rem;
		text-align: center;
	}

	header h1 {
		margin: 0 0 1rem 0;
		font-size: 2.5rem;
		font-weight: 700;
	}

	header p {
		margin: 0;
		font-size: 1.125rem;
		color: #aaa;
		max-width: 700px;
		margin-left: auto;
		margin-right: auto;
		line-height: 1.6;
	}

	main {
		padding: 3rem 1.5rem;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.section {
		margin-bottom: 4rem;
	}

	.section-header {
		margin-bottom: 2rem;
		text-align: center;
	}

	.section-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		font-weight: 700;
	}

	.section-header p {
		margin: 0;
		color: #888;
		font-size: 1rem;
	}

	.games-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.game-card {
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 12px;
		padding: 1.5rem;
		cursor: pointer;
		transition: all 0.3s ease;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-family: inherit;
	}

	.game-card:hover {
		background: #222;
		border-color: #4a9eff;
		transform: translateY(-4px);
		box-shadow: 0 8px 20px rgba(74, 158, 255, 0.2);
	}

	.icon {
		font-size: 3rem;
		line-height: 1;
		text-align: center;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.game-card h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		flex: 1;
	}

	.badge {
		display: inline-block;
		padding: 0.25rem 0.625rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
		flex-shrink: 0;
	}

	.badge-beginner {
		background: #2d5a2d;
		color: #90ee90;
	}

	.badge-intermediate {
		background: #5a512d;
		color: #ffd700;
	}

	.badge-advanced {
		background: #5a2d2d;
		color: #ff6b6b;
	}

	.description {
		margin: 0;
		color: #888;
		font-size: 0.95rem;
		flex: 1;
		line-height: 1.5;
	}

	.action {
		color: #4a9eff;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.arrow {
		transition: transform 0.3s ease;
		display: inline-block;
	}

	.game-card:hover .arrow {
		transform: translateX(4px);
	}

	.info-section {
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 12px;
		padding: 3rem 2rem;
		text-align: center;
		margin-top: 4rem;
	}

	.info-section h2 {
		margin: 0 0 2rem 0;
		font-size: 2rem;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.feature {
		text-align: center;
	}

	.feature-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.feature h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.feature p {
		margin: 0;
		color: #888;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.cta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding-top: 2rem;
		border-top: 1px solid #333;
	}

	.cta p {
		margin: 0;
		font-size: 1.125rem;
		color: #aaa;
	}

	.cta .btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s;
		border: 1px solid transparent;
	}

	.btn-primary {
		background: #4a9eff;
		color: #fff;
	}

	.btn-primary:hover {
		background: #6ab0ff;
	}

	.btn-secondary {
		background: #262626;
		color: #fff;
		border-color: #444;
	}

	.btn-secondary:hover {
		background: #333;
		border-color: #555;
	}

	@media (max-width: 768px) {
		header h1 {
			font-size: 1.875rem;
		}

		.games-grid {
			grid-template-columns: 1fr;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		main {
			padding: 2rem 1rem;
		}

		header {
			padding: 2rem 1rem;
		}

		.info-section {
			padding: 2rem 1rem;
		}
	}
</style>
