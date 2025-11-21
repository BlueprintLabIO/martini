<script lang="ts">
	import { Copy, Check } from 'lucide-svelte';

	interface Props {
		code: string;
		language?: string;
		filename?: string;
		showLineNumbers?: boolean;
	}

	let { code, language = 'typescript', filename, showLineNumbers = false }: Props = $props();

	let copied = $state(false);

	async function copyCode() {
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="code-block">
	{#if filename}
		<div class="code-header">
			<span class="filename">{filename}</span>
			<button class="copy-btn" onclick={copyCode}>
				{#if copied}
					<Check size={16} /> Copied!
				{:else}
					<Copy size={16} /> Copy
				{/if}
			</button>
		</div>
	{/if}
	<pre class:show-line-numbers={showLineNumbers}><code class="language-{language}">{code}</code></pre>
</div>

<style>
	.code-block {
		margin: 1.5rem 0;
		border: 1px solid var(--border-color, #e5e5e5);
		border-radius: 8px;
		overflow: hidden;
		background: #282a36;
	}

	.code-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.filename {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.875rem;
		color: rgba(248, 248, 242, 0.6);
	}

	.copy-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(248, 248, 242, 0.8);
		padding: 0.375rem 0.75rem;
		border-radius: 4px;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.copy-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.3);
	}

	pre {
		margin: 0;
		padding: 1.5rem;
		overflow-x: auto;
	}

	code {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.875rem;
		line-height: 1.7;
		color: #f8f8f2;
	}
</style>
