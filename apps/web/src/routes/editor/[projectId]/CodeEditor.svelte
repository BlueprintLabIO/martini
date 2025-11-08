<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { javascript } from '@codemirror/lang-javascript';
	import { EditorState } from '@codemirror/state';

	let { content = $bindable(''), onChange } = $props<{
		content: string;
		onChange?: (newContent: string) => void;
	}>();

	let editorEl: HTMLDivElement;
	let view: EditorView | null = null;

	onMount(() => {
		view = new EditorView({
			state: EditorState.create({
				doc: content,
				extensions: [
					basicSetup,
					javascript(),
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

		return () => {
			view?.destroy();
			view = null;
		};
	});

	// Update editor when content changes externally (e.g., switching files)
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

<div bind:this={editorEl} class="h-full w-full overflow-auto"></div>

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
