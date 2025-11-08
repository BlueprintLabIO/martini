<script lang="ts">
	import * as TreeView from '$lib/components/ui/tree-view';
	import { FilePlus } from 'lucide-svelte';
	import { fileTree, type FileNode } from '$lib/stores/fileTree.svelte';

	let { onFileClick, onNewFile } = $props<{
		onFileClick: (path: string) => void;
		onNewFile: () => void;
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
</script>

<div class="h-full overflow-auto border-r bg-muted/30 p-3">
	<div class="mb-2 flex items-center justify-between">
		<div class="text-xs font-semibold uppercase text-muted-foreground">Files</div>
		<button
			onclick={onNewFile}
			class="rounded p-1 hover:bg-muted"
			title="New file"
		>
			<FilePlus class="h-4 w-4 text-muted-foreground" />
		</button>
	</div>
	<TreeView.Root>
		{#each fileTree.files as node}
			{#if node.type === 'folder'}
				<TreeView.Folder name={node.name}>
					{#if node.children}
						{#each node.children as child}
							{#if child.type === 'folder'}
								<TreeView.Folder name={child.name}>
									{#if child.children}
										{#each child.children as grandchild}
											<TreeView.File
												name={grandchild.name}
												onclick={() => handleFileClick(grandchild.path, grandchild.type)}
											/>
										{/each}
									{/if}
								</TreeView.Folder>
							{:else}
								<TreeView.File
									name={child.name}
									onclick={() => handleFileClick(child.path, child.type)}
								/>
							{/if}
						{/each}
					{/if}
				</TreeView.Folder>
			{:else}
				<TreeView.File
					name={node.name}
					onclick={() => handleFileClick(node.path, node.type)}
				/>
			{/if}
		{/each}
	</TreeView.Root>
</div>
