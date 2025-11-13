<script lang="ts">
	/**
	 * ChatInputArea - Handles user input and chat controls
	 *
	 * Includes:
	 * - Auto-expanding textarea
	 * - Send/Stop buttons
	 * - Mode toggles (Quick/Safe, Plan/Act)
	 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
	 */

	import { Pause, Play, StopCircle, Image as ImageIcon, X } from 'lucide-svelte';

	let {
		input = $bindable(),
		isStreaming,
		planMode,
		hideToggles = false,
		projectId,
		attachedImages = $bindable(),
		onSubmit,
		onStop,
		onTogglePlanMode
	}: {
		input: string;
		isStreaming: boolean;
		planMode: boolean;
		hideToggles?: boolean;
		projectId: string;
		attachedImages: Array<{ url: string; filename: string; id: string; mediaType: string }>;
		onSubmit: (e: Event) => void;
		onStop: () => void;
		onTogglePlanMode: () => void;
	} = $props();

	let textareaElement: HTMLTextAreaElement | null = $state(null);
	let fileInputElement: HTMLInputElement | null = $state(null);
	let uploadingImage = $state(false);
	let uploadError = $state<string | null>(null);

	// Auto-expand textarea as user types
	function handleTextareaInput() {
		if (textareaElement) {
			textareaElement.style.height = 'auto';
			textareaElement.style.height = Math.min(textareaElement.scrollHeight, 200) + 'px';
		}
	}

	// Reset textarea height when input is cleared
	$effect(() => {
		if (!input && textareaElement) {
			textareaElement.style.height = 'auto';
		}
	})

	// Handle Enter key to send (Shift+Enter for new line)
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			// Only handle Enter if the textarea itself is focused
			if (e.target !== textareaElement) return;

			e.preventDefault();
			if (!isStreaming && input.trim()) {
				onSubmit(e);
			}
		}
	}

	// Handle paste event for images
	async function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		for (const item of items) {
			if (item.type.startsWith('image/')) {
				e.preventDefault();
				const file = item.getAsFile();
				if (file) {
					await uploadImage(file);
				}
				break;
			}
		}
	}

	// Handle file selection from button
	function handleImageButtonClick() {
		fileInputElement?.click();
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			await uploadImage(file);
		}
		// Reset input so same file can be selected again
		input.value = '';
	}

	// Upload image to server
	async function uploadImage(file: File) {
		// Validate file type
		const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			uploadError = 'Only PNG, JPEG, GIF, and WebP images are supported';
			setTimeout(() => uploadError = null, 3000);
			return;
		}

		// Validate file size (5MB)
		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			uploadError = `Image is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum is 5MB.`;
			setTimeout(() => uploadError = null, 3000);
			return;
		}

		uploadingImage = true;
		uploadError = null;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const res = await fetch(`/api/projects/${projectId}/chat-images`, {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to upload image');
			}

			const data = await res.json();
			attachedImages = [...attachedImages, {
				id: data.asset.id,
				url: data.asset.url,
				filename: data.asset.filename,
				mediaType: data.asset.mediaType
			}];
		} catch (error) {
			uploadError = error instanceof Error ? error.message : 'Failed to upload image';
			setTimeout(() => uploadError = null, 3000);
		} finally {
			uploadingImage = false;
		}
	}

	// Remove attached image
	function removeImage(id: string) {
		attachedImages = attachedImages.filter(img => img.id !== id);
	}
</script>

<div class="input-area">
	<!-- Image Previews -->
	{#if attachedImages.length > 0}
		<div class="image-previews">
			{#each attachedImages as image (image.id)}
				<div class="image-preview">
					<img src={image.url} alt={image.filename} />
					<button
						type="button"
						class="remove-image-btn"
						onclick={() => removeImage(image.id)}
						title="Remove image"
					>
						<X class="h-3 w-3" />
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Error Message -->
	{#if uploadError}
		<div class="upload-error">
			{uploadError}
		</div>
	{/if}

	<form class="input-form" onsubmit={onSubmit}>
		<textarea
			bind:value={input}
			bind:this={textareaElement}
			oninput={handleTextareaInput}
			onkeydown={handleKeyDown}
			onpaste={handlePaste}
			placeholder={isStreaming
				? 'AI is thinking... (type to queue next message)'
				: 'Press Enter to send, Shift+Enter for new line, Paste or click 📎 to add images'}
			autocomplete="off"
			rows="1"
		></textarea>
	</form>

	<!-- Hidden file input -->
	<input
		type="file"
		bind:this={fileInputElement}
		onchange={handleFileSelect}
		accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
		style="display: none;"
	/>

	<!-- Controls Row -->
	<div class="controls-row">
		<div class="left-controls">
			{#if !hideToggles}
				<div class="mode-toggles">
					<!-- Plan/Act Mode Toggle -->
					<button
						class="mode-toggle-btn"
						class:active={planMode}
						onclick={onTogglePlanMode}
						title={planMode
							? 'Plan Mode: Generate game specs and documentation'
							: 'Act Mode: Generate and edit game code'}
						type="button"
					>
						{#if planMode}
							<Pause class="h-4 w-4" />
							<span>Plan</span>
						{:else}
							<Play class="h-4 w-4" />
							<span>Act</span>
						{/if}
					</button>
				</div>
			{/if}

			<!-- Image Upload Button -->
			<button
				type="button"
				class="image-upload-btn"
				onclick={handleImageButtonClick}
				disabled={uploadingImage}
				title="Upload image (or paste)"
			>
				<ImageIcon class="h-4 w-4" />
				{#if uploadingImage}
					<span>Uploading...</span>
				{/if}
			</button>
		</div>

		<!-- Send/Stop Button -->
		{#if isStreaming}
			<button class="stop-btn" onclick={onStop} type="button">
				<StopCircle class="h-4 w-4" />
				<span>Stop</span>
			</button>
		{:else}
			<button class="send-btn" onclick={onSubmit} disabled={!input.trim()} type="button">
				Send
			</button>
		{/if}
	</div>
</div>

<style>
	.input-area {
		border-top: 1px solid hsl(var(--border));
		background: hsl(var(--background));
		flex-shrink: 0;
	}

	.input-form {
		padding: 12px 16px 0 16px;
	}

	.input-form textarea {
		width: 100%;
		min-height: 42px;
		max-height: 200px;
		padding: 10px 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 0.875rem;
		font-family: inherit;
		line-height: 1.5;
		resize: none;
		overflow-y: auto;
		transition: border-color 0.2s;
	}

	.input-form textarea:focus {
		outline: none;
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
	}

	.input-form textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Image Previews */
	.image-previews {
		display: flex;
		gap: 8px;
		padding: 12px 16px 0 16px;
		flex-wrap: wrap;
	}

	.image-preview {
		position: relative;
		width: 80px;
		height: 80px;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--muted));
	}

	.image-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.remove-image-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		background: hsl(0 0% 0% / 0.7);
		color: white;
		border: none;
		border-radius: 4px;
		padding: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.remove-image-btn:hover {
		background: hsl(0 84% 60%);
	}

	/* Upload Error */
	.upload-error {
		padding: 8px 16px;
		background: hsl(0 84% 60% / 0.1);
		color: hsl(0 84% 60%);
		font-size: 0.75rem;
		border-left: 3px solid hsl(0 84% 60%);
		margin: 0 16px;
	}

	.controls-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 16px 12px 16px;
		gap: 8px;
		flex-wrap: wrap;
	}

	.left-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.mode-toggles {
		display: flex;
		gap: 6px;
	}

	.mode-toggle-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.mode-toggle-btn:hover {
		background: hsl(var(--muted) / 0.8);
		border-color: hsl(var(--primary) / 0.5);
	}

	.mode-toggle-btn.active {
		background: hsl(var(--primary) / 0.15);
		color: hsl(var(--primary));
		border-color: hsl(var(--primary));
		font-weight: 600;
	}

	.mode-toggle-btn :global(svg) {
		flex-shrink: 0;
	}

	.image-upload-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.image-upload-btn:hover:not(:disabled) {
		background: hsl(var(--muted) / 0.8);
		border-color: hsl(var(--primary) / 0.5);
	}

	.image-upload-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.image-upload-btn :global(svg) {
		flex-shrink: 0;
	}

	.send-btn,
	.stop-btn {
		padding: 8px 24px;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.send-btn {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	.send-btn:hover:not(:disabled) {
		background: hsl(var(--primary) / 0.9);
		transform: translateY(-1px);
	}

	.send-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.stop-btn {
		background: hsl(0 84% 60%);
		color: white;
	}

	.stop-btn:hover {
		background: hsl(0 84% 50%);
		transform: translateY(-1px);
	}

	.stop-btn:active {
		transform: translateY(0);
	}

	.stop-btn :global(svg) {
		flex-shrink: 0;
	}
</style>
