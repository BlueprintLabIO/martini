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
			</div>
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
		background: var(--bg-page);
		color: var(--text);
		overflow: hidden;
	}

	header {
		padding: 1rem 1.25rem 0.75rem;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(245, 249, 255, 0.85));
		border-bottom: 1px solid transparent;
		position: relative;
		z-index: 100;
		box-shadow: none;
	}

	.header-content {
		position: relative;
		max-width: 1600px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
		padding: 1rem 1.25rem;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 246, 255, 0.9));
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		backdrop-filter: blur(12px);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
	}

	.title-section {
		flex: 1;
	}

	header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 1.65rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	header p {
		margin: 0;
		color: var(--muted);
		font-size: 0.97rem;
		line-height: 1.5;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-shrink: 0;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1rem;
		border-radius: 12px;
		font-weight: 600;
		border: 1px solid var(--border-strong);
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(245, 248, 255, 0.9));
		color: var(--text);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
		text-decoration: none;
	}

	.btn-secondary {
		background: linear-gradient(135deg, #2563eb, #0ea5e9);
		color: #fff;
		border-color: transparent;
		box-shadow: 0 12px 22px rgba(37, 99, 235, 0.22);
	}

	.btn-secondary:hover {
		transform: translateY(-1px);
		box-shadow: 0 16px 28px rgba(37, 99, 235, 0.24);
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
		top: calc(100% + 0.65rem);
		right: 1.25rem;
		background: rgba(255, 255, 255, 0.96);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		padding: 1.5rem;
		width: min(520px, calc(100% - 2.5rem));
		box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
		backdrop-filter: blur(10px);
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
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		font-family: monospace;
		font-size: 0.85rem;
	}

	.share-hint {
		margin: 0 0 1rem 0;
		color: var(--muted);
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
		background: var(--bg-page);
		color: var(--text);
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
		color: var(--muted);
		margin: 0 0 2rem 0;
	}

	.error-page .btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: rgba(255, 255, 255, 0.06);
		color: var(--text);
		border-radius: 10px;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.2s;
		border: 1px solid var(--border);
	}

	.error-page .btn:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: var(--border-strong);
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

		.actions .btn {
			flex: 1;
		}

		.share-menu {
			max-width: calc(100vw - 2.5rem);
			right: 1rem;
		}
	}
</style>
