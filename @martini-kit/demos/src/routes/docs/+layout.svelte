<script lang="ts">
	import DocsLayout from '$lib/layouts/DocsLayout.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>martini-kit Documentation</title>
	<meta name="description" content="Comprehensive documentation for the martini-kit multiplayer game SDK" />
</svelte:head>

<DocsLayout>
	{@render children()}
</DocsLayout>
