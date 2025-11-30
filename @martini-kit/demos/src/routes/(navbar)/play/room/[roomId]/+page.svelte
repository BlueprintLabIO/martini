<script lang="ts">
	import { onMount } from "svelte";
	import GamePreview from "../../../../../../../ide/src/lib/components/GamePreview.svelte";
	import { VirtualFileSystem } from "../../../../../../../ide/src/lib/core/VirtualFS.js";
	import { gameMetadata, getIDEConfig } from "$lib/games/ide-configs-map";
	import { page } from "$app/stores";

	type ConnectionStatus = "disconnected" | "connecting" | "connected";

	const curatedGameIds = Object.keys(gameMetadata);
	const defaultGame = curatedGameIds[0] ?? "";

	const roomId = $derived.by(() => $page.params.roomId);
	const selectedGameId = $derived.by(() => {
		const requestedGame = $page.url.searchParams.get("game");
		return requestedGame && curatedGameIds.includes(requestedGame)
			? requestedGame
			: defaultGame;
	});

	let vfs = $state<VirtualFileSystem | null>(null);
	let vfsVersion = $state(0);
	let entryPoint = $state("/src/game.ts");
	const role = $derived.by(() =>
		$page.url.searchParams.get("role") === "host" ? "host" : "client",
	);
	let shareUrl = $state("");
	let connectionStatus = $state<ConnectionStatus>("disconnected");
	let statusMessage = $state<string | null>(null);

	const transportOptions = $state({
		appId: "martini-kit-play",
	});

	function loadGame(gameId: string) {
		const config = getIDEConfig(gameId);
		if (!config) {
			statusMessage = "This game is not ready for play yet.";
			vfs = null;
			return;
		}
		vfs = new VirtualFileSystem(config.files);
		vfsVersion += 1;
		entryPoint = config.files["/src/main.ts"]
			? "/src/main.ts"
			: "/src/game.ts";
		statusMessage = null;
	}

	function updateShareLink() {
		if (typeof window === "undefined") return;
		const url = new URL(window.location.href);
		url.searchParams.set("game", selectedGameId);
		url.searchParams.delete("role"); // share link should make others clients
		shareUrl = url.toString();
	}

	onMount(() => {
		loadGame(selectedGameId);
		connectionStatus = "connecting";
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
			<div class="left-group">
				<a class="back-btn" href="/play" aria-label="Back to games">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
					>
				</a>
				<div class="room-info">
					<span class="code">{roomId}</span>
					<span class="divider">/</span>
					<span class="game-title"
						>{gameMetadata[selectedGameId]?.title ??
							selectedGameId}</span
					>
				</div>
			</div>
			<div class="top-actions">
				<button
					class="ghost compact"
					onclick={() => navigator.clipboard?.writeText(shareUrl)}
					disabled={!shareUrl}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><rect
							width="14"
							height="14"
							x="8"
							y="8"
							rx="2"
							ry="2"
						/><path
							d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
						/></svg
					>
					Copy Link
				</button>
			</div>
		</header>

		<div class="main">
			{#if statusMessage}
				<div class="notice">{statusMessage}</div>
			{/if}

			{#if vfs}
				<div class="preview-shell">
					<GamePreview
						{vfs}
						{vfsVersion}
						{entryPoint}
						{role}
						{roomId}
						transportType="trystero"
						{transportOptions}
						minPlayers={2}
						bind:connectionStatus
						hideDevTools={true}
						enableDevTools={false}
					/>
				</div>
			{:else}
				<div class="placeholder">
					Game is unavailable. Return to /play and choose another.
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.room-page {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-page);
		color: var(--text);
		padding: 0.5rem;
		box-sizing: border-box;
	}

	.page-container {
		width: 100%;
		height: 100%;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		border: 1px solid var(--border);
		background: #ffffff;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
		flex: none;
	}

	.left-group {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
		transition: color 0.15s;
		padding: 0.25rem;
	}

	.back-btn:hover {
		color: var(--text);
	}

	.room-info {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-family: "Space Grotesk", sans-serif;
	}

	.code {
		font-weight: 700;
		font-size: 1.1rem;
		letter-spacing: -0.02em;
	}

	.divider {
		color: var(--border-strong);
		font-size: 1.1rem;
	}

	.game-title {
		color: var(--muted);
		font-weight: 500;
		font-size: 0.95rem;
	}

	.ghost {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid var(--border);
		color: var(--muted-2);
		background: #ffffff;
		border-radius: 8px;
		padding: 0.4rem 0.8rem;
		cursor: pointer;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.85rem;
		transition: all 0.15s ease;
	}

	.ghost:hover {
		border-color: var(--border-strong);
		color: var(--text);
		background: #f8fafc;
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
		width: 100%;
		height: calc(100vh - 100px);
		min-height: 400px;
		background: #0b1220;
		border-radius: 12px;
		border: 1px solid var(--border);
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
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
	}

	.top-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}
</style>
