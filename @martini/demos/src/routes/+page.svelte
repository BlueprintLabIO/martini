<script lang="ts">
	import { demoGames } from '$lib/games';
	import { Gamepad2, Users, Zap, Code, Github, ArrowRight, Moon, Sun, Copy, Check } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let darkMode = false;
	let copied = false;

	onMount(() => {
		// Check for saved preference or system preference
		if (typeof window !== 'undefined') {
			const savedMode = localStorage.getItem('darkMode');
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			darkMode = savedMode ? savedMode === 'true' : prefersDark;
		}
	});

	function toggleDarkMode() {
		darkMode = !darkMode;
		if (typeof window !== 'undefined') {
			localStorage.setItem('darkMode', String(darkMode));
		}
	}

	async function copyInstallCommand() {
		await navigator.clipboard.writeText('npm install @martini-kit/core @martini-kit/phaser');
		copied = true;
		setTimeout(() => copied = false, 2000);
	}
</script>

<svelte:head>
	<title>martini-kit — Multiplayer for JavaScript games</title>
	<meta name="description" content="A fast JavaScript multiplayer framework. Build real-time games with P2P or dedicated servers." />
</svelte:head>

<div class="page" class:dark={darkMode}>
	<!-- Dark Mode Toggle -->
	<button class="theme-toggle" on:click={toggleDarkMode} aria-label="Toggle dark mode">
		{#if darkMode}
			<Sun size={20} />
		{:else}
			<Moon size={20} />
		{/if}
	</button>

	<!-- Hero Section -->
	<section class="hero">
		<div class="container">
			<div class="hero-content">
				<h1 class="hero-title">
					Write multiplayer<br />like single-player
				</h1>
				<p class="hero-description">
					Declarative state. Automatic sync. Zero server code. Battle-tested with 96%+ coverage.
				</p>

				<!-- Install Command -->
				<div class="install-command">
					<button class="install-cmd-btn" on:click={copyInstallCommand}>
						<span class="cmd-prompt">$</span>
						<code>npm install @martini-kit/core @martini-kit/phaser</code>
						<span class="copy-btn">
							{#if copied}
								<Check size={16} />
							{:else}
								<Copy size={16} />
							{/if}
						</span>
					</button>
				</div>

				<div class="hero-actions">
					<a href="#demos" class="btn btn-primary">
						Try Interactive Code Previews
						<ArrowRight class="icon" size={16} />
					</a>
					<a href="https://github.com/yourusername/martini-kit" class="btn btn-secondary">
						<Github class="icon" size={16} />
						GitHub
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
					<span class="code-title">game.ts — 15 lines handles everything</span>
				</div>
				<pre class="code-content"><code>{`// This 15-line game definition handles:
// ✓ State synchronization
// ✓ Player join/leave
// ✓ Network optimization
// ✓ All multiplayer plumbing

import { defineGame } from '@martini-kit/core';

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
				<h2 class="section-title">Why martini-kit?</h2>
				<p class="section-description">
					Most multiplayer frameworks make you write hundreds of lines of socket code and manage separate servers.
					martini-kit gives you a declarative, 10-line API that's battle-tested (96%+ coverage) and keeps all your code in one place.
				</p>
				<div class="features-grid">
					<div class="feature-card">
						<div class="feature-icon">
							<Code size={24} />
						</div>
						<h3>Declarative & Minimal</h3>
						<p>
							Define state + actions in ~10 lines per feature. No socket handlers, no RPC wiring, no serialization code.
							TypeScript autocomplete guides you.
						</p>
					</div>

					<div class="feature-card">
						<div class="feature-icon">
							<Users size={24} />
						</div>
						<h3>One Codebase, Zero Servers</h3>
						<p>
							Game logic lives alongside your rendering code. P2P by default, swap to WebSocket when you scale.
							No separate backend repo to maintain.
						</p>
					</div>

					<div class="feature-card">
						<div class="feature-icon">
							<Zap size={24} />
						</div>
						<h3>Battle-Tested & Fast</h3>
						<p>
							96%+ test coverage on sync algorithms. Efficient diff/patch minimizes bandwidth—only changed data goes over the wire.
							Host-authoritative prevents cheating.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Performance Section -->
		<section class="performance">
			<div class="container">
				<h2 class="section-title">Built for Performance & Reliability</h2>
				<div class="performance-grid">
					<div class="performance-card">
						<div class="performance-value">96%+</div>
						<div class="performance-label">Test Coverage</div>
						<p>Core sync algorithms battle-tested</p>
					</div>
					<div class="performance-card">
						<div class="performance-value">20 FPS</div>
						<div class="performance-label">State Sync</div>
						<p>Configurable, efficient diff/patch</p>
					</div>
					<div class="performance-card">
						<div class="performance-value">&lt;1KB</div>
						<div class="performance-label">Patch Size</div>
						<p>Only changed data over the wire</p>
					</div>
					<div class="performance-card">
						<div class="performance-value">~10</div>
						<div class="performance-label">Lines of Code</div>
						<p>Per multiplayer feature</p>
					</div>
				</div>
			</div>
		</section>

		<!-- How It Works Section -->
		<section class="approach">
			<div class="container">
				<h2 class="section-title">How It Works</h2>
				<p class="section-description">
					Declarative, automatic, simple. No socket code, no server setup.
				</p>
				<div class="approach-grid">
					<div class="approach-card">
						<h3>1. Define state + actions (10 lines)</h3>
						<p>Plain objects. No classes, no serialization, no RPC.</p>
					</div>
					<div class="approach-card">
						<h3>2. martini-kit handles the rest</h3>
						<p>Automatic sync with efficient diff/patch. Host runs logic, clients mirror.</p>
					</div>
					<div class="approach-card">
						<h3>3. Test locally, instantly</h3>
						<p>Open two browser tabs. No server setup, no deployment.</p>
					</div>
					<div class="approach-card">
						<h3>4. Scale when ready</h3>
						<p>Swap P2P for WebSocket with one line. Code stays identical.</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Comparison Section -->
		<section class="comparison">
			<div class="container">
				<h2 class="section-title">How It Compares</h2>
				<p class="section-description">
					martini-kit vs server-first frameworks (Colyseus), platform lock-in (Rune), and engine-locked solutions (Unity/Godot).
				</p>
				<div class="comparison-table-wrapper">
					<table class="comparison-table">
						<thead>
							<tr>
								<th></th>
								<th>martini-kit</th>
								<th>Colyseus/Photon</th>
								<th>Rune/Playroom</th>
								<th>Unity/Godot</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Declarative API (~10 lines)</td>
								<td><span class="tick">✓</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="partial">~</span></td>
								<td><span class="cross">✗</span></td>
							</tr>
							<tr>
								<td>Code lives with game</td>
								<td><span class="tick">✓</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="tick">✓</span></td>
							</tr>
							<tr>
								<td>Zero server setup</td>
								<td><span class="tick">✓</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="cross">✗</span></td>
							</tr>
							<tr>
								<td>P2P support</td>
								<td><span class="tick">✓</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="cross">✗</span></td>
							</tr>
							<tr>
								<td>Automatic state sync</td>
								<td><span class="tick">✓</span></td>
								<td><span class="partial">~</span></td>
								<td><span class="tick">✓</span></td>
								<td><span class="cross">✗</span></td>
							</tr>
							<tr>
								<td>Efficient diff/patch (&lt;1KB)</td>
								<td><span class="tick">✓</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="tick">✓</span></td>
								<td><span class="cross">✗</span></td>
							</tr>
							<tr>
								<td>96%+ test coverage</td>
								<td><span class="tick">✓</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="partial">~</span></td>
								<td><span class="cross">✗</span></td>
							</tr>
							<tr>
								<td>Framework agnostic</td>
								<td><span class="tick">✓</span></td>
								<td><span class="tick">✓</span></td>
								<td><span class="tick">✓</span></td>
								<td><span class="cross">✗</span></td>
							</tr>
							<tr>
								<td>Free tier (P2P)</td>
								<td><span class="tick">✓</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="cross">✗</span></td>
								<td><span class="tick">✓</span></td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

	<!-- Minimal API Callout -->
	<section class="minimal-api">
		<div class="container">
			<div class="api-callout">
				<h3>🎯 The Entire martini-kit API</h3>
				<div class="api-list">
					<code>defineGame(&#123; setup, actions &#125;)</code>
					<code>runtime.submitAction(name, input)</code>
					<code>runtime.onChange(callback)</code>
				</div>
				<p>That's it. No 50-method SDK to learn.</p>
			</div>
		</div>
	</section>

	<!-- Demos Section -->
	<section id="demos" class="demos">
		<div class="container">
			<h2 class="section-title">Interactive Code Previews</h2>
			<p class="section-description">
				Live code editor with dual game previews. See the code, edit it, and watch both instances update in real-time.
			</p>

			<div class="demos-grid">
				{#each demoGames as demo}
					<a href="/preview/{demo.id}" class="demo-card">
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
			<p class="section-description">
				Unlike Colyseus (~100 lines of server + client) or Unity Netcode (manual RPC wiring),
				martini-kit gets you running in 15 lines—works everywhere.
			</p>
			<div class="install-steps">
				<div class="install-step">
					<span class="step-number">1</span>
					<div class="step-content">
						<h3>Install</h3>
						<div class="code-block">
							<code>npm install @martini-kit/core @martini-kit/phaser</code>
						</div>
					</div>
				</div>

				<div class="install-step">
					<span class="step-number">2</span>
					<div class="step-content">
						<h3>Define Your Game (10 lines)</h3>
						<p class="step-description">
							Plain objects for state. Actions mutate directly. No classes, no serialization, no RPC.
						</p>
					</div>
				</div>

				<div class="install-step">
					<span class="step-number">3</span>
					<div class="step-content">
						<h3>Connect Your Engine</h3>
						<p class="step-description">
							Phaser, PixiJS, Three.js, or vanilla JavaScript. martini-kit syncs data, not rendering.
						</p>
					</div>
				</div>

				<div class="install-step">
					<span class="step-number">4</span>
					<div class="step-content">
						<h3>Test & Ship</h3>
						<p class="step-description">
							Open two browser tabs to test P2P. Deploy as static files—no backend required.
						</p>
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
				<a href="https://github.com/yourusername/martini-kit">GitHub</a>
				<span>•</span>
				<a href="https://github.com/yourusername/martini-kit/blob/main/LICENSE">MIT License</a>
			</p>
		</div>
	</footer>
</div>

<style>
	:root {
		/* Light mode colors */
		--bg-primary: #ffffff;
		--bg-secondary: #fafafa;
		--bg-tertiary: #f5f5f5;
		--text-primary: #0b0a08;
		--text-secondary: #525252;
		--text-tertiary: #737373;
		--border-color: #e5e5e5;
		--border-hover: #171717;

		/* Accent colors */
		--accent-primary: #171717;
		--accent-hover: #262626;
		--code-bg: #282a36;
		--code-text: #f8f8f2;

		/* Monospace font */
		--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
		--font-system: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}

	:global(body) {
		margin: 0;
		font-family: var(--font-system);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		background: var(--bg-primary);
		color: var(--text-primary);
		transition: background-color 0.3s ease, color 0.3s ease;
	}

	.page {
		min-height: 100vh;
		position: relative;
	}

	/* Dark mode */
	.page.dark {
		--bg-primary: #14151b;
		--bg-secondary: #1a1b23;
		--bg-tertiary: #282a36;
		--text-primary: #f9fafb;
		--text-secondary: #d1d5db;
		--text-tertiary: #9ca3af;
		--border-color: #3b3f4b;
		--border-hover: #6b7280;
		--accent-primary: #f9fafb;
		--accent-hover: #e5e7eb;
	}

	/* Theme Toggle */
	.theme-toggle {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 100;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 0.625rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		color: var(--text-primary);
	}

	.theme-toggle:hover {
		background: var(--bg-secondary);
		border-color: var(--border-hover);
		transform: scale(1.05);
	}

	.container {
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 3rem;
	}

	@media (max-width: 768px) {
		.container {
			padding: 0 1rem;
		}
	}

	/* Hero Section */
	.hero {
		padding: 8rem 0 6rem;
		background: var(--bg-primary);
	}

	.hero-content {
		text-align: center;
		margin-bottom: 4rem;
	}

	.hero-title {
		font-size: 3.5rem;
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.02em;
		margin: 0 0 1.5rem 0;
		color: var(--text-primary);
	}

	.hero-description {
		font-size: 1.25rem;
		line-height: 1.6;
		color: var(--text-secondary);
		max-width: 720px;
		margin: 0 auto 2.5rem;
	}

	/* Install Command */
	.install-command {
		max-width: 640px;
		margin: 0 auto 2rem;
	}

	.install-cmd-btn {
		width: 100%;
		background: var(--code-bg);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
		font-family: var(--font-mono);
		font-size: 0.9375rem;
	}

	.install-cmd-btn:hover {
		border-color: var(--border-hover);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.cmd-prompt {
		color: rgba(248, 248, 242, 0.5);
		font-weight: 500;
	}

	.install-cmd-btn code {
		flex: 1;
		color: var(--code-text);
		background: transparent;
		border: none;
		padding: 0;
		font-family: inherit;
		font-size: inherit;
		text-align: left;
	}

	.copy-btn {
		color: rgba(248, 248, 242, 0.6);
		display: flex;
		align-items: center;
		transition: color 0.2s;
	}

	.install-cmd-btn:hover .copy-btn {
		color: rgba(248, 248, 242, 0.9);
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
		background: var(--accent-primary);
		color: var(--bg-primary);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.btn-primary:hover {
		background: var(--accent-hover);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.btn-secondary {
		background: var(--bg-secondary);
		color: var(--text-primary);
		border-color: var(--border-color);
	}

	.btn-secondary:hover {
		border-color: var(--border-hover);
		background: var(--bg-tertiary);
	}

	.icon {
		flex-shrink: 0;
	}

	/* Code Preview */
	.code-preview {
		max-width: 720px;
		margin: 0 auto;
		background: var(--code-bg);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	}

	.code-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.code-dots {
		display: flex;
		gap: 0.5rem;
	}

	.code-dots span {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.25);
	}

	.code-dots span:nth-child(1) {
		background: #ff5f56;
	}

	.code-dots span:nth-child(2) {
		background: #ffbd2e;
	}

	.code-dots span:nth-child(3) {
		background: #27c93f;
	}

	.code-title {
		font-size: 0.875rem;
		color: rgba(248, 248, 242, 0.6);
		font-weight: 500;
		font-family: var(--font-mono);
	}

	.code-content {
		margin: 0;
		padding: 1.5rem;
		overflow-x: auto;
		background: var(--code-bg);
	}

	.code-content code {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.7;
		color: var(--code-text);
	}

	/* Features Section */
	.features {
		padding: 6rem 0;
		background: var(--bg-primary);
	}

	.section-title {
		font-size: 2.5rem;
		font-weight: 700;
		text-align: center;
		margin: 0 0 1rem 0;
		color: var(--text-primary);
	}

	.section-description {
		font-size: 1.125rem;
		text-align: center;
		color: var(--text-secondary);
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
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-primary);
	}

	.feature-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		color: var(--text-primary);
	}

	.feature-card p {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--text-secondary);
		margin: 0;
	}

	/* Performance Section */
	.performance {
		padding: 5rem 0;
		background: var(--bg-primary);
	}

	.performance-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 2rem;
		margin-top: 3rem;
	}

	.performance-card {
		text-align: center;
		padding: 2rem 1.5rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		transition: all 0.2s;
	}

	.performance-card:hover {
		border-color: var(--border-hover);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.performance-value {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-primary);
		font-family: var(--font-mono);
		margin-bottom: 0.5rem;
	}

	.performance-label {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-bottom: 0.75rem;
	}

	.performance-card p {
		font-size: 0.9375rem;
		color: var(--text-tertiary);
		margin: 0;
		line-height: 1.5;
	}

	/* Minimal API Section */
	.minimal-api {
		padding: 4rem 0;
		background: var(--bg-secondary);
	}

	.api-callout {
		max-width: 640px;
		margin: 0 auto;
		background: var(--bg-primary);
		border: 2px solid var(--border-hover);
		border-radius: 12px;
		padding: 2.5rem;
		text-align: center;
	}

	.api-callout h3 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 1.5rem 0;
		color: var(--text-primary);
	}

	.api-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.api-list code {
		font-family: var(--font-mono);
		font-size: 0.9375rem;
		background: var(--code-bg);
		color: var(--code-text);
		padding: 0.75rem 1rem;
		border-radius: 6px;
		display: block;
	}

	.api-callout p {
		font-size: 1.125rem;
		color: var(--text-secondary);
		margin: 0;
		font-weight: 500;
	}

	/* Approach Section */
	.approach {
		padding: 5rem 0;
		background: var(--bg-primary);
	}

	.approach-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
		margin-top: 3rem;
	}

	.approach-card {
		background: var(--bg-primary);
		border-radius: 8px;
		border: 1px solid var(--border-color);
		padding: 1.5rem;
		min-height: 160px;
		transition: all 0.2s;
	}

	.approach-card:hover {
		border-color: var(--border-hover);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		transform: translateY(-2px);
	}

	.approach-card h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1.125rem;
		color: var(--text-primary);
		font-weight: 600;
	}

	.approach-card p {
		margin: 0;
		color: var(--text-secondary);
		line-height: 1.6;
		font-size: 0.95rem;
	}

	/* Comparison Section */
	.comparison {
		padding: 5rem 0;
		background: var(--bg-primary);
	}

	.comparison-table-wrapper {
		margin-top: 3rem;
		overflow-x: auto;
		border: 1px solid var(--border-color);
		border-radius: 8px;
	}

	.comparison-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 720px;
		font-size: 0.9rem;
	}

	.comparison-table th,
	.comparison-table td {
		border: 1px solid var(--border-color);
		padding: 1rem;
		text-align: center;
		vertical-align: middle;
		line-height: 1.5;
	}

	.comparison-table th {
		background: var(--code-bg);
		color: var(--code-text);
		font-weight: 600;
		font-size: 0.875rem;
		font-family: var(--font-mono);
	}

	.comparison-table td:first-child,
	.comparison-table th:first-child {
		background: var(--bg-tertiary);
		font-weight: 600;
		color: var(--text-primary);
		text-align: left;
		width: 280px;
	}

	.comparison-table tbody tr {
		background: var(--bg-primary);
	}

	.comparison-table tbody tr:hover {
		background: var(--bg-secondary);
	}

	/* Tick/Cross/Partial styling */
	.comparison-table .tick {
		color: #22c55e;
		font-size: 1.5rem;
		font-weight: 700;
		display: inline-block;
	}

	.comparison-table .cross {
		color: #ef4444;
		font-size: 1.5rem;
		font-weight: 700;
		display: inline-block;
	}

	.comparison-table .partial {
		color: #f59e0b;
		font-size: 1.5rem;
		font-weight: 700;
		display: inline-block;
	}

	/* Demos Section */
	.demos {
		padding: 6rem 0;
		background: var(--bg-secondary);
	}

	.demos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
		margin-top: 3rem;
	}

	.demo-card {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1.5rem;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
	}

	.demo-card:hover {
		border-color: var(--border-hover);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
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
		color: var(--text-primary);
	}

	.demo-badge {
		font-size: 0.75rem;
		padding: 0.25rem 0.625rem;
		border-radius: 4px;
		font-weight: 500;
		text-transform: capitalize;
		font-family: var(--font-mono);
	}

	.demo-badge.beginner {
		background: rgba(34, 197, 94, 0.15);
		color: rgb(34, 197, 94);
	}

	.demo-badge.intermediate {
		background: rgba(251, 191, 36, 0.15);
		color: rgb(251, 191, 36);
	}

	.demo-badge.advanced {
		background: rgba(239, 68, 68, 0.15);
		color: rgb(239, 68, 68);
	}

	.demo-description {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--text-secondary);
		margin: 0 0 1rem 0;
		flex: 1;
	}

	.demo-meta {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}

	.demo-meta-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--text-tertiary);
		font-family: var(--font-mono);
	}

	.demo-action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		color: var(--text-primary);
		font-size: 0.9375rem;
	}

	/* Quick Start Section */
	.quick-start {
		padding: 6rem 0;
		background: var(--bg-primary);
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
		background: var(--accent-primary);
		color: var(--bg-primary);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		flex-shrink: 0;
		font-family: var(--font-mono);
	}

	.step-content {
		flex: 1;
	}

	.step-content h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		color: var(--text-primary);
	}

	.step-description {
		font-size: 0.9375rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.code-block {
		background: var(--code-bg);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1rem;
		margin-top: 0.5rem;
	}

	.code-block code {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--code-text);
		word-break: break-all;
	}

	/* Footer */
	.footer {
		padding: 3rem 0;
		background: var(--bg-secondary);
		border-top: 1px solid var(--border-color);
		text-align: center;
	}

	.footer p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		color: var(--text-tertiary);
	}

	.footer-links {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		align-items: center;
	}

	.footer a {
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.2s;
	}

	.footer a:hover {
		color: var(--text-primary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			padding: 4rem 0 3rem;
		}

		.hero-title {
			font-size: 2.25rem;
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

		.install-cmd-btn {
			font-size: 0.8125rem;
		}

		.theme-toggle {
			top: 1rem;
			right: 1rem;
		}
	}
</style>
