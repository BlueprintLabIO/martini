# Local Development Workflow

This is the ESBuild-powered workflow for hacking on `@martini-kit` packages inside the IDE.

## Quick Start

```bash
# 1) Build the SDK bundle once (import-map shims + martini-kit.js)
pnpm --filter=demos run build:sdk

# 2) Start the IDE + demos (runs a fresh SDK build automatically)
cd @martini-kit/demos
pnpm dev
```

Open `http://localhost:5173/ide` to verify the previews load.

## How It Works (no Sandpack)

- `scripts/build-sdk.ts` prebuilds the martini SDK into `static/sdk/`
- The preview iframes load that SDK via import maps
- User code is bundled in-browser with `esbuild-wasm` (fast rebuilds, no dev-packages)
- When the SDK changes, you just rebuild it; no file syncing or npm proxying

## Iterating on packages

**Active package work**
1. Terminal A: `cd @martini-kit/demos && pnpm dev:build-sdk` (watch SDK)
2. Terminal B: `cd @martini-kit/demos && pnpm dev` (Vite dev server)
3. Edit package sources (e.g., `@martini-kit/phaser/src/**`) → SDK rebuilds in 1-2s → refresh browser

**Occasional tweaks**
1. Edit a package
2. `pnpm --filter <package> run build`
3. `pnpm --filter=demos run build:sdk`
4. Refresh the IDE

## Troubleshooting

- **Missing imports or 404s for `/sdk/*`** → `pnpm --filter=demos run build:sdk`
- **Changes not visible** → ensure `pnpm dev:build-sdk` is running, then hard refresh
- **Slow first load** → esbuild-wasm downloads once (~8MB). Subsequent loads are cached.

## Outputs

- `@martini-kit/demos/static/sdk/` – generated import-map shims and bundled SDK (gitignored locally)
