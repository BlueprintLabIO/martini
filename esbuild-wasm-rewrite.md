# ESBuild-WASM IDE Preview Rewrite

## 🎉 STATUS: Phase 1 Complete - ESM Migration Done!

**What's Been Implemented:**
- ✅ SDK build script ([build-sdk.ts](/@martini-kit/demos/scripts/build-sdk.ts))
- ✅ ESBuildManager browser runtime ([ESBuildManager.ts](/@martini-kit/ide/src/lib/core/ESBuildManager.ts))
- ✅ GamePreview component updated with feature flag
- ✅ Dependencies installed and building successfully
- ✅ **SDK migrated from IIFE to ESM format**
- ✅ **Dynamic export shims** - auto-exports all package exports
- ✅ **Fixed Phaser dynamic require** - now uses global reference
- ✅ Fixed ESBuild-WASM singleton initialization
- ✅ Fixed version mismatch (pinned esbuild-wasm@0.20.2)

**Next Steps:**
- 🔄 Test in browser with actual IDE
- 🔄 Verify DevTools integration
- 🔄 Production build testing
- 🔄 Remove Sandpack after validation

**Recent Fixes (2025-01-23):**
- ✅ **MAJOR**: Migrated SDK from IIFE → ESM format (solves Phaser require issue)
- ✅ **MAJOR**: Implemented dynamic shim generation using `export *` (solves missing exports)
- ✅ Fixed "Cannot call initialize more than once" error by implementing singleton pattern
- ✅ Fixed "Host version 0.20.2 does not match binary version 0.20.0" by pinning esbuild-wasm to 0.20.2

---

## Executive Summary

Replace Sandpack with ESBuild-WASM for the `@martini-kit/ide` preview system. This delivers:

- **5-10x faster iteration**: 1-2s rebuild vs 5-10s with Sandpack
- **Local package support**: Direct workspace integration without hacky `/dev-packages` endpoints
- **No server required**: Works in static production deploys (Vercel, Netlify, CDN)
- **Simpler architecture**: No Sandpack black box, full control over bundling
- **Same security model**: User code still runs in sandboxed iframes

**Trade-off**: Full iframe reload instead of true HMR (acceptable for game development use case)

---

## Table of Contents

1. [Current System Problems](#current-system-problems)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Plan](#implementation-plan)
4. [File Structure](#file-structure)
5. [Development Workflow](#development-workflow)
6. [Production Workflow](#production-workflow)
7. [Migration Strategy](#migration-strategy)
8. [Footguns & Edge Cases](#footguns--edge-cases)
9. [Performance Characteristics](#performance-characteristics)
10. [Future Enhancements](#future-enhancements)

---

## Current System Problems

### What's Wrong with Sandpack?

1. **Slow HMR**: 5-10s rebuild due to Sandpack's internal bundler
2. **Local package hell**: Complex `/dev-packages` endpoint + manual sync scripts
3. **No source support**: Always requires pre-built dist files
4. **Black box**: Limited control over bundling, resolution, error handling
5. **Large payload**: ~5MB Sandpack runtime + 1.6MB dev-packages
6. **Fragile cleanup**: Transport leaks, "already exists" errors on HMR

### What Works Well (Must Preserve)

✅ Dual-view preview (host/client iframes with IframeBridgeRelay)
✅ DevTools integration (StateInspector postMessage bridge)
✅ Config injection (`__MARTINI_KIT_CONFIG__`)
✅ Transport abstraction (local/iframe-bridge)
✅ VirtualFileSystem API
✅ Sandboxed iframe security model

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ IDE (SvelteKit App)                                             │
│                                                                 │
│  ┌────────────────┐         ┌──────────────────┐              │
│  │  CodeEditor    │────────▶│ VirtualFileSystem │              │
│  │  (CodeMirror)  │         │   (user files)    │              │
│  └────────────────┘         └──────────────────┘              │
│                                      │                          │
│                                      ▼                          │
│                          ┌────────────────────────┐            │
│                          │  ESBuildManager        │            │
│                          │  (runs in browser)     │            │
│                          └────────────────────────┘            │
│                                      │                          │
│                                      ▼                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Preview Iframes (sandboxed)                              │ │
│  │                                                          │ │
│  │  1. Load pre-built SDK (cached)                         │ │
│  │     <script src="/sdk/martini-kit.js"></script>         │ │
│  │     → window.MartiniKit = { core, phaser, ... }         │ │
│  │                                                          │ │
│  │  2. Load user code bundle (built on-demand)             │ │
│  │     <script type="module">                              │ │
│  │       import { defineGame } from '@martini-kit/core';   │ │
│  │       // ↑ Resolved via import map to MartiniKit.core  │ │
│  │     </script>                                           │ │
│  │                                                          │ │
│  │  3. Execute + connect transport                         │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Two-Stage Build System

#### Stage 1: SDK Build (Pre-bundled, Cached)

**When**: Package build time (or on-demand in dev)

**Input**: `@martini-kit/*` packages from workspace (dev) or node_modules (prod)

**Output**:
- `static/sdk/martini-kit.js` (UMD bundle, ~200KB minified)
- `static/sdk/shims/*.js` (Import map shims)

**Format**: IIFE/UMD with global `window.MartiniKit`

**Caching**: Browser caches this heavily (changes rarely)

#### Stage 2: User Code Build (On-Demand, Fast)

**When**: User types in editor, file save event

**Input**: VirtualFileSystem (user's game code)

**Output**: ESM bundle as string

**Bundler**: ESBuild-WASM running in browser

**Speed**: 500ms-1s (only user code, SDK is external)

### Package Resolution Strategy

#### The Bundling Problem

When bundling user code, we need to resolve:
```typescript
import { defineGame } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';
```

**Option A: Bundle inline** → 500KB+ bundle every rebuild (slow)
**Option B: Mark external** → Browser can't resolve bare imports
**Option C: Pre-bundle SDK + Import Maps** → ✅ **This is what we do**

#### Solution: UMD + Import Maps

**Step 1**: Pre-build SDK as UMD (one global)
```javascript
// sdk/martini-kit.js (built once, cached)
window.MartiniKit = {
  core: { defineGame, GameRuntime, ... },
  phaser: { PhaserAdapter, initializeGame, ... },
  devtools: { StateInspector, ... },
  'transport-local': { LocalTransport, ... },
  'transport-iframe-bridge': { IframeBridgeTransport, IframeBridgeRelay, ... }
};
```

**Step 2**: Create import map shims
```javascript
// sdk/shims/core.js
export * from globalThis.MartiniKit.core;

// sdk/shims/phaser.js
export * from globalThis.MartiniKit.phaser;

// sdk/shims/phaser-global.js
export default globalThis.Phaser;
```

**Step 3**: Preview HTML uses import maps
```html
<!-- preview.html -->
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
<script src="/sdk/martini-kit.js"></script>
<script type="importmap">
{
  "imports": {
    "@martini-kit/core": "/sdk/shims/core.js",
    "@martini-kit/phaser": "/sdk/shims/phaser.js",
    "@martini-kit/devtools": "/sdk/shims/devtools.js",
    "@martini-kit/transport-local": "/sdk/shims/transport-local.js",
    "@martini-kit/transport-iframe-bridge": "/sdk/shims/transport-iframe-bridge.js",
    "phaser": "/sdk/shims/phaser-global.js"
  }
}
</script>
<script type="module" id="user-code">
  // User code injected here by ESBuildManager
</script>
```

**Step 4**: ESBuild marks SDK as external
```typescript
await esbuild.build({
  entryPoints: ['/src/main.ts'],
  bundle: true,
  format: 'esm',
  external: [
    '@martini-kit/core',
    '@martini-kit/phaser',
    '@martini-kit/devtools',
    '@martini-kit/transport-local',
    '@martini-kit/transport-iframe-bridge',
    'phaser'
  ],
  plugins: [virtualFSPlugin(vfs)]
});
```

Result: User imports stay as-is, resolved by import map at runtime.

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1) ✅ COMPLETED

#### 1.1: SDK Build Script ✅ DONE

**File**: `@martini-kit/demos/scripts/build-sdk.ts`

```typescript
import * as esbuild from 'esbuild';
import { resolve } from 'path';
import { mkdir, writeFile } from 'fs/promises';

const isDev = process.argv.includes('--watch');
const isProd = process.argv.includes('--production');

async function buildSDK() {
  const packages = [
    '@martini-kit/core',
    '@martini-kit/phaser',
    '@martini-kit/devtools',
    '@martini-kit/transport-local',
    '@martini-kit/transport-iframe-bridge'
  ];

  // Create virtual entry that re-exports all packages
  const sdkEntry = packages.map((pkg, i) => {
    const name = pkg.replace('@martini-kit/', '');
    return `import * as pkg${i} from '${pkg}';
export const ${name.replace(/-/g, '_')} = pkg${i};`;
  }).join('\n');

  console.log('[SDK Build] Starting...');
  console.log(`[SDK Build] Mode: ${isProd ? 'production' : 'development'}`);
  console.log(`[SDK Build] Packages: ${packages.join(', ')}`);

  const ctx = await esbuild.context({
    stdin: {
      contents: sdkEntry,
      resolveDir: process.cwd(),
      loader: 'ts'
    },
    bundle: true,
    format: 'iife',
    globalName: 'MartiniKit',
    outfile: 'static/sdk/martini-kit.js',
    external: ['phaser'],
    sourcemap: !isProd,
    minify: isProd,

    plugins: [{
      name: 'resolve-workspace-or-npm',
      setup(build) {
        build.onResolve({ filter: /@martini-kit\// }, (args) => {
          const pkgName = args.path.replace('@martini-kit/', '');

          if (isProd) {
            // Production: resolve from node_modules
            return { path: args.path, external: false };
          } else {
            // Dev: resolve from workspace source
            const sourcePath = resolve(
              __dirname,
              `../../@martini-kit/${pkgName}/src/index.ts`
            );
            console.log(`[SDK Build] Resolving ${args.path} → ${sourcePath}`);
            return { path: sourcePath };
          }
        });
      }
    }]
  });

  if (isDev) {
    console.log('[SDK Build] Watching for changes...');
    await ctx.watch();
    // Keep process alive
    await new Promise(() => {});
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('[SDK Build] ✓ Built successfully');
  }

  // Generate import map shims
  await generateShims(packages);
}

async function generateShims(packages: string[]) {
  const shimsDir = resolve(__dirname, '../static/sdk/shims');
  await mkdir(shimsDir, { recursive: true });

  console.log('[SDK Build] Generating import map shims...');

  for (const pkg of packages) {
    const name = pkg.replace('@martini-kit/', '');
    const exportName = name.replace(/-/g, '_');
    const shimContent = `// Auto-generated shim for ${pkg}
export * from globalThis.MartiniKit['${exportName}'];
export default globalThis.MartiniKit['${exportName}'];
`;

    await writeFile(
      resolve(shimsDir, `${name}.js`),
      shimContent
    );
  }

  // Phaser shim (points to CDN global)
  await writeFile(
    resolve(shimsDir, 'phaser-global.js'),
    `// Auto-generated shim for Phaser (loaded from CDN)
export default globalThis.Phaser;
`
  );

  console.log('[SDK Build] ✓ Generated shims for ${packages.length} packages');
}

buildSDK().catch(err => {
  console.error('[SDK Build] Failed:', err);
  process.exit(1);
});
```

**Package scripts** (`@martini-kit/demos/package.json`):
```json
{
  "scripts": {
    "dev": "npm run dev:build-sdk && vite dev",
    "dev:build-sdk": "tsx scripts/build-sdk.ts --watch",
    "build": "npm run build:sdk && vite build",
    "build:sdk": "tsx scripts/build-sdk.ts --production"
  }
}
```

#### 1.2: ESBuildManager (Browser Runtime)

**File**: `@martini-kit/ide/src/lib/core/ESBuildManager.ts`

```typescript
import * as esbuild from 'esbuild-wasm';
import type { VirtualFileSystem } from './VirtualFS';
import type { StateSnapshot, ActionRecord } from '@martini-kit/devtools';

export interface ESBuildManagerOptions {
  /** Container element for the preview iframe */
  container: HTMLElement;

  /** Role (host or client) for multiplayer setup */
  role: 'host' | 'client';

  /** Room ID for multiplayer */
  roomId: string;

  /** Transport type */
  transportType: 'local' | 'iframe-bridge';

  /** Enable DevTools */
  enableDevTools?: boolean;

  /** Error callback */
  onError?: (error: { type: 'runtime' | 'syntax'; message: string; stack?: string }) => void;

  /** Ready callback */
  onReady?: () => void;

  /** Console log callback */
  onConsoleLog?: (log: { message: string; level: 'log' | 'warn' | 'error'; timestamp: number }) => void;

  /** Connection status callback */
  onConnectionStatus?: (status: 'disconnected' | 'connecting' | 'connected') => void;

  /** State snapshot callback (DevTools integration) */
  onStateSnapshot?: (snapshot: StateSnapshot) => void;

  /** Action callback (DevTools integration) */
  onAction?: (action: ActionRecord) => void;

  /** Network packet callback (DevTools integration) */
  onNetworkPacket?: (packet: {
    timestamp: number;
    direction: 'send' | 'receive';
    type: string;
    size: number;
    payload: any;
  }) => void;
}

export class ESBuildManager {
  private iframe: HTMLIFrameElement | null = null;
  private options: ESBuildManagerOptions;
  private devToolsEnabled: boolean;
  private initialized = false;
  private buildInProgress = false;

  constructor(options: ESBuildManagerOptions) {
    this.options = options;
    this.devToolsEnabled = options.enableDevTools === true;
    this.setupDevToolsListener();
  }

  /**
   * Initialize ESBuild-WASM and create iframe
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[ESBuildManager] Already initialized');
      return;
    }

    console.log('[ESBuildManager] Initializing ESBuild-WASM...');

    // Initialize ESBuild-WASM (loads ~8MB WASM file)
    await esbuild.initialize({
      wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.20.0/esbuild.wasm',
      worker: true
    });

    console.log('[ESBuildManager] ✓ ESBuild-WASM ready');

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.title = `Game Preview (${this.options.role})`;

    // Security: sandbox the iframe
    this.iframe.sandbox.add('allow-scripts', 'allow-same-origin');

    // Append to container
    this.options.container.appendChild(this.iframe);

    this.initialized = true;
  }

  /**
   * Build and run user code
   */
  async run(vfs: VirtualFileSystem, entryPoint: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('ESBuildManager not initialized. Call initialize() first.');
    }

    if (this.buildInProgress) {
      console.warn('[ESBuildManager] Build already in progress, skipping');
      return;
    }

    this.buildInProgress = true;

    try {
      console.time('[ESBuildManager] Build');

      // Build user code with ESBuild
      const result = await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        format: 'esm',
        write: false,

        // Mark SDK packages as external (resolved by import map)
        external: [
          '@martini-kit/core',
          '@martini-kit/phaser',
          '@martini-kit/devtools',
          '@martini-kit/transport-local',
          '@martini-kit/transport-iframe-bridge',
          'phaser'
        ],

        plugins: [
          this.createVirtualFSPlugin(vfs, entryPoint)
        ]
      });

      console.timeEnd('[ESBuildManager] Build');

      if (result.errors.length > 0) {
        const error = result.errors[0];
        this.options.onError?.({
          type: 'syntax',
          message: error.text,
          stack: `${error.location?.file}:${error.location?.line}:${error.location?.column}`
        });
        return;
      }

      // Get bundled code
      const bundledCode = result.outputFiles[0].text;

      // Inject into iframe
      await this.loadPreview(bundledCode);

      this.options.onReady?.();

    } catch (error) {
      console.error('[ESBuildManager] Build failed:', error);
      this.options.onError?.({
        type: 'runtime',
        message: error instanceof Error ? error.message : 'Unknown build error'
      });
    } finally {
      this.buildInProgress = false;
    }
  }

  /**
   * Update code (rebuild and reload)
   */
  async updateCode(vfs: VirtualFileSystem, entryPoint: string): Promise<void> {
    // ESBuild-WASM: full rebuild + reload (no true HMR)
    return this.run(vfs, entryPoint);
  }

  /**
   * Dynamically enable or disable DevTools at runtime
   */
  setDevToolsEnabled(enabled: boolean): void {
    if (this.devToolsEnabled === enabled) return;
    this.devToolsEnabled = enabled;

    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage({
        type: enabled ? 'martini-kit:devtools:enable' : 'martini-kit:devtools:disable'
      }, '*');
    }
  }

  /**
   * Pause/resume Inspector capturing
   */
  setInspectorPaused(paused: boolean): void {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage({
        type: paused ? 'martini-kit:devtools:pause' : 'martini-kit:devtools:resume'
      }, '*');
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    // CRITICAL: Disconnect transport BEFORE removing iframe
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage({
        type: 'martini-kit:transport:disconnect'
      }, '*');
    }

    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }

    // Note: ESBuild-WASM doesn't need explicit cleanup
  }

  // ============================================================================
  // Private helper methods
  // ============================================================================

  /**
   * Create ESBuild plugin for virtual file system
   */
  private createVirtualFSPlugin(vfs: VirtualFileSystem, entryPoint: string): esbuild.Plugin {
    return {
      name: 'virtual-fs',
      setup(build) {
        // Resolve user files from VFS
        build.onResolve({ filter: /.*/ }, (args) => {
          // Let external packages pass through
          if (args.path.startsWith('@martini-kit/') || args.path === 'phaser') {
            return { external: true };
          }

          // Resolve relative imports
          if (args.path.startsWith('./') || args.path.startsWith('../')) {
            const dir = args.importer ? args.importer.substring(0, args.importer.lastIndexOf('/')) : '/src';
            const resolved = new URL(args.path, `file://${dir}/`).pathname;
            return { path: resolved, namespace: 'vfs' };
          }

          // Resolve absolute imports
          if (args.path.startsWith('/')) {
            return { path: args.path, namespace: 'vfs' };
          }

          // Default: treat as VFS path
          return { path: `/src/${args.path}`, namespace: 'vfs' };
        });

        // Load files from VFS
        build.onLoad({ filter: /.*/, namespace: 'vfs' }, (args) => {
          let content = vfs.readFile(args.path);

          if (content === undefined) {
            // Try adding .ts extension
            content = vfs.readFile(args.path + '.ts');
          }

          if (content === undefined) {
            return {
              errors: [{
                text: `File not found: ${args.path}`,
                location: null
              }]
            };
          }

          // Inject config into entry point
          if (args.path === entryPoint) {
            content = this.injectConfig(content);
          }

          // Determine loader from file extension
          const ext = args.path.split('.').pop();
          const loader = ext === 'ts' ? 'ts' : ext === 'tsx' ? 'tsx' : 'js';

          return {
            contents: content,
            loader
          };
        });
      }
    };
  }

  /**
   * Inject config and DevTools bridge into entry point
   */
  private injectConfig(entryCode: string): string {
    const config = {
      transport: {
        type: this.options.transportType,
        roomId: this.options.roomId,
        isHost: this.options.role === 'host'
      }
    };

    const configSetup = `// Injected by martini-kit IDE - setup config before any imports
const __martiniKitConfig = ${JSON.stringify(config, null, 2)};
// Support both legacy and current config keys
window['__martini-kit_CONFIG__'] = __martiniKitConfig;
window['__MARTINI_KIT_CONFIG__'] = __martiniKitConfig;

`;

    const devtoolsBridge = this.createDevToolsBridge();

    return configSetup + devtoolsBridge + entryCode;
  }

  /**
   * Create DevTools bridge script
   */
  private createDevToolsBridge(): string {
    const initiallyEnabled = this.devToolsEnabled ? 'true' : 'false';

    return `
// ===== martini-kit DevTools Bridge =====
// Auto-injected by martini-kit IDE - forwards runtime data to parent window
import { StateInspector } from '@martini-kit/devtools';

let devToolsEnabled = ${initiallyEnabled};
let capturedRuntime = null;

window.__MARTINI_KIT_INSPECTOR__ = new StateInspector({
  maxSnapshots: 200,
  maxActions: 1000,
  snapshotIntervalMs: 250,
  actionAggregationWindowMs: 200,
  ignoreActions: ['tick'],
  maxMemoryBytes: 30 * 1024 * 1024
});

window.addEventListener('message', (event) => {
  if (event.data?.type === 'martini-kit:devtools:enable') {
    if (!devToolsEnabled) {
      devToolsEnabled = true;
      if (capturedRuntime) {
        window.__MARTINI_KIT_INSPECTOR__.attach(capturedRuntime);
      }
    }
  } else if (event.data?.type === 'martini-kit:devtools:disable') {
    if (devToolsEnabled) {
      devToolsEnabled = false;
      if (capturedRuntime) {
        window.__MARTINI_KIT_INSPECTOR__.detach();
      }
    }
  } else if (event.data?.type === 'martini-kit:devtools:pause') {
    window.__MARTINI_KIT_INSPECTOR__.setPaused(true);
  } else if (event.data?.type === 'martini-kit:devtools:resume') {
    window.__MARTINI_KIT_INSPECTOR__.setPaused(false);
  }
});

// Register runtime hook (called by initializeGame)
window['__martini-kit_IDE__'] = {
  registerRuntime: (runtime) => {
    capturedRuntime = runtime;

    if (devToolsEnabled) {
      window.__MARTINI_KIT_INSPECTOR__.attach(runtime);
    }

    const stateSnapshotBatch = [];
    const actionBatch = [];
    let flushScheduled = false;

    function scheduleFlush() {
      if (flushScheduled) return;
      flushScheduled = true;
      requestAnimationFrame(() => {
        if (stateSnapshotBatch.length > 0) {
          window.parent.postMessage({
            type: 'martini-kit:devtools:state:batch',
            snapshots: stateSnapshotBatch.splice(0)
          }, '*');
        }
        if (actionBatch.length > 0) {
          window.parent.postMessage({
            type: 'martini-kit:devtools:action:batch',
            actions: actionBatch.splice(0)
          }, '*');
        }
        flushScheduled = false;
      });
    }

    window.__MARTINI_KIT_INSPECTOR__.onStateChange((snapshot) => {
      if (devToolsEnabled) {
        stateSnapshotBatch.push(snapshot);
        scheduleFlush();
      }
    });

    window.__MARTINI_KIT_INSPECTOR__.onAction((action) => {
      if (devToolsEnabled) {
        actionBatch.push(action);
        scheduleFlush();
      }
    });
  }
};
`;
  }

  /**
   * Load preview with bundled code
   */
  private async loadPreview(bundledCode: string): Promise<void> {
    if (!this.iframe) {
      throw new Error('Iframe not initialized');
    }

    // Create preview HTML
    const html = this.createPreviewHTML(bundledCode);

    // Load into iframe (this triggers full reload)
    this.iframe.srcdoc = html;

    // Wait for iframe to load
    await new Promise<void>((resolve) => {
      if (!this.iframe) return resolve();

      const onLoad = () => {
        this.iframe?.removeEventListener('load', onLoad);
        resolve();
      };

      this.iframe.addEventListener('load', onLoad);
    });
  }

  /**
   * Create preview HTML template
   */
  private createPreviewHTML(userCode: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #000;
      overflow: hidden;
    }
    #game {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    canvas {
      outline: none !important;
    }
  </style>
</head>
<body>
  <div id="game"></div>

  <!-- Load Phaser from CDN as a global -->
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>

  <!-- Load pre-built SDK (cached) -->
  <script src="/sdk/martini-kit.js"></script>

  <!-- Import map for package resolution -->
  <script type="importmap">
  {
    "imports": {
      "@martini-kit/core": "/sdk/shims/core.js",
      "@martini-kit/phaser": "/sdk/shims/phaser.js",
      "@martini-kit/devtools": "/sdk/shims/devtools.js",
      "@martini-kit/transport-local": "/sdk/shims/transport-local.js",
      "@martini-kit/transport-iframe-bridge": "/sdk/shims/transport-iframe-bridge.js",
      "phaser": "/sdk/shims/phaser-global.js"
    }
  }
  </script>

  <!-- User code (built by ESBuild) -->
  <script type="module">
${userCode}
  </script>
</body>
</html>`;
  }

  /**
   * Setup listener for DevTools postMessage events from iframe
   */
  private setupDevToolsListener(): void {
    window.addEventListener('message', (event) => {
      // Only process messages from our iframe
      if (event.source !== this.iframe?.contentWindow) return;

      const data = event.data;

      // Handle batched DevTools messages
      if (data?.type === 'martini-kit:devtools:state:batch') {
        data.snapshots?.forEach((snapshot: any) => {
          this.options.onStateSnapshot?.(snapshot);
        });
      } else if (data?.type === 'martini-kit:devtools:action:batch') {
        data.actions?.forEach((action: any) => {
          this.options.onAction?.(action);
        });
      } else if (data?.type === 'martini-kit:devtools:network:batch') {
        data.packets?.forEach((packet: any) => {
          this.options.onNetworkPacket?.(packet);
        });
      }
      // Keep single-message handlers for backwards compatibility
      else if (data?.type === 'martini-kit:devtools:state') {
        this.options.onStateSnapshot?.(data.snapshot);
      } else if (data?.type === 'martini-kit:devtools:action') {
        this.options.onAction?.(data.action);
      } else if (data?.type === 'martini-kit:devtools:network') {
        this.options.onNetworkPacket?.(data.packet);
      }
    });
  }
}
```

#### 1.3: Update GamePreview Component

**File**: `@martini-kit/ide/src/lib/components/GamePreview.svelte`

Replace `SandpackManager` imports and usage with `ESBuildManager`:

```diff
- import { SandpackManager } from '../core/SandpackManager';
+ import { ESBuildManager } from '../core/ESBuildManager';

- let sandpackManager: SandpackManager | null = null;
+ let esbuildManager: ESBuildManager | null = null;

  onMount(async () => {
-   sandpackManager = new SandpackManager({
+   esbuildManager = new ESBuildManager({
      container,
      role,
      roomId: sessionRoomId,
      transportType,
      enableDevTools,
      // ... other options
    });

    try {
-     await sandpackManager.initialize();
-     await sandpackManager.run(vfs, entryPoint);
+     await esbuildManager.initialize();
+     await esbuildManager.run(vfs, entryPoint);
    } catch (err) {
      // ... error handling
    }

    return () => {
-     sandpackManager?.destroy();
+     esbuildManager?.destroy();
    };
  });

  $effect(() => {
-   if (!sandpackManager || !isReady) return;
+   if (!esbuildManager || !isReady) return;
    if (status === 'initializing' || status === 'error') return;

    const version = vfsVersion;
    if (version >= 0) {
-     sandpackManager.updateCode(vfs, entryPoint).catch((err) => {
+     esbuildManager.updateCode(vfs, entryPoint).catch((err) => {
        console.error('[GamePreview] Failed to update sandbox', err);
      });
    }
  });
```

### Phase 2: Testing & Validation (Week 1-2)

#### 2.1: Manual Testing Checklist

**Local Development:**
- [ ] SDK builds from workspace source
- [ ] SDK watch mode rebuilds on package changes
- [ ] User code rebuilds in < 2s
- [ ] Dual preview (host/client) connects via IframeBridgeRelay
- [ ] DevTools integration works (state, actions, network)
- [ ] Console logs forwarded to IDE
- [ ] HMR triggers full reload (no stale state)
- [ ] Transport cleanup on iframe destroy (no "already exists" errors)
- [ ] Error overlay shows syntax errors clearly
- [ ] Source maps work for debugging

**Production Build:**
- [ ] SDK builds from node_modules
- [ ] Static deploy works (no server needed)
- [ ] All assets cached properly
- [ ] Bundle size < 500KB total
- [ ] Works on Vercel/Netlify static hosting

**Edge Cases:**
- [ ] Rapid file edits (debounce builds)
- [ ] Syntax errors don't crash IDE
- [ ] Large files (> 100KB) build OK
- [ ] Circular imports handled
- [ ] Missing imports show clear error

#### 2.2: Automated Tests

**Unit Tests** (`ESBuildManager.test.ts`):
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ESBuildManager } from './ESBuildManager';
import { VirtualFileSystem } from './VirtualFS';

describe('ESBuildManager', () => {
  let manager: ESBuildManager;
  let container: HTMLDivElement;

  beforeAll(async () => {
    container = document.createElement('div');
    manager = new ESBuildManager({
      container,
      role: 'host',
      roomId: 'test-room',
      transportType: 'local',
      enableDevTools: false
    });
    await manager.initialize();
  });

  afterAll(() => {
    manager.destroy();
  });

  it('should build simple user code', async () => {
    const vfs = new VirtualFileSystem({
      '/src/main.ts': `
        import { defineGame } from '@martini-kit/core';
        console.log('Hello from test');
      `
    });

    await expect(manager.run(vfs, '/src/main.ts')).resolves.toBeUndefined();
  });

  it('should handle syntax errors gracefully', async () => {
    const vfs = new VirtualFileSystem({
      '/src/main.ts': `
        import { defineGame from '@martini-kit/core';
        // Missing closing brace ^
      `
    });

    const onError = vi.fn();
    const errorManager = new ESBuildManager({
      ...manager.options,
      onError
    });

    await errorManager.run(vfs, '/src/main.ts');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'syntax' })
    );
  });

  it('should rebuild quickly on code change', async () => {
    const vfs = new VirtualFileSystem({
      '/src/main.ts': `console.log('v1');`
    });

    const start = performance.now();
    await manager.run(vfs, '/src/main.ts');
    const buildTime = performance.now() - start;

    // Should build in < 2s
    expect(buildTime).toBeLessThan(2000);
  });
});
```

### Phase 3: Migration & Rollout (Week 2)

#### 3.1: Parallel Implementation

1. **Keep Sandpack temporarily**:
   - Don't delete `SandpackManager.ts` yet
   - Add feature flag for A/B testing

2. **Add feature flag**:
```typescript
// @martini-kit/ide/src/lib/MartiniIDE.svelte
const USE_ESBUILD = import.meta.env.VITE_USE_ESBUILD !== 'false';

// In GamePreview component
{#if USE_ESBUILD}
  <ESBuildPreview {vfs} {entryPoint} ... />
{:else}
  <SandpackPreview {vfs} {entryPoint} ... />
{/if}
```

3. **Test in isolation**:
```bash
# Test ESBuild version
VITE_USE_ESBUILD=true pnpm dev

# Test Sandpack version (fallback)
VITE_USE_ESBUILD=false pnpm dev
```

#### 3.2: Full Cutover

Once validated:

1. **Remove Sandpack**:
   - Delete `SandpackManager.ts`
   - Remove `@codesandbox/sandpack-client` dependency
   - Delete `/dev-packages` endpoint routes
   - Delete `scripts/sync-dev-packages.js`

2. **Update docs**:
   - Update `DEV_WORKFLOW.md` with new build process
   - Remove references to Sandpack
   - Document ESBuild-WASM approach

3. **Clean up gitignore**:
```diff
- # Dev packages (generated by sync script)
- **/static/dev-packages/

+ # SDK build output (generated by build-sdk.ts)
+ **/static/sdk/
```

---

## File Structure

### Before (Sandpack)
```
@martini-kit/
  demos/
    scripts/
      sync-dev-packages.js          ← DELETE
    static/
      dev-packages/                 ← DELETE (gitignored)
        @martini-kit/
          core/
            dist/
              index.js
              package.json
          phaser/
            dist/
              ...
    src/
      routes/
        dev-packages/               ← DELETE
          [...path]/+server.ts
        dev-packages-list/          ← DELETE
          [package]/+server.ts

  ide/
    src/
      lib/
        core/
          SandpackManager.ts        ← DELETE
          VirtualFS.ts              ← KEEP
```

### After (ESBuild-WASM)
```
@martini-kit/
  demos/
    scripts/
      build-sdk.ts                  ← NEW
    static/
      sdk/                          ← NEW (gitignored in dev, committed in prod)
        martini-kit.js              ← Pre-built SDK bundle
        martini-kit.js.map
        shims/
          core.js
          phaser.js
          devtools.js
          transport-local.js
          transport-iframe-bridge.js
          phaser-global.js
    src/
      routes/
        ide/
          +page.svelte

  ide/
    src/
      lib/
        core/
          ESBuildManager.ts         ← NEW
          VirtualFS.ts              ← KEEP
        components/
          GamePreview.svelte        ← UPDATE
```

---

## Development Workflow

### Initial Setup

```bash
# 1. Install ESBuild-WASM
cd @martini-kit/ide
pnpm add esbuild-wasm

# 2. Install build tools
cd ../demos
pnpm add -D tsx esbuild

# 3. Build SDK for first time
pnpm run build:sdk

# 4. Start development
pnpm dev
```

### Daily Workflow

**Terminal 1: Watch SDK** (optional, only if editing packages)
```bash
cd @martini-kit/demos
pnpm run dev:build-sdk
# Watches: ../core/src/**, ../phaser/src/**, etc.
# Auto-rebuilds SDK when packages change (1-2s)
```

**Terminal 2: Dev Server**
```bash
cd @martini-kit/demos
pnpm dev
# Serves IDE at http://localhost:5173
```

**Terminal 3: Package Development** (when needed)
```bash
cd @martini-kit/phaser
nvim src/PhaserAdapter.ts
# Save → Terminal 1 rebuilds SDK automatically
# Refresh browser → new SDK loaded → user code rebuilds
```

### Iteration Speed

| Action | Old (Sandpack) | New (ESBuild) | Improvement |
|--------|---------------|---------------|-------------|
| **Edit user code** | 5-10s (Sandpack rebuild) | 0.5-1s (ESBuild rebuild) | **5-10x faster** |
| **Edit package source** | Build (5s) + sync + reload (5-10s) | SDK rebuild (1-2s) + reload | **3-5x faster** |
| **Initial load** | ~5s (load Sandpack + bundle) | ~500ms (load SDK + build) | **10x faster** |

---

## Production Workflow

### Building for Production

```bash
# From workspace root
cd @martini-kit/demos

# 1. Build SDK from npm packages
pnpm run build:sdk --production
# Reads from node_modules, outputs to static/sdk/

# 2. Build SvelteKit site
pnpm run build
# Outputs to .svelte-kit/output/

# 3. Preview production build locally
pnpm preview

# 4. Deploy to static hosting
vercel deploy
# or: netlify deploy
# or: any static CDN
```

### What Gets Deployed

```
.svelte-kit/output/static/
  sdk/
    martini-kit.js              ← 200KB minified SDK
    shims/
      *.js                       ← Small shim files
  _app/
    immutable/                   ← SvelteKit app bundles
  index.html
  ...other routes
```

**Total bundle size**: ~500KB (vs ~1.6MB with Sandpack dev-packages)

### CDN Caching

SDK is heavily cached:
```
Cache-Control: public, max-age=31536000, immutable
```

User rebuilds are instant (SDK already cached).

---

## Migration Strategy

### Phase 1: Parallel Implementation (1 week)

**Goal**: ESBuild and Sandpack run side-by-side

**Steps**:
1. Implement `ESBuildManager.ts` (new file)
2. Create `build-sdk.ts` script
3. Add feature flag to toggle between systems
4. Test ESBuild extensively in isolation

**Validation**:
- Both systems work independently
- Easy to switch between them
- No regressions in Sandpack version

### Phase 2: Internal Dogfooding (1 week)

**Goal**: Use ESBuild as primary, keep Sandpack as backup

**Steps**:
1. Default to ESBuild (`USE_ESBUILD=true`)
2. Keep Sandpack accessible via env var
3. Fix issues discovered in daily use
4. Measure performance improvements

**Validation**:
- ESBuild handles all current use cases
- Performance gains are real (5-10x)
- No critical bugs

### Phase 3: Full Cutover (1 week)

**Goal**: Remove Sandpack entirely

**Steps**:
1. Delete `SandpackManager.ts`
2. Remove Sandpack dependencies
3. Delete `/dev-packages` infrastructure
4. Update documentation
5. Celebrate 🎉

**Validation**:
- All tests pass
- Production deploy works
- Docs are accurate

---

## Footguns & Edge Cases

### 🔫 Footgun #1: Import Map Browser Support

**Problem**: Import maps require modern browsers (Chrome 89+, Safari 16.4+)

**Impact**: Won't work on older browsers

**Mitigation**:
- Document browser requirements clearly
- Show error message if import maps not supported
- Fallback: Could inline bundle SDK (slower but works everywhere)

**Detection**:
```typescript
if (!HTMLScriptElement.supports || !HTMLScriptElement.supports('importmap')) {
  showError('Your browser does not support import maps. Please upgrade to Chrome 89+ or Safari 16.4+');
}
```

---

### 🔫 Footgun #2: ESBuild-WASM Initial Load (8MB)

**Problem**: First time loading ESBuild-WASM downloads ~8MB WASM file

**Impact**: Initial page load is slower (~2-3s on slow connection)

**Mitigation**:
- Cache WASM file aggressively (CDN + browser cache)
- Show loading spinner with progress
- Only load once per session (singleton pattern)

**Loading UI**:
```svelte
{#if !esbuildReady}
  <div class="loading">
    <spinner />
    <p>Loading code bundler... (one-time: ~8MB)</p>
  </div>
{/if}
```

---

### 🔫 Footgun #3: Full Reload (Not True HMR)

**Problem**: ESBuild rebuilds and reloads entire iframe (loses game state)

**Impact**: Testing iterative changes requires restarting game each time

**Mitigation**:
- This is acceptable for game dev (state resets are normal)
- 1s reload is still way better than 10s rebuild
- Future: Could implement state snapshot/restore

**User expectation**:
```
Sandpack: Edit → 10s wait → HMR (state preserved)
ESBuild:  Edit → 1s wait → Reload (state reset)

Net result: ESBuild is still 5x faster despite reload
```

---

### 🔫 Footgun #4: SDK Rebuild in Dev Mode

**Problem**: Editing package source requires SDK rebuild + browser refresh

**Impact**: Not instant (1-2s rebuild + manual refresh)

**Mitigation**:
- Watch mode auto-rebuilds SDK
- Still way better than current (5s build + manual sync + 10s Sandpack)
- Document workflow clearly

**Current workflow**:
```bash
# Before (painful)
cd @martini-kit/phaser
vim src/runtime.ts
pnpm build                      # 5s
cd ../demos
pnpm run dev:sync-packages      # manual step
# Refresh browser                # Sandpack rebuilds: 10s
# Total: ~20s

# After (smooth)
cd @martini-kit/phaser
vim src/runtime.ts
# SDK watch rebuilds automatically  # 1-2s
# Refresh browser                    # ESBuild rebuilds: 1s
# Total: ~3s (6x faster)
```

---

### 🔫 Footgun #5: Circular Dependencies

**Problem**: ESBuild can struggle with circular imports

**Impact**: Build errors if user code has circular dependencies

**Mitigation**:
- Show clear error message
- Guide user to fix circular import
- Most projects don't have this issue

**Error handling**:
```typescript
if (result.errors.some(e => e.text.includes('circular'))) {
  showError(
    'Circular dependency detected. ' +
    'Check your imports - no file should import itself (directly or indirectly).'
  );
}
```

---

### 🔫 Footgun #6: Large File Performance

**Problem**: ESBuild-WASM can be slow with very large files (> 500KB)

**Impact**: Initial build may take > 2s for huge files

**Mitigation**:
- Show progress indicator for builds > 1s
- Warn users to split large files
- Debounce rapid edits (don't rebuild on every keystroke)

**Debouncing**:
```typescript
let buildTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleBuild(vfs: VirtualFileSystem) {
  if (buildTimer) clearTimeout(buildTimer);

  buildTimer = setTimeout(() => {
    esbuildManager.updateCode(vfs, entryPoint);
  }, 500); // Wait 500ms after last edit
}
```

---

### 🔫 Footgun #7: SDK Version Mismatch

**Problem**: Dev SDK (workspace) vs Prod SDK (npm) may differ

**Impact**: Code works in dev but breaks in prod

**Mitigation**:
- Test production build before deploying
- Version SDK bundle (include git hash in filename)
- Clear browser cache between SDK updates

**Versioning**:
```typescript
// build-sdk.ts
const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
const outfile = `static/sdk/martini-kit.${gitHash}.js`;
```

---

### 🔫 Footgun #8: Phaser Global Conflict

**Problem**: Phaser loaded from CDN as global, might conflict with other globals

**Impact**: If user code loads another version of Phaser, conflicts occur

**Mitigation**:
- Lock Phaser version in preview HTML
- Document that Phaser is provided globally
- Warn if user tries to install Phaser

**Check**:
```typescript
// In ESBuildManager, detect Phaser in user package.json
if (vfs.readFile('/package.json')?.includes('"phaser"')) {
  console.warn(
    'You don\'t need to install Phaser - it\'s provided by the IDE. ' +
    'Remove it from your package.json.'
  );
}
```

---

### 🔫 Footgun #9: Import Map Caching

**Problem**: Browser aggressively caches shim files

**Impact**: After SDK rebuild, browser may serve stale shims

**Mitigation**:
- Include SDK version hash in shim URLs
- Send `Cache-Control: no-cache` in dev mode
- Force reload with `Cmd+Shift+R` after SDK changes

**Cache headers**:
```typescript
// In SvelteKit server (dev mode only)
export function setHeaders({ headers }) {
  if (import.meta.env.DEV) {
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}
```

---

### 🔫 Footgun #10: Sandbox Restrictions

**Problem**: Iframe sandbox may block required features

**Impact**: Some browser APIs might not work in sandboxed iframe

**Mitigation**:
- Use minimal sandbox flags: `allow-scripts allow-same-origin`
- Document API restrictions
- Test on Safari (strictest sandbox)

**Required sandbox flags**:
```html
<iframe sandbox="allow-scripts allow-same-origin">
  <!-- Need allow-scripts: to run JavaScript -->
  <!-- Need allow-same-origin: to access /sdk/ resources -->
  <!-- DON'T add allow-top-navigation: security risk -->
</iframe>
```

---

## Performance Characteristics

### Build Times

| Scenario | Sandpack | ESBuild-WASM | Improvement |
|----------|----------|--------------|-------------|
| **Initial load** | 5s | 500ms + 8MB WASM (first time only) | 10x faster after WASM cached |
| **User code edit** | 5-10s | 500ms-1s | 5-10x faster |
| **Package edit** | 15-20s (build + sync + rebundle) | 2-3s (SDK rebuild + user rebuild) | 6-7x faster |
| **Large file (500KB)** | 10-15s | 2-3s | 5x faster |

### Bundle Sizes

| Asset | Sandpack | ESBuild-WASM | Savings |
|-------|----------|--------------|---------|
| **Bundler runtime** | ~5MB (Sandpack) | ~8MB (WASM, one-time) | -3MB initial, but cached |
| **SDK/packages** | ~1.6MB (fetched each rebuild) | ~200KB (cached) | 8x smaller |
| **User code** | Included in 1.6MB | ~10-50KB | Tiny |
| **Total per rebuild** | 1.6MB | 10-50KB | **30-50x less data** |

### Memory Usage

| Component | Memory | Notes |
|-----------|--------|-------|
| **ESBuild-WASM** | ~50MB | Loaded once, stays resident |
| **SDK bundle** | ~5MB | Parsed once, cached by browser |
| **User code bundle** | ~1-5MB | Per iframe (host + client) |
| **VirtualFileSystem** | ~1MB | Small, mostly strings |
| **Total** | ~60-70MB | Acceptable for modern browsers |

### Network Traffic

**First load** (cold cache):
- ESBuild WASM: 8MB (one-time)
- Phaser CDN: 2MB (cached)
- SDK bundle: 200KB (cached)
- SvelteKit app: ~300KB
- **Total**: ~10.5MB

**Subsequent loads** (warm cache):
- SvelteKit app: ~300KB
- User code rebuilds: 0KB (local)
- **Total**: ~300KB

**Compare to Sandpack**:
- First load: 5MB (Sandpack) + 1.6MB (dev-packages) + 300KB (app) = ~7MB
- Subsequent loads: 1.6MB (dev-packages refetched) + 300KB (app) = ~2MB

ESBuild wins after first load (90% less network traffic).

---

## Future Enhancements

### Phase 4: Advanced Features (Not MVP)

These are **nice-to-haves** that build on the solid foundation:

#### 4.1: State Snapshot/Restore (HMR Simulation)

**Goal**: Preserve game state across code reloads

**Implementation**:
```typescript
// Before reload
const snapshot = runtime.getState();
localStorage.setItem('__martini_kit_snapshot__', JSON.stringify(snapshot));

// After reload
const snapshot = localStorage.getItem('__martini_kit_snapshot__');
if (snapshot) {
  runtime.setState(JSON.parse(snapshot));
}
```

**Benefit**: Feels like true HMR even with full reload

---

#### 4.2: Time-Travel Debugging

**Goal**: Step through game state history

**Implementation**:
- Already have StateInspector capturing snapshots
- Add UI to scrub through timeline
- Restore preview to any snapshot
- Replay actions from that point

**UI**:
```
┌─────────────────────────────────────┐
│ Timeline:  ●──────●────●───●──[NOW] │
│            t0    t1   t2  t3         │
│                   ↑ Click to restore │
└─────────────────────────────────────┘
```

---

#### 4.3: Multi-Room IDE

**Goal**: Edit multiple games simultaneously

**Implementation**:
- Each preview iframe has unique room ID
- Can open multiple IDE instances in tabs
- State isolated per room

**Use case**: Compare two implementations side-by-side

---

#### 4.4: Asset Hot Reload

**Goal**: Update images/sprites without full reload

**Implementation**:
- Watch VFS for asset changes (`.png`, `.jpg`, `.json`)
- PostMessage to preview: `{ type: 'asset:changed', path: '/assets/player.png' }`
- Phaser scene reloads texture from new data URL

**Benefit**: Iterate on art without restarting game

---

#### 4.5: Performance Profiling

**Goal**: Built-in FPS counter, memory monitor

**Implementation**:
```typescript
// Inject into preview
const stats = new Stats();
stats.showPanel(0); // FPS
document.body.appendChild(stats.dom);

requestAnimationFrame(function loop() {
  stats.update();
  requestAnimationFrame(loop);
});
```

**UI**: Overlay in preview showing FPS, memory, network latency

---

#### 4.6: Remote Collaboration

**Goal**: Multiple devs edit same IDE session (like Replit)

**Implementation**:
- WebSocket server for VFS sync
- Operational Transform for conflict resolution
- Cursor presence (show where others are editing)

**Complexity**: High (needs backend infrastructure)

---

#### 4.7: Cloud Builds (Faster Initial Load)

**Goal**: Pre-build SDK on server, skip WASM download

**Implementation**:
- Server runs ESBuild (Node.js, not WASM)
- User code sent via WebSocket
- Server responds with bundle
- Fallback to local WASM if server unavailable

**Benefit**: No 8MB WASM download, instant builds

**Trade-off**: Requires server (can't be pure static)

---

## Appendix: Alternative Approaches Considered

### Why Not Vite Dev Server?

**Pros of Vite**:
- ✅ True HMR (module hot-swap)
- ✅ Extremely fast (<500ms)
- ✅ Great DX (devtools, source maps)

**Cons of Vite**:
- ❌ Requires Node.js server (can't be static)
- ❌ Complex to set up (two servers: IDE + preview)
- ❌ Production embeds need server deploy
- ❌ Network latency for every update

**Verdict**: Vite is great for internal tooling, but ESBuild-WASM is better for shareable, embeddable IDE.

---

### Why Not StackBlitz WebContainers?

**Pros of WebContainers**:
- ✅ Full Node.js in browser
- ✅ npm install works
- ✅ True filesystem

**Cons of WebContainers**:
- ❌ Chrome/Edge only (no Safari)
- ❌ 5MB+ payload
- ❌ Expensive license ($$$)
- ❌ Overkill for our use case

**Verdict**: Too heavy and locked-in for our needs.

---

### Why Not Inline Bundling?

**Approach**: Bundle SDK + user code together each time

**Pros**:
- ✅ Simple (one bundle)
- ✅ Works everywhere (no import maps)

**Cons**:
- ❌ Slow (500KB+ bundle every rebuild)
- ❌ No caching (SDK bundled each time)
- ❌ Huge network waste

**Verdict**: Pre-bundled SDK is much better for repeated iterations.

---

## Success Criteria

This rewrite is successful if:

### Performance
- ✅ User code rebuild < 2s (vs 5-10s with Sandpack)
- ✅ Package source changes reflected in < 5s (vs 15-20s)
- ✅ Initial load < 3s on fast connection
- ✅ Works offline after WASM cached

### Functionality
- ✅ All current IDE features work (dual preview, DevTools, etc.)
- ✅ No regressions in user experience
- ✅ Error messages as good or better than Sandpack
- ✅ Security model unchanged (sandboxed iframes)

### Developer Experience
- ✅ Local package development is seamless
- ✅ No manual sync scripts needed
- ✅ Simpler architecture (no black box)
- ✅ Better debuggability (source maps, clear errors)

### Production
- ✅ Static deploy works (Vercel, Netlify, CDN)
- ✅ No server required
- ✅ Smaller bundle size (< 500KB)
- ✅ Works on all modern browsers

---

## Conclusion

ESBuild-WASM is the **right architecture** for martini-kit IDE because:

1. **Fast**: 5-10x faster than Sandpack
2. **Simple**: No server, no complex build pipelines
3. **Flexible**: Works in dev and prod equally well
4. **Maintainable**: Full control over bundling (no black box)
5. **Secure**: Preserves iframe sandbox model
6. **Future-proof**: Extensible for advanced features

The trade-off (full reload vs true HMR) is acceptable because:
- 1s reload is way faster than 10s rebuild
- Game state resets are normal in game dev
- Can add state snapshot/restore later if needed

**Next Steps**:
1. Implement Phase 1 (SDK build + ESBuildManager)
2. Test thoroughly in local dev
3. Validate production deploy
4. Migrate gradually with feature flag
5. Remove Sandpack after validation
6. Celebrate 🎉

**Timeline**: 2-3 weeks for full migration
**Risk**: Low (can roll back to Sandpack if issues)
**Reward**: 10x better developer experience
