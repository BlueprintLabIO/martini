<script lang="ts">
	import FileTree from './FileTree.svelte';
	import CodeEditor from './CodeEditor.svelte';
	import GamePreview from './GamePreview.svelte';
	import AIChatPanel from './AIChatPanel.svelte';
	import AssetPanel from './AssetPanel.svelte';
	// import MultiplayerManager from '$lib/multiplayer/MultiplayerManager.svelte'; // REMOVED - will use Martini SDK
	import { fileTree } from '$lib/stores/fileTree.svelte';
	import { onMount } from 'svelte';
	import { ArrowLeft, Play } from 'lucide-svelte';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let { data } = $props();

	// Use plain object instead of Map for proper Svelte 5 reactivity
	let filesMap = $state<Record<string, { content: string; dirty: boolean }>>({});
	let activeFilePath = $state<string | null>(null);
	let saveStatus = $state<'saved' | 'saving' | 'unsaved'>('saved');
	let gamePreview: GamePreview;
	let aiChatPanel: any;
	let codeEditor: any; // Reference to CodeEditor component
	let iframeEl = $state<HTMLIFrameElement | null>(null); // Shared iframe ref for multiplayer
	let showNewFileDialog = $state(false);
	let newFilePath = $state('');
	let showNewFolderDialog = $state(false);
	let newFolderPath = $state('');
	let hotReloadEnabled = $state(true); // Auto-on by default

	// Editor mode: 'basic' shows only game preview + AI chat, 'advanced' shows full IDE
	let editorMode = $state<'basic' | 'advanced'>('basic');
	let isAdvancedMode = $state(false);

	onMount(() => {
		// Load editor mode from localStorage (default: basic)
		const savedMode = localStorage.getItem('editor-mode');
		if (savedMode === 'basic' || savedMode === 'advanced') {
			editorMode = savedMode;
			isAdvancedMode = savedMode === 'advanced';
		}

		// Build file tree from paths
		fileTree.buildTree(data.files.map((f) => f.path));

		// Load files into object
		data.files.forEach((file) => {
			filesMap[file.path] = { content: file.content, dirty: false };
		});

		// Open first file by default
		if (data.files.length > 0) {
			openFile(data.files[0].path);
		}
	});

	// Sync isAdvancedMode with editorMode
	$effect(() => {
		editorMode = isAdvancedMode ? 'advanced' : 'basic';
		localStorage.setItem('editor-mode', editorMode);
	});

	function openFile(path: string) {
		activeFilePath = path;
		fileTree.setActiveFile(path);
	}

	async function saveFile(path: string) {
		const file = filesMap[path];
		if (!file?.dirty) return;

		saveStatus = 'saving';

		try {
			const response = await fetch(`/api/projects/${data.project.id}/files`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path, content: file.content })
			});

			if (!response.ok) {
				throw new Error('Failed to save file');
			}

			// Trigger reactivity by reassigning
			filesMap[path] = { ...file, dirty: false };
			saveStatus = 'saved';

			// Hot reload: auto-run game after save if enabled
			if (hotReloadEnabled && gamePreview) {
				console.log('🔥 Hot reload: triggering game reload after save');
				await gamePreview.runGame();
			}
		} catch (error) {
			console.error('Error saving file:', error);
			saveStatus = 'unsaved';
		}
	}

	// Auto-save after 2s of inactivity
	let saveTimeout: ReturnType<typeof setTimeout>;
	function onContentChange(path: string, newContent: string) {
		const file = filesMap[path];
		if (file) {
			// Trigger reactivity by reassigning
			filesMap[path] = { content: newContent, dirty: true };
			saveStatus = 'unsaved';

			clearTimeout(saveTimeout);
			saveTimeout = setTimeout(() => saveFile(path), 2000);
		}
	}

	$effect(() => {
		return () => clearTimeout(saveTimeout);
	});

	function getFileName(path: string) {
		return path.split('/').filter(Boolean).pop() || path;
	}

	async function handleRunGame() {
		// Save all dirty files first
		const savePromises = Object.entries(filesMap)
			.filter(([_, file]) => file.dirty)
			.map(([path, _]) => saveFile(path));

		await Promise.all(savePromises);

		// Run the game preview
		if (gamePreview) {
			await gamePreview.runGame();
		}
	}


	function handleNewFile() {
		showNewFileDialog = true;
		newFilePath = '/src/';
	}

	function handleNewFolder() {
		showNewFolderDialog = true;
		newFolderPath = '/src/';
	}

	async function createNewFile() {
		if (!newFilePath.trim()) return;

		try {
			const response = await fetch(`/api/projects/${data.project.id}/files`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					path: newFilePath,
					content: '// New file\n'
				})
			});

			if (!response.ok) {
				const error = await response.json();
				alert(error.error || 'Failed to create file');
				return;
			}

			const { file } = await response.json();

			// Add to local file map
			filesMap[file.path] = { content: file.content, dirty: false };

			// Rebuild file tree
			fileTree.buildTree(Object.keys(filesMap));

			// Open the new file
			openFile(file.path);

			// Close dialog
			showNewFileDialog = false;
			newFilePath = '';
		} catch (error) {
			alert('Failed to create file: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	async function createNewFolder() {
		if (!newFolderPath.trim()) return;

		// Ensure folder path ends with /
		let folderPath = newFolderPath.trim();
		if (!folderPath.endsWith('/')) {
			folderPath += '/';
		}

		try {
			// Create a placeholder file in the folder (e.g., .gitkeep)
			const placeholderPath = folderPath + '.gitkeep';
			const response = await fetch(`/api/projects/${data.project.id}/files`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					path: placeholderPath,
					content: ''
				})
			});

			if (!response.ok) {
				const error = await response.json();
				alert(error.error || 'Failed to create folder');
				return;
			}

			const { file } = await response.json();

			// Add to local file map
			filesMap[file.path] = { content: file.content, dirty: false };

			// Rebuild file tree
			fileTree.buildTree(Object.keys(filesMap));

			// Close dialog
			showNewFolderDialog = false;
			newFolderPath = '';
		} catch (error) {
			alert('Failed to create folder: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	/**
	 * Refresh file content from database
	 */
	async function refreshFile(path: string) {
		try {
			const encodedPath = path.slice(1); // Remove leading slash for API
			const response = await fetch(`/api/projects/${data.project.id}/files/${encodedPath}`);

			if (!response.ok) {
				throw new Error('Failed to refresh file');
			}

			const { content } = await response.json();
			const file = filesMap[path];
			if (file) {
				// Trigger reactivity by reassigning
				filesMap[path] = { content, dirty: false };
				saveStatus = 'saved';
			}
		} catch (error) {
			console.error('Error refreshing file:', error);
		}
	}


	/**
	 * Handle file edit completion - auto-approved edits from AI
	 *
	 * CLIENT-SIDE EXECUTION: File content is already updated in filesMap by AI.
	 * We just need to persist to server.
	 *
	 * @param path - File path to update
	 * @param newContent - New content to apply
	 */
	async function handleFileEditCompleted(path: string, newContent?: string) {
		console.log('✅ [Client-Side Edit] Persisting to server:', path);

		// Update file content - MUST reassign to trigger Svelte 5 reactivity!
		if (newContent) {
			const file = filesMap[path];
			if (file) {
				filesMap[path] = { ...file, content: newContent };
			}
		}

		// Save to server
		const file = filesMap[path];
		if (file) {
			try {
				const response = await fetch(`/api/projects/${data.project.id}/files`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ path, content: file.content })
				});

				if (!response.ok) {
					throw new Error('Failed to save file');
				}

				// Trigger reactivity for dirty flag update
				filesMap[path] = { ...file, dirty: false };
				saveStatus = 'saved';
				console.log('✅ [Client-Side Edit] Saved to server successfully');
			} catch (error) {
				console.error('❌ [Client-Side Edit] Failed to save:', error);
				saveStatus = 'unsaved';
			}
		}
	}

	/**
	 * Handle file creation request from AI chat
	 *
	 * CLIENT-SIDE EXECUTION: File creation happens client-side for:
	 * - Instant reactivity - file appears in tree immediately
	 * - Client ownership - filesMap is source of truth
	 * - No race conditions - direct state updates
	 *
	 * SMART FALLBACK: If file exists, treat as overwrite (PUT instead of POST)
	 * This handles cases where AI uses createFile to rewrite an entire file.
	 */
	async function handleFileCreateRequest(
		path: string,
		content: string,
		approvalId: string,
		onApprove: () => void,
		onDeny: () => void
	) {
		const fileExists = path in filesMap;

		if (fileExists) {
			console.log('📝 File already exists, treating createFile as overwrite:', path);
		} else {
			console.log('📄 File creation requested:', path);
		}

		// Update local filesMap (works for both create and overwrite)
		filesMap[path] = { content, dirty: false };

		// Rebuild file tree to show new file (if it's actually new)
		if (!fileExists) {
			fileTree.buildTree(Object.keys(filesMap));
		}

		// Open the file
		openFile(path);

		// Persist to server
		try {
			// Use PUT if file exists (overwrite), POST if new file
			const method = fileExists ? 'PUT' : 'POST';
			const response = await fetch(`/api/projects/${data.project.id}/files`, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path, content })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to save file to server');
			}

			if (fileExists) {
				console.log('✅ File overwritten and saved to server:', path);
			} else {
				console.log('✅ File created and saved to server:', path);
			}
			onApprove();
		} catch (error) {
			console.error('❌ Failed to save file to server:', error);
			// File is still in UI, but server save failed
			// User can try to save again manually
			alert(`File ${fileExists ? 'overwrite' : 'creation'} failed: ${error instanceof Error ? error.message : String(error)}`);
			onDeny();
		}
	}

	/**
	 * Handle "Fix with AI" button from game error overlay
	 */
	function handleSendErrorToAI(errorMessage: string) {
		if (aiChatPanel) {
			aiChatPanel.sendMessage(errorMessage);
		}
	}
</script>

<div class="flex h-screen flex-col">
	<!-- Header -->
	<header class="flex items-center gap-4 border-b bg-background px-4 py-3">
		<a
			href="/dashboard"
			class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Dashboard
		</a>
		<div class="h-4 w-px bg-border"></div>
		<h1 class="text-lg font-semibold">{data.project.name}</h1>

		<div class="ml-auto flex items-center gap-3">
			<!-- Mode Toggle -->
			<div class="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
				<Label for="editor-mode" class="cursor-pointer text-xs font-medium">
					{editorMode === 'basic' ? 'Basic' : 'Advanced'}
				</Label>
				<Switch id="editor-mode" bind:checked={isAdvancedMode} />
			</div>

			<div class="h-6 w-px bg-border"></div>

			<span class="text-xs text-muted-foreground">
				{#if saveStatus === 'saving'}
					💾 Saving...
				{:else if saveStatus === 'saved'}
					✓ Saved
				{:else}
					• Unsaved changes
				{/if}
			</span>

			<!-- Multiplayer controls removed - now handled by Martini SDK in sandbox -->

			<button
				onclick={handleRunGame}
				class="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
			>
				<Play class="h-4 w-4" />
				Run Game
			</button>
		</div>
	</header>

	<!-- Editor Layout -->
	{#if editorMode === 'basic'}
		<!-- Basic Mode: Game Preview (left) + AI Chat (right) -->
		<Resizable.PaneGroup direction="horizontal" class="flex-1">
			<!-- Game Preview -->
			<Resizable.Pane defaultSize={60} minSize={40} maxSize={80}>
				<div class="h-full">
					<GamePreview
						bind:this={gamePreview}
						bind:hotReloadEnabled
						bind:iframeEl
						projectId={data.project.id}
						onRunGame={async () => {
							// Optional: Add any post-run callbacks here
						}}
						onSendErrorToAI={handleSendErrorToAI}
					/>
				</div>
			</Resizable.Pane>

			<Resizable.Handle withHandle />

			<!-- AI Chat -->
			<Resizable.Pane defaultSize={40} minSize={20} maxSize={60}>
				<AIChatPanel
					bind:this={aiChatPanel}
					projectId={data.project.id}
					onFileEditCompleted={handleFileEditCompleted}
					onFileCreateRequested={handleFileCreateRequest}
					hideToggles={true}
				/>
			</Resizable.Pane>
		</Resizable.PaneGroup>
	{:else}
		<!-- Advanced Mode: Full IDE Layout -->
		<Resizable.PaneGroup direction="horizontal" class="flex-1">
			<!-- Left Panel: File Tree + Asset Panel Sidebar -->
			<Resizable.Pane defaultSize={20} minSize={10} maxSize={25}>
				<Resizable.PaneGroup direction="vertical">
					<!-- File Tree -->
					<Resizable.Pane defaultSize={60} minSize={30}>
						<div class="h-full overflow-auto bg-muted/30">
							<FileTree onFileClick={openFile} onNewFile={handleNewFile} onNewFolder={handleNewFolder} />
						</div>
					</Resizable.Pane>

					<Resizable.Handle />

					<!-- Asset Panel -->
					<Resizable.Pane defaultSize={40} minSize={20}>
						<AssetPanel projectId={data.project.id} />
					</Resizable.Pane>
				</Resizable.PaneGroup>
			</Resizable.Pane>

			<Resizable.Handle withHandle />

			<!-- Middle Panel: Game Preview (top) + Code Editor (bottom) -->
			<Resizable.Pane defaultSize={45} minSize={40} maxSize={70}>
				<Resizable.PaneGroup direction="vertical">
					<!-- Game Preview -->
					<Resizable.Pane defaultSize={50} minSize={30}>
						<div class="h-full">
							<GamePreview
								bind:this={gamePreview}
								bind:hotReloadEnabled
								bind:iframeEl
								projectId={data.project.id}
								onRunGame={async () => {
									// Optional: Add any post-run callbacks here
								}}
								onSendErrorToAI={handleSendErrorToAI}
							/>
						</div>
					</Resizable.Pane>

					<Resizable.Handle withHandle />

					<!-- Code Editor -->
					<Resizable.Pane defaultSize={50} minSize={30}>
						<div class="flex h-full flex-col overflow-hidden">
							{#if activeFilePath && activeFilePath in filesMap}
								{@const file = filesMap[activeFilePath]!}
								<div class="border-b bg-muted/50 px-4 py-2">
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium">{getFileName(activeFilePath)}</span>
										{#if file.dirty}
											<span class="h-2 w-2 rounded-full bg-orange-500" title="Unsaved changes"></span>
										{/if}
									</div>
									<span class="text-xs text-muted-foreground">{activeFilePath}</span>
								</div>
								<div class="flex-1 overflow-auto">
									<CodeEditor
										bind:this={codeEditor}
										bind:content={file.content}
										onChange={(newContent) => {
											if (activeFilePath) onContentChange(activeFilePath, newContent);
										}}
										filePath={activeFilePath}
									/>
								</div>
							{:else}
								<div class="flex h-full items-center justify-center text-muted-foreground">
									<div class="text-center">
										<p class="text-lg">No file selected</p>
										<p class="mt-2 text-sm">Click a file in the tree to start editing</p>
									</div>
								</div>
							{/if}
						</div>
					</Resizable.Pane>
				</Resizable.PaneGroup>
			</Resizable.Pane>

			<Resizable.Handle withHandle />

			<!-- Right Panel: AI Chat -->
			<Resizable.Pane defaultSize={35} minSize={20} maxSize={40}>
				<AIChatPanel
					bind:this={aiChatPanel}
					projectId={data.project.id}
					onFileEditCompleted={handleFileEditCompleted}
					onFileCreateRequested={handleFileCreateRequest}
				/>
			</Resizable.Pane>
		</Resizable.PaneGroup>
	{/if}

	<!-- Status Bar -->
	<footer class="flex items-center gap-4 border-t bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
		<span>CodeMirror 6</span>
		{#if activeFilePath}
			<span>•</span>
			<span>{activeFilePath}</span>
			{@const file = filesMap[activeFilePath]}
			{#if file}
				<span>•</span>
				<span>{file.content.split('\n').length} lines</span>
			{/if}
		{/if}
	</footer>
</div>

<!-- New File Dialog -->
{#if showNewFileDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
			<h3 class="mb-4 text-lg font-semibold">Create New File</h3>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					createNewFile();
				}}
			>
				<div class="mb-4">
					<label for="filePath" class="mb-2 block text-sm font-medium">File Path</label>
					<input
						id="filePath"
						type="text"
						bind:value={newFilePath}
						placeholder="/src/myfile.js"
						required
						class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
					/>
					<p class="mt-1 text-xs text-muted-foreground">
						Must start with / (e.g., /src/entities/Enemy.js)
					</p>
				</div>
				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => {
							showNewFileDialog = false;
							newFilePath = '';
						}}
						class="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-muted"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
					>
						Create
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- New Folder Dialog -->
{#if showNewFolderDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
			<h3 class="mb-4 text-lg font-semibold">Create New Folder</h3>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					createNewFolder();
				}}
			>
				<div class="mb-4">
					<label for="folderPath" class="mb-2 block text-sm font-medium">Folder Path</label>
					<input
						id="folderPath"
						type="text"
						bind:value={newFolderPath}
						placeholder="/src/myfolder"
						required
						class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
					/>
					<p class="mt-1 text-xs text-muted-foreground">
						Must start with / (e.g., /src/entities)
					</p>
				</div>
				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => {
							showNewFolderDialog = false;
							newFolderPath = '';
						}}
						class="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-muted"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
					>
						Create
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
