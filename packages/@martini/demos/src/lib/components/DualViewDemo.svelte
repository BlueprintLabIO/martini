<script lang="ts">
	import { onMount } from 'svelte';
	import Phaser from 'phaser';
	import { GameRuntime } from '@martini/core';
	import { LocalTransport } from '@martini/transport-local';
	import type { DemoGame } from '$lib/games';
	import { createBlobBattleConfig } from '$lib/games/blob-battle';
	import { createFireAndIceConfig } from '$lib/games/fire-and-ice';
	import { createPaddleBattleConfig } from '$lib/games/paddle-battle';
	import { createArenaBlasterConfig } from '$lib/games/arena-blaster';
	import { createTileMatcherConfig } from '$lib/games/tile-matcher';
	import { createCircuitRacerConfig } from '$lib/games/circuit-racer';

	interface Props {
		game: DemoGame;
	}

	let { game }: Props = $props();

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
			// This is CRITICAL for host-authoritative architecture:
			// Both runtimes need to know about ALL players from the start
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

			// With LocalTransport, peers are instantly connected!
			clientStatus = 'Connected';
			console.log('Peers connected instantly!', {
				hostPeers: hostTransport.getPeerIds(),
				clientPeers: clientTransport.getPeerIds(),
			});

			// Create Phaser games using game-specific configs
			createPhaserGame('host', hostContainer, hostRuntime, hostTransport);
			createPhaserGame('client', clientContainer, clientRuntime, clientTransport);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to initialize demo';
			console.error('Demo initialization error:', err);
		}

		return () => {
			// Cleanup keyboard listeners
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

		// Get game-specific Phaser config
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
		// Each game provides its own complete config
		switch (gameId) {
			case 'blob-battle':
				// Uses shared keyState for dual-view controls
				return createBlobBattleConfig(container, runtime, keyState);
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
				// Default placeholder
				return {
					type: Phaser.AUTO,
					width: 800,
					height: 600,
					parent: container,
					backgroundColor: '#f8f9fa',
					scene: {
						create: function (this: Phaser.Scene) {
							this.add
								.text(400, 300, `${gameId}\n(Demo implementation coming soon)`, {
									fontSize: '24px',
									color: '#000000',
									align: 'center',
								})
								.setOrigin(0.5);
						},
					},
				};
		}
	}
</script>

<div class="dual-view-container">
	{#if error}
		<div class="error-banner">
			<p>{error}</p>
		</div>
	{/if}

	<div class="game-views">
		<div class="player-view">
			<div class="view-header">
				<h3>Player 1 (Host)</h3>
				<span class="status {hostStatus === 'Host Ready' ? 'ready' : ''}">{hostStatus}</span>
			</div>
			<div bind:this={hostContainer} class="game-container"></div>
		</div>

		<div class="player-view">
			<div class="view-header">
				<h3>Player 2 (Client)</h3>
				<span class="status {clientStatus === 'Connected' ? 'ready' : ''}">{clientStatus}</span>
			</div>
			<div bind:this={clientContainer} class="game-container"></div>
		</div>
	</div>
</div>

<style>
	.dual-view-container {
		width: 100%;
		max-width: 1800px;
		margin: 0 auto;
	}

	.error-banner {
		background: #fee;
		border: 1px solid #fcc;
		padding: 1rem;
		margin-bottom: 1rem;
		border-radius: 8px;
		color: #c00;
	}

	.game-views {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	@media (max-width: 1400px) {
		.game-views {
			grid-template-columns: 1fr;
		}
	}

	.player-view {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.view-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.view-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.status {
		font-size: 0.875rem;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		background: #f3f4f6;
		color: #6b7280;
		font-weight: 500;
	}

	.status.ready {
		background: #dcfce7;
		color: #166534;
	}

	.game-container {
		width: 100%;
		aspect-ratio: 4 / 3;
		background: #f8f9fa;
		border-radius: 8px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.game-container :global(canvas) {
		max-width: 100%;
		max-height: 100%;
	}
</style>
