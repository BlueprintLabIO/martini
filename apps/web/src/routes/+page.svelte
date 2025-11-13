<script lang="ts">
	import { APP_NAME } from '@martini/shared';
	import { onMount } from 'svelte';

	let mouseX = 0;
	let mouseY = 0;

	onMount(() => {
		const handleMouseMove = (e: MouseEvent) => {
			mouseX = e.clientX;
			mouseY = e.clientY;
		};
		window.addEventListener('mousemove', handleMouseMove);

		// Tooltip functionality
		const hoverLines = document.querySelectorAll('.code-hover-line');
		hoverLines.forEach(line => {
			const tooltipName = line.getAttribute('data-tooltip');
			const tooltip = document.querySelector(`.code-tooltip[data-for="${tooltipName}"]`) as HTMLElement;

			if (tooltip) {
				line.addEventListener('mouseenter', () => {
					// Position tooltip relative to the code demo container
					const codeDemo = document.querySelector('.code-demo');
					if (codeDemo) {
						const rect = line.getBoundingClientRect();
						const demoRect = codeDemo.getBoundingClientRect();

						tooltip.style.position = 'fixed';
						tooltip.style.left = `${rect.left + rect.width / 2}px`;
						tooltip.style.top = `${rect.top - 10}px`;
						tooltip.style.opacity = '1';
						tooltip.style.visibility = 'visible';
					}
				});

				line.addEventListener('mouseleave', () => {
					tooltip.style.opacity = '0';
					tooltip.style.visibility = 'hidden';
				});
			}
		});

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
		};
	});

	// Demo games - now with Fire & Ice
	const demoGames = [
		{
			id: 'fire-and-ice',
			name: 'Fire & Ice',
			emoji: '🔥',
			players: '2-4',
			color: '#ff006e',
			description: 'Team-based elemental combat'
		},
		{
			id: 'paddle-battle',
			name: 'Paddle Battle',
			emoji: '🏓',
			players: '2',
			color: '#00ffff',
			description: 'Classic Pong reimagined'
		},
		{
			id: 'connect-four',
			name: 'Connect Four',
			emoji: '🔴',
			players: '2',
			color: '#7b2cbf',
			description: 'Turn-based strategy'
		},
		{
			id: 'circuit-racer',
			name: 'Circuit Racer',
			emoji: '🏎️',
			players: '2-4',
			color: '#ffff00',
			description: 'Top-down racing action'
		},
		{
			id: 'arena-blaster',
			name: 'Arena Blaster',
			emoji: '🎯',
			players: '2-4',
			color: '#00ff88',
			description: 'Fast-paced shooter'
		}
	];

	const codeExample = `import { defineGame } from '@martini/core';

const game = defineGame({
  setup: () => ({
    players: [],
    ball: { x: 400, y: 300, dx: 2, dy: 2 }
  }),
  actions: {
    move: (state, playerId, y) => {
      const player = state.players.find(p => p.id === playerId);
      if (player) player.y = y;
    }
  },
  tick: (state, dt) => {
    state.ball.x += state.ball.dx;
    state.ball.y += state.ball.dy;
  }
});`;
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="page-container">
	<!-- Background effects -->
	<div class="cyber-background">
		<div class="grid-pattern"></div>
		<div class="grid-surge"></div>
		<div class="glow-orb orb-1"></div>
		<div class="glow-orb orb-2"></div>
		<div class="glow-orb orb-3"></div>
	</div>
	<div class="scanlines"></div>
	<div class="vignette"></div>
	<div class="mouse-spotlight" style="left: {mouseX}px; top: {mouseY}px;"></div>

	<!-- Navigation -->
	<nav class="navbar">
		<div class="nav-content">
			<div class="nav-brand">
				<svg class="brand-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<g stroke="url(#navGradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
						<path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
						<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
						<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
					</g>
					<defs>
						<linearGradient id="navGradient" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop offset="0%" stop-color="#00ffff" />
							<stop offset="100%" stop-color="#ff00ff" />
						</linearGradient>
					</defs>
				</svg>
				<span class="brand-text">{APP_NAME}</span>
			</div>
			<div class="nav-links">
				<a href="#quickstart">Quick Start</a>
				<a href="#how-it-works">How It Works</a>
				<a href="#demos">Demos</a>
				<a href="https://github.com/martini-game-framework/martini" target="_blank" rel="noopener noreferrer">GitHub</a>
			</div>
		</div>
	</nav>

	<!-- Hero Section -->
	<section class="hero-section">
		<div class="hero-content">
			<h1 class="hero-headline">Build multiplayer like single-player.</h1>
			<p class="hero-subheadline">Declarative state. Instant sync. No servers.</p>

			<div class="hero-buttons">
				<a href="#demos" class="btn-primary">
					<span>Play Demos</span>
					<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
					</svg>
				</a>
				<button class="btn-code">
					<span class="code-text">npm install @martini/core</span>
					<svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
					</svg>
				</button>
			</div>

			<div class="microproof">
				<span class="proof-item">96% coverage</span>
				<span class="proof-divider">•</span>
				<span class="proof-item">&lt;1KB patches</span>
				<span class="proof-divider">•</span>
				<span class="proof-item">Host-authoritative</span>
			</div>
		</div>
	</section>

	<!-- Quick Start (Main Feature) -->
	<section id="quickstart" class="quickstart-main-section">
		<div class="section-container">
			<h2 class="section-title">Quick Start</h2>
			<p class="section-intro">
				Unlike Colyseus (~100 lines of server + client) or Unity Netcode (manual RPC wiring),
				Martini gets you running in 15 lines—works everywhere.
			</p>

			<div class="quickstart-main-grid">
				<!-- Step 1 -->
				<div class="qs-main-step">
					<div class="qs-main-header">
						<div class="qs-main-number">1</div>
						<h3 class="qs-main-title">Install</h3>
					</div>
					<div class="qs-main-content">
						<code class="qs-main-code">npm install @martini/core @martini/phaser</code>
					</div>
				</div>

				<!-- Step 2 - Code Demo with Tooltips -->
				<div class="qs-main-step qs-code-step">
					<div class="qs-main-header">
						<div class="qs-main-number">2</div>
						<h3 class="qs-main-title">Define Your Game (~15 lines)</h3>
					</div>
					<div class="qs-main-content">
						<p class="qs-main-text qs-intro-text">
							Plain objects for state. Actions mutate directly. No classes, no serialization, no RPC.
						</p>

						<div class="code-demo">
							<div class="code-demo-header">
								<div class="code-dots">
									<span></span><span></span><span></span>
								</div>
								<span class="code-filename">game.ts</span>
							</div>
							<pre class="code-demo-content"><code><span class="code-line">
<span class="code-keyword">import</span> <span class="code-bracket">{'{'}</span> <span class="code-function">defineGame</span> <span class="code-bracket">{'}'}</span> <span class="code-keyword">from</span> <span class="code-string">'@martini/core'</span>;
</span>
<span class="code-line">
<span class="code-keyword">const</span> <span class="code-variable">game</span> <span class="code-operator">=</span> <span class="code-function">defineGame</span>(<span class="code-bracket">{'{'}</span>
</span><span class="code-line code-hover-line" data-tooltip="setup">  <span class="code-property">setup</span><span class="code-operator">:</span> () <span class="code-operator">=></span> (<span class="code-bracket">{'{'}</span>
</span><span class="code-line code-hover-line" data-tooltip="state">    <span class="code-property">players</span><span class="code-operator">:</span> [],
    <span class="code-property">ball</span><span class="code-operator">:</span> <span class="code-bracket">{'{'}</span> <span class="code-property">x</span><span class="code-operator">:</span> <span class="code-number">400</span>, <span class="code-property">y</span><span class="code-operator">:</span> <span class="code-number">300</span>, <span class="code-property">dx</span><span class="code-operator">:</span> <span class="code-number">2</span>, <span class="code-property">dy</span><span class="code-operator">:</span> <span class="code-number">2</span> <span class="code-bracket">{'}'}</span>
</span><span class="code-line">  <span class="code-bracket">{'}'}</span>),
</span><span class="code-line code-hover-line" data-tooltip="actions">  <span class="code-property">actions</span><span class="code-operator">:</span> <span class="code-bracket">{'{'}</span>
</span><span class="code-line code-hover-line" data-tooltip="action">    <span class="code-function">move</span><span class="code-operator">:</span> (<span class="code-variable">state</span>, <span class="code-variable">playerId</span>, <span class="code-variable">y</span>) <span class="code-operator">=></span> <span class="code-bracket">{'{'}</span>
      <span class="code-keyword">const</span> <span class="code-variable">player</span> <span class="code-operator">=</span> <span class="code-variable">state</span>.<span class="code-property">players</span>.<span class="code-function">find</span>(<span class="code-variable">p</span> <span class="code-operator">=></span> <span class="code-variable">p</span>.<span class="code-property">id</span> <span class="code-operator">===</span> <span class="code-variable">playerId</span>);
      <span class="code-keyword">if</span> (<span class="code-variable">player</span>) <span class="code-variable">player</span>.<span class="code-property">y</span> <span class="code-operator">=</span> <span class="code-variable">y</span>;
</span><span class="code-line">    <span class="code-bracket">{'}'}</span>
  <span class="code-bracket">{'}'}</span>,
</span><span class="code-line code-hover-line" data-tooltip="tick">  <span class="code-property">tick</span><span class="code-operator">:</span> (<span class="code-variable">state</span>, <span class="code-variable">dt</span>) <span class="code-operator">=></span> <span class="code-bracket">{'{'}</span>
    <span class="code-variable">state</span>.<span class="code-property">ball</span>.<span class="code-property">x</span> <span class="code-operator">+=</span> <span class="code-variable">state</span>.<span class="code-property">ball</span>.<span class="code-property">dx</span>;
    <span class="code-variable">state</span>.<span class="code-property">ball</span>.<span class="code-property">y</span> <span class="code-operator">+=</span> <span class="code-variable">state</span>.<span class="code-property">ball</span>.<span class="code-property">dy</span>;
</span><span class="code-line">  <span class="code-bracket">{'}'}</span>
<span class="code-bracket">{'}'}</span>);</span></code></pre>

							<!-- Tooltips -->
							<div class="code-tooltip" data-for="setup">
								<strong>setup()</strong> - Initialize your game state with plain objects
							</div>
							<div class="code-tooltip" data-for="state">
								<strong>State</strong> - Just vanilla JS objects, no magic classes
							</div>
							<div class="code-tooltip" data-for="actions">
								<strong>actions</strong> - Define how players can modify the game
							</div>
							<div class="code-tooltip" data-for="action">
								<strong>Mutate directly</strong> - No RPC wrappers, just plain functions
							</div>
							<div class="code-tooltip" data-for="tick">
								<strong>tick()</strong> - Game loop runs on host, synced automatically
							</div>
						</div>

						<div class="example-features">
							<div class="feature-tag">
								<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<polyline points="20 6 9 17 4 12" />
								</svg>
								<span>Automatic sync</span>
							</div>
							<div class="feature-tag">
								<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<polyline points="20 6 9 17 4 12" />
								</svg>
								<span>P2P by default</span>
							</div>
							<div class="feature-tag">
								<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<polyline points="20 6 9 17 4 12" />
								</svg>
								<span>Join/leave handled</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Step 3 -->
				<div class="qs-main-step">
					<div class="qs-main-header">
						<div class="qs-main-number">3</div>
						<h3 class="qs-main-title">Connect Your Engine</h3>
					</div>
					<div class="qs-main-content">
						<p class="qs-main-text">
							Phaser, PixiJS, Three.js, or vanilla JavaScript. Martini syncs data, not rendering.
						</p>
					</div>
				</div>

				<!-- Step 4 -->
				<div class="qs-main-step">
					<div class="qs-main-header">
						<div class="qs-main-number">4</div>
						<h3 class="qs-main-title">Test & Ship</h3>
					</div>
					<div class="qs-main-content">
						<p class="qs-main-text">
							Open two browser tabs to test P2P. Deploy as static files—no backend required.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- How It Works -->
	<section id="how-it-works" class="how-works-section">
		<div class="section-container">
			<h2 class="section-title">How It Works</h2>
			<p class="section-intro">
				Three simple APIs. That's it. Here's how you'd build a multiplayer paddle game:
			</p>

			<div class="how-works-scroll-container">
				<div class="how-works-cards">
					<!-- Card 1: defineGame -->
					<div class="how-card">
						<div class="how-card-split">
							<div class="how-card-left">
								<div class="how-card-badge">
									<code>defineGame()</code>
								</div>
								<h3 class="how-card-title">Describe your game</h3>
								<p class="how-card-text">
									Plain objects for state. No classes or networking code.
								</p>
							</div>
							<div class="how-card-right">
								<div class="how-code-snippet">
									<code class="inline-code">setup: () => ({'{'} paddles: [], ball: {'{'} x, y, dx, dy {'}'} {'}'})</code>
								</div>
							</div>
						</div>
					</div>

					<!-- Card 2: submitAction -->
					<div class="how-card">
						<div class="how-card-split">
							<div class="how-card-left">
								<div class="how-card-badge">
									<code>submitAction()</code>
								</div>
								<h3 class="how-card-title">Players interact</h3>
								<p class="how-card-text">
									Call actions from player input. Martini syncs instantly.
								</p>
							</div>
							<div class="how-card-right">
								<div class="how-code-snippet">
									<code class="inline-code">actions: {'{'} move: (state, id, y) => ... {'}'}</code>
								</div>
							</div>
						</div>
					</div>

					<!-- Card 3: onChange -->
					<div class="how-card">
						<div class="how-card-split">
							<div class="how-card-left">
								<div class="how-card-badge">
									<code>onChange()</code>
								</div>
								<h3 class="how-card-title">Render updates</h3>
								<p class="how-card-text">
									React to state changes. Draw with any engine you want.
								</p>
							</div>
							<div class="how-card-right">
								<div class="how-code-snippet">
									<code class="inline-code">onChange(s => sprite.x = s.ball.x)</code>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Scroll indicators -->
				<div class="scroll-indicators">
					<span class="scroll-dot active"></span>
					<span class="scroll-dot"></span>
					<span class="scroll-dot"></span>
				</div>
			</div>

			<!-- Result -->
			<div class="how-result">
				<div class="result-icon">🎮</div>
				<h3 class="result-title">You've got multiplayer</h3>
				<p class="result-text">
					Open two browser tabs. Both see the same game. One moves a paddle, the other sees it instantly.
					No backend, no deployment, no DevOps nightmares.
				</p>
			</div>
		</div>
	</section>

	<!-- Demo Gallery -->
	<section id="demos" class="demos-section">
		<div class="section-container">
			<h2 class="section-title">Demo Gallery</h2>

			<div class="demos-grid">
				{#each demoGames as game}
					<div class="demo-card" style="--game-color: {game.color}">
						<div class="demo-screen">
							<div class="game-emoji">{game.emoji}</div>
							<div class="player-count">{game.players}P</div>
						</div>
						<div class="demo-info">
							<h3 class="demo-title">{game.name}</h3>
							<p class="demo-desc">{game.description}</p>
						</div>
						<button class="demo-button">
							<svg class="play-icon" fill="currentColor" viewBox="0 0 24 24">
								<polygon points="5 3 19 12 5 21 5 3" />
							</svg>
							<span>Play</span>
						</button>
					</div>
				{/each}
			</div>
		</div>
	</section>


	<!-- Comparison Table -->
	<section id="comparison" class="comparison-section">
		<div class="section-container">
			<h2 class="section-title">Comparison Snapshot</h2>

			<div class="comparison-table">
				<table>
					<thead>
						<tr>
							<th>Feature</th>
							<th class="highlight-col">Martini</th>
							<th>Colyseus</th>
							<th>Photon</th>
							<th>Rune</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Declarative API</td>
							<td class="highlight-col">✓</td>
							<td>✗</td>
							<td>✗</td>
							<td>~</td>
						</tr>
						<tr>
							<td>Zero Server</td>
							<td class="highlight-col">✓</td>
							<td>✗</td>
							<td>✗</td>
							<td>✗</td>
						</tr>
						<tr>
							<td>P2P Support</td>
							<td class="highlight-col">✓</td>
							<td>✗</td>
							<td>✗</td>
							<td>✗</td>
						</tr>
						<tr>
							<td>Patch Efficiency</td>
							<td class="highlight-col">✓</td>
							<td>✗</td>
							<td>✓</td>
							<td>✓</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="cta-section">
		<div class="cta-container">
			<div class="cta-content">
				<h2 class="cta-title">Ready to build multiplayer?</h2>
				<p class="cta-subtitle">
					Start building your multiplayer game in minutes. No servers, no complexity.
				</p>
				<div class="cta-buttons">
					<a href="#quickstart" class="cta-btn-primary">
						<span>Get Started</span>
						<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</a>
					<a href="https://github.com/martini-game-framework/martini" target="_blank" rel="noopener noreferrer" class="cta-btn-secondary">
						<svg class="github-icon" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
						</svg>
						<span>GitHub</span>
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="footer">
		<div class="footer-content">
			<div class="footer-links">
				<a href="https://github.com/martini-game-framework/martini" target="_blank" rel="noopener noreferrer">GitHub</a>
				<span class="footer-divider">•</span>
				<a href="#quickstart">Quick Start</a>
				<span class="footer-divider">•</span>
				<a href="#demos">Demos</a>
				<span class="footer-divider">•</span>
				<span class="footer-license">MIT License</span>
			</div>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #000;
		color: #fff;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.page-container {
		position: relative;
		min-height: 100vh;
		background: #000;
		overflow-x: hidden;
	}

	/* ===== BACKGROUND ===== */
	.cyber-background {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
	}

	.grid-pattern {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(to right, rgba(0, 255, 255, 0.08) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(0, 255, 255, 0.08) 1px, transparent 1px);
		background-size: 60px 60px;
	}

	.grid-surge {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(to right, transparent 0%, rgba(0, 255, 255, 0.6) 50%, transparent 100%),
			linear-gradient(to bottom, transparent 0%, rgba(0, 255, 255, 0.6) 50%, transparent 100%);
		background-size: 300px 300px;
		background-position: 0 0;
		animation: surge-flow 8s linear infinite;
		opacity: 0;
		animation: surge-pulse 8s ease-in-out infinite;
	}

	@keyframes surge-flow {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 600px 600px;
		}
	}

	@keyframes surge-pulse {
		0%, 90% {
			opacity: 0;
		}
		92%, 94% {
			opacity: 0.4;
		}
		93% {
			opacity: 0.8;
		}
		95%, 100% {
			opacity: 0;
		}
	}

	.glow-orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(100px);
		animation: pulse-orb 10s ease-in-out infinite;
		opacity: 0.1;
	}

	.orb-1 { top: 10%; left: 10%; width: 500px; height: 500px; background: #00ffff; }
	.orb-2 { top: 50%; right: 10%; width: 600px; height: 600px; background: #ff00ff; animation-delay: 2s; }
	.orb-3 { bottom: 10%; left: 30%; width: 550px; height: 550px; background: #0080ff; animation-delay: 4s; }

	@keyframes pulse-orb {
		0%, 100% { opacity: 0.08; transform: scale(1); }
		50% { opacity: 0.15; transform: scale(1.1); }
	}

	.scanlines {
		position: fixed;
		inset: 0;
		background-image: linear-gradient(transparent 50%, rgba(0, 255, 255, 0.02) 50%);
		background-size: 100% 4px;
		pointer-events: none;
		z-index: 100;
		opacity: 0.3;
	}

	.vignette {
		position: fixed;
		inset: 0;
		background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.6) 100%);
		pointer-events: none;
		z-index: 1;
	}

	.mouse-spotlight {
		position: fixed;
		width: 500px;
		height: 500px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(0, 255, 255, 0.08) 0%, transparent 70%);
		pointer-events: none;
		transform: translate(-50%, -50%);
		transition: all 0.8s ease-out;
		z-index: 2;
	}

	/* ===== NAVBAR ===== */
	.navbar {
		position: sticky;
		top: 0;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid rgba(0, 255, 255, 0.1);
	}

	.nav-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.brand-icon {
		width: 28px;
		height: 28px;
		filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.6));
	}

	.brand-text {
		font-family: 'Orbitron', sans-serif;
		font-size: 1.25rem;
		font-weight: 700;
		background: linear-gradient(to right, #00ffff, #ff00ff);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.nav-links {
		display: flex;
		gap: 2rem;
		align-items: center;
	}

	.nav-links a {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s;
	}

	.nav-links a:hover {
		color: #00ffff;
	}

	/* ===== HERO ===== */
	.hero-section {
		position: relative;
		min-height: 80vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		z-index: 10;
	}

	.hero-content {
		max-width: 900px;
		text-align: center;
	}

	.hero-headline {
		font-family: 'Orbitron', sans-serif;
		font-size: clamp(2.5rem, 7vw, 5rem);
		font-weight: 900;
		margin: 0 0 1rem 0;
		background: linear-gradient(135deg, #00ffff 0%, #ff00ff 50%, #ffff00 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		line-height: 1.2;
	}

	.hero-subheadline {
		font-size: clamp(1.125rem, 3vw, 1.5rem);
		color: rgba(224, 224, 255, 0.8);
		margin: 0 0 2.5rem 0;
		font-weight: 300;
	}

	.hero-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 2rem;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 2rem;
		background: linear-gradient(to right, #00ffff, #0080ff);
		color: #000;
		font-weight: 700;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.2s ease;
		box-shadow: 0 0 30px rgba(0, 255, 255, 0.4);
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 0 50px rgba(0, 255, 255, 0.7);
	}

	.btn-icon {
		width: 16px;
		height: 16px;
	}

	.btn-code {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		background: rgba(0, 255, 255, 0.05);
		border: 1px solid rgba(0, 255, 255, 0.3);
		color: #00ffff;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-code:hover {
		background: rgba(0, 255, 255, 0.1);
		border-color: #00ffff;
	}

	.code-text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875rem;
	}

	.copy-icon {
		width: 18px;
		height: 18px;
	}

	.microproof {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		font-size: 0.875rem;
		color: rgba(224, 224, 255, 0.5);
	}

	.proof-item {
		font-weight: 600;
	}

	.proof-divider {
		color: rgba(0, 255, 255, 0.3);
	}

	/* ===== SECTIONS ===== */
	section {
		position: relative;
		padding: 6rem 2rem;
		z-index: 10;
	}

	.section-container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.section-title {
		font-family: 'Orbitron', sans-serif;
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		text-align: center;
		margin: 0 0 3rem 0;
		color: #fff;
	}

	/* Shared code styles */
	.code-dots {
		display: flex;
		gap: 0.375rem;
	}

	.code-dots span {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
	}

	.code-filename {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875rem;
		color: #00ffff;
	}

	.feature-tag {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: rgba(0, 255, 255, 0.05);
		border: 1px solid rgba(0, 255, 255, 0.2);
		border-radius: 2rem;
		color: #00ffff;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.check-icon {
		width: 16px;
		height: 16px;
		stroke-width: 3;
	}

	/* ===== QUICK START MAIN ===== */
	.quickstart-main-section {
		background: linear-gradient(to bottom, #000, #0a0a0f, #000);
	}

	.section-intro {
		text-align: center;
		font-size: clamp(1rem, 2vw, 1.125rem);
		color: rgba(224, 224, 255, 0.7);
		max-width: 800px;
		margin: 0 auto 3rem;
		line-height: 1.6;
	}

	.quickstart-main-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.qs-main-step {
		background: rgba(0, 255, 255, 0.02);
		border: 1px solid rgba(0, 255, 255, 0.2);
		border-radius: 0.75rem;
		padding: 2rem;
		transition: all 0.3s ease;
	}

	.qs-main-step:first-child {
		grid-column: 1 / -1;
	}

	.qs-code-step {
		grid-column: 1 / -1;
	}

	.qs-main-step:hover {
		border-color: rgba(0, 255, 255, 0.4);
		background: rgba(0, 255, 255, 0.05);
		transform: translateY(-5px);
		box-shadow: 0 10px 40px rgba(0, 255, 255, 0.1);
	}

	.qs-main-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.qs-main-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: linear-gradient(135deg, #00ffff, #0080ff);
		color: #000;
		font-weight: 900;
		font-size: 1.25rem;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
	}

	.qs-main-title {
		font-family: 'Rajdhani', sans-serif;
		font-size: 1.375rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
	}

	.qs-main-content {
		padding-left: 0;
	}

	.qs-main-code {
		display: block;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.9rem;
		color: #00ffff;
		background: rgba(0, 0, 0, 0.6);
		padding: 0.875rem 1.25rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(0, 255, 255, 0.3);
		overflow-x: auto;
	}

	.qs-main-text {
		font-size: 1rem;
		color: rgba(224, 224, 255, 0.7);
		line-height: 1.6;
		margin: 0;
	}

	.qs-intro-text {
		margin-bottom: 1.5rem;
	}

	/* Code Demo with Tooltips */
	.code-demo {
		position: relative;
		background: linear-gradient(135deg, rgba(10, 10, 20, 0.95), rgba(5, 5, 15, 0.95));
		border: 1px solid rgba(0, 255, 255, 0.4);
		border-radius: 0.75rem;
		overflow: visible;
		margin-bottom: 1.5rem;
		box-shadow:
			0 0 40px rgba(0, 255, 255, 0.15),
			0 10px 40px rgba(0, 0, 0, 0.5),
			inset 0 0 60px rgba(0, 255, 255, 0.03);
	}

	.code-demo-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		background: linear-gradient(to right, rgba(0, 0, 0, 0.8), rgba(10, 10, 20, 0.8));
		border-bottom: 1px solid rgba(0, 255, 255, 0.3);
		box-shadow: 0 1px 20px rgba(0, 255, 255, 0.1);
	}

	.code-demo-content {
		padding: 1.5rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.8;
		color: #e0e0ff;
		margin: 0;
		overflow-x: auto;
		background:
			linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.02) 50%, transparent 100%),
			repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.02) 2px, rgba(0, 255, 255, 0.02) 4px);
	}

	.code-line {
		display: block;
		position: relative;
	}

	.code-hover-line {
		cursor: help;
		transition: all 0.2s ease;
		padding: 0 0.5rem;
		margin: 0 -0.5rem;
		border-radius: 0.25rem;
		border-left: 2px solid transparent;
	}

	.code-hover-line:hover {
		background: linear-gradient(to right, rgba(0, 255, 255, 0.15), rgba(255, 0, 255, 0.05));
		border-left-color: #00ffff;
		box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
	}

	.code-tooltip {
		position: fixed;
		background: linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 10, 20, 0.98));
		border: 2px solid #00ffff;
		color: #fff;
		padding: 0.875rem 1.25rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.2s ease, visibility 0.2s ease;
		z-index: 10000;
		box-shadow:
			0 0 30px rgba(0, 255, 255, 0.6),
			0 0 60px rgba(0, 255, 255, 0.3),
			0 10px 40px rgba(0, 0, 0, 0.8),
			inset 0 0 20px rgba(0, 255, 255, 0.1);
		backdrop-filter: blur(10px);
	}

	.code-tooltip::before {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 8px solid transparent;
		border-top-color: #00ffff;
		filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
	}

	.code-tooltip strong {
		color: #00ffff;
		display: block;
		margin-bottom: 0.25rem;
		text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
	}

	/* Enhanced Neon Syntax Highlighting */
	.code-keyword {
		color: #ff00ff;
		font-weight: 700;
		text-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
	}

	.code-function {
		color: #00ffff;
		font-weight: 600;
		text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
	}

	.code-variable {
		color: #ffaa00;
		text-shadow: 0 0 8px rgba(255, 170, 0, 0.4);
	}

	.code-property {
		color: #00ff88;
		text-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
	}

	.code-operator {
		color: #ff0099;
		font-weight: 500;
	}

	.code-number {
		color: #ffff00;
		font-weight: 600;
		text-shadow: 0 0 8px rgba(255, 255, 0, 0.4);
	}

	.code-bracket {
		color: rgba(224, 224, 255, 0.9);
	}

	.code-string {
		color: #a8e6cf;
		text-shadow: 0 0 8px rgba(168, 230, 207, 0.3);
	}

	.example-features {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	/* ===== DEMOS ===== */
	.demos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.demo-card {
		background: linear-gradient(to bottom, #1a1a1f, #0a0a0f);
		border: 1px solid rgba(0, 255, 255, 0.2);
		border-radius: 0.75rem;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.demo-card:hover {
		transform: translateY(-10px);
		border-color: var(--game-color);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px var(--game-color);
	}

	.demo-screen {
		position: relative;
		aspect-ratio: 16/10;
		background: radial-gradient(circle at center, var(--game-color), #0a0a0f);
		opacity: 0.3;
		display: flex;
		align-items: center;
		justify-content: center;
		border-bottom: 1px solid rgba(0, 255, 255, 0.1);
	}

	.game-emoji {
		font-size: 4rem;
		filter: drop-shadow(0 0 30px var(--game-color));
	}

	.player-count {
		position: absolute;
		top: 1rem;
		right: 1rem;
		padding: 0.375rem 0.75rem;
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid rgba(0, 255, 255, 0.3);
		border-radius: 1rem;
		font-size: 0.75rem;
		color: #00ffff;
		font-weight: 700;
	}

	.demo-info {
		padding: 1.25rem;
	}

	.demo-title {
		font-family: 'Rajdhani', sans-serif;
		font-size: 1.25rem;
		font-weight: 700;
		color: #fff;
		margin: 0 0 0.5rem 0;
	}

	.demo-desc {
		font-size: 0.875rem;
		color: rgba(224, 224, 255, 0.6);
		margin: 0;
	}

	.demo-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		background: rgba(0, 255, 255, 0.05);
		border: none;
		border-top: 1px solid rgba(0, 255, 255, 0.1);
		color: #00ffff;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.demo-button:hover {
		background: rgba(0, 255, 255, 0.1);
	}

	.play-icon {
		width: 14px;
		height: 14px;
	}

	/* ===== COMPARISON ===== */
	.comparison-table {
		max-width: 900px;
		margin: 0 auto;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background: rgba(10, 10, 15, 0.5);
		border: 1px solid rgba(0, 255, 255, 0.2);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	thead {
		background: rgba(0, 0, 0, 0.6);
	}

	th, td {
		padding: 1rem;
		text-align: center;
		border-bottom: 1px solid rgba(0, 255, 255, 0.1);
	}

	th {
		font-family: 'Rajdhani', sans-serif;
		font-size: 1.125rem;
		font-weight: 700;
		color: #fff;
	}

	td {
		color: rgba(224, 224, 255, 0.7);
	}

	.highlight-col {
		background: rgba(0, 255, 255, 0.05);
		color: #00ffff !important;
		font-weight: 700;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	/* ===== HOW IT WORKS (Horizontal Scroll) ===== */
	.how-works-section {
		background: linear-gradient(to bottom, #000, #0a0a0f);
	}

	.how-works-scroll-container {
		position: relative;
		margin-bottom: 3rem;
	}

	.how-works-cards {
		display: flex;
		gap: 2rem;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-behavior: smooth;
		padding: 1rem 0 2rem;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.how-works-cards::-webkit-scrollbar {
		display: none;
	}

	.how-card {
		flex: 0 0 65vw;
		scroll-snap-align: center;
		background: linear-gradient(135deg, rgba(0, 255, 255, 0.03), rgba(255, 0, 255, 0.02));
		border: 1px solid rgba(0, 255, 255, 0.3);
		border-radius: 1rem;
		padding: 2.5rem;
		transition: all 0.3s ease;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		min-width: 65vw;
		max-width: 65vw;
	}

	.how-card:hover {
		border-color: rgba(0, 255, 255, 0.6);
		background: linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(255, 0, 255, 0.03));
		transform: translateY(-10px);
		box-shadow: 0 20px 60px rgba(0, 255, 255, 0.2);
	}

	.how-card-split {
		display: flex;
		gap: 2rem;
		align-items: stretch;
		height: 100%;
	}

	.how-card-left {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.how-card-right {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.how-card-badge {
		display: inline-block;
		margin-bottom: 1rem;
	}

	.how-card-badge code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.125rem;
		font-weight: 700;
		color: #00ffff;
		background: rgba(0, 255, 255, 0.1);
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(0, 255, 255, 0.4);
		text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
	}

	.how-card-title {
		font-family: 'Rajdhani', sans-serif;
		font-size: 1.75rem;
		font-weight: 700;
		color: #fff;
		margin: 0 0 1rem 0;
		line-height: 1.3;
	}

	.how-card-text {
		font-size: 1.125rem;
		color: rgba(224, 224, 255, 0.85);
		line-height: 1.6;
		margin: 0 0 1.25rem 0;
		font-style: italic;
	}

	.how-code-snippet {
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(0, 255, 255, 0.3);
		border-radius: 0.5rem;
		padding: 1.5rem 1.5rem;
		box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
	}

	.inline-code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.9rem;
		color: #e0e0ff;
		line-height: 1.6;
	}

	.inline-code-text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.9em;
		color: #00ffff;
		background: rgba(0, 255, 255, 0.1);
		padding: 0.2em 0.4em;
		border-radius: 0.25rem;
	}

	.how-card-note {
		font-size: 0.9rem;
		color: rgba(224, 224, 255, 0.6);
		margin: 0;
		font-style: italic;
	}

	/* Scroll Indicators */
	.scroll-indicators {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.scroll-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: rgba(0, 255, 255, 0.2);
		border: 1px solid rgba(0, 255, 255, 0.4);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.scroll-dot.active {
		background: #00ffff;
		box-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
		transform: scale(1.3);
	}

	.scroll-dot:hover {
		background: rgba(0, 255, 255, 0.5);
	}

	/* Responsive horizontal scroll */
	@media (max-width: 768px) {
		.how-card-split {
			flex-direction: column;
			gap: 1.5rem;
		}

		.how-card {
			padding: 2rem;
		}
	}

	@media (min-width: 768px) {
		.how-card {
			flex: 0 0 calc(50% - 1rem);
		}
	}

	@media (min-width: 1200px) {
		.how-card {
			flex: 0 0 calc(33.333% - 1.5rem);
		}
	}

	.how-result {
		background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.05));
		border: 2px solid rgba(0, 255, 255, 0.3);
		border-radius: 0.75rem;
		padding: 2.5rem;
		text-align: center;
		margin-top: 2rem;
	}

	.result-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.result-title {
		font-family: 'Orbitron', sans-serif;
		font-size: 2rem;
		font-weight: 700;
		color: #00ffff;
		margin: 0 0 1rem 0;
	}

	.result-text {
		font-size: 1.125rem;
		color: rgba(224, 224, 255, 0.8);
		line-height: 1.6;
		max-width: 600px;
		margin: 0 auto;
	}

	/* ===== CTA SECTION ===== */
	.cta-section {
		position: relative;
		padding: 8rem 2rem;
		background: linear-gradient(to bottom, #000, #0a0a0f);
		z-index: 10;
		overflow: hidden;
	}

	.cta-section::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at center, rgba(0, 255, 255, 0.1), transparent 70%);
		pointer-events: none;
	}

	.cta-container {
		max-width: 800px;
		margin: 0 auto;
		position: relative;
	}

	.cta-content {
		text-align: center;
		padding: 4rem 3rem;
		background: linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(255, 0, 255, 0.03));
		border: 2px solid rgba(0, 255, 255, 0.3);
		border-radius: 1rem;
		position: relative;
		overflow: hidden;
		box-shadow:
			0 20px 60px rgba(0, 0, 0, 0.5),
			0 0 40px rgba(0, 255, 255, 0.1),
			inset 0 0 60px rgba(0, 255, 255, 0.02);
	}

	.cta-content::before {
		content: '';
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: conic-gradient(
			from 0deg,
			transparent,
			rgba(0, 255, 255, 0.1),
			transparent 30%
		);
		animation: cta-spin 8s linear infinite;
	}

	@keyframes cta-spin {
		100% {
			transform: rotate(360deg);
		}
	}

	.cta-title {
		font-family: 'Orbitron', sans-serif;
		font-size: clamp(2rem, 5vw, 3.5rem);
		font-weight: 900;
		margin: 0 0 1rem 0;
		background: linear-gradient(135deg, #00ffff 0%, #ff00ff 50%, #ffff00 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		position: relative;
		z-index: 1;
	}

	.cta-subtitle {
		font-size: clamp(1rem, 2vw, 1.25rem);
		color: rgba(224, 224, 255, 0.8);
		margin: 0 0 2.5rem 0;
		line-height: 1.6;
		position: relative;
		z-index: 1;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
		position: relative;
		z-index: 1;
	}

	.cta-btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 2.5rem;
		background: linear-gradient(135deg, #00ffff, #0080ff);
		color: #000;
		font-weight: 700;
		font-size: 1.125rem;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.3s ease;
		box-shadow:
			0 0 30px rgba(0, 255, 255, 0.5),
			0 10px 30px rgba(0, 0, 0, 0.3);
		position: relative;
		overflow: hidden;
		white-space: nowrap;
	}

	.cta-btn-primary::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0;
		height: 0;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
		transform: translate(-50%, -50%);
		transition: width 0.6s, height 0.6s;
	}

	.cta-btn-primary:hover::before {
		width: 300px;
		height: 300px;
	}

	.cta-btn-primary:hover {
		transform: translateY(-3px);
		box-shadow:
			0 0 50px rgba(0, 255, 255, 0.8),
			0 15px 40px rgba(0, 0, 0, 0.4);
	}

	.cta-btn-primary span,
	.cta-btn-primary .btn-icon {
		position: relative;
		z-index: 1;
	}

	.cta-btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 2.5rem;
		background: rgba(0, 255, 255, 0.05);
		color: #00ffff;
		font-weight: 600;
		font-size: 1.125rem;
		border: 2px solid rgba(0, 255, 255, 0.4);
		border-radius: 0.5rem;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.3s ease;
		white-space: nowrap;
	}

	.cta-btn-secondary:hover {
		background: rgba(0, 255, 255, 0.1);
		border-color: #00ffff;
		transform: translateY(-3px);
		box-shadow: 0 10px 30px rgba(0, 255, 255, 0.2);
	}

	/* ===== FOOTER ===== */
	.footer {
		position: relative;
		padding: 3rem 2rem;
		border-top: 1px solid rgba(0, 255, 255, 0.1);
		background: #000;
		z-index: 10;
	}

	.footer-content {
		max-width: 1200px;
		margin: 0 auto;
		text-align: center;
	}

	.footer-links {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.footer-links a {
		color: rgba(224, 224, 255, 0.6);
		text-decoration: none;
		transition: color 0.2s;
	}

	.footer-links a:hover {
		color: #00ffff;
	}

	.footer-divider {
		color: rgba(0, 255, 255, 0.2);
	}

	.footer-license {
		color: rgba(224, 224, 255, 0.4);
	}

	/* ===== RESPONSIVE ===== */
	@media (max-width: 1024px) {
		.quickstart-main-grid {
			grid-template-columns: 1fr;
		}

		.qs-code-step {
			grid-column: 1;
		}
	}

	@media (max-width: 768px) {
		.nav-links {
			gap: 1rem;
		}

		.hero-buttons {
			flex-direction: column;
			align-items: stretch;
		}

		table {
			font-size: 0.875rem;
		}

		th, td {
			padding: 0.75rem 0.5rem;
		}

		.code-demo-content {
			font-size: 0.75rem;
		}

		.how-step {
			padding: 1.5rem;
		}

		.how-step-text {
			font-size: 1rem;
		}

		.result-text {
			font-size: 1rem;
		}
	}
</style>
