<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { javascript } from '@codemirror/lang-javascript';
	import { EditorState } from '@codemirror/state';

	interface Props {
		content: string;
		filePath?: string;
		onChange?: (newContent: string) => void;
	}

	let { content = $bindable(''), filePath = '', onChange }: Props = $props();

	let editorEl: HTMLDivElement;
	let view: EditorView | null = null;

	/**
	 * Get language extension based on file path
	 */
	function getLanguageExtension() {
		const ext = filePath.split('.').pop()?.toLowerCase() || '';

		switch (ext) {
			case 'js':
			case 'ts':
			case 'jsx':
			case 'tsx':
			default:
				return javascript({ typescript: ext === 'ts' || ext === 'tsx' });
		}
	}

	onMount(() => {
		initializeEditor();

		return () => {
			cleanupEditor();
		};
	});

	function initializeEditor() {
		const langExtension = getLanguageExtension();

		// Create editor
		view = new EditorView({
			state: EditorState.create({
				doc: content,
				extensions: [
					basicSetup,
					langExtension,
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							const newContent = update.state.doc.toString();
							content = newContent;
							onChange?.(newContent);
						}
					})
				]
			}),
			parent: editorEl
		});
	}

	function cleanupEditor() {
		view?.destroy();
		view = null;
	}

	// Reinitialize when filePath changes
	$effect(() => {
		if (view) {
			cleanupEditor();
			initializeEditor();
		}
	});

	// Update editor when content changes externally
	$effect(() => {
		if (view && content !== view.state.doc.toString()) {
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: content
				}
			});
		}
	});
</script>

<div class="code-editor-container">
	<div bind:this={editorEl} class="code-editor"></div>
</div>

<style>
	.code-editor-container {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: #ffffff;
	}

	.code-editor {
		width: 100%;
		height: 100%;
	}

	:global(.cm-editor) {
		height: 100%;
		font-size: 12px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		background: #ffffff;
		color: #1f2937;
	}

	:global(.cm-scroller) {
		overflow: auto;
	}

	:global(.cm-gutters) {
		background: #f9fafb;
		border-right: 1px solid #e5e7eb;
		color: #6b7280;
	}

	:global(.cm-activeLineGutter) {
		background: #f3f4f6;
	}

	:global(.cm-activeLine) {
		background: #f9fafb;
	}

	:global(.cm-selectionBackground) {
		background: #dbeafe !important;
	}

	:global(.cm-cursor) {
		border-left-color: #1f2937;
	}
</style>
