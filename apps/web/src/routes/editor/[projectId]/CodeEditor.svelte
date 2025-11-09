<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { javascript } from '@codemirror/lang-javascript';
	import { html } from '@codemirror/lang-html';
	import { markdown } from '@codemirror/lang-markdown';
	import { EditorState } from '@codemirror/state';
	import { MergeView } from '@codemirror/merge';
	import { Check, X } from 'lucide-svelte';
	import type { Extension } from '@codemirror/state';

	let {
		content = $bindable(''),
		onChange,
		diffMode = $bindable(false),
		originalContent = '',
		onApproveDiff,
		onDenyDiff,
		filePath = ''
	} = $props<{
		content: string;
		onChange?: (newContent: string) => void;
		diffMode?: boolean;
		originalContent?: string;
		onApproveDiff?: () => void;
		onDenyDiff?: () => void;
		filePath?: string;
	}>();

	let editorEl: HTMLDivElement;
	let view: EditorView | null = null;
	let mergeView: MergeView | null = null;

	/**
	 * Scroll to a specific line number in the editor
	 */
	export function scrollToLine(lineNumber: number) {
		const editor = mergeView?.b || view;
		if (!editor) return;

		const line = Math.max(0, lineNumber - 1); // Convert to 0-indexed
		const pos = editor.state.doc.line(Math.min(line + 1, editor.state.doc.lines)).from;

		editor.dispatch({
			effects: EditorView.scrollIntoView(pos, { y: 'center' })
		});
	}

	/**
	 * Get language extension based on file path
	 */
	function getLanguageExtension(): Extension {
		const ext = filePath.split('.').pop()?.toLowerCase() || '';

		switch (ext) {
			case 'html':
				return html();
			case 'md':
			case 'markdown':
				return markdown();
			case 'js':
			case 'ts':
			case 'jsx':
			case 'tsx':
			default:
				return javascript({ typescript: ext === 'ts' || ext === 'tsx', jsx: ext === 'jsx' || ext === 'tsx' });
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

		if (diffMode && originalContent) {
			// Create merge view
			mergeView = new MergeView({
				a: {
					doc: originalContent,
					extensions: [basicSetup, langExtension, EditorState.readOnly.of(true)]
				},
				b: {
					doc: content,
					extensions: [basicSetup, langExtension, EditorState.readOnly.of(true)]
				},
				parent: editorEl,
				highlightChanges: true,
				gutter: true
			});
		} else {
			// Create normal editor
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
	}

	function cleanupEditor() {
		view?.destroy();
		view = null;
		mergeView?.destroy();
		mergeView = null;
	}

	// Reinitialize when diffMode changes
	$effect(() => {
		console.log('🔄 CodeEditor reinitializing - diffMode:', diffMode, 'originalContent:', originalContent.slice(0, 30));
		cleanupEditor();
		initializeEditor();
	});

	// Update editor when content changes externally (only in normal mode)
	$effect(() => {
		if (!diffMode && view && content !== view.state.doc.toString()) {
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

<div class="relative h-full w-full">
	<div bind:this={editorEl} class="h-full w-full overflow-auto"></div>

	{#if diffMode && (onApproveDiff || onDenyDiff)}
		{@const _ = console.log('🎨 Rendering approve/deny buttons - diffMode:', diffMode)}
		<!-- Floating approve/deny buttons -->
		<div class="absolute bottom-4 right-4 flex gap-3 rounded-lg border bg-background p-3 shadow-lg">
			<button
				class="approve-btn flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
				onclick={onApproveDiff}
			>
				<Check class="h-4 w-4" />
				<span>Approve Changes</span>
			</button>
			<button
				class="deny-btn flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
				onclick={onDenyDiff}
			>
				<X class="h-4 w-4" />
				<span>Reject Changes</span>
			</button>
		</div>
	{:else}
		{@const _ = console.log('❌ NOT rendering buttons - diffMode:', diffMode, 'onApproveDiff:', !!onApproveDiff, 'onDenyDiff:', !!onDenyDiff)}
	{/if}
</div>

<style>
	:global(.cm-editor) {
		height: 100%;
		font-size: 14px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	:global(.cm-scroller) {
		overflow: auto;
	}
</style>
