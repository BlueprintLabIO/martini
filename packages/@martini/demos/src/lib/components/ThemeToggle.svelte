<script lang="ts">
	import { onMount } from 'svelte';
	import { Sun, Moon } from '@lucide/svelte';

	let theme = $state<'light' | 'dark'>('light');

	onMount(() => {
		// Load theme from localStorage or default to light
		const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

		if (savedTheme) {
			theme = savedTheme;
		} else if (prefersDark) {
			theme = 'dark';
		}

		applyTheme(theme);

		// Listen for system theme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent) => {
			if (!localStorage.getItem('theme')) {
				// Only auto-switch if user hasn't set a preference
				theme = e.matches ? 'dark' : 'light';
				applyTheme(theme);
			}
		};

		mediaQuery.addEventListener('change', handleChange);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	});

	function applyTheme(newTheme: 'light' | 'dark') {
		document.documentElement.dataset.theme = newTheme;
	}

	function toggleTheme() {
		const newTheme = theme === 'dark' ? 'light' : 'dark';
		theme = newTheme;
		localStorage.setItem('theme', newTheme);
		applyTheme(newTheme);
	}
</script>

<button onclick={toggleTheme} class="theme-toggle" aria-label="Toggle theme">
	{#if theme === 'dark'}
		<Sun size={20} />
	{:else}
		<Moon size={20} />
	{/if}
</button>

<style>
	.theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0.5rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.2s;
	}

	.theme-toggle:hover {
		background: var(--bg-secondary);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.theme-toggle:active {
		transform: translateY(0);
	}
</style>
