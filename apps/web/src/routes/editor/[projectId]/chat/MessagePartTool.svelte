<script lang="ts">
	/**
	 * MessagePartTool - Routes tool parts to appropriate tool-specific components
	 *
	 * This component acts as a dispatcher, determining which tool component
	 * to render based on the part type (tool-readFile, tool-editFile, etc.)
	 */

	import type { Chat } from '@ai-sdk/svelte';
	import ToolReadFile from './tools/ToolReadFile.svelte';
	import ToolListFiles from './tools/ToolListFiles.svelte';
	import ToolEditFile from './tools/ToolEditFile.svelte';
	import ToolCreateFile from './tools/ToolCreateFile.svelte';
	import ToolGetConsoleLogs from './tools/ToolGetConsoleLogs.svelte';
	import ToolCaptureScreenshot from './tools/ToolCaptureScreenshot.svelte';

	let {
		part,
		chat,
		originalContentCache,
		onFileCreateRequested
	}: {
		part: any;
		chat: Chat;
		originalContentCache: Map<string, string>;
		onFileCreateRequested?: (
			path: string,
			content: string,
			approvalId: string,
			onApprove: () => void,
			onDeny: () => void
		) => void;
	} = $props();
</script>

<div class="tool-call">
	{#if part.type === 'tool-readFile'}
		<ToolReadFile {part} />
	{:else if part.type === 'tool-listFiles'}
		<ToolListFiles {part} />
	{:else if part.type === 'tool-editFile'}
		<ToolEditFile {part} {originalContentCache} />
	{:else if part.type === 'tool-createFile'}
		<ToolCreateFile {part} {chat} {onFileCreateRequested} />
	{:else if part.type === 'tool-getConsoleLogs'}
		<ToolGetConsoleLogs {part} />
	{:else if part.type === 'tool-captureScreenshot'}
		<ToolCaptureScreenshot {part} />
	{/if}
</div>

<style>
	.tool-call {
		font-size: 0.75rem;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		background: hsl(var(--muted) / 0.5);
		padding: 6px 8px;
		border-radius: 6px;
	}
</style>
