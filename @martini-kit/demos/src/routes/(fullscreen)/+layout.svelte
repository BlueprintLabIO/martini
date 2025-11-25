<script lang="ts">
	import '../../app.css';

	let { children } = $props();
</script>

{@render children()}

<style>
	:global(html),
	:global(body) {
		padding: 0;
		margin: 0;
		height: 100%;
		overflow: hidden;
	}
</style>
