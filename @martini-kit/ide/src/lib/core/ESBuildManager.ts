import * as esbuild from 'esbuild-wasm';
import type { VirtualFileSystem } from './VirtualFS.js';
import type { StateSnapshot, ActionRecord } from '@martini-kit/devtools';
import type { GameError } from '../types.js';

// Singleton to ensure esbuild is only initialized once globally
let esbuildInitialized = false;
let esbuildInitPromise: Promise<void> | null = null;

async function ensureEsbuildInitialized(): Promise<void> {
  if (esbuildInitialized) {
    return;
  }

  if (esbuildInitPromise) {
    return esbuildInitPromise;
  }

  esbuildInitPromise = (async () => {
    console.log('[ESBuildManager] Initializing ESBuild-WASM...');

    // Use CDN URL that matches the installed version (0.20.2)
    await esbuild.initialize({
      wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.20.2/esbuild.wasm',
      worker: true
    });

    esbuildInitialized = true;
    console.log('[ESBuildManager] ✓ ESBuild-WASM ready');
  })();

  return esbuildInitPromise;
}

export interface ESBuildManagerOptions {
  /** Container element for the preview iframe */
  container: HTMLElement;

  /** Role (host or client) for multiplayer setup */
  role: 'host' | 'client';

  /** Room ID for multiplayer */
  roomId: string;

  /** Transport type */
  transportType: 'local' | 'iframe-bridge' | 'trystero';

  /** Transport options (Trystero) */
  transportOptions?: {
    appId?: string;
    rtcConfig?: RTCConfiguration;
    relayUrls?: string[];
  };

  /** Minimum players required before game starts (passed to platform config) */
  minPlayers?: number;

  /** Enable DevTools */
  enableDevTools?: boolean;

  /** Error callback */
  onError?: (error: GameError) => void;

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
    payload: unknown;
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

    // Use singleton to ensure esbuild is only initialized once globally
    await ensureEsbuildInitialized();

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
      const startTime = performance.now();

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
          '@martini-kit/transport-trystero',
          'phaser'
        ],

        plugins: [
          this.createVirtualFSPlugin(vfs, entryPoint)
        ]
      });

      const buildTime = performance.now() - startTime;
      console.log(`[ESBuildManager] Build completed in ${buildTime.toFixed(0)}ms`);

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
      setup: (build) => {
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
          let resolvedPath = args.path;

          if (content === undefined) {
            // Try adding .ts extension
            const tsPath = args.path + '.ts';
            content = vfs.readFile(tsPath);
            if (content !== undefined) {
              resolvedPath = tsPath;
            }
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

          // Determine loader from file extension - use resolvedPath to get correct extension
          const ext = resolvedPath.split('.').pop() || 'js';
          const loader: esbuild.Loader = ext === 'ts' ? 'ts' : ext === 'tsx' ? 'tsx' : 'js';

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
        isHost: this.options.role === 'host',
        ...(this.options.transportOptions || {})
      },
      minPlayers: this.options.minPlayers
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

  <!-- Load Phaser from CDN as a global (required before SDK) -->
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>

  <!-- Import map for package resolution (must come before any module scripts) -->
  <script type="importmap">
  {
    "imports": {
      "@martini-kit/core": "/sdk/shims/core.js",
      "@martini-kit/phaser": "/sdk/shims/phaser.js",
      "@martini-kit/devtools": "/sdk/shims/devtools.js",
      "@martini-kit/transport-local": "/sdk/shims/transport-local.js",
      "@martini-kit/transport-iframe-bridge": "/sdk/shims/transport-iframe-bridge.js",
      "@martini-kit/transport-trystero": "/sdk/shims/transport-trystero.js",
      "phaser": "/sdk/shims/phaser-global.js"
    }
  }
  </script>

  <!-- Preload SDK module (ESM format, cached by browser) -->
  <link rel="modulepreload" href="/sdk/martini-kit.js">

  <!-- User code (built by ESBuild, imports from SDK via import map) -->
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
