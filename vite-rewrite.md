Vite Preview Migration Plan
===========================

Goal
----
Replace Sandpack with a Vite-based preview pipeline for the martini IDE (local dev and optional embeds), solving bare-import resolution for local packages, improving HMR speed, and giving full control over bundling/resolution.

Principles
----------
- Keep current Sandpack flow as a fallback (feature flag) during rollout.
- Prefer same-origin dev assets (served by Vite/static) to avoid CORS.
- Preserve current runtime semantics: injected `__martini-kit_CONFIG__`, dual host/client preview, DevTools bridge, and virtual user file system.

Scope
-----
- New Vite preview server (can live in @martini-kit/preview-server or inside IDE).
- Replace SandpackManager with VitePreviewManager (same API surface where possible).
- Provide virtual FS plugin to mount user files and injected bootstrapping.
- Resolve martini packages from local builds in dev; from npm in prod.
- Support host+client dual runtime preview wiring.
- Preserve DevTools transport bridge.

Architecture
------------
1) Preview server (Vite):
   - Serves a minimal entry (e.g., /preview/index.html) that bootstraps the user code bundle.
   - Uses Vite plugins to:
     * Mount virtual files from IDE (user project) into the module graph.
     * Inject `__martini-kit_CONFIG__`/`__MARTINI_KIT_CONFIG__` and DevTools bridge before entry.
     * Resolve martini packages:
         - Dev: from file URLs /dev-packages/@martini-kit/*/dist/index.js (or tsconfig paths if using source).
         - Prod/embed: from published npm versions.
   - Exposes a small API (e.g., websocket or postMessage) to push file updates (HMR) and re-run previews.

2) IDE client:
   - New VitePreviewManager mirrors SandpackManager responsibilities:
     * Start/stop preview iframe pointing to Vite dev server URL (e.g., http://localhost:5173/preview).
     * Push virtual files + entry path to preview server via plugin channel.
     * Handle errors and display overlays similarly to Sandpack.
     * Keep host/client dual preview wiring.
   - Feature flag to switch between Vite and Sandpack until stable.

3) Assets/layout:
   - Vite publicDir can serve dev packages at /dev-packages/* (symlink or watch-copy from each package dist).
   - For production embeds, ship a static build of the preview app that consumes npm versions.

Migration Steps
---------------
1) Prep dev-packages pipeline
   - Ensure `pnpm --filter @martini-kit/* build` produces dist outputs.
   - Symlink or watch-copy dist into `static/dev-packages/@martini-kit/...`.
   - Verify URLs: http://localhost:5173/dev-packages/@martini-kit/core/dist/index.js etc.

2) Add preview server
   - Create a Vite config for preview (separate package or within IDE).
   - Add Vite plugins:
     * Virtual FS plugin: serves IDE-provided files under /src/**.
     * Injection plugin: prepends config + DevTools bridge to entry.
     * Resolver plugin: aliases martini deps to dev-packages in dev; npm in prod.
   - Add preview entry (HTML + small bootstrap) to render Phaser game container and load user entry.

3) Add VitePreviewManager
   - Mirror SandpackManager API: initialize(container), run(files, entryPoint), update(files), destroy().
   - Manage iframe pointing at preview server; pass virtual FS updates via websocket/postMessage.
   - Inject transport role/roomId and DevTools bridge.
   - Support dual runtime (host/client) as today.

4) Feature flag and fallback
   - Add env/setting to choose Vite vs Sandpack.
   - Keep Sandpack codepath intact until Vite path is stable.

5) DevTools and transport
   - Ensure the Vite preview loads the same DevTools bridge used in Sandpack.
   - Confirm transport disconnect/cleanup on reload and HMR (existing fixes).

6) Embed/build
   - For production embeds, build the preview app (Vite build) targeting npm deps.
   - Consider keeping Sandpack for remote, no-server embeds as a backup.

Testing Plan
------------
- Local dev:
  * Vite dev server resolves @martini-kit/* from /dev-packages URLs.
  * HMR under 2s for code edits; no “Transport already exists” errors after hot reload.
  * Dual host/client preview works.
  * DevTools panel connects.
- Fallback:
  * Toggle flag to Sandpack still works.
- Production build:
  * Preview build consumes published versions; no 404s; config injection works.
  * Embed page loads and runs a sample game.

Risks & Mitigations
-------------------
- Resolution mismatch (Vite vs sandbox): Verify aliases point to dist bundles; add tests that load a sample project through the preview.
- CORS/origin issues: Keep preview and IDE on same origin/port when possible; else add CORS headers and use absolute URLs.
- HMR flakiness: Use Vite’s native HMR; ensure transport cleanup on dispose (reuse runtime cleanup logic).
- Breaks embeds: Keep Sandpack fallback; ship Vite as opt-in until proven.
- Build drift between packages and dev-packages: Add a watch or predev script to rebuild/sync dist into dev-packages.
- Timeline overrun: Phase rollout—land preview server + manager behind flag, validate with one demo, then expand.

Success Criteria
----------------
- Local dev: bare imports resolved from local builds; HMR < 2s; no transport guard errors.
- Dual runtime: host/client preview parity with existing behavior.
- DevTools: functional in Vite preview.
- Production/embeds: stable build path or working fallback to Sandpack.

Open Questions
--------------
- Should preview resolve from source (tsconfig paths) or always dist? (Recommend dist for parity with published shape.)
- Do we need a remote embed story without running a Vite server? (If yes, keep Sandpack for that case.)
