<script lang="ts">
	import { page } from '$app/stores';
	import { Menu, X } from '@lucide/svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let mobileMenuOpen = $state(false);

	interface NavLink {
		label: string;
		href: string;
		external?: boolean;
	}

	const navLinks: NavLink[] = [
		{ label: 'Home', href: '/' },
		{ label: 'Games', href: '/preview' },
		{ label: 'Docs', href: '/docs' },
		{ label: 'GitHub', href: 'https://github.com/anthropics/martini-kit', external: true }
	];

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function isActive(href: string): boolean {
		const currentPath = $page.url.pathname;
		if (href === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(href);
	}
</script>

<nav class="navbar">
	<div class="nav-container">
		<!-- Logo / Branding -->
		<a href="/" class="nav-brand">
			<span class="brand-text">martini-kit</span>
		</a>

		<!-- Desktop Navigation Links -->
		<div class="nav-links-desktop">
			{#each navLinks as link}
				<a
					href={link.href}
					class="nav-link"
					class:active={isActive(link.href)}
					target={link.external ? '_blank' : undefined}
					rel={link.external ? 'noopener noreferrer' : undefined}
				>
					{link.label}
				</a>
			{/each}

			<ThemeToggle />
		</div>

		<!-- Mobile Menu Button -->
		<div class="nav-mobile-controls">
			<ThemeToggle />
			<button
				class="mobile-menu-button"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				aria-label="Toggle mobile menu"
			>
				{#if mobileMenuOpen}
					<X size={24} />
				{:else}
					<Menu size={24} />
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile Menu -->
	{#if mobileMenuOpen}
		<div class="mobile-menu-backdrop" onclick={closeMobileMenu} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}></div>
		<div class="mobile-menu">
			{#each navLinks as link}
				<a
					href={link.href}
					class="mobile-nav-link"
					class:active={isActive(link.href)}
					onclick={closeMobileMenu}
					target={link.external ? '_blank' : undefined}
					rel={link.external ? 'noopener noreferrer' : undefined}
				>
					{link.label}
				</a>
			{/each}
		</div>
	{/if}
</nav>

<style>
	.navbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: var(--bg-primary, #ffffff);
		border-bottom: 1px solid var(--border-color, #e5e5e5);
		z-index: 1000;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.nav-container {
		max-width: 1600px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 64px;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		font-weight: 700;
		font-size: 1.5rem;
		color: var(--text-primary, #0b0a08);
		text-decoration: none;
		transition: color 0.2s;
		flex-shrink: 0;
	}

	.nav-brand:hover {
		color: var(--link-color, #3b82f6);
	}

	.brand-text {
		background: linear-gradient(135deg, #3b82f6, #8b5cf6);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.nav-links-desktop {
		display: none;
		align-items: center;
		gap: 2rem;
	}

	@media (min-width: 768px) {
		.nav-links-desktop {
			display: flex;
		}
	}

	.nav-link {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--text-secondary, #525252);
		text-decoration: none;
		transition: color 0.2s;
		border-bottom: 2px solid transparent;
		padding-bottom: 2px;
	}

	.nav-link:hover {
		color: var(--text-primary, #0b0a08);
	}

	.nav-link.active {
		color: var(--link-color, #3b82f6);
		border-bottom-color: var(--link-color, #3b82f6);
	}

	.nav-mobile-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.nav-mobile-controls {
			display: none;
		}
	}

	.mobile-menu-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0.5rem;
		background: var(--bg-tertiary, #f5f5f5);
		border: 1px solid var(--border-color, #e5e5e5);
		border-radius: 8px;
		color: var(--text-primary, #0b0a08);
		cursor: pointer;
		transition: all 0.2s;
	}

	.mobile-menu-button:hover {
		background: var(--bg-secondary, #fafafa);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.mobile-menu-button:active {
		transform: translateY(0);
	}

	.mobile-menu-backdrop {
		display: block;
		position: fixed;
		inset: 64px 0 0 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
		animation: fadeIn 0.2s;
	}

	.mobile-menu {
		display: flex;
		flex-direction: column;
		position: fixed;
		top: 64px;
		left: 0;
		right: 0;
		background: var(--bg-primary, #ffffff);
		border-bottom: 1px solid var(--border-color, #e5e5e5);
		z-index: 1000;
		padding: 1rem 0;
		animation: slideDown 0.2s;
	}

	@media (min-width: 768px) {
		.mobile-menu {
			display: none;
		}
	}

	.mobile-nav-link {
		padding: 0.75rem 2rem;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--text-secondary, #525252);
		text-decoration: none;
		transition: all 0.2s;
	}

	.mobile-nav-link:hover {
		background: var(--bg-secondary, #fafafa);
		color: var(--text-primary, #0b0a08);
	}

	.mobile-nav-link.active {
		background: #3b82f6;
		color: white;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideDown {
		from {
			transform: translateY(-10px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>
