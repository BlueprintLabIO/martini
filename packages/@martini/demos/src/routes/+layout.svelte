<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Navbar />

<div class="page-content">
	{@render children()}
</div>

<style>
	:global(body) {
		padding-top: 64px;
	}

	.page-content {
		min-height: 100vh;
	}
</style>
