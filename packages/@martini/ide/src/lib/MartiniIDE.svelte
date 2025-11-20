<script lang="ts">
	import { onMount } from 'svelte';
	import { PaneGroup, Pane, PaneResizer } from 'paneforge';
	import CodeEditor from './components/CodeEditor.svelte';
	import GamePreview from './components/GamePreview.svelte';
	import StateViewer from './components/StateViewer.svelte';
	import ActionTimeline from './components/ActionTimeline.svelte';
	import StateDiffViewer from './components/StateDiffViewer.svelte';
	import NetworkMonitor from './components/NetworkMonitor.svelte';
	import { VirtualFileSystem } from './core/VirtualFS';
	import { IframeBridgeRelay } from '@martini/transport-iframe-bridge';
	import type { MartiniIDEConfig } from './types';
	import type { StateSnapshot, ActionRecord } from '@martini/devtools';

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

	// GamePreview component refs
	let hostPreviewRef: any;
	let clientPreviewRef: any;

	// DevTools state (shared between both previews)
	let showDevTools = $state(false);
	let activeDevToolsTab = $state<'console' | 'state' | 'actions' | 'diff' | 'network'>('console');
	let hostLogs = $state<Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error'; channel?: string }>>([]);
	let clientLogs = $state<Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error'; channel?: string }>>([]);
	let hostStatus = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');
	let clientStatus = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');
	let hostStateSnapshots = $state<StateSnapshot[]>([]);
	let clientStateSnapshots = $state<StateSnapshot[]>([]);
	let hostActions = $state<ActionRecord[]>([]);
	let clientActions = $state<ActionRecord[]>([]);
	let hostActionsExcluded = $state(0);
	let clientActionsExcluded = $state(0);
	let hostNetworkPackets = $state<Array<{ timestamp: number; direction: 'send' | 'receive'; type: string; size: number; payload: any }>>([]);
	let clientNetworkPackets = $state<Array<{ timestamp: number; direction: 'send' | 'receive'; type: string; size: number; payload: any }>>([]);
	// Room scoping per navigation: include timestamp to ensure fresh room per page load
	// This prevents phantom peers from previous navigations from appearing in new sessions
	const sessionRoomId = `${generateRoomId()}-${Date.now()}`;
	const DEVTOOLS_STORAGE_KEY = 'martini-ide-show-devtools';

	// Derived state: check if there are divergences
	let hasDivergences = $derived(
		hostStateSnapshots.length > 0 &&
			clientStateSnapshots.length > 0 &&
			JSON.stringify(hostStateSnapshots[hostStateSnapshots.length - 1]?.state) !==
				JSON.stringify(clientStateSnapshots[clientStateSnapshots.length - 1]?.state)
	);

	onMount(async () => {
		// Initialize IframeBridgeRelay if using iframe-bridge transport
		if (config.transport.type === 'iframe-bridge') {
			relay = new IframeBridgeRelay();
		}

		if (typeof localStorage !== 'undefined') {
			const storedPreference = localStorage.getItem(DEVTOOLS_STORAGE_KEY);
			if (storedPreference !== null) {
				showDevTools = storedPreference === 'true';
			}
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

	$effect(() => {
		if (typeof localStorage === 'undefined') {
			return;
		}
		localStorage.setItem(DEVTOOLS_STORAGE_KEY, showDevTools ? 'true' : 'false');

		// DevTools toggling is now handled via enableDevTools prop in GamePreview

		// Auto-switch to Console tab when DevTools is turned off
		if (!showDevTools && activeDevToolsTab !== 'console') {
			activeDevToolsTab = 'console';
		}
	});

	// Pause Inspector when not viewing relevant tabs
	$effect(() => {
		// Only run Inspector when viewing tabs that need it
		const inspectorActive = showDevTools &&
			(activeDevToolsTab === 'state' ||
			 activeDevToolsTab === 'actions' ||
			 activeDevToolsTab === 'diff');

		hostPreviewRef?.setInspectorPaused(!inspectorActive);
		clientPreviewRef?.setInspectorPaused(!inspectorActive);
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
				<div class="preview-pane-content">
					<PaneGroup direction="vertical" class="preview-group">
						<!-- Game Canvases -->
						<Pane defaultSize={50} minSize={30} class="games-pane">
						{#if config.layout === 'dual'}
							<div class="dual-preview">
								<GamePreview
									bind:this={hostPreviewRef}
									{vfs}
									{entryPoint}
									role="host"
									transportType={config.transport.type}
									roomId={sessionRoomId}
									bind:consoleLogs={hostLogs}
									bind:connectionStatus={hostStatus}
									bind:stateSnapshots={hostStateSnapshots}
									bind:actionHistory={hostActions}
									bind:actionExcludedCount={hostActionsExcluded}
									bind:networkPackets={hostNetworkPackets}
									hideDevTools={true}
									enableDevTools={showDevTools}
									onReady={config.onReady}
									onError={config.onError}
								/>
								<GamePreview
									bind:this={clientPreviewRef}
									{vfs}
									{entryPoint}
									role="client"
									transportType={config.transport.type}
									roomId={sessionRoomId}
									bind:consoleLogs={clientLogs}
									bind:connectionStatus={clientStatus}
									bind:stateSnapshots={clientStateSnapshots}
									bind:actionHistory={clientActions}
									bind:actionExcludedCount={clientActionsExcluded}
									bind:networkPackets={clientNetworkPackets}
									hideDevTools={true}
									enableDevTools={showDevTools}
								/>
							</div>
						{:else}
							<GamePreview
								bind:this={hostPreviewRef}
								{vfs}
								{entryPoint}
								role="host"
								transportType={config.transport.type}
								roomId={sessionRoomId}
								bind:consoleLogs={hostLogs}
								bind:connectionStatus={hostStatus}
								bind:stateSnapshots={hostStateSnapshots}
								bind:actionHistory={hostActions}
								bind:actionExcludedCount={hostActionsExcluded}
								bind:networkPackets={hostNetworkPackets}
								hideDevTools={true}
								enableDevTools={showDevTools}
								onReady={config.onReady}
								onError={config.onError}
							/>
						{/if}
					</Pane>

					<!-- Shared DevTools Panel -->
					<PaneResizer class="resizer-horizontal" />
					<Pane defaultSize={50} minSize={25} class="devtools-pane">
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
									class:disabled={!showDevTools}
									disabled={!showDevTools}
									onclick={() => showDevTools && (activeDevToolsTab = 'state')}
								>
									State
								</button>
								<button
									class="devtools-tab"
									class:active={activeDevToolsTab === 'actions'}
									class:disabled={!showDevTools}
									disabled={!showDevTools}
									onclick={() => showDevTools && (activeDevToolsTab = 'actions')}
								>
									Actions
								</button>
								<button
									class="devtools-tab"
									class:active={activeDevToolsTab === 'diff'}
									class:disabled={!showDevTools}
									disabled={!showDevTools}
									onclick={() => showDevTools && (activeDevToolsTab = 'diff')}
								>
									Diff {#if hasDivergences}⚠️{/if}
								</button>
								<button
									class="devtools-tab"
									class:active={activeDevToolsTab === 'network'}
									class:disabled={!showDevTools}
									disabled={!showDevTools}
									onclick={() => showDevTools && (activeDevToolsTab = 'network')}
								>
									Network (coming soon)
								</button>

								<!-- DevTools Toggle Switch -->
								<div class="devtools-toggle-container">
									<label class="devtools-toggle-label">
										<input
											type="checkbox"
											class="devtools-toggle-checkbox"
											bind:checked={showDevTools}
										/>
										<span class="devtools-toggle-switch"></span>
										<span class="devtools-toggle-text">Inspector</span>
									</label>
								</div>
							</div>

								<!-- Tab Content -->
								{#if config.layout === 'dual'}
									{#if activeDevToolsTab === 'diff'}
										<!-- Diff Tab Content (full width, shows both sides) -->
										<div class="devtools-diff-full">
											<StateDiffViewer
												hostSnapshots={hostStateSnapshots}
												clientSnapshots={clientStateSnapshots}
											/>
										</div>
									{:else}
										<div class="devtools-dual">
											<!-- HOST Section -->
											<div class="devtools-section">
												<div class="devtools-section-header">
												<span class="role-badge role-host">HOST</span>
												{#if activeDevToolsTab === 'console'}
													<span class="status-indicator" class:connected={hostStatus === 'connected'}>
														{hostStatus}
													</span>
												{:else if activeDevToolsTab === 'state'}
													<span class="snapshot-count">
														{hostStateSnapshots.length} snapshot{hostStateSnapshots.length === 1 ? '' : 's'}
													</span>
												{:else if activeDevToolsTab === 'actions'}
													<span class="action-count">
														{hostActions.length} action{hostActions.length === 1 ? '' : 's'}
													</span>
												{:else if activeDevToolsTab === 'network'}
													<span class="packet-count">
														{hostNetworkPackets.length} packet{hostNetworkPackets.length === 1 ? '' : 's'}
													</span>
												{/if}
											</div>

											<!-- Console Tab Content -->
											{#if activeDevToolsTab === 'console'}
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
											{/if}

											<!-- State Tab Content -->
											{#if activeDevToolsTab === 'state'}
												<div class="devtools-content">
													<StateViewer snapshots={hostStateSnapshots} />
												</div>
											{/if}

											<!-- Actions Tab Content -->
											{#if activeDevToolsTab === 'actions'}
												<div class="devtools-content">
											<ActionTimeline actions={hostActions} excludedCount={hostActionsExcluded} />
												</div>
											{/if}

											<!-- Network Tab Content -->
											{#if activeDevToolsTab === 'network'}
												<div class="devtools-content">
													<NetworkMonitor packets={hostNetworkPackets} />
												</div>
											{/if}
										</div>

										<!-- CLIENT Section -->
										<div class="devtools-section">
											<div class="devtools-section-header">
												<span class="role-badge role-client">CLIENT</span>
												{#if activeDevToolsTab === 'console'}
													<span class="status-indicator" class:connected={clientStatus === 'connected'}>
														{clientStatus}
													</span>
												{:else if activeDevToolsTab === 'state'}
													<span class="snapshot-count">
														{clientStateSnapshots.length} snapshot{clientStateSnapshots.length === 1 ? '' : 's'}
													</span>
												{:else if activeDevToolsTab === 'actions'}
													<span class="action-count">
														{clientActions.length} action{clientActions.length === 1 ? '' : 's'}
													</span>
												{:else if activeDevToolsTab === 'network'}
													<span class="packet-count">
														{clientNetworkPackets.length} packet{clientNetworkPackets.length === 1 ? '' : 's'}
													</span>
												{/if}
											</div>

											<!-- Console Tab Content -->
											{#if activeDevToolsTab === 'console'}
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
											{/if}

											<!-- State Tab Content -->
											{#if activeDevToolsTab === 'state'}
												<div class="devtools-content">
													<StateViewer snapshots={clientStateSnapshots} />
												</div>
											{/if}

											<!-- Actions Tab Content -->
											{#if activeDevToolsTab === 'actions'}
												<div class="devtools-content">
											<ActionTimeline actions={clientActions} excludedCount={clientActionsExcluded} />
												</div>
											{/if}

											<!-- Network Tab Content -->
											{#if activeDevToolsTab === 'network'}
												<div class="devtools-content">
													<NetworkMonitor packets={clientNetworkPackets} />
												</div>
											{/if}
										</div>
										</div>
									{/if}
								{:else}
									<!-- Single Player Mode -->
									<div class="devtools-section">
										<div class="devtools-section-header">
											<span class="role-badge role-host">
												{activeDevToolsTab === 'console'
													? 'CONSOLE'
													: activeDevToolsTab === 'state'
														? 'STATE'
														: activeDevToolsTab === 'actions'
															? 'ACTIONS'
															: activeDevToolsTab === 'network'
																? 'NETWORK'
																: 'DIFF'}
											</span>
											{#if activeDevToolsTab === 'console'}
												<span class="status-indicator" class:connected={hostStatus === 'connected'}>
													{hostStatus}
												</span>
											{:else if activeDevToolsTab === 'state'}
												<span class="snapshot-count">
													{hostStateSnapshots.length} snapshot{hostStateSnapshots.length === 1 ? '' : 's'}
												</span>
											{:else if activeDevToolsTab === 'actions'}
												<span class="action-count">
													{hostActions.length} action{hostActions.length === 1 ? '' : 's'}
												</span>
											{/if}
										</div>

										<!-- Console Tab Content -->
										{#if activeDevToolsTab === 'console'}
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
										{/if}

										<!-- State Tab Content -->
										{#if activeDevToolsTab === 'state'}
											<div class="devtools-content">
												<StateViewer snapshots={hostStateSnapshots} />
											</div>
										{/if}

										<!-- Actions Tab Content -->
										{#if activeDevToolsTab === 'actions'}
											<div class="devtools-content">
												<ActionTimeline actions={hostActions} excludedCount={hostActionsExcluded} />
											</div>
										{/if}

										<!-- Diff Tab Content -->
										{#if activeDevToolsTab === 'diff'}
											<div class="devtools-content">
												<StateDiffViewer
													hostSnapshots={hostStateSnapshots}
													clientSnapshots={clientStateSnapshots}
												/>
											</div>
										{/if}

										<!-- Network Tab Content -->
										{#if activeDevToolsTab === 'network'}
											<div class="devtools-content">
												<NetworkMonitor packets={hostNetworkPackets} />
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</Pane>
					</PaneGroup>
				</div>
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
		padding: 0.75rem;
		border-right: 1px solid #e5e7eb;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.sidebar h3 {
		margin: 0 0 0.5rem 0;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		color: #6b7280;
		letter-spacing: 0.05em;
	}

	.file-list {
		list-style: none;
		padding: 0;
		margin: 0 0 0.75rem 0;
		flex: 1;
	}

	.file-list li {
		margin-bottom: 0.0625rem;
	}

	.file-list button {
		width: 100%;
		padding: 0.375rem 0.5rem;
		background: transparent;
		border: none;
		color: #374151;
		text-align: left;
		cursor: pointer;
		border-radius: 4px;
		font-size: 0.75rem;
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
		padding: 0.5rem;
		background: #3b82f6;
		color: #ffffff;
		border: none;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		margin-bottom: 0.75rem;
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
	.preview-pane-content {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	:global(.preview-group) {
		height: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;
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
		font-size: 0.6875rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.devtools-tabs {
		display: flex;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		background: #252526;
		border-bottom: 1px solid #3e3e42;
		align-items: center;
	}

	.devtools-tab {
		padding: 0.25rem 0.5rem;
		background: transparent;
		border: none;
		color: #969696;
		cursor: pointer;
		border-radius: 3px;
		font-size: 0.625rem;
		font-weight: 500;
		transition: all 0.15s;
	}

	.devtools-tab:hover {
		background: rgba(90, 93, 94, 0.31);
		color: #d4d4d4;
	}

	.devtools-tab.active {
		background: #1e1e1e;
		color: #ffffff;
		border: 1px solid #3e3e42;
	}

	.devtools-tab.disabled {
		color: #4d4d4d;
		cursor: not-allowed;
		opacity: 0.5;
	}

	.devtools-tab.disabled:hover {
		background: transparent;
		color: #4d4d4d;
	}

	/* DevTools Toggle Switch */
	.devtools-toggle-container {
		margin-left: auto;
		display: flex;
		align-items: center;
	}

	.devtools-toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		user-select: none;
	}

	.devtools-toggle-text {
		font-size: 0.625rem;
		color: #969696;
		font-weight: 500;
	}

	.devtools-toggle-checkbox {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.devtools-toggle-switch {
		position: relative;
		width: 32px;
		height: 18px;
		background: #3e3e42;
		border-radius: 9px;
		transition: background 0.2s;
	}

	.devtools-toggle-switch::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		background: #969696;
		border-radius: 50%;
		transition: all 0.2s;
	}

	.devtools-toggle-checkbox:checked + .devtools-toggle-switch {
		background: #0e639c;
	}

	.devtools-toggle-checkbox:checked + .devtools-toggle-switch::after {
		left: 16px;
		background: #ffffff;
	}

	.devtools-toggle-label:hover .devtools-toggle-switch {
		background: #4d4d4d;
	}

	.devtools-toggle-checkbox:checked + .devtools-toggle-switch:hover {
		background: #1177bb;
	}

	.devtools-dual {
		display: flex;
		height: 100%;
		gap: 1px;
		background: #2d2d30;
	}

	.devtools-diff-full {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: #1e1e1e;
		padding: 0.5rem;
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

	.devtools-content {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.snapshot-count,
	.action-count {
		font-size: 0.625rem;
		color: #6e6e6e;
		text-transform: capitalize;
	}

	.empty-logs {
		color: #6e6e6e;
		text-align: center;
		padding: 2rem 1rem;
		margin: 0;
	}

	.log-entry {
		display: flex;
		gap: 0.375rem;
		padding: 0.1875rem 0.25rem;
		font-size: 0.625rem;
		line-height: 1.3;
		border-radius: 3px;
		margin-bottom: 1px;
	}

	.log-entry:hover {
		background: rgba(42, 42, 42, 0.8);
	}

	.log-time {
		color: #6e6e6e;
		flex-shrink: 0;
		font-size: 0.5625rem;
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
