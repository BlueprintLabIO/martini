<script lang="ts">
	import { demoGames } from '$lib/games';
	import { Gamepad2, Users, Zap, Code, Github, ArrowRight } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Martini - Multiplayer Game Framework</title>
	<meta name="description" content="Build real-time multiplayer games with ease. Declarative, type-safe, and framework-agnostic." />
</svelte:head>

<div class="page">
	<!-- Hero Section -->
	<section class="hero">
		<div class="container">
			<div class="hero-content">
				<h1 class="hero-title">
					Multiplayer that feels<br />
					<span class="gradient-text">as easy as single-player</span>
				</h1>
				<p class="hero-description">
					Sketch your state, name a few actions, and Martini keeps every player glued together.
					No socket wrangling, no backend spelunking—just game feel, faster.
				</p>
				<div class="hero-actions">
					<a href="#demos" class="btn btn-primary">
						Try Interactive Demos
						<ArrowRight class="icon" size={16} />
					</a>
					<a href="https://github.com/yourusername/martini" class="btn btn-secondary">
						<Github class="icon" size={16} />
						View on GitHub
					</a>
				</div>
				<div class="hero-stats">
					<div class="stat">
						<div class="stat-label">Get a room running in</div>
						<div class="stat-value">5 min</div>
					</div>
					<div class="stat">
						<div class="stat-label">Test coverage</div>
						<div class="stat-value">96%+</div>
					</div>
					<div class="stat">
						<div class="stat-label">License</div>
						<div class="stat-value">MIT / OSS</div>
					</div>
				</div>
			</div>

			<!-- Code Preview -->
			<div class="code-preview">
				<div class="code-header">
					<div class="code-dots">
						<span></span>
						<span></span>
						<span></span>
					</div>
					<span class="code-title">game.ts</span>
				</div>
				<pre class="code-content"><code>{`import { defineGame } from '@martini/core';

export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: playerIds.map(id => ({
      id, x: 100, y: 100, score: 0
    }))
  }),

  actions: {
    move: {
      apply: (state, playerId, { x, y }) => {
        const player = state.players
          .find(p => p.id === playerId);
        player.x = x;
        player.y = y;
      }
    }
  }
});`}</code></pre>
			</div>
		</div>
	</section>

	<!-- Features Section -->
		<section class="features">
			<div class="container">
				<h2 class="section-title">Why Martini?</h2>
				<p class="section-description">
					Bun makes server-side JS feel fast; Martini does the same for multiplayer loops. Drop it in,
					stop thinking about plumbing, and keep iterating on the fun part.
				</p>
				<div class="features-grid">
					<div class="feature-card">
						<div class="feature-icon">
							<Zap size={24} />
						</div>
						<h3>Host-Authoritative</h3>
						<p>
							Pick any device or micro-server to be “the adult in the room.” Martini streams byte-sized
							diffs to everyone else, so inputs feel instant and desyncs stay gone.
						</p>
					</div>

					<div class="feature-card">
					<div class="feature-icon">
						<Users size={24} />
					</div>
						<h3>P2P now, server later</h3>
						<p>
							Run free peer-to-peer playtests today, then flip to WebSocket or custom relays with a single import.
						</p>
					</div>

					<div class="feature-card">
						<div class="feature-icon">
							<Code size={24} />
						</div>
						<h3>Type-Safe</h3>
						<p>TypeScript autocomplete keeps your state/actions honest, no guessing or `any` soup.</p>
					</div>

					<div class="feature-card">
						<div class="feature-icon">
							<Gamepad2 size={24} />
						</div>
						<h3>Engine-agnostic</h3>
						<p>
							Phaser today, Unity tomorrow, Godot next jam—Martini only cares about data, not your
							rendering stack.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Approach Section -->
		<section class="approach">
			<div class="container">
				<h2 class="section-title">How Martini Works</h2>
				<p class="section-description">
					Same mindset as Bun’s “install, import, ship” flow—except we’re syncing multiplayer state.
				</p>
				<div class="approach-grid">
					<div class="approach-card">
						<h3>1. Describe your world</h3>
						<p>Use plain objects for players, bullets, timers. Actions mutate state directly.</p>
					</div>
					<div class="approach-card">
						<h3>2. Drop in your engine</h3>
						<p>Keep Phaser physics, Unity behaviours, or Godot scenes. Martini only mirrors data.</p>
					</div>
					<div class="approach-card">
						<h3>3. Test instantly</h3>
						<p>Demos open two panes so you can watch host vs. client updates in real time.</p>
					</div>
					<div class="approach-card">
						<h3>4. Scale on your terms</h3>
						<p>Switch transports without rewriting logic. Diff streams keep payloads tiny and cheap.</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Comparison Section -->
		<section class="comparison">
			<div class="container">
				<h2 class="section-title">How It Compares</h2>
				<p class="section-description">
					Think of Martini as the "game-side glue" that sits between your engine and whatever backend or
					matching service you prefer.
				</p>
				<div class="comparison-table-wrapper">
					<table class="comparison-table">
						<thead>
							<tr>
								<th>Feature</th>
								<th>Martini</th>
								<th>Photon / Colyseus</th>
								<th>Rune / Playroom</th>
								<th>Unity / Godot Netcode</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Where code lives</td>
								<td>Inside your game files, same repo as art + logic</td>
								<td>Split between client + bespoke server rooms</td>
								<td>Uploaded mini-apps inside their walled garden</td>
								<td>Engine-specific scripts & RPC nodes</td>
							</tr>
							<tr>
								<td>Setup time</td>
								<td>`pnpm add`, define a game, press play</td>
								<td>Provision servers, auth, serialization</td>
								<td>Follow platform ingestion rules & SDKs</td>
								<td>Wire RPCs, manage sync manually</td>
							</tr>
							<tr>
								<td>Engine choice</td>
								<td>Phaser, Unity, Godot, Three.js, custom engines</td>
								<td>Engine-agnostic but backend flow dictates APIs</td>
								<td>Browser-first templates, limited engine hooks</td>
								<td>Locked to the engine you picked</td>
							</tr>
							<tr>
								<td>Hosting model</td>
								<td>P2P by default, swap in WebSocket or custom infra anytime</td>
								<td>Requires managed or self-hosted fleets</td>
								<td>Fully managed only</td>
								<td>You host everything yourself</td>
							</tr>
							<tr>
								<td>Cost control</td>
								<td>MIT OSS; pay only for infra you already use</td>
								<td>Usage tiers, per-CCU or server bills</td>
								<td>Revenue share / per-MAU fees</td>
								<td>Free tooling, high engineering time</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

	<!-- Demos Section -->
	<section id="demos" class="demos">
		<div class="container">
			<h2 class="section-title">Interactive Demos</h2>
			<p class="section-description">
				Each demo runs two game instances side-by-side. No tabs, no hassle—just instant multiplayer.
			</p>

			<div class="demos-grid">
				{#each demoGames as demo}
					<a href="/demo/{demo.id}" class="demo-card">
						<div class="demo-header">
							<h3>{demo.name}</h3>
							<span class="demo-badge {demo.difficulty}">{demo.difficulty}</span>
						</div>
						<p class="demo-description">{demo.description}</p>
						<div class="demo-meta">
							<span class="demo-meta-item">
								<Users size={14} />
								{demo.players} Players
							</span>
							<span class="demo-meta-item">
								<Gamepad2 size={14} />
								{demo.type}
							</span>
						</div>
						<div class="demo-action">
							Play Demo
							<ArrowRight size={16} />
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>

	<!-- Quick Start Section -->
	<section class="quick-start">
		<div class="container">
			<h2 class="section-title">Quick Start</h2>
			<div class="install-steps">
				<div class="install-step">
					<span class="step-number">1</span>
					<div class="step-content">
						<h3>Install</h3>
						<div class="code-block">
							<code>npm install @martini/core @martini/phaser @martini/transport-trystero</code>
						</div>
					</div>
				</div>

				<div class="install-step">
					<span class="step-number">2</span>
					<div class="step-content">
						<h3>Define Your Game</h3>
						<p class="step-description">Create game logic with simple, declarative API</p>
					</div>
				</div>

				<div class="install-step">
					<span class="step-number">3</span>
					<div class="step-content">
						<h3>Add Rendering</h3>
						<p class="step-description">Connect to Phaser, PixiJS, or your preferred engine</p>
					</div>
				</div>

				<div class="install-step">
					<span class="step-number">4</span>
					<div class="step-content">
						<h3>Ship It</h3>
						<p class="step-description">Deploy as static files—no backend needed</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="footer">
		<div class="container">
			<p>Built with SvelteKit, Phaser 3, and Trystero</p>
			<p class="footer-links">
				<a href="https://github.com/yourusername/martini">GitHub</a>
				<span>•</span>
				<a href="https://github.com/yourusername/martini/blob/main/LICENSE">MIT License</a>
			</p>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		-webkit-font-smoothing: antialiased;
		background: #ffffff;
		color: #171717;
	}

	.page {
		min-height: 100vh;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	/* Hero Section */
	.hero {
		padding: 6rem 0 4rem;
		background: linear-gradient(to bottom, #fafafa 0%, #ffffff 100%);
	}

	.hero-content {
		text-align: center;
		margin-bottom: 4rem;
	}

	.hero-title {
		font-size: 4rem;
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.02em;
		margin: 0 0 1.5rem 0;
		color: #171717;
	}

	.gradient-text {
		background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero-description {
		font-size: 1.25rem;
		line-height: 1.6;
		color: #525252;
		max-width: 640px;
		margin: 0 auto 2rem;
	}

	.hero-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.hero-stats {
		margin-top: 2.5rem;
		display: flex;
		justify-content: center;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.stat {
		background: white;
		border: 1px solid #e5e5e5;
		border-radius: 12px;
		padding: 1rem 1.5rem;
		min-width: 160px;
		box-shadow: 0 6px 18px rgba(15, 23, 42, 0.07);
	}

	.stat-label {
		font-size: 0.85rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1rem;
		text-decoration: none;
		transition: all 0.2s;
		border: 1px solid transparent;
	}

	.btn-primary {
		background: #171717;
		color: white;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.btn-primary:hover {
		background: #262626;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.btn-secondary {
		background: white;
		color: #171717;
		border-color: #e5e5e5;
	}

	.btn-secondary:hover {
		border-color: #171717;
	}

	.icon {
		flex-shrink: 0;
	}

	/* Code Preview */
	.code-preview {
		max-width: 700px;
		margin: 0 auto;
		background: #fafafa;
		border: 1px solid #e5e5e5;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
	}

	.code-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: #f5f5f5;
		border-bottom: 1px solid #e5e5e5;
	}

	.code-dots {
		display: flex;
		gap: 0.5rem;
	}

	.code-dots span {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #d4d4d4;
	}

	.code-title {
		font-size: 0.875rem;
		color: #737373;
		font-weight: 500;
	}

	.code-content {
		margin: 0;
		padding: 1.5rem;
		overflow-x: auto;
	}

	.code-content code {
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 0.875rem;
		line-height: 1.7;
		color: #171717;
	}

	/* Features Section */
	.features {
		padding: 6rem 0;
		background: white;
	}

	.section-title {
		font-size: 2.5rem;
		font-weight: 700;
		text-align: center;
		margin: 0 0 1rem 0;
		color: #171717;
	}

	.section-description {
		font-size: 1.125rem;
		text-align: center;
		color: #525252;
		max-width: 640px;
		margin: 0 auto 3rem;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 2rem;
		margin-top: 3rem;
	}

	.feature-card {
		padding: 1.5rem;
		text-align: center;
	}

	.feature-icon {
		width: 48px;
		height: 48px;
		margin: 0 auto 1rem;
		background: #fafafa;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #171717;
	}

	.feature-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		color: #171717;
	}

	.feature-card p {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: #525252;
		margin: 0;
	}

	/* Approach Section */
	.approach {
		padding: 5rem 0;
		background: #f9fafb;
	}

	.approach-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
		margin-top: 3rem;
	}

	.approach-card {
		background: white;
		border-radius: 12px;
		border: 1px solid #e5e5e5;
		padding: 1.5rem;
		min-height: 190px;
		box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
	}

	.approach-card h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1.125rem;
		color: #0f172a;
	}

	.approach-card p {
		margin: 0;
		color: #475569;
		line-height: 1.6;
		font-size: 0.95rem;
	}

	/* Comparison Section */
	.comparison {
		padding: 5rem 0;
		background: white;
	}

	.comparison-table-wrapper {
		margin-top: 3rem;
		overflow-x: auto;
	}

	.comparison-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 720px;
		font-size: 0.95rem;
	}

	.comparison-table th,
	.comparison-table td {
		border: 1px solid #e5e5e5;
		padding: 0.85rem 1rem;
		text-align: left;
		vertical-align: top;
		line-height: 1.5;
	}

	.comparison-table th {
		background: #0f172a;
		color: white;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.comparison-table td:first-child,
	.comparison-table th:first-child {
		background: #f8fafc;
		font-weight: 600;
		color: #0f172a;
		width: 180px;
	}

	.comparison-table tbody tr:nth-child(odd) {
		background: #fcfcfc;
	}

	/* Demos Section */
	.demos {
		padding: 6rem 0;
		background: #fafafa;
	}

	.demos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
		margin-top: 3rem;
	}

	.demo-card {
		background: white;
		border: 1px solid #e5e5e5;
		border-radius: 12px;
		padding: 1.5rem;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
	}

	.demo-card:hover {
		border-color: #171717;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
	}

	.demo-header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		margin-bottom: 0.75rem;
	}

	.demo-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: #171717;
	}

	.demo-badge {
		font-size: 0.75rem;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		font-weight: 500;
		text-transform: capitalize;
	}

	.demo-badge.beginner {
		background: #dcfce7;
		color: #166534;
	}

	.demo-badge.intermediate {
		background: #fef3c7;
		color: #92400e;
	}

	.demo-badge.advanced {
		background: #fee2e2;
		color: #991b1b;
	}

	.demo-description {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: #525252;
		margin: 0 0 1rem 0;
		flex: 1;
	}

	.demo-meta {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #f5f5f5;
	}

	.demo-meta-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: #737373;
	}

	.demo-action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		color: #171717;
		font-size: 0.9375rem;
	}

	/* Quick Start Section */
	.quick-start {
		padding: 6rem 0;
		background: white;
	}

	.install-steps {
		max-width: 800px;
		margin: 3rem auto 0;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.install-step {
		display: flex;
		gap: 1.5rem;
	}

	.step-number {
		width: 40px;
		height: 40px;
		background: #171717;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		flex-shrink: 0;
	}

	.step-content {
		flex: 1;
	}

	.step-content h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		color: #171717;
	}

	.step-description {
		font-size: 0.9375rem;
		color: #525252;
		margin: 0;
	}

	.code-block {
		background: #fafafa;
		border: 1px solid #e5e5e5;
		border-radius: 8px;
		padding: 1rem;
		margin-top: 0.5rem;
	}

	.code-block code {
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.875rem;
		color: #171717;
		word-break: break-all;
	}

	/* Footer */
	.footer {
		padding: 3rem 0;
		background: #fafafa;
		border-top: 1px solid #e5e5e5;
		text-align: center;
	}

	.footer p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		color: #737373;
	}

	.footer-links {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		align-items: center;
	}

	.footer a {
		color: #171717;
		text-decoration: none;
	}

	.footer a:hover {
		text-decoration: underline;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero-title {
			font-size: 2.5rem;
		}

		.hero-description {
			font-size: 1.125rem;
		}

		.section-title {
			font-size: 2rem;
		}

		.demos-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
