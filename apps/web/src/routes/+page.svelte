<script lang="ts">
	import { APP_NAME } from '@martini/shared';
	import { onMount } from 'svelte';

	let mouseX = 0;
	let mouseY = 0;

	onMount(() => {
		const handleMouseMove = (e: MouseEvent) => {
			mouseX = e.clientX;
			mouseY = e.clientY;

			// Update mouse glow position
			const mouseGlow = document.querySelector('.mouse-glow') as HTMLElement;
			if (mouseGlow) {
				mouseGlow.style.left = `${e.clientX}px`;
				mouseGlow.style.top = `${e.clientY}px`;
			}
		};
		window.addEventListener('mousemove', handleMouseMove);

		// Create floating particles with arcade colors
		const createParticles = () => {
			const particleContainer = document.querySelector('.particle-container');
			if (!particleContainer) return;

			const colors = [
				'rgba(0, 255, 255, 0.4)',    // cyan
				'rgba(255, 0, 255, 0.4)',    // magenta
				'rgba(255, 105, 180, 0.4)',  // hot pink
				'rgba(138, 43, 226, 0.4)',   // blue violet
				'rgba(255, 215, 0, 0.4)',    // gold
				'rgba(0, 255, 127, 0.4)'     // spring green
			];

			for (let i = 0; i < 40; i++) {
				const particle = document.createElement('div');
				particle.className = 'particle';
				particle.style.left = `${Math.random() * 100}%`;
				particle.style.top = `${Math.random() * 100}%`;
				particle.style.animationDelay = `${Math.random() * 20}s`;
				particle.style.animationDuration = `${12 + Math.random() * 15}s`;

				// Random shapes and colors
				const shapes = ['◆', '▲', '●', '■', '✦', '✧', '◈', '▼', '◀', '▶'];
				particle.textContent = shapes[Math.floor(Math.random() * shapes.length)];
				particle.style.color = colors[Math.floor(Math.random() * colors.length)];

				particleContainer.appendChild(particle);
			}
		};
		createParticles();

		// Scroll-triggered animations
		const observerOptions = {
			threshold: 0.1,
			rootMargin: '0px 0px -100px 0px'
		};

		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add('animate-in');
				}
			});
		}, observerOptions);

		const animatedElements = document.querySelectorAll('.section-container, .qs-main-step, .how-card, .arcade-cabinet, .comparison-section, .cta-section');
		animatedElements.forEach(el => {
			el.classList.add('animate-on-scroll');
			observer.observe(el);
		});

		// Tooltip functionality
		const hoverLines = document.querySelectorAll('.code-hover-line');
		hoverLines.forEach(line => {
			const tooltipName = line.getAttribute('data-tooltip');
			const tooltip = document.querySelector(`.code-tooltip[data-for="${tooltipName}"]`) as HTMLElement;

			if (tooltip) {
				line.addEventListener('mouseenter', () => {
					const codeDemo = document.querySelector('.code-demo');
					if (codeDemo) {
						const rect = line.getBoundingClientRect();
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
			observer.disconnect();
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
			id: 'tile-matcher',
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
		<div class="diagonal-stripes"></div>
		<div class="arcade-bars"></div>
		<div class="particle-container"></div>
		<div class="arcade-lights">
			<div class="arcade-light" style="left: 10%; top: 15%;"></div>
			<div class="arcade-light" style="left: 25%; top: 35%;"></div>
			<div class="arcade-light" style="left: 70%; top: 25%;"></div>
			<div class="arcade-light" style="left: 85%; top: 55%;"></div>
			<div class="arcade-light" style="left: 15%; top: 75%;"></div>
			<div class="arcade-light" style="left: 60%; top: 80%;"></div>
			<div class="arcade-light" style="left: 40%; top: 10%;"></div>
			<div class="arcade-light" style="left: 90%; top: 90%;"></div>
		</div>
		<div class="glow-orb orb-1"></div>
		<div class="glow-orb orb-2"></div>
		<div class="glow-orb orb-3"></div>
		<div class="glow-orb orb-4"></div>

		<!-- Planets -->
		<div class="planets-container">
			<div class="planet planet-1">
				<div class="planet-ring"></div>
			</div>
			<div class="planet planet-2"></div>
			<div class="planet planet-3">
				<div class="planet-moon"></div>
			</div>
			<div class="planet planet-4"></div>
		</div>
	</div>
	<div class="scanlines"></div>
	<div class="film-grain"></div>
	<div class="vignette"></div>
	<div class="mouse-spotlight" style="left: {mouseX}px; top: {mouseY}px;"></div>
	<div class="mouse-glow"></div>

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
			<h1 class="hero-headline gradient-text">Build multiplayer like single-player.</h1>
			<p class="hero-subheadline glow-text">Declarative state. Instant sync. No servers.</p>

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
					<div class="arcade-cabinet" style="--game-color: {game.color}">
						<!-- Top Marquee -->
						<div class="cabinet-marquee">
							<div class="marquee-lights">
								<span class="marquee-light"></span>
								<span class="marquee-light"></span>
								<span class="marquee-light"></span>
							</div>
						</div>

						<!-- Screen Bezel -->
						<div class="screen-bezel">
							<div class="screen-inner">
								<div class="crt-effect"></div>
									<div class="screen-content">
										<div class="game-emoji">{game.emoji}</div>
										<h3 class="game-title">
											{#if game.name.includes(' ')}
												<span class="title-line">{game.name.split(' ').slice(0, -1).join(' ')}</span>
												<span class="title-line">{game.name.split(' ').at(-1)}</span>
											{:else}
												<span class="title-line">{game.name}</span>
												<span class="title-line">&nbsp;</span>
											{/if}
										</h3>
										<p class="game-players">{game.players} PLAYERS</p>
									</div>
							</div>
						</div>

						<!-- Control Panel -->
						<div class="control-panel">
							<div class="insert-coin">
								<span class="coin-icon">🪙</span>
								<span class="coin-text">INSERT COIN</span>
							</div>
							<a href="/demo/{game.id}" class="start-button">
								<span>START</span>
							</a>
						</div>

						<!-- Cabinet Bottom -->
						<div class="cabinet-bottom"></div>
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

	/* ===== FLOATING PARTICLES ===== */
	.particle-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.particle {
		position: absolute;
		font-size: clamp(14px, 1.8vw, 28px);
		animation: float-particle 20s linear infinite;
		pointer-events: none;
		text-shadow:
			0 0 10px currentColor,
			0 0 20px currentColor;
		filter: drop-shadow(0 0 5px currentColor);
	}

	@keyframes float-particle {
		0% {
			transform: translateY(100vh) rotate(0deg);
			opacity: 0;
		}
		10% {
			opacity: 0.3;
		}
		90% {
			opacity: 0.3;
		}
		100% {
			transform: translateY(-100vh) rotate(360deg);
			opacity: 0;
		}
	}

	/* ===== MOUSE GLOW EFFECT ===== */
	.mouse-glow {
		position: fixed;
		width: 400px;
		height: 400px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(0, 255, 255, 0.15) 0%, transparent 70%);
		pointer-events: none;
		z-index: 9;
		transform: translate(-50%, -50%);
		transition: opacity 0.3s ease;
		mix-blend-mode: screen;
	}

	/* ===== ANIMATED GRADIENT TEXT ===== */
	.gradient-text {
		background: linear-gradient(
			90deg,
			#00ffff 0%,
			#00d4ff 20%,
			#00a8ff 40%,
			#ff00ff 60%,
			#00ffff 80%,
			#00ffff 100%
		);
		background-size: 200% auto;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: gradient-shift 8s ease-in-out infinite;
	}

	@keyframes gradient-shift {
		0%, 100% {
			background-position: 0% center;
		}
		50% {
			background-position: 200% center;
		}
	}

	.glow-text {
		text-shadow:
			0 0 20px rgba(0, 255, 255, 0.5),
			0 0 40px rgba(0, 255, 255, 0.3),
			0 0 60px rgba(0, 255, 255, 0.2);
		animation: text-glow-pulse 3s ease-in-out infinite;
	}

	@keyframes text-glow-pulse {
		0%, 100% {
			text-shadow:
				0 0 20px rgba(0, 255, 255, 0.5),
				0 0 40px rgba(0, 255, 255, 0.3),
				0 0 60px rgba(0, 255, 255, 0.2);
		}
		50% {
			text-shadow:
				0 0 30px rgba(0, 255, 255, 0.8),
				0 0 60px rgba(0, 255, 255, 0.5),
				0 0 90px rgba(0, 255, 255, 0.3);
		}
	}

	/* ===== SCROLL ANIMATIONS ===== */
	.animate-on-scroll {
		opacity: 0;
		transform: translateY(50px);
		transition: opacity 0.8s ease, transform 0.8s ease;
	}

	.animate-on-scroll.animate-in {
		opacity: 1;
		transform: translateY(0);
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
	.orb-3 { bottom: 10%; left: 30%; width: 550px; height: 550px; background: #ff69b4; animation-delay: 4s; }
	.orb-4 { top: 70%; right: 40%; width: 450px; height: 450px; background: #8a2be2; animation-delay: 6s; }

	@keyframes pulse-orb {
		0%, 100% { opacity: 0.12; transform: scale(1); }
		50% { opacity: 0.2; transform: scale(1.15); }
	}

	/* ===== PLANETS ===== */
	.planets-container {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.planet {
		position: absolute;
		border-radius: 50%;
		opacity: 0.4;
		animation: planet-float 20s ease-in-out infinite;
	}

	@keyframes planet-float {
		0%, 100% {
			transform: translateY(0) rotate(0deg);
		}
		50% {
			transform: translateY(-30px) rotate(180deg);
		}
	}

	.planet-1 {
		width: 120px;
		height: 120px;
		top: 15%;
		right: 12%;
		background: radial-gradient(circle at 30% 30%, #00ffff, #0080ff, #000080);
		box-shadow:
			0 0 40px rgba(0, 255, 255, 0.4),
			inset -10px -10px 30px rgba(0, 0, 0, 0.5),
			inset 5px 5px 20px rgba(255, 255, 255, 0.1);
		animation-duration: 25s;
	}

	.planet-ring {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 180px;
		height: 60px;
		border: 3px solid rgba(0, 255, 255, 0.3);
		border-radius: 50%;
		transform: translate(-50%, -50%) rotateX(75deg);
		box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
	}

	.planet-2 {
		width: 80px;
		height: 80px;
		top: 60%;
		left: 8%;
		background: radial-gradient(circle at 35% 35%, #ff00ff, #8b008b, #4b0082);
		box-shadow:
			0 0 30px rgba(255, 0, 255, 0.4),
			inset -8px -8px 25px rgba(0, 0, 0, 0.5),
			inset 5px 5px 15px rgba(255, 255, 255, 0.1);
		animation-duration: 30s;
		animation-delay: -5s;
	}

	.planet-3 {
		width: 100px;
		height: 100px;
		bottom: 20%;
		right: 20%;
		background: radial-gradient(circle at 30% 30%, #ff69b4, #ff1493, #8b0045);
		box-shadow:
			0 0 35px rgba(255, 105, 180, 0.4),
			inset -10px -10px 28px rgba(0, 0, 0, 0.5),
			inset 5px 5px 18px rgba(255, 255, 255, 0.1);
		animation-duration: 28s;
		animation-delay: -10s;
	}

	.planet-moon {
		position: absolute;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: radial-gradient(circle at 30% 30%, #ffffff, #cccccc, #666666);
		box-shadow:
			0 0 15px rgba(255, 255, 255, 0.3),
			inset -3px -3px 8px rgba(0, 0, 0, 0.5);
		animation: moon-orbit 8s linear infinite;
	}

	@keyframes moon-orbit {
		0% {
			transform: translate(-80px, 0) rotate(0deg);
		}
		25% {
			transform: translate(0, -80px) rotate(90deg);
		}
		50% {
			transform: translate(80px, 0) rotate(180deg);
		}
		75% {
			transform: translate(0, 80px) rotate(270deg);
		}
		100% {
			transform: translate(-80px, 0) rotate(360deg);
		}
	}

	.planet-4 {
		width: 60px;
		height: 60px;
		top: 40%;
		left: 50%;
		background: radial-gradient(circle at 35% 35%, #ffd700, #ffaa00, #ff8c00);
		box-shadow:
			0 0 25px rgba(255, 215, 0, 0.4),
			inset -6px -6px 20px rgba(0, 0, 0, 0.5),
			inset 4px 4px 12px rgba(255, 255, 255, 0.2);
		animation-duration: 35s;
		animation-delay: -15s;
	}

	/* ===== DIAGONAL STRIPES (Arcade Background) ===== */
	.diagonal-stripes {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 50px,
			rgba(0, 255, 255, 0.03) 50px,
			rgba(0, 255, 255, 0.03) 100px,
			transparent 100px,
			transparent 150px,
			rgba(255, 0, 255, 0.03) 150px,
			rgba(255, 0, 255, 0.03) 200px
		);
		animation: stripes-move 20s linear infinite;
	}

	@keyframes stripes-move {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 1000px 1000px;
		}
	}

	/* ===== ARCADE BARS (Horizontal Scrolling) ===== */
	.arcade-bars {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.arcade-bars::before,
	.arcade-bars::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 3px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			#00ffff 20%,
			#ff00ff 40%,
			#ffff00 60%,
			#00ffff 80%,
			transparent 100%
		);
		opacity: 0.3;
		animation: bars-scroll 15s linear infinite;
	}

	.arcade-bars::before {
		top: 20%;
	}

	.arcade-bars::after {
		top: 60%;
		animation-duration: 18s;
		animation-delay: -5s;
	}

	@keyframes bars-scroll {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	/* ===== ARCADE LIGHTS ===== */
	.arcade-lights {
		position: absolute;
		inset: 0;
	}

	.arcade-light {
		position: absolute;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #00ffff;
		box-shadow:
			0 0 10px currentColor,
			0 0 20px currentColor,
			0 0 30px currentColor;
		animation: light-pulse 3s ease-in-out infinite;
	}

	.arcade-light:nth-child(1) { color: #00ffff; animation-delay: 0s; }
	.arcade-light:nth-child(2) { color: #ff00ff; animation-delay: 0.4s; }
	.arcade-light:nth-child(3) { color: #ffff00; animation-delay: 0.8s; }
	.arcade-light:nth-child(4) { color: #ff69b4; animation-delay: 1.2s; }
	.arcade-light:nth-child(5) { color: #00ff7f; animation-delay: 1.6s; }
	.arcade-light:nth-child(6) { color: #8a2be2; animation-delay: 2s; }
	.arcade-light:nth-child(7) { color: #ffd700; animation-delay: 2.4s; }
	.arcade-light:nth-child(8) { color: #00ffff; animation-delay: 2.8s; }

	@keyframes light-pulse {
		0%, 100% {
			opacity: 0.3;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.5);
		}
	}

	/* ===== FILM GRAIN ===== */
	.film-grain {
		position: fixed;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E");
		pointer-events: none;
		z-index: 101;
		animation: grain-flicker 0.3s steps(2) infinite;
		opacity: 0.4;
	}

	@keyframes grain-flicker {
		0%, 100% { opacity: 0.35; }
		50% { opacity: 0.45; }
	}

	.scanlines {
		position: fixed;
		inset: 0;
		background-image: linear-gradient(transparent 50%, rgba(0, 255, 255, 0.025) 50%);
		background-size: 100% 4px;
		pointer-events: none;
		z-index: 100;
		opacity: 0.4;
		animation: scanline-flicker 0.15s infinite;
	}

	@keyframes scanline-flicker {
		0%, 100% { opacity: 0.35; }
		50% { opacity: 0.45; }
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
		background: linear-gradient(135deg, rgba(0, 0, 0, 0.85), rgba(10, 10, 20, 0.75));
		backdrop-filter: blur(20px) saturate(180%);
		border-bottom: 2px solid transparent;
		border-image: linear-gradient(90deg, transparent, #00ffff, #ff00ff, #00ffff, transparent) 1;
		box-shadow:
			0 4px 30px rgba(0, 0, 0, 0.5),
			0 0 40px rgba(0, 255, 255, 0.1),
			inset 0 -1px 0 rgba(0, 255, 255, 0.2);
		animation: navbar-glow 5s ease-in-out infinite;
	}

	@keyframes navbar-glow {
		0%, 100% {
			box-shadow:
				0 4px 30px rgba(0, 0, 0, 0.5),
				0 0 40px rgba(0, 255, 255, 0.1),
				inset 0 -1px 0 rgba(0, 255, 255, 0.2);
		}
		50% {
			box-shadow:
				0 4px 30px rgba(0, 0, 0, 0.5),
				0 0 50px rgba(0, 255, 255, 0.2),
				inset 0 -1px 0 rgba(0, 255, 255, 0.4);
		}
	}

	.navbar::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, transparent, #00ffff, #ff00ff, #00ffff, transparent);
		animation: border-flow 6s linear infinite;
		opacity: 0.5;
	}

	@keyframes border-flow {
		0% {
			background-position: 0% 50%;
		}
		100% {
			background-position: 200% 50%;
		}
	}

	.nav-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: relative;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		transition: transform 0.3s ease;
	}

	.nav-brand:hover {
		transform: scale(1.05);
	}

	.brand-icon {
		width: 28px;
		height: 28px;
		filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.6));
		animation: icon-pulse 3s ease-in-out infinite;
		transition: transform 0.3s ease;
	}

	@keyframes icon-pulse {
		0%, 100% {
			filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.6));
		}
		50% {
			filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.9)) drop-shadow(0 0 25px rgba(255, 0, 255, 0.5));
		}
	}

	.nav-brand:hover .brand-icon {
		transform: rotate(360deg);
		animation: icon-pulse 1s ease-in-out infinite;
	}

	.brand-text {
		font-family: 'Orbitron', sans-serif;
		font-size: 1.25rem;
		font-weight: 700;
		background: linear-gradient(90deg, #00ffff, #00d4ff, #ff00ff, #00ffff);
		background-size: 300% 100%;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: brand-shimmer 4s ease-in-out infinite;
		text-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
		position: relative;
	}

	@keyframes brand-shimmer {
		0%, 100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
	}

	.nav-links {
		display: flex;
		gap: 2rem;
		align-items: center;
	}

	.nav-links a {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.95rem;
		letter-spacing: 0.5px;
		transition: all 0.3s ease;
		position: relative;
		padding: 0.5rem 0;
	}

	.nav-links a::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 0;
		height: 2px;
		background: linear-gradient(90deg, #00ffff, #ff00ff);
		transition: width 0.3s ease;
		box-shadow: 0 0 10px currentColor;
	}

	.nav-links a::after {
		content: '';
		position: absolute;
		inset: -4px;
		background: radial-gradient(circle, rgba(0, 255, 255, 0.15), transparent 70%);
		opacity: 0;
		transition: opacity 0.3s ease;
		z-index: -1;
		border-radius: 4px;
	}

	.nav-links a:hover {
		color: #00ffff;
		text-shadow:
			0 0 10px rgba(0, 255, 255, 0.8),
			0 0 20px rgba(0, 255, 255, 0.4);
		transform: translateY(-2px);
	}

	.nav-links a:hover::before {
		width: 100%;
	}

	.nav-links a:hover::after {
		opacity: 1;
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
		background: linear-gradient(135deg, #00ffff, #0080ff, #00ffff);
		background-size: 200% 200%;
		color: #000;
		font-weight: 700;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.3s ease;
		box-shadow:
			0 0 30px rgba(0, 255, 255, 0.4),
			0 10px 30px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.3);
		position: relative;
		animation: button-glow 3s ease-in-out infinite;
	}

	@keyframes button-glow {
		0%, 100% {
			box-shadow:
				0 0 30px rgba(0, 255, 255, 0.4),
				0 10px 30px rgba(0, 0, 0, 0.3),
				inset 0 1px 0 rgba(255, 255, 255, 0.3);
		}
		50% {
			box-shadow:
				0 0 50px rgba(0, 255, 255, 0.6),
				0 10px 30px rgba(0, 0, 0, 0.3),
				inset 0 1px 0 rgba(255, 255, 255, 0.3);
		}
	}

	.btn-primary:hover {
		transform: translateY(-3px) scale(1.05);
		background-position: 100% 100%;
		box-shadow:
			0 0 60px rgba(0, 255, 255, 0.8),
			0 15px 40px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.4);
	}

	.btn-primary:active {
		transform: translateY(-1px) scale(1.02);
		box-shadow:
			0 0 40px rgba(0, 255, 255, 0.6),
			0 5px 20px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
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
		background: linear-gradient(135deg, #ffffff, #00ffff, #ffffff);
		background-size: 200% 200%;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		text-shadow: 0 0 40px rgba(0, 255, 255, 0.3);
		animation: title-shimmer 5s ease-in-out infinite;
		position: relative;
	}

	.section-title::after {
		content: attr(data-text);
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		z-index: -1;
		background: linear-gradient(135deg, #ffffff, #00ffff, #ffffff);
		background-size: 200% 200%;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: blur(20px);
		opacity: 0.5;
		animation: title-shimmer 5s ease-in-out infinite;
	}

	@keyframes title-shimmer {
		0%, 100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
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
		background: transparent;
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
		backdrop-filter: blur(5px);
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
		border-color: rgba(0, 255, 255, 0.6);
		background: linear-gradient(135deg, rgba(0, 255, 255, 0.08), rgba(255, 0, 255, 0.04));
		box-shadow:
			0 15px 50px rgba(0, 255, 255, 0.2),
			0 0 40px rgba(0, 255, 255, 0.15),
			inset 0 0 30px rgba(0, 255, 255, 0.03);
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
		width: 50px;
		height: 50px;
		background: linear-gradient(135deg, #00ffff, #0080ff, #00ffff);
		background-size: 200% 200%;
		color: #000;
		font-weight: 900;
		font-size: 1.5rem;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow:
			0 0 30px rgba(0, 255, 255, 0.6),
			0 0 60px rgba(0, 255, 255, 0.3),
			inset 0 0 20px rgba(255, 255, 255, 0.3);
		animation: number-pulse 3s ease-in-out infinite;
		position: relative;
	}

	.qs-main-number::before {
		content: '';
		position: absolute;
		inset: -5px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(0, 255, 255, 0.4) 0%, transparent 70%);
		animation: ring-pulse 3s ease-in-out infinite;
		z-index: -1;
	}

	@keyframes number-pulse {
		0%, 100% {
			box-shadow:
				0 0 30px rgba(0, 255, 255, 0.6),
				0 0 60px rgba(0, 255, 255, 0.3),
				inset 0 0 20px rgba(255, 255, 255, 0.3);
			background-position: 0% 0%;
		}
		50% {
			box-shadow:
				0 0 40px rgba(0, 255, 255, 0.8),
				0 0 80px rgba(0, 255, 255, 0.4),
				inset 0 0 25px rgba(255, 255, 255, 0.4);
			background-position: 100% 100%;
		}
	}

	@keyframes ring-pulse {
		0%, 100% {
			transform: scale(1);
			opacity: 0.5;
		}
		50% {
			transform: scale(1.3);
			opacity: 0.8;
		}
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
		background: linear-gradient(135deg, rgba(10, 10, 20, 0.75), rgba(5, 5, 15, 0.7));
		backdrop-filter: blur(10px);
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

	/* ===== ARCADE CABINETS ===== */
	.arcade-cabinet {
		background: linear-gradient(180deg, #1a1a1f 0%, #0f0f14 40%, #08080c 100%);
		border: 3px solid #000;
		border-radius: 12px 12px 8px 8px;
		overflow: hidden;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		box-shadow:
			0 20px 60px rgba(0, 0, 0, 0.8),
			0 0 0 2px rgba(0, 255, 255, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	.arcade-cabinet:hover {
		transform: translateY(-10px);
		box-shadow:
			0 30px 80px rgba(0, 0, 0, 0.9),
			0 0 60px var(--game-color),
			0 0 0 2px var(--game-color),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	/* Top Marquee */
	.cabinet-marquee {
		background: linear-gradient(180deg, var(--game-color) 0%, rgba(0, 0, 0, 0.8) 100%);
		padding: 0.75rem;
		border-bottom: 2px solid rgba(0, 255, 255, 0.3);
		box-shadow:
			inset 0 -2px 10px rgba(0, 0, 0, 0.5),
			0 2px 8px var(--game-color);
	}

	.marquee-lights {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.marquee-light {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ffff00;
		box-shadow:
			0 0 10px #ffff00,
			0 0 20px #ffff00;
		animation: marquee-blink 1.5s ease-in-out infinite;
	}

	.marquee-light:nth-child(2) {
		animation-delay: 0.5s;
	}

	.marquee-light:nth-child(3) {
		animation-delay: 1s;
	}

	@keyframes marquee-blink {
		0%, 100% {
			opacity: 1;
			box-shadow:
				0 0 10px #ffff00,
				0 0 20px #ffff00;
		}
		50% {
			opacity: 0.3;
			box-shadow:
				0 0 5px #ffff00,
				0 0 10px #ffff00;
		}
	}

	/* Screen Bezel */
	.screen-bezel {
		padding: 1.5rem;
		background: linear-gradient(135deg, #2a2a2f, #1a1a1f);
		border-bottom: 3px solid #000;
		box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.8);
	}

	.screen-inner {
		aspect-ratio: 4/3;
		background: radial-gradient(circle at center, var(--game-color), #000 70%);
		border-radius: 8px;
		border: 4px solid #0a0a0f;
		box-shadow:
			0 0 40px var(--game-color),
			inset 0 0 60px rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		padding: 0.75rem;
	}

	.screen-content {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		transform: scale(0.83);
		transform-origin: center;
		gap: 0.35rem;
		z-index: 1;
	}

	/* CRT Effect */
	.crt-effect {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			0deg,
			rgba(0, 0, 0, 0.15) 0px,
			transparent 2px,
			transparent 4px
		);
		pointer-events: none;
		animation: crt-flicker 0.15s infinite;
	}

	@keyframes crt-flicker {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.95; }
	}

	.game-emoji {
		font-size: 3.2rem;
		filter:
			drop-shadow(0 0 20px var(--game-color))
			drop-shadow(0 0 40px var(--game-color));
		animation: emoji-float 3s ease-in-out infinite;
		z-index: 1;
	}

	@keyframes emoji-float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}

	.game-title {
		font-family: 'Orbitron', sans-serif;
		font-size: 1.1rem;
		font-weight: 900;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 2px;
		margin: 0.6rem 0 0.25rem;
		text-shadow:
			0 0 10px var(--game-color),
			0 0 20px var(--game-color),
			2px 2px 4px rgba(0, 0, 0, 0.8);
		z-index: 1;
		line-height: 1.1;
	}

	.title-line {
		display: block;
	}

	.game-players {
		font-family: 'Rajdhani', sans-serif;
		font-size: 0.75rem;
		font-weight: 700;
		color: #ffff00;
		text-shadow:
			0 0 8px #ffff00,
			0 0 16px #ffff00;
		margin: 0;
		z-index: 1;
	}

	/* Control Panel */
	.control-panel {
		background: linear-gradient(180deg, #1a1a1f, #0a0a0f);
		padding: 1.5rem;
		border-top: 2px solid rgba(0, 255, 255, 0.2);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}

	.insert-coin {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'Orbitron', sans-serif;
		animation: coin-blink 2s ease-in-out infinite;
	}

	@keyframes coin-blink {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.coin-icon {
		font-size: 1.5rem;
		animation: coin-spin 4s linear infinite;
	}

	@keyframes coin-spin {
		0%, 100% { transform: rotateY(0deg); }
		50% { transform: rotateY(180deg); }
	}

	.coin-text {
		font-size: 0.9rem;
		font-weight: 700;
		color: #ffff00;
		text-shadow:
			0 0 10px #ffff00,
			0 0 20px #ffff00;
		letter-spacing: 2px;
	}

	.start-button {
		display: inline-block;
		text-decoration: none;
		padding: 0.75rem 2rem;
		background: linear-gradient(180deg, #ff0000, #cc0000);
		border: 3px solid #8b0000;
		border-radius: 8px;
		color: #fff;
		font-family: 'Orbitron', sans-serif;
		font-size: 1.125rem;
		font-weight: 900;
		letter-spacing: 3px;
		cursor: pointer;
		box-shadow:
			0 4px 0 #660000,
			0 6px 20px rgba(255, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.3);
		transition: all 0.1s ease;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
	}

	.start-button:hover {
		background: linear-gradient(180deg, #ff3333, #ff0000);
		box-shadow:
			0 4px 0 #660000,
			0 6px 30px rgba(255, 0, 0, 0.8),
			inset 0 1px 0 rgba(255, 255, 255, 0.4);
		transform: translateY(-2px);
	}

	.start-button:active {
		transform: translateY(2px);
		box-shadow:
			0 2px 0 #660000,
			0 3px 10px rgba(255, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
	}

	/* Cabinet Bottom */
	.cabinet-bottom {
		height: 1rem;
		background: linear-gradient(180deg, #0a0a0f, #000);
		border-top: 1px solid rgba(0, 255, 255, 0.1);
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
		backdrop-filter: blur(10px);
		border: 1px solid rgba(0, 255, 255, 0.2);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	thead {
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(5px);
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
		background: transparent;
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
		backdrop-filter: blur(8px);
		border: 1px solid rgba(0, 255, 255, 0.3);
		border-radius: 1rem;
		padding: 2.5rem;
		transition: all 0.3s ease;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		min-width: 65vw;
		max-width: 65vw;
	}

	.how-card:hover {
		border-color: rgba(0, 255, 255, 0.8);
		background: linear-gradient(135deg, rgba(0, 255, 255, 0.08), rgba(255, 0, 255, 0.05));
		box-shadow:
			0 25px 70px rgba(0, 255, 255, 0.25),
			0 0 50px rgba(0, 255, 255, 0.2),
			inset 0 0 40px rgba(0, 255, 255, 0.05);
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
		background: transparent;
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
