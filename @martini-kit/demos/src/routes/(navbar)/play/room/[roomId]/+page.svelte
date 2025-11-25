<script lang="ts">
	import { onMount } from 'svelte';
	import GamePreview from '../../../../../../../ide/src/lib/components/GamePreview.svelte';
	import { VirtualFileSystem } from '../../../../../../../ide/src/lib/core/VirtualFS.js';
	import { gameMetadata, getIDEConfig } from '$lib/games/ide-configs-map';
	import { page } from '$app/stores';

	type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

	const curatedGameIds = Object.keys(gameMetadata);
	const defaultGame = curatedGameIds[0] ?? '';

	const roomId = $derived.by(() => $page.params.roomId);
	const selectedGameId = $derived.by(() => {
		const requestedGame = $page.url.searchParams.get('game');
		return requestedGame && curatedGameIds.includes(requestedGame) ? requestedGame : defaultGame;
	});

	let vfs = $state<VirtualFileSystem | null>(null);
	let vfsVersion = $state(0);
	let entryPoint = $state('/src/game.ts');
	const role = $derived.by(() => ($page.url.searchParams.get('role') === 'host' ? 'host' : 'client'));
	let shareUrl = $state('');
	let connectionStatus = $state<ConnectionStatus>('disconnected');
	let statusMessage = $state<string | null>(null);

	const transportOptions = $state({
		appId: 'martini-kit-play'
	});

	function loadGame(gameId: string) {
		const config = getIDEConfig(gameId);
		if (!config) {
			statusMessage = 'This game is not ready for play yet.';
			vfs = null;
			return;
		}
		vfs = new VirtualFileSystem(config.files);
		vfsVersion += 1;
		entryPoint = config.files['/src/main.ts'] ? '/src/main.ts' : '/src/game.ts';
		statusMessage = null;
	}

	function updateShareLink() {
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		url.searchParams.set('game', selectedGameId);
		url.searchParams.delete('role'); // share link should make others clients
		shareUrl = url.toString();
	}

	onMount(() => {
		loadGame(selectedGameId);
		connectionStatus = 'connecting';
		updateShareLink();
	});

	$effect(() => {
		updateShareLink();
	});
</script>

<svelte:head>
	<title>Room {roomId} - martini-kit</title>
	<link rel="icon" type="image/png" href="/image.png" />
</svelte:head>

<div class="room-page">
	<div class="page-container">
		<header class="topbar">
			<div>
				<p class="eyebrow">Room</p>
				<h1>{roomId}</h1>
				<p class="label">
					Game: {gameMetadata[selectedGameId]?.title ?? selectedGameId} — Role: {role === 'host' ? 'Host' : 'Client'}
				</p>
			</div>
			<div class="top-actions">
				<div class="share">
					<input value={shareUrl} readonly />
					<button class="ghost" onclick={() => navigator.clipboard?.writeText(shareUrl)} disabled={!shareUrl}>
						Copy link
					</button>
				</div>
				<a class="ghost" href="/play">Back to games</a>
			</div>
		</header>

		<div class="main">
			<div class="status-row">
				<div class="status-badge {connectionStatus}">
					{connectionStatus}
				</div>
				{#if statusMessage}
					<div class="notice">{statusMessage}</div>
				{/if}
			</div>

			{#if vfs}
				<div class="preview-shell">
					<GamePreview
						{vfs}
						{vfsVersion}
						{entryPoint}
						{role}
						roomId={roomId}
						transportType="trystero"
						transportOptions={transportOptions}
						minPlayers={2}
						bind:connectionStatus
						hideDevTools={true}
						enableDevTools={false}
					/>
				</div>
			{:else}
				<div class="placeholder">Game is unavailable. Return to /play and choose another.</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.room-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg-page);
		color: var(--text);
		padding: 2rem 1.25rem 2.5rem;
		overflow: auto;
	}

	.page-container {
		max-width: 1280px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.2rem 1.4rem;
		border: 1px solid var(--border);
		background: #ffffff;
		gap: 1.1rem;
		border-radius: 16px;
		box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
	}

	.main {
		flex: 1;
		padding: 0.25rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.eyebrow {
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #a5b4fc;
		font-weight: 700;
		font-size: 0.8rem;
		margin: 0;
	}

	.label {
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.share {
		display: flex;
		gap: 0.5rem;
		padding: 0.35rem;
		background: #f8fafc;
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
	}

	input {
		border-radius: 10px;
		border: 1px solid var(--border);
		background: #ffffff;
		color: var(--text);
		padding: 0.65rem 0.8rem;
		min-width: 320px;
		width: 100%;
	}

	.ghost {
		border: 1px solid var(--border);
		color: var(--muted-2);
		background: #ffffff;
		border-radius: 10px;
		padding: 0.6rem 0.9rem;
		cursor: pointer;
		text-decoration: none;
		font-weight: 600;
		transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
		box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
	}

	.ghost:hover {
		border-color: var(--border-strong);
		color: var(--text);
		transform: translateY(-1px);
	}

	.status-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.status-badge {
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		text-transform: capitalize;
		font-weight: 700;
		font-size: 0.9rem;
		border: 1px solid var(--border);
		background: #ffffff;
	}

	.status-badge.connecting {
		color: #854d0e;
		background: #fef3c7;
	}

	.status-badge.connected {
		color: #166534;
		background: #dcfce7;
	}

	.status-badge.disconnected {
		color: #b91c1c;
		background: #fee2e2;
	}

	.notice {
		border: 1px solid rgba(248, 113, 113, 0.35);
		color: #991b1b;
		background: #fff1f2;
		padding: 0.5rem 0.75rem;
		border-radius: 10px;
		font-weight: 600;
	}

	.preview-shell {
		height: calc(100vh - 240px);
		min-height: 520px;
		background: #0b1220;
		border-radius: 16px;
		border: 1px solid var(--border);
		overflow: hidden;
		box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16);
	}

	.placeholder {
		padding: 2rem;
		border: 1px dashed var(--border);
		border-radius: 12px;
		text-align: center;
		color: var(--muted);
		background: #ffffff;
	}

	@media (max-width: 960px) {
		.topbar {
			flex-direction: column;
			align-items: flex-start;
		}
		.top-actions {
			width: 100%;
		}

		.share {
			width: 100%;
		}

		.share input {
			min-width: 0;
		}
	}

	.top-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}
</style>
