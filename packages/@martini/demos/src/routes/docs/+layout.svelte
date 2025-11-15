<script lang="ts">
	import DocsLayout from '$lib/layouts/DocsLayout.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Martini Documentation</title>
	<meta name="description" content="Comprehensive documentation for the Martini multiplayer game SDK" />
</svelte:head>

<DocsLayout>
	{@render children()}
</DocsLayout>
