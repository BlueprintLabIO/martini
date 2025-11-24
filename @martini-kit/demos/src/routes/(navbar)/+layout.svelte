<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400..700&family=IBM+Plex+Mono:wght@400;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="app-shell">
	<div class="shell-header">
		<Navbar />
	</div>

	<div class="page-content">
		{@render children()}
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden; /* Prevent body scroll */
	}

	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.shell-header {
		flex: none;
		z-index: 50;
	}

	.page-content {
		flex: 1;
		overflow: auto; /* Scroll happens here */
		position: relative;
	}
</style>
