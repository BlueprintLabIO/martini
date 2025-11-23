<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import MartiniIDE from '@martini-kit/ide';
	import { getIDEConfig, getGameMetadata } from '$lib/games/ide-configs-map';
	import type { MartiniKitIDEConfig } from '@martini-kit/ide';

	const gameId = $derived($page.params.gameId || '');
	const originalConfig = $derived(getIDEConfig(gameId));
	const metadata = $derived(getGameMetadata(gameId));

	let config = $state<MartiniKitIDEConfig | null>(null);
	let showShareMenu = $state(false);
	let shareUrl = $state('');
	let copied = $state(false);
	let LZ: any = null;

	onMount(async () => {
		// Load LZ library for compression
		if (typeof window !== 'undefined' && !(window as any).LZ) {
			const script = document.createElement('script');
			script.src = 'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js';
			script.onload = () => {
				LZ = (window as any).LZ;
				loadGameWithState();
			};
			document.head.appendChild(script);
		} else {
			LZ = (window as any).LZ;
			loadGameWithState();
		}
	});

	function loadGameWithState() {
		if (originalConfig) {
			config = structuredClone(originalConfig);

			// Check if URL has encoded state
			const params = new URLSearchParams(window.location.search);
			const encodedState = params.get('code');

			if (encodedState && LZ) {
				try {
					const decoded = decodeURIComponent(encodedState);
					const decompressed = LZ.decompress(decoded);
					const state = JSON.parse(decompressed);

					// Merge with original config
					if (config) {
						config.files = { ...config.files, ...state.files };
					}
				} catch (e) {
					console.warn('Failed to decode shared code:', e);
				}
			}
		}
	}

	function getShareUrl() {
		if (!config || !LZ) return '';

		try {
			const state = {
				files: config.files
			};
			const json = JSON.stringify(state);
			const compressed = LZ.compress(json);
			const encoded = encodeURIComponent(compressed);
			const url = `${window.location.origin}/preview/${gameId}?code=${encoded}`;
			return url;
		} catch (e) {
			console.error('Failed to create share URL:', e);
			return '';
		}
	}

	function handleShare() {
		shareUrl = getShareUrl();
		showShareMenu = true;
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(shareUrl);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	function downloadCode() {
		if (!config) return;

		const JSZip = (window as any).JSZip;
		if (!JSZip) {
			alert('JSZip library not loaded yet. Please wait a moment and try again.');
			return;
		}

		const zip = new JSZip();
		for (const [path, content] of Object.entries(config.files)) {
			const filePath = path.startsWith('/') ? path.substring(1) : path;
			zip.file(filePath, content as string);
		}

		zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
			const url = URL.createObjectURL(content);
			const a = document.createElement('a');
			a.href = url;
			a.download = `martini-kit-${gameId}-${Date.now()}.zip`;
			a.click();
			URL.revokeObjectURL(url);
		});
	}

	function resetToOriginal() {
		if (originalConfig) {
			config = structuredClone(originalConfig);
			window.history.pushState({}, '', `/preview/${gameId}`);
		}
	}
</script>

<svelte:head>
	<title>{metadata?.title || 'Game Preview'} - martini-kit</title>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
</svelte:head>

{#if config && metadata}
	<div class="demo-page">
		<header>
			<div class="header-content">
				<div class="title-section">
					<h1>{metadata.title}</h1>
					<p>{metadata.description}</p>
				</div>

				<div class="actions">
					<button class="btn btn-secondary" onclick={downloadCode} title="Download as ZIP">
						↓ Download
					</button>
				</div>
			</div>

			{#if showShareMenu}
				<div class="share-menu">
					<div class="share-content">
						<h3>Share Your Code</h3>
						<div class="share-input-group">
							<input type="text" value={shareUrl} readonly class="share-input" />
							<button class="btn btn-small" onclick={copyToClipboard}>
								{copied ? '✓ Copied' : 'Copy'}
							</button>
						</div>
						<p class="share-hint">
							Share this link to let others see and modify your code. Changes won't affect your original.
						</p>
						<button class="btn btn-close" onclick={() => (showShareMenu = false)}>
							Close
						</button>
					</div>
				</div>
			{/if}
		</header>

		<div class="ide-container">
			<MartiniIDE {config} />
		</div>
	</div>
{:else}
	<div class="error-page">
		<div class="container">
			<h1>Game Not Found</h1>
			<p>The game "{gameId}" does not have a preview available.</p>
			<a href="/" class="btn">Back to Home</a>
		</div>
	</div>
{/if}

<style>
	.demo-page {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: #0a0a0a;
		color: #fff;
		overflow: hidden;
	}

	header {
		padding: 1.5rem;
		background: linear-gradient(180deg, #1e1e1e 0%, #0a0a0a 100%);
		border-bottom: 1px solid #333;
		position: relative;
		z-index: 100;
	}

	.header-content {
		max-width: 1600px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
	}

	.title-section {
		flex: 1;
	}

	header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	header p {
		margin: 0;
		color: #888;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-shrink: 0;
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 600;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
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
		border: 1px solid #444;
	}

	.btn-secondary:hover {
		background: #333;
		border-color: #555;
	}

	.btn-small {
		padding: 0.375rem 0.75rem;
		font-size: 0.85rem;
		background: #4a9eff;
		color: #fff;
	}

	.btn-small:hover {
		background: #6ab0ff;
	}

	.btn-close {
		padding: 0.5rem 1.5rem;
		background: #262626;
		color: #fff;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
	}

	.btn-close:hover {
		background: #333;
	}

	.share-menu {
		position: absolute;
		top: 100%;
		right: 0;
		background: #262626;
		border: 1px solid #444;
		border-radius: 8px;
		margin-top: 0.5rem;
		padding: 1.5rem;
		width: 100%;
		max-width: 500px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		z-index: 1000;
	}

	.share-content h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1rem;
	}

	.share-input-group {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.share-input {
		flex: 1;
		padding: 0.5rem;
		background: #1a1a1a;
		border: 1px solid #444;
		border-radius: 6px;
		color: #fff;
		font-family: monospace;
		font-size: 0.85rem;
	}

	.share-hint {
		margin: 0 0 1rem 0;
		color: #888;
		font-size: 0.85rem;
		line-height: 1.5;
	}

	header p :global(strong) {
		color: #4a9eff;
	}

	header p :global(code) {
		background: #1e1e1e;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.95em;
	}

	.ide-container {
		flex: 1;
		min-height: 0;
	}

	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		background: #0a0a0a;
		color: #fff;
	}

	.container {
		max-width: 600px;
		padding: 2rem;
	}

	.error-page h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
	}

	.error-page p {
		font-size: 1.125rem;
		color: #888;
		margin: 0 0 2rem 0;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: #171717;
		color: white;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.2s;
		border: 1px solid #333;
	}

	.error-page .btn:hover {
		background: #262626;
		border-color: #444;
	}

	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			gap: 1rem;
		}

		header h1 {
			font-size: 1.25rem;
		}

		.actions {
			width: 100%;
		}

		.btn {
			flex: 1;
		}

		.share-menu {
			max-width: calc(100vw - 2rem);
		}
	}
</style>
