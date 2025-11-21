<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorState, Compartment } from '@codemirror/state';
	import {
		EditorView,
		keymap,
		highlightActiveLine,
		highlightActiveLineGutter,
		lineNumbers,
		drawSelection,
		dropCursor,
		rectangularSelection,
		crosshairCursor
	} from '@codemirror/view';
	import {
		bracketMatching,
		defaultHighlightStyle,
		indentOnInput,
		syntaxHighlighting
	} from '@codemirror/language';
	import { history, historyKeymap, indentWithTab, defaultKeymap } from '@codemirror/commands';
	import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
	import { closeBrackets, autocompletion, completionKeymap } from '@codemirror/autocomplete';
	import { javascript } from '@codemirror/lang-javascript';
	import { html } from '@codemirror/lang-html';
	import { css } from '@codemirror/lang-css';
	import { markdown } from '@codemirror/lang-markdown';

	interface Props {
		content: string;
		filePath?: string;
		onChange?: (newContent: string) => void;
	}

	let { content = $bindable(''), filePath = '', onChange }: Props = $props();

	let editorEl: HTMLDivElement;
	let view: EditorView | null = null;
	const languageCompartment = new Compartment();
	const themeCompartment = new Compartment();
	const lightTheme = EditorView.theme(
		{
			'&': {
				color: '#1f2937',
				backgroundColor: '#ffffff'
			},
			'.cm-content': {
				fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
				fontSize: '12px'
			},
			'.cm-scroller': {
				fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
			},
			'.cm-gutters': {
				backgroundColor: '#f9fafb',
				borderRight: '1px solid #e5e7eb',
				color: '#6b7280'
			},
			'.cm-activeLineGutter': {
				backgroundColor: '#f3f4f6'
			},
			'.cm-activeLine': {
				backgroundColor: '#f9fafb'
			},
			'.cm-selectionBackground': {
				backgroundColor: '#dbeafe !important'
			},
			'.cm-cursor': {
				borderLeftColor: '#1f2937'
			}
		},
		{ dark: false }
	);

	/**
	 * Get language extension based on file path
	 */
	function getLanguageExtension(path: string) {
		const ext = path.split('.').pop()?.toLowerCase() || '';

		if (ext === 'html' || ext === 'htm') return html();
		if (ext === 'css' || ext === 'scss') return css();
		if (ext === 'md' || ext === 'markdown') return markdown();
		if (ext === 'json') return javascript({ json: true });

		return javascript({
			typescript: ext === 'ts' || ext === 'tsx',
			jsx: ext === 'jsx' || ext === 'tsx'
		});
	}

	onMount(() => {
		const language = getLanguageExtension(filePath);
		const state = EditorState.create({
			doc: content,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				drawSelection(),
				dropCursor(),
				rectangularSelection(),
				crosshairCursor(),
				history(),
				indentOnInput(),
				bracketMatching(),
				highlightSelectionMatches(),
				closeBrackets(),
				autocompletion(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
				keymap.of([
					...defaultKeymap,
					...historyKeymap,
					...searchKeymap,
					...completionKeymap,
					indentWithTab
				]),
				EditorState.tabSize.of(2),
				EditorView.lineWrapping,
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newContent = update.state.doc.toString();
						if (newContent !== content) {
							content = newContent;
							onChange?.(newContent);
						}
					}
				}),
				languageCompartment.of(language),
				themeCompartment.of(lightTheme)
			]
		});

		view = new EditorView({
			state,
			parent: editorEl
		});

		return () => {
			view?.destroy();
			view = null;
		};
	});

	// Update editor when content changes externally
	$effect(() => {
		if (view && content !== view.state.doc.toString()) {
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: content
				},
				selection: {
					anchor: Math.min(content.length, view.state.selection.main.anchor)
				}
			});
		}
	});

	// Swap language mode without tearing down the editor
	$effect(() => {
		if (!view) return;
		const lang = getLanguageExtension(filePath);
		view.dispatch({
			effects: languageCompartment.reconfigure(lang)
		});
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
