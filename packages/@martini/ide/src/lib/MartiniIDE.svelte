<script lang="ts">
	import { onMount } from 'svelte';
	import { PaneGroup, Pane, PaneResizer } from 'paneforge';
	import CodeEditor from './components/CodeEditor.svelte';
	import GamePreview from './components/GamePreview.svelte';
	import { VirtualFileSystem } from './core/VirtualFS';
	import { Bundler } from './core/Bundler';
	import { TypeScriptEnvironment } from './core/TypeScriptEnv';
	import { PhaserEngine } from './adapters/PhaserEngine';
	import { IframeBridgeRelay } from '@martini/transport-iframe-bridge';
	import type { MartiniIDEConfig } from './types';

	interface Props {
		config: MartiniIDEConfig;
	}

	let { config }: Props = $props();

	// Core systems
	let vfs: VirtualFileSystem;
	let bundler: Bundler;
	let tsEnv: TypeScriptEnvironment;
	let engine = new PhaserEngine();
	let relay: IframeBridgeRelay | null = null;

	// State
	let activeFile = $state<string>('/src/game.ts');
	let activeFileContent = $state<string>('');
	let bundledCode = $state<string>('');
	let isInitializing = $state(true);
	let isBundling = $state(false);
	let errors = $state<string[]>([]);
	let filePaths = $state<string[]>([]);

	onMount(async () => {
		// Initialize IframeBridgeRelay if using iframe-bridge transport
		if (config.transport.type === 'iframe-bridge') {
			relay = new IframeBridgeRelay();
		}

		// Initialize core systems
		vfs = new VirtualFileSystem(config.files);
		bundler = new Bundler();
		// tsEnv = new TypeScriptEnvironment(); // TODO: Phase 1 - Skip TS type checking (needs lib files)

		// Initialize bundler (esbuild-wasm)
		await bundler.initialize();

		// TODO: Phase 1 - Skip TypeScript environment (requires fetching lib.d.ts files from CDN)
		// This will be enabled in Phase 2 with proper lib file loading
		// await tsEnv.initialize(vfs);

		// Get file list
		filePaths = vfs.getFilePaths();

		// Open first file
		if (filePaths.length > 0) {
			activeFile = filePaths[0];
			activeFileContent = vfs.readFile(activeFile) || '';
		}

		isInitializing = false;

		// Initial bundle
		await handleBundle();

		// Cleanup on unmount
		return () => {
			relay?.destroy();
		};
	});

	/**
	 * Handle file content change
	 */
	async function handleFileChange(newContent: string) {
		// Update VFS
		vfs.writeFile(activeFile, newContent);

		// TODO: Phase 1 - Skip TypeScript type checking
		// tsEnv?.updateFile(activeFile, newContent);

		// Notify parent
		config.onChange?.(vfs.getAllFiles());

		// Debounced bundle
		await handleBundle();
	}

	/**
	 * Bundle files
	 */
	async function handleBundle() {
		isBundling = true;
		errors = [];

		try {
			// Find entry point (main.ts or game.ts)
			const entryPoint = vfs.exists('/src/main.ts') ? '/src/main.ts' : '/src/game.ts';

			// Bundle
			const result = await bundler.bundle(vfs, entryPoint, engine.getGlobals());

			if (result.errors.length > 0) {
				errors = result.errors.map((e) => e.message);
				config.onError?.({
					type: 'syntax',
					message: result.errors[0].message
				});
			} else {
				bundledCode = result.code;
				config.onReady?.();
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown bundling error';
			errors = [message];
			config.onError?.({
				type: 'syntax',
				message
			});
		} finally {
			isBundling = false;
		}
	}

	/**
	 * Handle file selection
	 */
	function selectFile(path: string) {
		activeFile = path;
		activeFileContent = vfs.readFile(path) || '';
	}

	/**
	 * Run game (re-bundle and reload)
	 */
	async function runGame() {
		await handleBundle();
		config.onRun?.();
	}
</script>

<div class="martini-ide">
	{#if isInitializing}
		<div class="loading">
			<p>Initializing IDE...</p>
		</div>
	{:else}
		<PaneGroup direction="horizontal" class="ide-pane-group">
			<!-- Sidebar -->
			<Pane defaultSize={15} minSize={10} class="sidebar-pane">
				<div class="sidebar">
					<h3>Files</h3>
					<ul class="file-list">
						{#each filePaths as path}
							<li class:active={path === activeFile}>
								<button onclick={() => selectFile(path)}>
									{path.split('/').pop()}
								</button>
							</li>
						{/each}
					</ul>

					<button class="run-button" onclick={runGame} disabled={isBundling}>
						{isBundling ? 'Building...' : 'Run Game'}
					</button>

					{#if errors.length > 0}
						<div class="errors">
							<h4>Errors</h4>
							{#each errors as error}
								<p>{error}</p>
							{/each}
						</div>
					{/if}
				</div>
			</Pane>

			<PaneResizer class="resizer" />

			<!-- Editor -->
			<Pane defaultSize={35} minSize={20} class="editor-pane">
				<div class="editor-panel">
					<div class="editor-header">
						<span>{activeFile}</span>
					</div>
					<CodeEditor bind:content={activeFileContent} filePath={activeFile} onChange={handleFileChange} />
				</div>
			</Pane>

			<PaneResizer class="resizer" />

			<!-- Game Previews -->
			{#if config.layout === 'dual'}
				<Pane defaultSize={25} minSize={15} class="preview-pane">
					<GamePreview {engine} code={bundledCode} role="host" transportType={config.transport.type} />
				</Pane>

				<PaneResizer class="resizer" />

				<Pane defaultSize={25} minSize={15} class="preview-pane">
					<GamePreview {engine} code={bundledCode} role="client" transportType={config.transport.type} />
				</Pane>
			{:else}
				<Pane defaultSize={50} minSize={30} class="preview-pane">
					<GamePreview {engine} code={bundledCode} role="host" transportType={config.transport.type} />
				</Pane>
			{/if}
		</PaneGroup>
	{/if}
</div>

<style>
	.martini-ide {
		width: 100%;
		height: 100%;
		background: #ffffff;
		color: #1f2937;
		font-family: system-ui, -apple-system, sans-serif;
		overflow: hidden;
	}

	/* Paneforge overrides */
	:global(.ide-pane-group) {
		height: 100%;
	}

	:global(.sidebar-pane),
	:global(.editor-pane),
	:global(.preview-pane) {
		height: 100%;
		overflow: hidden;
	}

	:global(.resizer) {
		width: 1px;
		background: #e5e7eb;
		cursor: col-resize;
		transition: background 0.2s;
	}

	:global(.resizer:hover),
	:global(.resizer[data-state='drag']) {
		background: #3b82f6;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-size: 1.25rem;
		color: #6b7280;
	}

	/* Sidebar */
	.sidebar {
		height: 100%;
		background: #f9fafb;
		padding: 1rem;
		border-right: 1px solid #e5e7eb;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.sidebar h3 {
		margin: 0 0 1rem 0;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: #6b7280;
		letter-spacing: 0.05em;
	}

	.file-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem 0;
		flex: 1;
	}

	.file-list li {
		margin-bottom: 0.125rem;
	}

	.file-list button {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: none;
		color: #374151;
		text-align: left;
		cursor: pointer;
		border-radius: 6px;
		font-size: 0.875rem;
		transition: all 0.15s;
	}

	.file-list li.active button {
		background: #3b82f6;
		color: #ffffff;
	}

	.file-list button:hover:not(.active button) {
		background: #f3f4f6;
	}

	.run-button {
		width: 100%;
		padding: 0.75rem;
		background: #3b82f6;
		color: #ffffff;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		margin-bottom: 1rem;
		transition: background 0.15s;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.run-button:hover:not(:disabled) {
		background: #2563eb;
	}

	.run-button:disabled {
		background: #d1d5db;
		cursor: not-allowed;
	}

	.errors {
		padding: 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		font-size: 0.75rem;
	}

	.errors h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		color: #dc2626;
		font-weight: 600;
	}

	.errors p {
		margin: 0.25rem 0;
		color: #991b1b;
	}

	/* Editor Panel */
	.editor-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #ffffff;
	}

	.editor-header {
		padding: 0.75rem 1rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}
</style>
