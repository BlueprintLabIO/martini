<script lang="ts">
	import { onMount } from 'svelte';
	import { PaneGroup, Pane, PaneResizer } from 'paneforge';
	import CodeEditor from './components/CodeEditor.svelte';
	import GamePreview from './components/GamePreview.svelte';
	import { VirtualFileSystem } from './core/VirtualFS';
	import { IframeBridgeRelay } from '@martini/transport-iframe-bridge';
	import type { MartiniIDEConfig } from './types';

	interface Props {
		config: MartiniIDEConfig;
	}

	let { config }: Props = $props();

	// Core systems
	let vfs: VirtualFileSystem;
	let relay: IframeBridgeRelay | null = null;

	// State
	let activeFile = $state<string>('/src/game.ts');
	let activeFileContent = $state<string>('');
	let isInitializing = $state(true);
	let entryPoint = $state<string>('/src/main.ts');
	let filePaths = $state<string[]>([]);

	// DevTools state (shared between both previews)
	let showDevTools = $state(true);
	let activeDevToolsTab = $state<'console' | 'state' | 'actions'>('console');
	let hostLogs = $state<Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error'; channel?: string }>>([]);
	let clientLogs = $state<Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error'; channel?: string }>>([]);
	let hostStatus = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');
	let clientStatus = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');
	let hostStateSnapshots = $state<Array<{ timestamp: number; state: any }>>([]);
	let clientStateSnapshots = $state<Array<{ timestamp: number; state: any }>>([]);
	let hostActions = $state<Array<{ timestamp: number; actionName: string; input: any; playerId?: string; targetId?: string }>>([]);
	let clientActions = $state<Array<{ timestamp: number; actionName: string; input: any; playerId?: string; targetId?: string }>>([]);
	const sessionRoomId = generateRoomId();

	onMount(async () => {
		// Initialize IframeBridgeRelay if using iframe-bridge transport
		if (config.transport.type === 'iframe-bridge') {
			relay = new IframeBridgeRelay();
		}

		// Initialize core systems
		vfs = new VirtualFileSystem(config.files);

		// Get file list
		filePaths = vfs.getFilePaths();

		// Determine entry point
		entryPoint = vfs.exists('/src/main.ts') ? '/src/main.ts' : '/src/game.ts';

		// Open first file
		if (filePaths.length > 0) {
			activeFile = filePaths[0];
			activeFileContent = vfs.readFile(activeFile) || '';
		}

		isInitializing = false;

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

		// Notify parent
		config.onChange?.(vfs.getAllFiles());

		// Sandpack will handle HMR automatically via $effect in GamePreview
	}

	/**
	 * Handle file selection
	 */
	function selectFile(path: string) {
		activeFile = path;
		activeFileContent = vfs.readFile(path) || '';
	}

	/**
	 * Run game (force refresh)
	 */
	async function runGame() {
		// Trigger re-run via reactive update
		vfs = new VirtualFileSystem(vfs.getAllFiles());
		config.onRun?.();
	}

	function generateRoomId() {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return `martini-ide-${crypto.randomUUID()}`;
		}
		return `martini-ide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
			<Pane defaultSize={10} minSize={10} class="sidebar-pane">
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

					<button class="run-button" onclick={runGame}>
						Run Game
					</button>
				</div>
			</Pane>

			<PaneResizer class="resizer" />

			<!-- Editor -->
			<Pane defaultSize={25} minSize={20} class="editor-pane">
				<div class="editor-panel">
					<div class="editor-header">
						<span>{activeFile}</span>
					</div>
					<CodeEditor bind:content={activeFileContent} filePath={activeFile} onChange={handleFileChange} />
				</div>
			</Pane>

			<PaneResizer class="resizer" />

			<!-- Game Previews + DevTools -->
			<Pane defaultSize={65} minSize={30} class="preview-pane">
				<PaneGroup direction="vertical" class="preview-group">
					<!-- Game Canvases -->
					<Pane defaultSize={75} minSize={40} class="games-pane">
						{#if config.layout === 'dual'}
							<div class="dual-preview">
								<GamePreview
									{vfs}
									{entryPoint}
									role="host"
									transportType={config.transport.type}
									roomId={sessionRoomId}
									bind:consoleLogs={hostLogs}
									bind:connectionStatus={hostStatus}
									hideDevTools={true}
									onReady={config.onReady}
									onError={config.onError}
								/>
								<GamePreview
									{vfs}
									{entryPoint}
									role="client"
									transportType={config.transport.type}
									roomId={sessionRoomId}
									bind:consoleLogs={clientLogs}
									bind:connectionStatus={clientStatus}
									hideDevTools={true}
								/>
							</div>
						{:else}
							<GamePreview
								{vfs}
								{entryPoint}
								role="host"
								transportType={config.transport.type}
								roomId={sessionRoomId}
								bind:consoleLogs={hostLogs}
								bind:connectionStatus={hostStatus}
								hideDevTools={true}
								onReady={config.onReady}
								onError={config.onError}
							/>
						{/if}
					</Pane>

					<!-- Shared DevTools Panel -->
					{#if showDevTools}
						<PaneResizer class="resizer-horizontal" />
						<Pane defaultSize={25} minSize={15} class="devtools-pane">
							<div class="devtools-container">
								<!-- Tabs -->
								<div class="devtools-tabs">
									<button
										class="devtools-tab"
										class:active={activeDevToolsTab === 'console'}
										onclick={() => (activeDevToolsTab = 'console')}
									>
										Console
									</button>
									<button
										class="devtools-tab"
										class:active={activeDevToolsTab === 'state'}
										onclick={() => (activeDevToolsTab = 'state')}
									>
										State
									</button>
									<button
										class="devtools-tab"
										class:active={activeDevToolsTab === 'actions'}
										onclick={() => (activeDevToolsTab = 'actions')}
									>
										Actions
									</button>
								</div>
								{#if config.layout === 'dual'}
									<div class="devtools-dual">
										<div class="devtools-section">
											<div class="devtools-section-header">
												<span class="role-badge role-host">HOST</span>
												<span class="status-indicator" class:connected={hostStatus === 'connected'}>
													{hostStatus}
												</span>
											</div>
											<div class="devtools-logs">
												{#if hostLogs.length === 0}
													<p class="empty-logs">No console output</p>
												{:else}
													{#each hostLogs.slice(-20) as log}
														<div class="log-entry log-{log.level}">
															<span class="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
															<span class="log-message">{log.message}</span>
														</div>
													{/each}
												{/if}
											</div>
										</div>
										<div class="devtools-section">
											<div class="devtools-section-header">
												<span class="role-badge role-client">CLIENT</span>
												<span class="status-indicator" class:connected={clientStatus === 'connected'}>
													{clientStatus}
												</span>
											</div>
											<div class="devtools-logs">
												{#if clientLogs.length === 0}
													<p class="empty-logs">No console output</p>
												{:else}
													{#each clientLogs.slice(-20) as log}
														<div class="log-entry log-{log.level}">
															<span class="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
															<span class="log-message">{log.message}</span>
														</div>
													{/each}
												{/if}
											</div>
										</div>
									</div>
								{:else}
									<div class="devtools-section">
										<div class="devtools-section-header">
											<span class="role-badge role-host">CONSOLE</span>
											<span class="status-indicator" class:connected={hostStatus === 'connected'}>
												{hostStatus}
											</span>
										</div>
										<div class="devtools-logs">
											{#if hostLogs.length === 0}
												<p class="empty-logs">No console output</p>
											{:else}
												{#each hostLogs.slice(-20) as log}
													<div class="log-entry log-{log.level}">
														<span class="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
														<span class="log-message">{log.message}</span>
													</div>
												{/each}
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</Pane>
					{/if}
				</PaneGroup>
			</Pane>
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

	/* Preview Layout */
	:global(.preview-group) {
		height: 100%;
	}

	:global(.games-pane),
	:global(.devtools-pane) {
		overflow: hidden;
	}

	:global(.resizer-horizontal) {
		height: 1px;
		background: #e5e7eb;
		cursor: row-resize;
		transition: background 0.2s;
	}

	:global(.resizer-horizontal:hover),
	:global(.resizer-horizontal[data-state='drag']) {
		background: #3b82f6;
	}

	.dual-preview {
		display: flex;
		height: 100%;
		gap: 1px;
		background: #e5e7eb;
	}

	.dual-preview > :global(*) {
		flex: 1;
		min-width: 0;
	}

	/* DevTools Container */
	.devtools-container {
		height: 100%;
		background: #1e1e1e;
		color: #d4d4d4;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 0.75rem;
		overflow: hidden;
	}

	.devtools-dual {
		display: flex;
		height: 100%;
		gap: 1px;
		background: #2d2d30;
	}

	.devtools-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: #1e1e1e;
	}

	.devtools-section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: #252526;
		border-bottom: 1px solid #3e3e42;
	}

	.role-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 3px;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.role-host {
		background: rgba(78, 201, 176, 0.2);
		color: #4ec9b0;
		border: 1px solid rgba(78, 201, 176, 0.3);
	}

	.role-client {
		background: rgba(206, 145, 120, 0.2);
		color: #ce9178;
		border: 1px solid rgba(206, 145, 120, 0.3);
	}

	.status-indicator {
		font-size: 0.625rem;
		color: #6e6e6e;
		text-transform: capitalize;
	}

	.status-indicator.connected {
		color: #10b981;
	}

	.devtools-logs {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0.5rem;
	}

	.empty-logs {
		color: #6e6e6e;
		text-align: center;
		padding: 2rem 1rem;
		margin: 0;
	}

	.log-entry {
		display: flex;
		gap: 0.5rem;
		padding: 0.25rem 0.375rem;
		font-size: 0.6875rem;
		line-height: 1.4;
		border-radius: 3px;
		margin-bottom: 1px;
	}

	.log-entry:hover {
		background: rgba(42, 42, 42, 0.8);
	}

	.log-time {
		color: #6e6e6e;
		flex-shrink: 0;
		font-size: 0.625rem;
	}

	.log-message {
		flex: 1;
		word-break: break-word;
		color: #d4d4d4;
	}

	.log-error .log-message {
		color: #f48771;
	}

	.log-warn .log-message {
		color: #dcdcaa;
	}
</style>
