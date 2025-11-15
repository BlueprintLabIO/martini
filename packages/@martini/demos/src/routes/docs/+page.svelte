<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.metadata.title || 'Documentation'} | Martini</title>
	{#if data.metadata.description}
		<meta name="description" content={data.metadata.description} />
	{/if}
</svelte:head>

<article class="doc-content">
	{#if data.component}
		{@render data.component()}
	{:else}
		<h1>Documentation</h1>
		<p>Welcome to Martini documentation!</p>
	{/if}
</article>

<style>
	.doc-content {
		max-width: 100%;
	}
</style>
