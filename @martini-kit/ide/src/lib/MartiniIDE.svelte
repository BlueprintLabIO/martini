<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { PaneGroup, Pane, PaneResizer } from 'paneforge';
	import CodeEditor from './components/CodeEditor.svelte';
	import GamePreview from './components/GamePreview.svelte';
	import StateViewer from './components/StateViewer.svelte';
	import ActionTimeline from './components/ActionTimeline.svelte';
	import StateDiffViewer from './components/StateDiffViewer.svelte';
	import NetworkMonitor from './components/NetworkMonitor.svelte';
	import FilePlus from '@lucide/svelte/icons/file-plus';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import Download from '@lucide/svelte/icons/download';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Folder from '@lucide/svelte/icons/folder';
	import FileText from '@lucide/svelte/icons/file-text';
	import Play from '@lucide/svelte/icons/play';
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import { VirtualFileSystem } from './core/VirtualFS.js';
	import { IframeBridgeRelay } from '@martini-kit/transport-iframe-bridge';
	import type { MartiniKitIDEConfig } from './types.js';
	import type { StateSnapshot, ActionRecord } from '@martini-kit/devtools';
	import './styles/ide.css';

	type FileNode = {
		name: string;
		path: string;
		isDir: boolean;
		children?: FileNode[];
	};

	type VisibleNode = FileNode & { depth: number };

	interface Props {
		config: MartiniKitIDEConfig;
		onDownload?: () => void;
	}

	let { config, onDownload }: Props = $props();

	// Core systems
	let vfs = $state<VirtualFileSystem>(new VirtualFileSystem(config.files));
	let relay: IframeBridgeRelay | null = null;

	// State
	let activeFile = $state<string>('/src/game.ts');
	let selectedPath = $state<string | null>(null);
	let activeFileContent = $state<string>('');
	let isInitializing = $state(true);
	let entryPoint = $state<string>('/src/main.ts');
	let filePaths = $state<string[]>([]);
	let folderPaths = $state<string[]>([]);
	let vfsVersion = $state(0);
	let searchQuery = $state('');
	let expandedNodes = $state<Record<string, boolean>>({});
	let saveState = $state<'idle' | 'saving' | 'saved'>('saved');
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let theme = $state<'light' | 'dark'>(config.editor?.theme === 'dark' ? 'dark' : 'light');
	let sidebarVisible = $state(true);

	// File tree UX
	let inlineEdit = $state<{
		mode: 'create-file' | 'create-folder' | 'rename';
		path?: string;
		parent?: string;
		name: string;
	} | null>(null);
	let contextMenu = $state<{
		x: number;
		y: number;
		target: { path: string; isDir: boolean } | null;
	} | null>(null);
	let treeFocused = $state(false);
	let inlineError = $state<string | null>(null);

	// Derived
	const treePaths = $derived([...folderPaths, ...filePaths]);

	// GamePreview component refs
	let hostPreviewRef = $state<any>(null);
	let clientPreviewRef = $state<any>(null);

	// DevTools state (shared between both previews)
	let showDevTools = $state(false);
	let activeDevToolsTab = $state<'console' | 'state' | 'actions' | 'diff' | 'network'>('console');
	let hostLogs = $state<
		Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error'; channel?: string }>
	>([]);
	let clientLogs = $state<
		Array<{ message: string; timestamp: number; level: 'log' | 'warn' | 'error'; channel?: string }>
	>([]);
	let hostStatus = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');
	let clientStatus = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');
	let hostStateSnapshots = $state<StateSnapshot[]>([]);
	let clientStateSnapshots = $state<StateSnapshot[]>([]);
	let hostActions = $state<ActionRecord[]>([]);
	let clientActions = $state<ActionRecord[]>([]);
	let hostActionsExcluded = $state(0);
	let clientActionsExcluded = $state(0);
	let hostNetworkPackets = $state<
		Array<{
			timestamp: number;
			direction: 'send' | 'receive';
			type: string;
			size: number;
			payload: unknown;
		}>
	>([]);
	let clientNetworkPackets = $state<
		Array<{
			timestamp: number;
			direction: 'send' | 'receive';
			type: string;
			size: number;
			payload: unknown;
		}>
	>([]);
	// Room scoping per navigation: include timestamp to ensure fresh room per page load
	// This prevents phantom peers from previous navigations from appearing in new sessions
	const sessionRoomId = `${generateRoomId()}-${Date.now()}`;
	const DEVTOOLS_STORAGE_KEY = 'martini-kit-ide-show-devtools';

	// Derived state: check if there are divergences
	let hasDivergences = $derived(
		hostStateSnapshots.length > 0 &&
			clientStateSnapshots.length > 0 &&
			JSON.stringify(hostStateSnapshots[hostStateSnapshots.length - 1]?.state) !==
				JSON.stringify(clientStateSnapshots[clientStateSnapshots.length - 1]?.state)
	);

	function refreshPaths() {
		filePaths = vfs.getFilePaths().sort();
		folderPaths = vfs.getFolderPaths().sort();
	}

	function basename(path: string) {
		const parts = path.split('/').filter(Boolean);
		return parts[parts.length - 1] ?? '';
	}

	function dirname(path: string) {
		const normalized = path.startsWith('/') ? path : `/${path}`;
		const parts = normalized.split('/').filter(Boolean);
		if (parts.length <= 1) return '/';
		return `/${parts.slice(0, parts.length - 1).join('/')}`;
	}

	function joinPath(parent: string, name: string) {
		if (!parent || parent === '/') {
			return `/${name}`;
		}
		return `${parent}/${name}`;
	}

	function currentFolderForCreate() {
		if (!selectedPath) return '/';
		const isDir = folderPaths.includes(selectedPath);
		return isDir ? selectedPath : dirname(selectedPath);
	}

	function rebasePath(current: string, from: string, to: string) {
		if (!current) return current;
		if (current === from) return to;
		if (current.startsWith(from + '/')) {
			return current.replace(from, to);
		}
		return current;
	}

	function getDepth(path: string) {
		const clean = path.replace(/^\/|\/$/g, '');
		return clean ? clean.split('/').length : 0;
	}

	onMount(() => {
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

		// Get file + folder list
		refreshPaths();

		// Determine entry point
		entryPoint = vfs.exists('/src/main.ts') ? '/src/main.ts' : '/src/game.ts';

		// Open first file
		const firstFile = filePaths[0];
		if (firstFile) {
			activeFile = firstFile;
			activeFileContent = vfs.readFile(activeFile) || '';
			selectedPath = firstFile;
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

	// React to config.files changes (e.g. reset or show solution)
	$effect(() => {
		console.log('[ide] config.files changed', Object.keys(config.files));

		const newFiles = config.files;
		untrack(() => {
			// Only update if files have actually changed content-wise to avoid loops
			// Simple check: if we just wrote to VFS, vfsVersion incremented.
			// But here we want to catch external updates.
			// We'll trust the parent to only pass new objects when intended.
			vfs = new VirtualFileSystem(newFiles);
			refreshPaths();

			// Refresh active file content if it exists in new VFS
			if (vfs.exists(activeFile)) {
				activeFileContent = vfs.readFile(activeFile) || '';
			} else {
				// Fallback to entry point or first file
				const first = vfs.getFilePaths()[0];
				if (first) {
					activeFile = first;
					activeFileContent = vfs.readFile(activeFile) || '';
					selectedPath = activeFile;
				}
			}
			console.log('[ide] active file content updated', {
				activeFile,
				length: activeFileContent.length,
				preview: activeFileContent.slice(0, 80)
			});
			vfsVersion += 1;
		});
	});

	// Pause Inspector when not viewing relevant tabs
	$effect(() => {
		// Only run Inspector when viewing tabs that need it
		const inspectorActive =
			showDevTools &&
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
		console.log('[ide] handleFileChange', activeFile, 'length', newContent.length);
		saveState = 'saving';
		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		// Update VFS
		vfs.writeFile(activeFile, newContent);
		vfsVersion += 1;

		// Notify parent
		config.onChange?.(vfs.getAllFiles());

		saveTimer = setTimeout(() => {
			saveState = 'saved';
		}, 450);
	}

	/**
	 * Handle file selection
	 */
	function selectFile(path: string) {
		activeFile = path;
		activeFileContent = vfs.readFile(path) || '';
		selectedPath = path;
	}

	/**
	 * Run game (force refresh)
	 */
	async function runGame() {
		// Trigger re-run via reactive update
		vfs = vfs.clone();
		vfsVersion += 1;
		config.onRun?.();
	}

	function startCreate(type: 'file' | 'folder', parent = currentFolderForCreate()) {
		inlineEdit = { mode: type === 'file' ? 'create-file' : 'create-folder', parent, name: '' };
		inlineError = null;
		contextMenu = null;
	}

	function startRename(path: string, isDir: boolean) {
		inlineEdit = {
			mode: 'rename',
			path,
			parent: dirname(path),
			name: basename(path) || (isDir ? 'untitled' : 'untitled.ts')
		};
		inlineError = null;
		contextMenu = null;
	}

	function cancelInlineEdit() {
		inlineEdit = null;
		inlineError = null;
	}

	function commitInlineEdit() {
		if (!inlineEdit) return;
		const name = inlineEdit.name.trim();
		if (!name) {
			inlineError = 'Name cannot be empty';
			return;
		}

		try {
			if (inlineEdit.mode === 'create-file') {
				const target = joinPath(inlineEdit.parent ?? '/', name);
				vfs.createFile(target, '');
				selectedPath = target;
				activeFile = target;
				activeFileContent = '';
			} else if (inlineEdit.mode === 'create-folder') {
				const target = joinPath(inlineEdit.parent ?? '/', name);
				vfs.createFolder(target);
				selectedPath = target;
				expandedNodes = { ...expandedNodes, [target]: true };
			} else if (inlineEdit.mode === 'rename' && inlineEdit.path) {
				const target = joinPath(inlineEdit.parent ?? dirname(inlineEdit.path), name);
				const original = inlineEdit.path;
				const isDir = folderPaths.includes(original);
				vfs.renamePath(original, target);
				selectedPath = target;
				if (!isDir) {
					activeFile = rebasePath(activeFile, original, target);
					activeFileContent = vfs.readFile(activeFile) || '';
				} else {
					activeFile = rebasePath(activeFile, original, target);
					selectedPath = rebasePath(selectedPath ?? '', original, target);
				}
			}

			refreshPaths();
			vfsVersion += 1;
			config.onChange?.(vfs.getAllFiles());
			inlineEdit = null;
			inlineError = null;
		} catch (err) {
			inlineError = err instanceof Error ? err.message : 'Unable to apply change';
		}
	}

	function deletePath(path: string) {
		if (!path) return;
		vfs.deletePath(path);
		refreshPaths();

		if (activeFile && (activeFile === path || activeFile.startsWith(path + '/'))) {
			activeFile = filePaths[0] ?? '';
			activeFileContent = activeFile ? vfs.readFile(activeFile) || '' : '';
		}

		if (selectedPath && (selectedPath === path || selectedPath.startsWith(path + '/'))) {
			selectedPath = filePaths[0] ?? folderPaths[0] ?? null;
		}

		inlineEdit = null;
		inlineError = null;
		contextMenu = null;

		vfsVersion += 1;
		config.onChange?.(vfs.getAllFiles());
	}

	function duplicateFile(path: string) {
		if (!path || !vfs.exists(path) || folderPaths.includes(path)) return;
		const base = basename(path);
		const dir = dirname(path);
		let copyName = `${base}-copy`;
		let attempt = 1;
		let target = joinPath(dir, copyName);
		while (vfs.exists(target)) {
			copyName = `${base}-copy-${attempt}`;
			target = joinPath(dir, copyName);
			attempt += 1;
		}
		const content = vfs.readFile(path) ?? '';
		vfs.createFile(target, content);
		refreshPaths();
		selectedPath = target;
		activeFile = target;
		activeFileContent = content;
		vfsVersion += 1;
		config.onChange?.(vfs.getAllFiles());
	}

	function handleContextAction(
		action: 'new-file' | 'new-folder' | 'rename' | 'delete' | 'duplicate'
	) {
		const target = contextMenu?.target;
		if (action === 'new-file') {
			const parent = target?.isDir ? target.path : target ? dirname(target.path) : '/';
			startCreate('file', parent);
		} else if (action === 'new-folder') {
			const parent = target?.isDir ? target.path : target ? dirname(target.path) : '/';
			startCreate('folder', parent);
		} else if (action === 'rename' && target) {
			startRename(target.path, target.isDir);
		} else if (action === 'delete' && target) {
			deletePath(target.path);
		} else if (action === 'duplicate' && target && !target.isDir) {
			duplicateFile(target.path);
		}

		contextMenu = null;
	}

	function openContextMenu(event: MouseEvent, target: { path: string; isDir: boolean } | null) {
		event.preventDefault();
		contextMenu = {
			x: event.clientX,
			y: event.clientY,
			target
		};
	}

	function handleTreeKeydown(event: KeyboardEvent) {
		if (!treeFocused) return;
		const key = event.key;
		const meta = event.metaKey || event.ctrlKey;
		const shift = event.shiftKey;
		const targetPath = selectedPath ?? activeFile;
		const isDir = targetPath ? folderPaths.includes(targetPath) : false;

		if (meta && key.toLowerCase() === 'n' && shift) {
			event.preventDefault();
			startCreate('folder');
		} else if (meta && key.toLowerCase() === 'n') {
			event.preventDefault();
			startCreate('file');
		} else if (meta && key.toLowerCase() === 'd' && targetPath && !isDir) {
			event.preventDefault();
			duplicateFile(targetPath);
		} else if ((key === 'Delete' || key === 'Backspace') && targetPath) {
			event.preventDefault();
			deletePath(targetPath);
		} else if (key === 'F2' && targetPath) {
			event.preventDefault();
			startRename(targetPath, isDir);
		}
	}

	function buildFileTree(files: string[], folders: string[]): FileNode[] {
		const root: FileNode = { name: '', path: '/', isDir: true, children: [] };
		const sortedFolders = [...folders].sort();
		const sortedFiles = [...files].sort();

		// Seed known folders (including empty)
		for (const folderPath of sortedFolders) {
			const cleanPath = folderPath.startsWith('/') ? folderPath.slice(1) : folderPath;
			if (!cleanPath) continue;
			const segments = cleanPath.split('/');
			let current = root;
			let currentPath = '';

			for (let i = 0; i < segments.length; i++) {
				const segment = segments[i];
				currentPath += '/' + segment;
				const isDir = true;

				if (!current.children) current.children = [];
				let child = current.children.find((c) => c.name === segment && c.isDir === isDir);

				if (!child) {
					child = {
						name: segment,
						path: currentPath,
						isDir,
						children: []
					};
					current.children.push(child);
				}
				current = child;
			}
		}

		for (const fullPath of sortedFiles) {
			const cleanPath = fullPath.startsWith('/') ? fullPath.slice(1) : fullPath;
			if (!cleanPath) continue;
			const segments = cleanPath.split('/');
			let current = root;
			let currentPath = '';

			for (let i = 0; i < segments.length; i++) {
				const segment = segments[i];
				currentPath += '/' + segment;
				const isDir = i < segments.length - 1;

				if (!current.children) current.children = [];
				let child = current.children.find((c) => c.name === segment && c.isDir === isDir);

				if (!child) {
					child = {
						name: segment,
						path: currentPath,
						isDir,
						children: isDir ? [] : undefined
					};
					current.children.push(child);
				}

				if (isDir) {
					current = child;
				}
			}
		}

		return root.children ?? [];
	}

	function filterTree(nodes: FileNode[], query: string): FileNode[] {
		const q = query.trim().toLowerCase();
		if (!q) return nodes;

		const walk = (node: FileNode): FileNode | null => {
			if (!node.isDir) {
				return node.path.toLowerCase().includes(q) ? node : null;
			}

			const children = (node.children ?? [])
				.map((child) => walk(child))
				.filter((child): child is FileNode => child !== null);

			if (children.length > 0 || node.name.toLowerCase().includes(q)) {
				return { ...node, children };
			}

			return null;
		};

		return nodes.map((node) => walk(node)).filter((node): node is FileNode => node !== null);
	}

	const fileTree = $derived(buildFileTree(filePaths, folderPaths));
	const filteredFileTree = $derived(filterTree(fileTree, searchQuery));

	function collectVisibleNodes(
		nodes: FileNode[],
		expanded: Record<string, boolean>,
		forceOpen = false,
		depth = 0,
		acc: VisibleNode[] = []
	): VisibleNode[] {
		for (const node of nodes) {
			acc.push({ ...node, depth });
			if (node.isDir && (forceOpen || (expanded[node.path] ?? true))) {
				collectVisibleNodes(node.children ?? [], expanded, forceOpen, depth + 1, acc);
			}
		}
		return acc;
	}

	const visibleNodes = $derived(
		collectVisibleNodes(filteredFileTree, expandedNodes, searchQuery.trim().length > 0)
	);

	function isExpanded(path: string) {
		return expandedNodes[path] ?? true;
	}

	function toggleNode(path: string) {
		expandedNodes = { ...expandedNodes, [path]: !isExpanded(path) };
	}

	function generateRoomId() {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return `martini-kit-ide-${crypto.randomUUID()}`;
		}
		return `martini-kit-ide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	}
</script>

<div class="martini-kit-ide">
	{#if isInitializing}
		<div class="loading">
			<p>Initializing IDE...</p>
		</div>
	{:else}
		<PaneGroup direction="horizontal" class="ide-pane-group">
			<!-- Sidebar -->
			{#if sidebarVisible}
				<Pane defaultSize={10} minSize={12} class="sidebar-pane">
					<div class="sidebar">
						<div class="sidebar-header">
							<div class="sidebar-actions">
								<button
									class="ghost-button"
									onclick={() => startCreate('file')}
									aria-label="New file"
								>
									<FilePlus size={16} />
								</button>
								<button
									class="ghost-button"
									onclick={() => startCreate('folder')}
									aria-label="New folder"
								>
									<FolderPlus size={16} />
								</button>
								{#if onDownload}
									<button
										class="ghost-button"
										onclick={onDownload}
										aria-label="Download code"
										title="Download as ZIP"
									>
										<Download size={16} />
									</button>
								{/if}
							</div>
							{#if saveState !== 'saved'}
								<span class="badge" class:saving={saveState === 'saving'}>
									{saveState === 'saving' ? 'Saving…' : 'Edited'}
								</span>
							{/if}
						</div>

						<div class="search-bar">
							<input type="text" placeholder="Search files" bind:value={searchQuery} />
						</div>

						{#if inlineError}
							<div class="inline-error">{inlineError}</div>
						{/if}

						{#if filteredFileTree.length === 0}
							<p class="empty-files">No files found</p>
						{:else}
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
							<ul
								class="file-tree"
								role="tree"
								tabindex="0"
								onfocus={() => (treeFocused = true)}
								onblur={() => (treeFocused = false)}
								onkeydown={handleTreeKeydown}
								onclick={() => (contextMenu = null)}
								oncontextmenu={(event) => openContextMenu(event, null)}
							>
								{#if inlineEdit && inlineEdit.mode !== 'rename'}
									<li class="inline-row">
										<div
											class="tree-row inline-editor"
											style={`padding-left:${(inlineEdit.parent ? getDepth(inlineEdit.parent) + 1 : 1) * 12 + 4}px`}
										>
											<span class="chevron-icon">
												{#if inlineEdit.mode === 'create-folder'}
													<Folder size={14} />
												{:else}
													<FileText size={14} />
												{/if}
											</span>
											<!-- svelte-ignore a11y_autofocus -->
											<input
												autofocus
												placeholder={inlineEdit.mode === 'create-folder'
													? 'New folder'
													: 'New file'}
												bind:value={inlineEdit.name}
												onkeydown={(event) => {
													if (event.key === 'Enter') commitInlineEdit();
													if (event.key === 'Escape') cancelInlineEdit();
												}}
												onblur={commitInlineEdit}
											/>
										</div>
									</li>
								{/if}

								{#each visibleNodes as node (node.path)}
									<li
										class:selected={selectedPath === node.path}
										class:active={node.path === activeFile}
										oncontextmenu={(event) =>
											openContextMenu(event, { path: node.path, isDir: node.isDir })}
									>
										{#if node.isDir}
											{#if inlineEdit && inlineEdit.mode === 'rename' && inlineEdit.path === node.path}
												<div
													class="tree-row inline-editor"
													style={`padding-left:${node.depth * 12 + 4}px`}
												>
													<span class="chevron-icon">
														{#if isExpanded(node.path)}
															<ChevronDown size={14} />
														{:else}
															<ChevronRight size={14} />
														{/if}
													</span>
													<span class="node-icon"><Folder size={14} /></span>
													<!-- svelte-ignore a11y_autofocus -->
													<input
														autofocus
														bind:value={inlineEdit.name}
														onkeydown={(event) => {
															if (event.key === 'Enter') commitInlineEdit();
															if (event.key === 'Escape') cancelInlineEdit();
														}}
														onblur={commitInlineEdit}
													/>
												</div>
											{:else}
												<button
													class="tree-row"
													style={`padding-left:${node.depth * 12 + 4}px`}
													onclick={() => {
														selectedPath = node.path;
														toggleNode(node.path);
													}}
												>
													<span class="chevron-icon">
														{#if isExpanded(node.path)}
															<ChevronDown size={14} />
														{:else}
															<ChevronRight size={14} />
														{/if}
													</span>
													<span class="node-icon"><Folder size={14} /></span>
													<span class="folder">{node.name}</span>
												</button>
											{/if}
										{:else if inlineEdit && inlineEdit.mode === 'rename' && inlineEdit.path === node.path}
											<div
												class="file-row inline-editor"
												style={`padding-left:${node.depth * 12 + 20}px`}
											>
												<span class="node-icon"><FileText size={14} /></span>
												<!-- svelte-ignore a11y_autofocus -->
												<input
													autofocus
													bind:value={inlineEdit.name}
													onkeydown={(event) => {
														if (event.key === 'Enter') commitInlineEdit();
														if (event.key === 'Escape') cancelInlineEdit();
													}}
													onblur={commitInlineEdit}
												/>
											</div>
										{:else}
											<button
												class="file-row"
												style={`padding-left:${node.depth * 12 + 20}px`}
												onclick={() => selectFile(node.path)}
											>
												<span class="node-icon"><FileText size={14} /></span>
												{node.name}
											</button>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}

						<button class="run-button" onclick={runGame}>
							<Play size={16} />
							Run Game
						</button>
					</div>
				</Pane>

				<PaneResizer class="resizer" />
			{/if}

			<!-- Editor -->
			<Pane defaultSize={sidebarVisible ? 25 : 35} minSize={30} class="editor-pane">
				<div class="editor-panel">
					<div class="editor-header">
						<button
							class="sidebar-toggle"
							onclick={() => (sidebarVisible = !sidebarVisible)}
							aria-label={sidebarVisible ? 'Hide file explorer' : 'Show file explorer'}
						>
							{#if sidebarVisible}
								<PanelLeftClose size={16} />
							{:else}
								<PanelLeftOpen size={16} />
							{/if}
						</button>
						<span>{activeFile}</span>
						{#if saveState === 'saving'}
							<span class="status-dot saving">Saving…</span>
						{:else if saveState === 'saved'}
							<span class="status-dot saved">Saved</span>
						{/if}
					</div>
					{#key `${activeFile}-${vfsVersion}`}
						<CodeEditor
							bind:content={activeFileContent}
							filePath={activeFile}
							onChange={handleFileChange}
						/>
					{/key}
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
										{vfsVersion}
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
										enableDevTools={true}
										onReady={config.onReady}
										onError={config.onError}
									/>
									<GamePreview
										bind:this={clientPreviewRef}
										{vfs}
										{vfsVersion}
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
										enableDevTools={true}
									/>
								</div>
							{:else}
								<GamePreview
									bind:this={hostPreviewRef}
									{vfs}
									{vfsVersion}
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
									enableDevTools={true}
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
														<span
															class="status-indicator"
															class:connected={hostStatus === 'connected'}
														>
															{hostStatus}
														</span>
													{:else if activeDevToolsTab === 'state'}
														<span class="snapshot-count">
															{hostStateSnapshots.length} snapshot{hostStateSnapshots.length === 1
																? ''
																: 's'}
														</span>
													{:else if activeDevToolsTab === 'actions'}
														<span class="action-count">
															{hostActions.length} action{hostActions.length === 1 ? '' : 's'}
														</span>
													{:else if activeDevToolsTab === 'network'}
														<span class="packet-count">
															{hostNetworkPackets.length} packet{hostNetworkPackets.length === 1
																? ''
																: 's'}
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
																	<span class="log-time"
																		>{new Date(log.timestamp).toLocaleTimeString()}</span
																	>
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
														<ActionTimeline
															actions={hostActions}
															excludedCount={hostActionsExcluded}
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

											<!-- CLIENT Section -->
											<div class="devtools-section">
												<div class="devtools-section-header">
													<span class="role-badge role-client">CLIENT</span>
													{#if activeDevToolsTab === 'console'}
														<span
															class="status-indicator"
															class:connected={clientStatus === 'connected'}
														>
															{clientStatus}
														</span>
													{:else if activeDevToolsTab === 'state'}
														<span class="snapshot-count">
															{clientStateSnapshots.length} snapshot{clientStateSnapshots.length ===
															1
																? ''
																: 's'}
														</span>
													{:else if activeDevToolsTab === 'actions'}
														<span class="action-count">
															{clientActions.length} action{clientActions.length === 1 ? '' : 's'}
														</span>
													{:else if activeDevToolsTab === 'network'}
														<span class="packet-count">
															{clientNetworkPackets.length} packet{clientNetworkPackets.length === 1
																? ''
																: 's'}
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
																	<span class="log-time"
																		>{new Date(log.timestamp).toLocaleTimeString()}</span
																	>
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
														<ActionTimeline
															actions={clientActions}
															excludedCount={clientActionsExcluded}
														/>
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
													{hostStateSnapshots.length} snapshot{hostStateSnapshots.length === 1
														? ''
														: 's'}
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
															<span class="log-time"
																>{new Date(log.timestamp).toLocaleTimeString()}</span
															>
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

	{#if contextMenu}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="context-menu-overlay"
			role="button"
			tabindex="0"
			onclick={() => (contextMenu = null)}
			onkeydown={(e) => e.key === 'Escape' && (contextMenu = null)}
		></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="context-menu"
			role="menu"
			tabindex="-1"
			style={`left:${contextMenu.x}px; top:${contextMenu.y}px`}
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<button onclick={() => handleContextAction('new-file')}>New File</button>
			<button onclick={() => handleContextAction('new-folder')}>New Folder</button>
			{#if contextMenu.target}
				<hr />
				<button onclick={() => handleContextAction('rename')}>Rename</button>
				{#if !contextMenu.target.isDir}
					<button onclick={() => handleContextAction('duplicate')}>Duplicate</button>
				{/if}
				<button class="danger" onclick={() => handleContextAction('delete')}>Delete</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Baseline layout stays co-located to guarantee sizing even if external CSS is skipped */
	.martini-kit-ide {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	:global(.ide-pane-group),
	:global(.sidebar-pane),
	:global(.editor-pane),
	:global(.preview-pane) {
		height: 100%;
		min-height: 0;
	}

	:global(.sidebar-pane),
	:global(.editor-pane),
	:global(.preview-pane) {
		overflow: hidden;
	}

	:global(.resizer) {
		width: 1px;
		cursor: col-resize;
	}

	:global(.resizer-horizontal) {
		height: 1px;
		cursor: row-resize;
	}

	.preview-pane-content,
	:global(.preview-group) {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.dual-preview {
		display: flex;
		height: 100%;
	}

	.dual-preview > * {
		flex: 1;
		min-width: 0;
	}
</style>
