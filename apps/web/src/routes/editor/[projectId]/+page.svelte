<script lang="ts">
	import FileTree from './FileTree.svelte';
	import CodeEditor from './CodeEditor.svelte';
	import GamePreview from './GamePreview.svelte';
	import AIChatPanel from './AIChatPanel.svelte';
	import AssetPanel from './AssetPanel.svelte';
	import DocsPanel from './DocsPanel.svelte';
	import { fileTree } from '$lib/stores/fileTree.svelte';
	import { onMount } from 'svelte';
	import { ArrowLeft, Play, BookOpen, MessageSquare } from 'lucide-svelte';
	import * as Resizable from '$lib/components/ui/resizable/index.js';

	let { data } = $props();

	let filesMap = $state<Map<string, { content: string; dirty: boolean }>>(new Map());
	let activeFilePath = $state<string | null>(null);
	let saveStatus = $state<'saved' | 'saving' | 'unsaved'>('saved');
	let gamePreview: GamePreview;
	let showNewFileDialog = $state(false);
	let newFilePath = $state('');
	let hotReloadEnabled = $state(true); // Auto-on by default

	// Diff mode state for AI file edits
	let diffMode = $state(false);
	let originalContent = $state('');
	let pendingApproval: {
		path: string;
		approvalId: string;
		onApprove: () => void;
		onDeny: () => void;
	} | null = $state(null);

	// Bottom panel toggle (AI Chat vs Docs)
	let bottomPanelView = $state<'chat' | 'docs'>('chat');

	onMount(() => {
		// Build file tree from paths
		fileTree.buildTree(data.files.map((f) => f.path));

		// Load files into map
		data.files.forEach((file) => {
			filesMap.set(file.path, { content: file.content, dirty: false });
		});

		// Open first file by default
		if (data.files.length > 0) {
			openFile(data.files[0].path);
		}
	});

	function openFile(path: string) {
		activeFilePath = path;
		fileTree.setActiveFile(path);
	}

	async function saveFile(path: string) {
		const file = filesMap.get(path);
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

			file.dirty = false;
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
		const file = filesMap.get(path);
		if (file) {
			file.content = newContent;
			file.dirty = true;
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
		const savePromises = Array.from(filesMap.entries())
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
			filesMap.set(file.path, { content: file.content, dirty: false });

			// Rebuild file tree
			fileTree.buildTree(Array.from(filesMap.keys()));

			// Open the new file
			openFile(file.path);

			// Close dialog
			showNewFileDialog = false;
			newFilePath = '';
		} catch (error) {
			alert('Failed to create file: ' + (error instanceof Error ? error.message : String(error)));
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
			const file = filesMap.get(path);
			if (file) {
				file.content = content;
				file.dirty = false;
				saveStatus = 'saved';
			}
		} catch (error) {
			console.error('Error refreshing file:', error);
		}
	}

	/**
	 * Handle file edit request from AI chat
	 */
	function handleFileEditRequest(
		path: string,
		oldContent: string,
		newContent: string,
		approvalId: string,
		onApprove: () => void,
		onDeny: () => void
	) {
		console.log('📝 File edit requested:', path);
		console.log('🔍 Debug - oldContent length:', oldContent.length);
		console.log('🔍 Debug - newContent length:', newContent.length);

		// Switch to the file if not already open
		if (activeFilePath !== path) {
			openFile(path);
		}

		// Update file content to new version (for diff view)
		const file = filesMap.get(path);
		if (file) {
			originalContent = oldContent;
			file.content = newContent;
			diffMode = true;
			pendingApproval = { path, approvalId, onApprove, onDeny };
			console.log('✅ Diff mode enabled:', { diffMode, originalContent: originalContent.slice(0, 50), pendingApproval });
		} else {
			console.error('❌ File not found in filesMap:', path);
		}
	}

	/**
	 * Handle file edit completion (after approval or auto-apply)
	 */
	async function handleFileEditCompleted(path: string) {
		console.log('✅ File edit completed:', path);
		await refreshFile(path);
		diffMode = false;
		pendingApproval = null;
	}

	/**
	 * Approve diff changes
	 */
	function handleApproveDiff() {
		if (pendingApproval) {
			console.log('✅ User approved changes');
			pendingApproval.onApprove();
			diffMode = false;
			// Refresh file after approval to ensure DB is synced
			if (activeFilePath) {
				refreshFile(activeFilePath);
			}
			pendingApproval = null;
		}
	}

	/**
	 * Deny diff changes
	 */
	function handleDenyDiff() {
		if (pendingApproval) {
			console.log('❌ User denied changes');
			pendingApproval.onDeny();
			// Restore original content
			const file = filesMap.get(pendingApproval.path);
			if (file) {
				file.content = originalContent;
			}
			diffMode = false;
			pendingApproval = null;
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
			<span class="text-xs text-muted-foreground">
				{#if saveStatus === 'saving'}
					💾 Saving...
				{:else if saveStatus === 'saved'}
					✓ Saved
				{:else}
					• Unsaved changes
				{/if}
			</span>
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
	<Resizable.PaneGroup direction="horizontal" class="flex-1">
		<!-- File Tree + Asset Panel Sidebar -->
		<Resizable.Pane defaultSize={15} minSize={10} maxSize={25}>
			<Resizable.PaneGroup direction="vertical">
				<!-- File Tree -->
				<Resizable.Pane defaultSize={60} minSize={30}>
					<div class="h-full overflow-auto bg-muted/30">
						<FileTree onFileClick={openFile} onNewFile={handleNewFile} />
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

		<!-- Code Editor -->
		<Resizable.Pane defaultSize={35} minSize={25} maxSize={60}>
			<div class="flex h-full flex-col overflow-hidden">
				{#if activeFilePath && filesMap.has(activeFilePath)}
					{@const file = filesMap.get(activeFilePath)!}
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
							bind:content={file.content}
							onChange={(newContent) => {
								if (activeFilePath) onContentChange(activeFilePath, newContent);
							}}
							bind:diffMode
							{originalContent}
							onApproveDiff={handleApproveDiff}
							onDenyDiff={handleDenyDiff}
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

		<Resizable.Handle withHandle />

		<!-- Right Panel: Game Preview + AI Chat -->
		<Resizable.Pane defaultSize={50} minSize={30}>
			<Resizable.PaneGroup direction="vertical">
				<!-- Game Preview -->
				<Resizable.Pane defaultSize={60} minSize={30}>
					<div class="h-full">
						<GamePreview
							bind:this={gamePreview}
							bind:hotReloadEnabled
							projectId={data.project.id}
							onRunGame={async () => {
								// Optional: Add any post-run callbacks here
							}}
						/>
					</div>
				</Resizable.Pane>

				<Resizable.Handle withHandle />

				<!-- Bottom Panel: AI Chat + Docs -->
				<Resizable.Pane defaultSize={40} minSize={20} maxSize={70}>
					<div class="flex h-full flex-col">
						<!-- Tab Bar -->
						<div class="flex border-b bg-muted/30">
							<button
								class="flex items-center gap-2 px-4 py-2 text-sm transition-colors {bottomPanelView === 'chat' ? 'border-b-2 border-purple-500 bg-background font-medium' : 'text-muted-foreground hover:text-foreground'}"
								onclick={() => bottomPanelView = 'chat'}
							>
								<MessageSquare class="h-4 w-4" />
								AI Assistant
							</button>
							<button
								class="flex items-center gap-2 px-4 py-2 text-sm transition-colors {bottomPanelView === 'docs' ? 'border-b-2 border-purple-500 bg-background font-medium' : 'text-muted-foreground hover:text-foreground'}"
								onclick={() => bottomPanelView = 'docs'}
							>
								<BookOpen class="h-4 w-4" />
								Quick Reference
							</button>
						</div>

						<!-- Panel Content -->
						<div class="flex-1 overflow-hidden">
							{#if bottomPanelView === 'chat'}
								<AIChatPanel
									projectId={data.project.id}
									onFileEditRequested={handleFileEditRequest}
									onFileEditCompleted={handleFileEditCompleted}
								/>
							{:else}
								<DocsPanel
									onInsertCode={(code) => {
										// Insert code into active file at cursor position
										if (activeFilePath) {
											const file = filesMap.get(activeFilePath);
											if (file) {
												file.content += '\n\n' + code;
												file.dirty = true;
												saveStatus = 'unsaved';
											}
										}
									}}
								/>
							{/if}
						</div>
					</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</Resizable.Pane>
	</Resizable.PaneGroup>

	<!-- Status Bar -->
	<footer class="flex items-center gap-4 border-t bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
		<span>CodeMirror 6</span>
		{#if activeFilePath}
			<span>•</span>
			<span>{activeFilePath}</span>
			{@const file = filesMap.get(activeFilePath)}
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
						autofocus
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
