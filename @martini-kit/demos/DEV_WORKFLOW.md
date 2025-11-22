# Local Development Workflow

This document explains how to work on `@martini-kit` packages with fast local iteration in the IDE.

## Quick Start

```bash
# 1. Build all packages (first time)
pnpm build

# 2. Sync packages to static directory
cd @martini-kit/demos
pnpm dev:sync-packages

# 3. Start dev server
pnpm dev
```

The IDE will now use your local package builds from `/dev-packages/` instead of npm!

## How It Works

### Development Mode
- SandpackManager detects `import.meta.env.DEV = true` (Vite dev mode)
- Package dependencies point to `/dev-packages/@martini-kit/*/dist/index.js`
- Vite serves these files from `static/dev-packages/`
- Changes to packages are reflected after rebuild + refresh

### Production Mode
- `import.meta.env.DEV = false` (Vite build mode)
- Package dependencies use npm versions (`0.1.1`)
- Normal CDN/npm resolution

## Fast Iteration Workflow

### Option 1: Manual Sync (Recommended for occasional changes)

```bash
# 1. Make changes to a package (e.g., @martini-kit/phaser)
cd @martini-kit/phaser
# edit src/runtime.ts

# 2. Rebuild that package
pnpm build

# 3. Sync to static directory
cd ../demos
pnpm dev:sync-packages

# 4. Refresh browser - changes are live!
```

### Option 2: Watch Mode (Best for active development)

Terminal 1 - Watch and rebuild packages:
```bash
cd @martini-kit/phaser
pnpm build --watch
```

Terminal 2 - Auto-sync on changes (requires chokidar-cli):
```bash
cd @martini-kit/demos

# Install if needed
pnpm add -D chokidar-cli

# Watch and sync
pnpm dlx chokidar '../*/dist/**' -c 'pnpm dev:sync-packages'
```

Terminal 3 - Dev server:
```bash
cd @martini-kit/demos
pnpm dev
```

Now any change to package source → auto rebuild → auto sync → browser refresh!

## Package Scripts

In `@martini-kit/demos/package.json`:

- `dev:sync-packages` - Copy dist files to static/dev-packages
- `dev:with-sync` - Sync packages then start dev server
- `dev` - Start dev server (assumes packages already synced)

## Troubleshooting

### Error: "Cannot find module '@martini-kit/phaser'"
**Solution:** Run `pnpm dev:sync-packages` to copy packages to static directory

### Changes not reflecting in IDE
**Solution:**
1. Rebuild the package: `pnpm build`
2. Re-sync: `pnpm dev:sync-packages`
3. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)

### "Transport already exists" error persists
**Solution:**
1. The self-healing fix is in `@martini-kit/transport-iframe-bridge`
2. Rebuild it: `cd @martini-kit/transport-iframe-bridge && pnpm build`
3. Sync: `cd ../demos && pnpm dev:sync-packages`
4. Refresh IDE

## Files Created

- `scripts/sync-dev-packages.js` - Copies dist files to static
- `static/dev-packages/@martini-kit/` - Local package builds (gitignored)
- `.gitignore` entry for `**/static/dev-packages/`

## Production Deployment

The local packages setup only affects development:

- Production builds use `import.meta.env.DEV = false`
- Sandpack resolves packages from npm
- No changes needed for deployment

## Publishing to npm

When you're happy with changes:

```bash
# From workspace root
pnpm build  # Rebuild all packages

# Publish (in each package dir)
cd @martini-kit/phaser
npm publish

cd ../transport-iframe-bridge
npm publish

# etc.
```

After publishing, update version numbers in SandpackManager.ts if needed.
