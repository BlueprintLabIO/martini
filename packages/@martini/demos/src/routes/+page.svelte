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
					Build multiplayer games<br />
					<span class="gradient-text">in minutes, not months</span>
				</h1>
				<p class="hero-description">
					Martini is a declarative, type-safe framework for building real-time multiplayer games.
					Works with any game engine. Deploy anywhere.
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
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">
						<Zap size={24} />
					</div>
					<h3>Host-Authoritative</h3>
					<p>Deterministic game state with automatic conflict resolution. No server required.</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<Users size={24} />
					</div>
					<h3>P2P or Server</h3>
					<p>Use WebRTC for P2P or plug in your own transport. Scales from 2 to 100+ players.</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<Code size={24} />
					</div>
					<h3>Type-Safe</h3>
					<p>Full TypeScript support with type inference for game state and actions.</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<Gamepad2 size={24} />
					</div>
					<h3>Engine Agnostic</h3>
					<p>Works with Phaser, PixiJS, Three.js, or any rendering engine you prefer.</p>
				</div>
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
