# Pterodactyl: Svelte-native docs engine

## Premise
- Extract the existing `/docs` stack into a standalone, SvelteKit-based Docusaurus alternative.
- Keep authoring in Markdown/MDsveX, ship a theme-first DX, and preserve versioning/search/prev-next already in the project.

## Core stance (where we beat Docusaurus)
- MDX complexity: mdsvex + Svelte components → no React/MDX bundler fragility; faster HMR, simpler authoring.
- Theme customization: slot/prop-driven layout (DocsLayout + replaceable components) instead of React theme shadowing; CSS variables first, zero Webpack aliasing.
- Overconfiguration: single `pterodactyl.config.ts` (site meta, versions, sidebar hints) + opinionated defaults; minimal boilerplate to get a themed docs site.
- Rebuild speed: SvelteKit + Vite + eager globbing for docs/navigation; static search index generation; no heavy client bundles for theme logic.

## Product shape
- `pterodactyl-core`: SvelteKit preset that wires mdsvex, Shiki with copy buttons, version matcher, doc loader, prerender entries.
- `pterodactyl-theme-classic`: the current Martini docs UI lifted and generalized (nav, breadcrumbs, TOC, search modal, callouts, code tabs, edit-link, SDK badges optional).
- `pterodactyl-cli`: scaffold (`pnpm create pterodactyl`), version snapshotter (copies `src/content/docs` → `src/content/versioned_docs/vX.Y`, updates config), search-index generator (static JSON + Fuse index at build time).
- Config: `pterodactyl.config.ts` with site metadata, version list/aliases, sidebar ordering overrides, edit-link base, optional SDK scopes, and component map for MDsveX shortcodes.

## Architecture
- Content: `src/content/docs` + `src/content/versioned_docs/*`; frontmatter validated via zod (title/description/section/subsection/order/scope/sdks/hidden).
- Routing: SvelteKit route group at `/docs/[version]/[...slug]` with `entries()` for prerender/export; `latest/next/vX.Y` aliases resolved via config.
- Data layer: virtual module exposing `getDocBySlug`, `getSidebar`, `getPrevNext`, `getVersions`, `getSearchPayload`; backed by Vite glob imports.
- Theme: layout slots for nav/sidebar/main/toc/footer; CSS variables for colors/spacing/typography; optional component overrides per section; mobile-first responsive defaults.
- Search: build-time generator emits `search-index.json` (docs metadata + serialized Fuse index) to avoid runtime serverless; ships modal UI with keyboard shortcuts.
- Performance: eager globbing for docs to avoid dynamic import resolution issues; Vite optimizeDeps preconfig; static search payload; no React runtime weight.

## DX highlights
- Zero-config start: drop docs in `src/content/docs`, run `pnpm dev`, get nav, TOC, search, version selector.
- Hot sidebar regeneration on file add/remove; ordering via frontmatter, not giant JSON.
- MDsveX components auto-registered (CodeTabs, Callout, LiveExample, PackageBadge); no manual imports in Markdown.
- Theming: swap theme package or override slots; CSS variables documented; no Webpack alias hacks.
- Content safety: typed frontmatter with build-time errors; prerender warnings downgraded to non-fatal (like current setup) to keep CI green.

## Migration path from Docusaurus
- Copy `docs` → `src/content/docs`; convert MDX-specific React components to Svelte shortcodes (or map via components registry).
- Translate sidebar config into frontmatter `section/subsection/order`; optional seed script to ingest `sidebars.js`.
- Move versioned docs into `src/content/versioned_docs/vX.Y`; register versions in config; CLI can snapshot existing `docs` to create first version.
- Replace theme overrides with slot/component overrides; keep existing CSS tokens by mapping to theme variables.

## Why now
- The current Martini docs already prove the stack: mdsvex, versioning, search, prev/next, and a full Svelte theme. Packaging it as Pterodactyl is mostly extraction + config surface, yielding a lighter, more customizable alternative to Docusaurus. 
