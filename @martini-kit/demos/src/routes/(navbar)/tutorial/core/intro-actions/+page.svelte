<script lang="ts">
	import MartiniIDE from "@martini-kit/ide";
	import type { MartiniKitIDEConfig } from "@martini-kit/ide";
	import { RefreshCw, Lightbulb, Sparkles } from "@lucide/svelte";

	let { data } = $props();

	let files = $state<Record<string, string>>(data.config?.files ?? {});
	let ideConfig = $state<MartiniKitIDEConfig | null>(null);
	let solutionFiles = $state<Record<string, string> | null>(
		data.solutionFiles || null,
	);
	let infoMessage = $state<string | null>(null);
	let showSolution = $state(false);

	$effect(() => {
		if (data.config) {
			console.log("[tutorial] initializing IDE config", {
				lesson: data.metadata.title,
				fileCount: Object.keys(data.config.files ?? {}).length,
			});
			buildIdeConfig(files || data.config.files);
		}
	});

	function buildIdeConfig(newFiles: Record<string, string>) {
		console.log(
			"[tutorial] rebuilding IDE config with files",
			Object.keys(newFiles),
		);
		ideConfig = {
			...data.config,
			files: newFiles,
			onChange: (updated) => {
				files = updated;
				console.log("[tutorial] IDE onChange", Object.keys(updated));
			},
		};
	}

	function resetLesson() {
		if (!data.config) return;
		files = data.config.files;
		infoMessage = null;
		buildIdeConfig(files);
	}

	function applySolution() {
		console.log("[tutorial] applySolution clicked", {
			hasSolution: Boolean(solutionFiles),
			fileCount: solutionFiles ? Object.keys(solutionFiles).length : 0,
		});
		if (!solutionFiles) return;
		files = { ...solutionFiles };
		infoMessage = "Solution applied to editor.";
		buildIdeConfig(files);
	}
</script>

<svelte:head>
	<title>{data.metadata.title} | martini-kit tutorials</title>
	{#if data.metadata.description}
		<meta name="description" content={data.metadata.description} />
	{/if}
</svelte:head>

<div class="tutorial-page">
	<header class="header">
		<div>
			<p class="track-badge">Core Track</p>
			<h1>{data.metadata.title}</h1>
			<p class="desc">{data.metadata.description}</p>
		</div>
		<div class="actions">
			<button
				class="secondary"
				onclick={resetLesson}
				title="Reset to starter code"
			>
				<RefreshCw size={16} />
				Reset
			</button>
			<button
				class="secondary"
				onclick={applySolution}
				disabled={!solutionFiles}
				title="Replace code with solution"
			>
				<Sparkles size={16} />
				Show solution
			</button>
		</div>
	</header>

	<div class="layout">
		<aside class="instructions">
			{@render data.component()}

			{#if data.metadata.hints?.length}
				<div class="callout">
					<Lightbulb size={16} />
					<div>
						<p class="callout-title">Hints</p>
						<ul>
							{#each data.metadata.hints as hint}
								<li>{hint}</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}

			{#if data.metadata.solution}
				<button
					class="secondary"
					onclick={() => (showSolution = !showSolution)}
				>
					{showSolution ? "Hide solution" : "Show solution"}
				</button>
				{#if showSolution}
					<pre class="solution"><code>{data.metadata.solution}</code
						></pre>
				{/if}
			{/if}

			{#if infoMessage}
				<div class="status status-info">{infoMessage}</div>
			{/if}
		</aside>

		<section class="ide-pane">
			{#if ideConfig}
				<div class="ide-wrapper">
					<MartiniIDE config={ideConfig} />
				</div>
			{:else}
				<p>Loading IDE…</p>
			{/if}
		</section>
	</div>
</div>

<style>
	.tutorial-page {
		padding: 0.5rem 1rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		height: 100%; /* Fill the available space in .page-content */
		overflow: hidden; /* Internal scrolling handled by children */
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
		flex-wrap: wrap;
		padding: 0.25rem 0.5rem;
		min-height: 0;
	}

	.track-badge {
		display: inline-flex;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		background: #eef2ff;
		color: #312e81;
		font-weight: 600;
		font-size: 0.8rem;
		margin-bottom: 0.35rem;
	}

	h1 {
		margin: 0 0 0.1rem;
		font-size: 1.4rem;
		line-height: 1.3;
	}

	.desc {
		margin: 0;
		color: #6b7280;
		font-size: 0.95rem;
		line-height: 1.5;
		max-width: 540px;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(280px, 360px) 1fr;
		gap: 0.75rem;
		height: calc(100vh - 110px);
		overflow: hidden;
		min-height: 0;
	}

	.instructions {
		padding: 0.35rem 0.5rem 0.65rem;
		overflow: auto;
		font-size: 0.95rem;
		line-height: 1.6;
		color: #1f2937;
		border-right: 1px solid #e5e7eb;
		min-height: 0;
	}

	/* Prose-like defaults for tutorial content */
	.instructions :global(p) {
		margin: 0 0 0.65rem;
	}

	.instructions :global(h1) {
		display: none; /* Title shown in header already */
	}

	.instructions :global(h2) {
		font-size: 1rem;
		margin: 0.6rem 0 0.35rem;
		font-weight: 700;
	}

	.instructions :global(ul),
	.instructions :global(ol) {
		margin: 0 0 0.75rem;
		padding-left: 1.25rem;
		list-style-position: outside;
	}

	.instructions :global(ul) {
		list-style: disc;
	}

	.instructions :global(ol) {
		list-style: decimal;
	}

	.instructions :global(code) {
		background: #f3f4f6;
		padding: 0.05rem 0.25rem;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.instructions :global(pre) {
		background: #0f172a;
		color: #e5e7eb;
		padding: 0.75rem;
		border-radius: 8px;
		overflow: auto;
		margin: 0 0 0.85rem;
		font-size: 0.9em;
	}

	.instructions :global(h1) {
		font-size: 1.15rem;
		margin: 0 0 0.5rem;
	}

	.instructions :global(h2) {
		font-size: 1.05rem;
		margin: 0.75rem 0 0.35rem;
	}

	.instructions :global(p) {
		margin: 0 0 0.6rem;
	}

	.ide-pane {
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		overflow: hidden;
		background: #0b1021;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.ide-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.ide-wrapper :global(*) {
		box-sizing: border-box;
	}

	.ide-wrapper :global(.martini-kit-ide),
	.ide-wrapper :global(.ide-pane-group),
	.ide-wrapper :global(.pane-group),
	.ide-wrapper :global(.pane) {
		height: 100%;
		min-height: 0;
	}

	.callout {
		display: flex;
		gap: 0.5rem;
		margin: 0.75rem 0;
		padding: 0.65rem;
		border-radius: 8px;
		background: #fef3c7;
		color: #92400e;
		font-size: 0.9rem;
	}

	.callout-title {
		margin: 0 0 0.15rem;
		font-weight: 700;
	}

	.solution {
		background: #0f172a;
		color: #e5e7eb;
		padding: 0.75rem;
		border-radius: 8px;
		overflow: auto;
	}

	.status {
		margin-top: 0.8rem;
		padding: 0.65rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.status-info {
		background: #eff6ff;
		color: #1d4ed8;
		border: 1px solid #bfdbfe;
	}

	.secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.9rem;
		border-radius: 8px;
		border: 1px solid transparent;
		cursor: pointer;
		font-weight: 600;
	}

	.secondary {
		background: white;
		border-color: #e5e7eb;
		color: #111827;
	}

	@media (max-width: 1100px) {
		.layout {
			grid-template-columns: 1fr;
			height: auto;
		}

		.ide-pane {
			min-height: 480px;
		}
	}
</style>
