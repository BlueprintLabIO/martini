<script lang="ts">
	import { Upload, Image, Music, Trash2, Copy, Info, Plus, Download } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import * as Collapsible from '$lib/components/ui/collapsible';

	let { projectId } = $props<{ projectId: string }>();

	type Asset = {
		id: string;
		filename: string;
		fileType: 'image' | 'audio';
		assetType: string;
		sizeBytes: number;
		url: string;
		createdAt?: string;
		path?: string;
		isStarter?: boolean;
	};

	let assets = $state<Asset[]>([]);
	let starterAssets = $state<{ spritesheets: Asset[]; sounds: Asset[]; total: number }>({
		spritesheets: [],
		sounds: [],
		total: 0
	});
	let isLoading = $state(false);
	let isLoadingStarter = $state(false);
	let uploadError = $state<string | null>(null);
	let showUploadModal = $state(false);
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let selectedFile = $state<File | null>(null);
	let dragOver = $state(false);
	let imageLoadErrors = $state<Set<string>>(new Set());
	let copyingAssets = $state<Set<string>>(new Set());

	// Collapsible sections
	let myUploadsOpen = $state(true);
	let starterPackOpen = $state(true);

	onMount(() => {
		loadAssets();
		loadStarterAssets();
	});

	async function loadAssets() {
		isLoading = true;
		try {
			const response = await fetch(`/api/projects/${projectId}/assets`);
			if (response.ok) {
				const data = await response.json();
				assets = data.assets;
			} else {
				console.error('Failed to load assets');
			}
		} catch (error) {
			console.error('Error loading assets:', error);
		} finally {
			isLoading = false;
		}
	}

	async function loadStarterAssets() {
		isLoadingStarter = true;
		try {
			const response = await fetch('/api/starter-assets');
			if (response.ok) {
				const data = await response.json();
				starterAssets = data.assets;
			} else {
				console.error('Failed to load starter assets');
			}
		} catch (error) {
			console.error('Error loading starter assets:', error);
		} finally {
			isLoadingStarter = false;
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			selectedFile = input.files[0];
			validateAndShowPreview();
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;

		const file = event.dataTransfer?.files[0];
		if (file) {
			selectedFile = file;
			validateAndShowPreview();
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function validateAndShowPreview() {
		if (!selectedFile) return;

		// Validate file type
		const allowedTypes = [
			'image/png',
			'image/jpeg',
			'image/jpg',
			'image/gif',
			'image/webp',
			'audio/mpeg',
			'audio/mp3',
			'audio/wav',
			'audio/ogg'
		];

		if (!allowedTypes.includes(selectedFile.type)) {
			uploadError = 'Invalid file type. Please upload an image (PNG, JPEG, GIF, WebP) or audio (MP3, WAV, OGG).';
			selectedFile = null;
			return;
		}

		// Validate file size (5MB)
		if (selectedFile.size > 5 * 1024 * 1024) {
			uploadError = `File too large (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB.`;
			selectedFile = null;
			return;
		}

		uploadError = null;
		showUploadModal = true;
	}

	async function uploadAsset() {
		if (!selectedFile) return;

		isUploading = true;
		uploadProgress = 0;
		uploadError = null;

		try {
			const formData = new FormData();
			formData.append('file', selectedFile);

			// Simulate progress (real progress would need XMLHttpRequest or fetch with ReadableStream)
			const progressInterval = setInterval(() => {
				if (uploadProgress < 90) {
					uploadProgress += 10;
				}
			}, 100);

			const response = await fetch(`/api/projects/${projectId}/assets`, {
				method: 'POST',
				body: formData
			});

			clearInterval(progressInterval);
			uploadProgress = 100;

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.details || error.error || 'Upload failed');
			}

			const { asset } = await response.json();
			assets = [...assets, asset];

			// Close modal and reset
			showUploadModal = false;
			selectedFile = null;
			uploadProgress = 0;
		} catch (error) {
			uploadError = error instanceof Error ? error.message : 'Upload failed';
		} finally {
			isUploading = false;
		}
	}

	async function deleteAsset(assetId: string, filename: string) {
		if (!confirm(`Delete "${filename}"? This cannot be undone.`)) {
			return;
		}

		try {
			const response = await fetch(`/api/projects/${projectId}/assets/${assetId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				assets = assets.filter((a) => a.id !== assetId);
			} else {
				const error = await response.json();
				alert(`Failed to delete: ${error.error}`);
			}
		} catch (error) {
			alert('Failed to delete asset');
		}
	}

	function copyCodeSnippet(asset: Asset) {
		const assetName = asset.filename.replace(/\.[^/.]+$/, ''); // Remove extension
		let code = '';

		if (asset.fileType === 'image') {
			code = `// In your scene's create() method:\nthis.add.sprite(100, 100, '${assetName}');`;
		} else if (asset.fileType === 'audio') {
			code = `// In your scene:\nthis.sound.play('${assetName}');`;
		}

		navigator.clipboard.writeText(code);
		alert('Code snippet copied to clipboard!');
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function getAssetIcon(fileType: string) {
		return fileType === 'image' ? Image : Music;
	}

	function handleImageError(assetId: string) {
		imageLoadErrors = new Set([...imageLoadErrors, assetId]);
	}

	const imageAssets = $derived(assets.filter((a) => a.fileType === 'image'));
	const audioAssets = $derived(assets.filter((a) => a.fileType === 'audio'));
</script>

<div class="flex h-full flex-col bg-muted/30">
	<!-- Header -->
	<div class="flex items-center justify-between border-b bg-background px-3 py-2">
		<h3 class="text-sm font-semibold">Assets</h3>
		<button
			onclick={() => {
				const input = document.getElementById('asset-file-input') as HTMLInputElement;
				input?.click();
			}}
			class="flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700"
			title="Upload asset"
		>
			<Upload class="h-3 w-3" />
			Upload
		</button>
	</div>

	<!-- Hidden file input -->
	<input
		id="asset-file-input"
		type="file"
		accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,audio/mpeg,audio/mp3,audio/wav,audio/ogg"
		onchange={handleFileSelect}
		class="hidden"
	/>

	<!-- Asset List -->
	<div class="flex-1 overflow-auto p-2">
		{#if isLoading}
			<div class="flex items-center justify-center py-8">
				<div class="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
			</div>
		{:else}
			<!-- My Uploads Section -->
			<Collapsible.Root bind:open={myUploadsOpen}>
				<Collapsible.Trigger class="flex w-full items-center gap-1 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
					<span class="text-lg transition-transform" class:rotate-90={myUploadsOpen}>›</span>
					📂 My Uploads ({assets.length})
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="mt-2 space-y-1">
						{#if assets.length === 0}
							<p class="py-4 text-center text-xs text-muted-foreground">
								No assets yet. Upload images or sounds to use in your game!
							</p>
						{:else}
							<!-- Images -->
							{#if imageAssets.length > 0}
								<div class="mb-3">
									<p class="mb-1 text-xs font-medium text-muted-foreground">Images</p>
									{#each imageAssets as asset (asset.id)}
										<div
											class="group flex items-center gap-2 rounded border border-transparent bg-muted/50 p-2 hover:border-purple-500/50 hover:bg-muted"
										>
											<!-- Thumbnail with fallback -->
											{#if imageLoadErrors.has(asset.id)}
												<div class="flex h-8 w-8 items-center justify-center rounded border border-border bg-background">
													<Image class="h-4 w-4 text-purple-500" />
												</div>
											{:else}
												<img
													src={asset.url}
													alt={asset.filename}
													class="h-8 w-8 rounded border border-border object-cover"
													onerror={() => handleImageError(asset.id)}
												/>
											{/if}

											<!-- Info -->
											<div class="flex-1 min-w-0">
												<p class="truncate text-xs font-medium">
													{asset.filename}
												</p>
												<p class="text-xs text-muted-foreground">
													{formatFileSize(asset.sizeBytes)}
												</p>
											</div>

											<!-- Actions -->
											<div class="flex gap-1 opacity-0 group-hover:opacity-100">
												<button
													onclick={() => copyCodeSnippet(asset)}
													class="rounded p-1 hover:bg-background"
													title="Copy code snippet"
												>
													<Copy class="h-3 w-3" />
												</button>
												<button
													onclick={() => deleteAsset(asset.id, asset.filename)}
													class="rounded p-1 hover:bg-red-500/10 hover:text-red-500"
													title="Delete asset"
												>
													<Trash2 class="h-3 w-3" />
												</button>
											</div>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Audio -->
							{#if audioAssets.length > 0}
								<div>
									<p class="mb-1 text-xs font-medium text-muted-foreground">Audio</p>
									{#each audioAssets as asset (asset.id)}
										<div
											class="group flex items-center gap-2 rounded border border-transparent bg-muted/50 p-2 hover:border-purple-500/50 hover:bg-muted"
										>
											<!-- Icon -->
											<div class="flex h-8 w-8 items-center justify-center rounded border border-border bg-background">
												<Music class="h-4 w-4 text-purple-500" />
											</div>

											<!-- Info -->
											<div class="flex-1 min-w-0">
												<p class="truncate text-xs font-medium">
													{asset.filename}
												</p>
												<p class="text-xs text-muted-foreground">
													{formatFileSize(asset.sizeBytes)}
												</p>
											</div>

											<!-- Actions -->
											<div class="flex gap-1 opacity-0 group-hover:opacity-100">
												<button
													onclick={() => copyCodeSnippet(asset)}
													class="rounded p-1 hover:bg-background"
													title="Copy code snippet"
												>
													<Copy class="h-3 w-3" />
												</button>
												<button
													onclick={() => deleteAsset(asset.id, asset.filename)}
													class="rounded p-1 hover:bg-red-500/10 hover:text-red-500"
													title="Delete asset"
												>
													<Trash2 class="h-3 w-3" />
												</button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						{/if}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- Starter Pack Section (TODO: Phase 2) -->
			<Collapsible.Root bind:open={starterPackOpen} class="mt-4">
				<Collapsible.Trigger class="flex w-full items-center gap-1 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
					<span class="text-lg transition-transform" class:rotate-90={starterPackOpen}>›</span>
					📦 Starter Pack (Coming Soon)
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="mt-2">
						<p class="py-4 text-center text-xs text-muted-foreground">
							Free sprites and sounds coming soon!
						</p>
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		{/if}
	</div>

	<!-- Info Footer -->
	<div class="border-t bg-muted/50 px-3 py-2">
		<p class="flex items-center gap-1 text-xs text-muted-foreground">
			<Info class="h-3 w-3" />
			Max 5MB per file
		</p>
	</div>
</div>

<!-- Upload Modal -->
{#if showUploadModal && selectedFile}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
			<h3 class="mb-4 text-lg font-semibold">Upload Asset</h3>

			<!-- Preview -->
			<div class="mb-4 rounded border bg-muted/30 p-4">
				{#if selectedFile.type.startsWith('image/')}
					<img
						src={URL.createObjectURL(selectedFile)}
						alt="Preview"
						class="mx-auto max-h-48 rounded"
					/>
				{:else}
					<div class="flex items-center justify-center py-8">
						<Music class="h-16 w-16 text-purple-500" />
					</div>
				{/if}

				<div class="mt-3 text-center">
					<p class="text-sm font-medium">{selectedFile.name}</p>
					<p class="text-xs text-muted-foreground">
						{formatFileSize(selectedFile.size)} • {selectedFile.type}
					</p>
				</div>
			</div>

			<!-- Progress Bar -->
			{#if isUploading}
				<div class="mb-4">
					<div class="h-2 overflow-hidden rounded-full bg-muted">
						<div
							class="h-full bg-purple-600 transition-all duration-300"
							style="width: {uploadProgress}%"
						></div>
					</div>
					<p class="mt-1 text-center text-xs text-muted-foreground">
						Uploading... {uploadProgress}%
					</p>
				</div>
			{/if}

			<!-- Error -->
			{#if uploadError}
				<div class="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
					{uploadError}
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex gap-3">
				<button
					onclick={() => {
						showUploadModal = false;
						selectedFile = null;
						uploadError = null;
					}}
					disabled={isUploading}
					class="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					onclick={uploadAsset}
					disabled={isUploading}
					class="flex-1 rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
				>
					{isUploading ? 'Uploading...' : 'Upload'}
				</button>
			</div>
		</div>
	</div>
{/if}
