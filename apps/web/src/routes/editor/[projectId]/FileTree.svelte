<script lang="ts">
	import * as TreeView from '$lib/components/ui/tree-view';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import { FilePlus, FolderPlus } from 'lucide-svelte';
	import { fileTree, type FileNode } from '$lib/stores/fileTree.svelte';

	let { onFileClick, onNewFile, onNewFolder } = $props<{
		onFileClick: (path: string) => void;
		onNewFile: () => void;
		onNewFolder: () => void;
	}>();

	function renderFiles(nodes: FileNode[]) {
		return nodes.map((node) => ({
			node,
			isActive: fileTree.activeFile === node.path
		}));
	}

	function handleFileClick(path: string, type: 'file' | 'folder') {
		if (type === 'file') {
			onFileClick(path);
		}
	}

	// Context menu handlers
	function handleRename(path: string) {
		const newName = prompt('Enter new name:', path.split('/').pop());
		if (newName) {
			console.log('Rename:', path, 'to', newName);
			// TODO: Implement rename functionality
		}
	}

	function handleDelete(path: string) {
		if (confirm(`Are you sure you want to delete ${path}?`)) {
			console.log('Delete:', path);
			// TODO: Implement delete functionality
		}
	}

	function handleDuplicate(path: string) {
		console.log('Duplicate:', path);
		// TODO: Implement duplicate functionality
	}
</script>

<div class="h-full overflow-auto border-r bg-muted/30 p-3">
	<div class="mb-2 flex items-center justify-between">
		<div class="text-xs font-semibold uppercase text-muted-foreground">Files</div>
		<div class="flex items-center gap-1">
			<button
				onclick={onNewFolder}
				class="rounded p-1 hover:bg-muted"
				title="New folder"
			>
				<FolderPlus class="h-4 w-4 text-muted-foreground" />
			</button>
			<button
				onclick={onNewFile}
				class="rounded p-1 hover:bg-muted"
				title="New file"
			>
				<FilePlus class="h-4 w-4 text-muted-foreground" />
			</button>
		</div>
	</div>
	<TreeView.Root>
		{#each fileTree.files as node}
			{#if node.type === 'folder'}
				<ContextMenu.Root>
					<ContextMenu.Trigger class="w-full">
						<TreeView.Folder name={node.name}>
							{#if node.children}
								{#each node.children as child}
									{#if child.type === 'folder'}
										<ContextMenu.Root>
											<ContextMenu.Trigger class="w-full">
												<TreeView.Folder name={child.name}>
													{#if child.children}
														{#each child.children as grandchild}
															<ContextMenu.Root>
																<ContextMenu.Trigger class="w-full">
																	<TreeView.File
																		name={grandchild.name}
																		onclick={() => handleFileClick(grandchild.path, grandchild.type)}
																	/>
																</ContextMenu.Trigger>
																<ContextMenu.Content class="w-48">
																	<ContextMenu.Item onclick={() => handleRename(grandchild.path)}>
																		Rename
																	</ContextMenu.Item>
																	<ContextMenu.Item onclick={() => handleDuplicate(grandchild.path)}>
																		Duplicate
																	</ContextMenu.Item>
																	<ContextMenu.Separator />
																	<ContextMenu.Item onclick={() => handleDelete(grandchild.path)} class="text-red-600">
																		Delete
																	</ContextMenu.Item>
																</ContextMenu.Content>
															</ContextMenu.Root>
														{/each}
													{/if}
												</TreeView.Folder>
											</ContextMenu.Trigger>
											<ContextMenu.Content class="w-48">
												<ContextMenu.Item onclick={onNewFile}>
													New File
												</ContextMenu.Item>
												<ContextMenu.Item onclick={onNewFolder}>
													New Folder
												</ContextMenu.Item>
												<ContextMenu.Separator />
												<ContextMenu.Item onclick={() => handleRename(child.path)}>
													Rename
												</ContextMenu.Item>
												<ContextMenu.Separator />
												<ContextMenu.Item onclick={() => handleDelete(child.path)} class="text-red-600">
													Delete
												</ContextMenu.Item>
											</ContextMenu.Content>
										</ContextMenu.Root>
									{:else}
										<ContextMenu.Root>
											<ContextMenu.Trigger class="w-full">
												<TreeView.File
													name={child.name}
													onclick={() => handleFileClick(child.path, child.type)}
												/>
											</ContextMenu.Trigger>
											<ContextMenu.Content class="w-48">
												<ContextMenu.Item onclick={() => handleRename(child.path)}>
													Rename
												</ContextMenu.Item>
												<ContextMenu.Item onclick={() => handleDuplicate(child.path)}>
													Duplicate
												</ContextMenu.Item>
												<ContextMenu.Separator />
												<ContextMenu.Item onclick={() => handleDelete(child.path)} class="text-red-600">
													Delete
												</ContextMenu.Item>
											</ContextMenu.Content>
										</ContextMenu.Root>
									{/if}
								{/each}
							{/if}
						</TreeView.Folder>
					</ContextMenu.Trigger>
					<ContextMenu.Content class="w-48">
						<ContextMenu.Item onclick={onNewFile}>
							New File
						</ContextMenu.Item>
						<ContextMenu.Item onclick={onNewFolder}>
							New Folder
						</ContextMenu.Item>
						<ContextMenu.Separator />
						<ContextMenu.Item onclick={() => handleRename(node.path)}>
							Rename
						</ContextMenu.Item>
						<ContextMenu.Separator />
						<ContextMenu.Item onclick={() => handleDelete(node.path)} class="text-red-600">
							Delete
						</ContextMenu.Item>
					</ContextMenu.Content>
				</ContextMenu.Root>
			{:else}
				<ContextMenu.Root>
					<ContextMenu.Trigger class="w-full">
						<TreeView.File
							name={node.name}
							onclick={() => handleFileClick(node.path, node.type)}
						/>
					</ContextMenu.Trigger>
					<ContextMenu.Content class="w-48">
						<ContextMenu.Item onclick={() => handleRename(node.path)}>
							Rename
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => handleDuplicate(node.path)}>
							Duplicate
						</ContextMenu.Item>
						<ContextMenu.Separator />
						<ContextMenu.Item onclick={() => handleDelete(node.path)} class="text-red-600">
							Delete
						</ContextMenu.Item>
					</ContextMenu.Content>
				</ContextMenu.Root>
			{/if}
		{/each}
	</TreeView.Root>
</div>
