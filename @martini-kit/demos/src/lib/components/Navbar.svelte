<script lang="ts">
	import { page } from "$app/stores";
	import { Menu, X } from "@lucide/svelte";
	import ThemeToggle from "./ThemeToggle.svelte";
	import logo from "/image.png";

	let mobileMenuOpen = $state(false);

	interface NavLink {
		label: string;
		href: string;
		external?: boolean;
	}

	const navLinks: NavLink[] = [
		{ label: "Games", href: "/preview" },
		{ label: "Docs", href: "/docs" },
		{
			label: "GitHub",
			href: "https://github.com/BlueprintLabIO/martini",
			external: true,
		},
		{
			label: "NPM",
			href: "https://www.npmjs.com/package/@martini-kit/core",
			external: true,
		},
	];

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function isActive(href: string): boolean {
		const currentPath = $page.url.pathname;
		if (href === "/") {
			return currentPath === "/";
		}
		return currentPath.startsWith(href);
	}
</script>

<nav class="navbar">
	<div class="nav-container">
		<div class="nav-surface">
			<!-- Logo / Branding -->
			<a href="/" class="nav-brand">
				<img src={logo} alt="martini-kit logo" class="brand-logo" />
				<span class="brand-text">martini-kit</span>
			</a>

			<!-- Desktop Navigation Links -->
			<div class="nav-links-desktop">
				{#each navLinks as link}
					<a
						href={link.href}
						class="nav-link"
						class:active={isActive(link.href)}
						target={link.external ? "_blank" : undefined}
						rel={link.external ? "noopener noreferrer" : undefined}
					>
						{link.label}
					</a>
				{/each}
			</div>

			<!-- Mobile Menu Button -->
			<div class="nav-mobile-controls">
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
	</div>

	<!-- Mobile Menu -->
	{#if mobileMenuOpen}
		<div
			class="mobile-menu-backdrop"
			onclick={closeMobileMenu}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === "Escape" && closeMobileMenu()}
		></div>
		<div class="mobile-menu">
			{#each navLinks as link}
				<a
					href={link.href}
					class="mobile-nav-link"
					class:active={isActive(link.href)}
					onclick={closeMobileMenu}
					target={link.external ? "_blank" : undefined}
					rel={link.external ? "noopener noreferrer" : undefined}
				>
					{link.label}
				</a>
			{/each}
		</div>
	{/if}
</nav>

<style>
	.navbar {
		/* position: fixed; -- Removed for App Shell */
		/* top: 0; */
		/* left: 0; */
		/* right: 0; */
		/* z-index: 1000; */
		background: transparent;
		padding: 0.65rem 0;
		/* pointer-events: none; -- Removed */
		width: 100%;
	}

	.nav-container {
		max-width: 1600px;
		margin: 0 auto;
		padding: 0 2rem;
		pointer-events: auto;
	}

	.nav-surface {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 0.6rem 1.1rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid var(--border, rgba(15, 23, 42, 0.08));
		backdrop-filter: blur(14px);
		box-shadow:
			0 12px 28px rgba(15, 23, 42, 0.12),
			inset 0 0 0 1px rgba(255, 255, 255, 0.35);
	}

	.nav-brand {
		display: flex;
		align-items: center;
		font-weight: 700;
		font-size: 1.3rem;
		color: var(--text, #0f172a);
		text-decoration: none;
		transition: color 0.2s;
		flex-shrink: 0;
	}

	.nav-brand:hover {
		color: var(--accent, #2563eb);
	}

	.brand-logo {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		object-fit: cover;
		margin-right: 0.5rem;
		box-shadow: none;
	}

	.brand-text {
		background: linear-gradient(135deg, #2563eb, #0ea5e9);
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
		color: var(--muted, #475569);
		text-decoration: none;
		transition: color 0.2s;
	}

	.nav-link:hover {
		color: var(--text, #0f172a);
	}

	.nav-link.active {
		color: var(--accent, #2563eb);
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
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid var(--border, rgba(15, 23, 42, 0.08));
		border-radius: 12px;
		color: var(--text, #0f172a);
		cursor: pointer;
		transition: all 0.2s;
	}

	.mobile-menu-button:hover {
		background: rgba(255, 255, 255, 0.9);
		transform: translateY(-1px);
		box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
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
		top: 72px;
		left: 0;
		right: 0;
		background: rgba(255, 255, 255, 0.96);
		border-bottom: 1px solid var(--border, rgba(15, 23, 42, 0.08));
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
		color: var(--muted, #475569);
		text-decoration: none;
		transition: all 0.2s;
	}

	.mobile-nav-link:hover {
		background: rgba(37, 99, 235, 0.08);
		color: var(--text, #0f172a);
	}

	.mobile-nav-link.active {
		background: rgba(37, 99, 235, 0.12);
		color: var(--text, #0f172a);
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
			transform: translateY(-8px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>
