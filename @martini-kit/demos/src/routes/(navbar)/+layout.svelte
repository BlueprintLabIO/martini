<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

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
