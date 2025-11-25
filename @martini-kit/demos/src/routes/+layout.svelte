<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import posthog from 'posthog-js'
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		posthog.init(
		'phc_OGNJlDrkfSloaice291LvwuaHbN2AkAjD0HS15Gaqa1',
		{
			api_host: 'https://us.i.posthog.com',
			defaults: '2025-05-24',
			person_profiles: 'always',
		}
		)
	});

</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

