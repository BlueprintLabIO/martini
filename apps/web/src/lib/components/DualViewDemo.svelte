<script lang="ts">
	import { onMount } from 'svelte';
	import Phaser from 'phaser';
	import { GameRuntime } from '@martini/core';
	import { LocalTransport } from '@martini/transport-local';
	import type { DemoGame } from '$lib/games';
	import { createFireAndIceConfig } from '$lib/games/fire-and-ice';
	import { createPaddleBattleConfig } from '$lib/games/paddle-battle';
	import { createArenaBlasterConfig } from '$lib/games/arena-blaster';
	import { createTileMatcherConfig } from '$lib/games/tile-matcher';
	import { createCircuitRacerConfig } from '$lib/games/circuit-racer';

	interface Props {
		game: DemoGame;
		accentColor?: string;
	}

	let { game, accentColor = '#00f5ff' }: Props = $props();

	let hostContainer: HTMLDivElement;
	let clientContainer: HTMLDivElement;
	let hostStatus = $state('Initializing...');
	let clientStatus = $state('Waiting for host...');
	let error = $state<string | null>(null);

	// Global keyboard state (shared across both Phaser instances)
	// Host uses WASD + Space, Client uses Arrow Keys + Enter
	const keyState = {
		host: {
			left: false,  // A
			right: false, // D
			up: false,    // W
			down: false,  // S
			shoot: false, // Space
		},
		client: {
			left: false,  // ArrowLeft
			right: false, // ArrowRight
			up: false,    // ArrowUp
			down: false,  // ArrowDown
			shoot: false, // Enter
		},
	};

	onMount(() => {
		const roomId = `demo-${game.id}-${Math.random().toString(36).substring(2, 8)}`;

		// Global keyboard listeners (works for both games!)
		const handleKeyDown = (e: KeyboardEvent) => {
			// Host controls (WASD)
			if (e.key === 'a' || e.key === 'A') {
				e.preventDefault();
				keyState.host.left = true;
			}
			if (e.key === 'd' || e.key === 'D') {
				e.preventDefault();
				keyState.host.right = true;
			}
			if (e.key === 'w' || e.key === 'W') {
				e.preventDefault();
				keyState.host.up = true;
			}
			if (e.key === 's' || e.key === 'S') {
				e.preventDefault();
				keyState.host.down = true;
			}
			if (e.key === ' ') { // Space
				e.preventDefault();
				keyState.host.shoot = true;
			}

			// Client controls (Arrow Keys) - Prevent default to stop page scrolling
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				keyState.client.left = true;
			}
			if (e.key === 'ArrowRight') {
				e.preventDefault();
				keyState.client.right = true;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				keyState.client.up = true;
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				keyState.client.down = true;
			}
			if (e.key === 'Enter') {
				e.preventDefault();
				keyState.client.shoot = true;
			}
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			// Host controls (WASD)
			if (e.key === 'a' || e.key === 'A') {
				e.preventDefault();
				keyState.host.left = false;
			}
			if (e.key === 'd' || e.key === 'D') {
				e.preventDefault();
				keyState.host.right = false;
			}
			if (e.key === 'w' || e.key === 'W') {
				e.preventDefault();
				keyState.host.up = false;
			}
			if (e.key === 's' || e.key === 'S') {
				e.preventDefault();
				keyState.host.down = false;
			}
			if (e.key === ' ') { // Space
				e.preventDefault();
				keyState.host.shoot = false;
			}

			// Client controls (Arrow Keys)
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				keyState.client.left = false;
			}
			if (e.key === 'ArrowRight') {
				e.preventDefault();
				keyState.client.right = false;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				keyState.client.up = false;
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				keyState.client.down = false;
			}
			if (e.key === 'Enter') {
				e.preventDefault();
				keyState.client.shoot = false;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		try {
			// Create Host instance with LocalTransport
			const hostTransport = new LocalTransport({
				roomId,
				isHost: true,
			});

			// Create Client instance with LocalTransport
			const clientTransport = new LocalTransport({
				roomId,
				isHost: false,
			});

			// Get both player IDs to initialize both runtimes
			const hostPlayerId = hostTransport.getPlayerId();
			const clientPlayerId = clientTransport.getPlayerId();

			const hostRuntime = new GameRuntime(game.gameLogic, hostTransport, {
				isHost: true,
				playerIds: [hostPlayerId, clientPlayerId],
			});

			hostStatus = 'Host Ready';

			const clientRuntime = new GameRuntime(game.gameLogic, clientTransport, {
				isHost: false,
				playerIds: [hostPlayerId, clientPlayerId],
			});

			clientStatus = 'Connected';
			console.log('Peers connected instantly!', {
				hostPeers: hostTransport.getPeerIds(),
				clientPeers: clientTransport.getPeerIds(),
			});

			createPhaserGame('host', hostContainer, hostRuntime, hostTransport);
			createPhaserGame('client', clientContainer, clientRuntime, clientTransport);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to initialize demo';
			console.error('Demo initialization error:', err);
		}

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	});

	function createPhaserGame(
		role: 'host' | 'client',
		container: HTMLDivElement,
		runtime: GameRuntime,
		transport: LocalTransport
	) {
		const playerId = transport.getPlayerId();
		const isHost = role === 'host';
		const config = getGameConfig(game.id, container, runtime, transport, isHost, playerId, role);
		new Phaser.Game(config);
	}

	function getGameConfig(
		gameId: string,
		container: HTMLDivElement,
		runtime: GameRuntime,
		transport: LocalTransport,
		isHost: boolean,
		playerId: string,
		role: 'host' | 'client'
	): Phaser.Types.Core.GameConfig {
		switch (gameId) {
			case 'fire-and-ice':
				return createFireAndIceConfig(container, runtime, transport, isHost, playerId, role, keyState);
			case 'paddle-battle':
				return createPaddleBattleConfig(container, runtime, transport, isHost, playerId, role, keyState);
			case 'arena-blaster':
				return createArenaBlasterConfig(container, runtime, transport, isHost, playerId, role, keyState);
			case 'tile-matcher':
				return createTileMatcherConfig(container, runtime, transport, isHost, playerId, role, keyState);
			case 'circuit-racer':
				return createCircuitRacerConfig(container, runtime, transport, isHost, playerId, role, keyState);
			default:
				return {
					type: Phaser.AUTO,
					width: 800,
					height: 600,
					parent: container,
					backgroundColor: '#0d1117',
					scene: {
						create: function (this: Phaser.Scene) {
							this.add
								.text(400, 300, `${gameId}\n(Demo implementation coming soon)`, {
									fontSize: '24px',
									color: '#ffffff',
									align: 'center',
								})
								.setOrigin(0.5);
						},
					},
				};
		}
	}

	const hostLegend = ['W / A / S / D — Movement', 'Space — Primary action'];
	const clientLegend = ['Arrow Keys — Movement', 'Enter — Primary action'];
</script>

<div class="dual-view-shell" style={`--accent: ${accentColor};`}>
	<div class="shell-glow"></div>
	<div class="shell-grid"></div>

	{#if error}
		<div class="error-banner">
			<p>{error}</p>
		</div>
	{/if}

	<div class="shell-header">
		<div>
			<p class="eyebrow">Dual-runtime showcase</p>
			<h2>{game.name} playground</h2>
		</div>
		<span class="runtime-pill">Local transport</span>
	</div>

	<div class="dual-grid">
		<section class="player-panel host">
			<header class="panel-header">
				<div>
					<p class="label">Player 1</p>
					<h3>Host runtime</h3>
				</div>
				<span class="status-chip {hostStatus === 'Host Ready' ? 'online' : ''}">{hostStatus}</span>
			</header>
			<div bind:this={hostContainer} class="game-container"></div>
			<footer class="panel-footer">
				<p>Authoritative state + game loop</p>
				<span>WASD + Space</span>
			</footer>
		</section>

		<section class="player-panel client">
			<header class="panel-header">
				<div>
					<p class="label">Player 2</p>
					<h3>Client runtime</h3>
				</div>
				<span class="status-chip {clientStatus === 'Connected' ? 'online' : ''}">{clientStatus}</span>
			</header>
			<div bind:this={clientContainer} class="game-container"></div>
			<footer class="panel-footer">
				<p>Input prediction + rendering</p>
				<span>Arrows + Enter</span>
			</footer>
		</section>
	</div>

	<div class="legend-grid">
		<div class="legend-card">
			<p class="legend-title">Host controls</p>
			<ul>
				{#each hostLegend as item}
					<li>{item}</li>
				{/each}
			</ul>
		</div>
		<div class="legend-card">
			<p class="legend-title">Client controls</p>
			<ul>
				{#each clientLegend as item}
					<li>{item}</li>
				{/each}
			</ul>
		</div>
	</div>
</div>

<style>
	.dual-view-shell {
		position: relative;
		padding: clamp(1.5rem, 3vw, 2.5rem);
		border-radius: 32px;
		background:
			radial-gradient(circle at top, color-mix(in srgb, var(--accent) 25%, transparent) 0%, transparent 55%),
			rgba(4, 7, 19, 0.95);
		border: 1px solid rgba(148, 163, 184, 0.2);
		box-shadow:
			0 10px 60px rgba(0, 0, 0, 0.6),
			0 0 80px color-mix(in srgb, var(--accent) 35%, transparent);
		overflow: hidden;
	}

	.shell-glow,
	.shell-grid {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;
	}

	.shell-glow {
		background:
			radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent) 45%, transparent), transparent 55%),
			radial-gradient(circle at 80% 30%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 50%);
		filter: blur(40px);
		opacity: 0.5;
	}

	.shell-grid {
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
		background-size: 40px 40px;
		opacity: 0.25;
	}

	.error-banner {
		position: relative;
		z-index: 1;
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.4);
		padding: 0.75rem 1rem;
		border-radius: 12px;
		color: #fecaca;
		margin-bottom: 1.5rem;
	}

	.shell-header {
		position: relative;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-size: 0.75rem;
		color: rgba(148, 163, 184, 0.8);
		margin: 0 0 0.35rem 0;
	}

	h2 {
		margin: 0;
		font-size: clamp(1.5rem, 3vw, 2.5rem);
		color: #f8fafc;
	}

	.runtime-pill {
		padding: 0.35rem 0.85rem;
		border-radius: 999px;
		border: 1px solid rgba(148, 163, 184, 0.4);
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(226, 232, 240, 0.8);
	}

	.dual-grid {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: clamp(1rem, 2vw, 1.75rem);
	}

	.player-panel {
		background: rgba(15, 23, 42, 0.75);
		border: 1px solid rgba(148, 163, 184, 0.3);
		border-radius: 24px;
		padding: 1.5rem;
		box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.08);
		backdrop-filter: blur(12px);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.panel-header h3 {
		margin: 0;
		font-size: 1.3rem;
	}

	.label {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		font-size: 0.7rem;
		color: rgba(148, 163, 184, 0.9);
	}

	.status-chip {
		font-size: 0.85rem;
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		border: 1px solid rgba(148, 163, 184, 0.3);
		color: rgba(248, 250, 252, 0.8);
	}

	.status-chip.online {
		border-color: color-mix(in srgb, var(--accent) 60%, transparent);
		color: #0f172a;
		background: color-mix(in srgb, var(--accent) 75%, #ffffff 5%);
	}

	.game-container {
		aspect-ratio: 4 / 3;
		border-radius: 18px;
		background:
			linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(2, 6, 23, 0.95));
		border: 1px solid rgba(148, 163, 184, 0.2);
		overflow: hidden;
		position: relative;
	}

	.game-container :global(canvas) {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		max-width: 100%;
		max-height: 100%;
	}

	.panel-footer {
		margin-top: 1rem;
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: rgba(226, 232, 240, 0.75);
	}

	.legend-grid {
		position: relative;
		z-index: 1;
		margin-top: 2rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.legend-card {
		background: rgba(15, 23, 42, 0.7);
		border: 1px solid rgba(148, 163, 184, 0.25);
		border-radius: 18px;
		padding: 1rem 1.25rem;
		color: rgba(226, 232, 240, 0.85);
	}

	.legend-title {
		margin: 0 0 0.35rem 0;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(148, 163, 184, 0.9);
	}

	.legend-card ul {
		margin: 0;
		padding-left: 1.1rem;
		line-height: 1.7;
	}

	.legend-card li {
		margin: 0.1rem 0;
	}

	@media (max-width: 768px) {
		.panel-footer {
			flex-direction: column;
			gap: 0.4rem;
		}
	}
</style>
