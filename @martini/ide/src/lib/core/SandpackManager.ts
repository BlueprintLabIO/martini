/**
 * SandpackManager - Manages Sandpack client for live code execution
 *
 * Replaces both Bundler.ts and Sandbox.ts with Sandpack's built-in bundler
 */

import { loadSandpackClient, type SandpackClient, type SandpackMessage } from '@codesandbox/sandpack-client';
import type { VirtualFileSystem } from './VirtualFS';
import type { StateSnapshot, ActionRecord } from '@martini-kit/devtools';

// Import pre-bundled ESM modules (single file per package)
import coreBrowserBundle from '@martini-kit/core/dist/browser.js?raw';
import phaserBrowserBundle from '@martini-kit/phaser/dist/browser.js?raw';
import localTransportBundle from '@martini-kit/transport-local/dist/browser.js?raw';
import iframeBridgeBundle from '@martini-kit/transport-iframe-bridge/dist/browser.js?raw';
import devtoolsBrowserBundle from '@martini-kit/devtools/dist/martini-kit-devtools.browser.js?raw';

export interface SandpackManagerOptions {
	/** Container element for the Sandpack iframe */
	container: HTMLElement;

	/** Role (host or client) for multiplayer setup */
	role: 'host' | 'client';

	/** Room ID for multiplayer */
	roomId: string;

	/** Transport type */
	transportType: 'local' | 'iframe-bridge';

	/** Enable DevTools - when false, skips DevTools bridge injection and listeners */
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

export class SandpackManager {
	private client: SandpackClient | null = null;
	private iframe: HTMLIFrameElement | null = null;
	private options: SandpackManagerOptions;
	private devToolsEnabled: boolean;
	private bundlerHealthy = true;

	constructor(options: SandpackManagerOptions) {
		this.options = options;
		this.devToolsEnabled = options.enableDevTools === true; // Off by default
		// Always setup DevTools listener (lightweight)
		this.setupDevToolsListener();
	}

	/**
	 * Dynamically enable or disable DevTools at runtime
	 */
	setDevToolsEnabled(enabled: boolean): void {
		if (this.devToolsEnabled === enabled) {
			return; // Already in desired state
		}

		this.devToolsEnabled = enabled;

		// Send message to iframe to enable/disable DevTools
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
	 * Initialize Sandpack - setup iframe
	 */
	async initialize(): Promise<void> {
		// Create iframe
		this.iframe = document.createElement('iframe');
		this.iframe.style.width = '100%';
		this.iframe.style.height = '100%';
		this.iframe.style.border = 'none';
		this.iframe.title = `Game Preview (${this.options.role})`;

		// Append to container
		this.options.container.appendChild(this.iframe);
	}

	/**
	 * Load and run code in Sandpack
	 */
	async run(vfs: VirtualFileSystem, entryPoint: string): Promise<void> {
		if (!this.iframe) {
			throw new Error('SandpackManager not initialized. Call initialize() first.');
		}

		// Build Sandpack files object with user code + martini-kit SDK source
		const files: Record<string, { code: string }> = {};

		// 1. Add user files from VFS, injecting config into entry point
		for (const path of vfs.getFilePaths()) {
			let content = vfs.readFile(path);
			if (content !== undefined) {
				// Inject __martini-kit_CONFIG__ and DevTools bridge at the top of the entry file
				if (path === entryPoint) {
					const configSetup = `// Injected by martini-kit IDE - setup config before any imports
window.__martini-kit_CONFIG__ = ${JSON.stringify({
	transport: {
		type: this.options.transportType,
		roomId: this.options.roomId,
		isHost: this.options.role === 'host'
	}
})};

`;
					const devtoolsBridge = this.createDevToolsBridge();
					content = configSetup + devtoolsBridge + content;
				}
				files[path] = { code: content };
			}
		}

		// 2. Inject pre-bundled martini-kit SDK packages as single ESM files
		files['/node_modules/@martini-kit/core/index.js'] = { code: coreBrowserBundle };
		files['/node_modules/@martini-kit/core/package.json'] = {
			code: JSON.stringify({ name: '@martini-kit/core', version: '2.0.0', main: './index.js', type: 'module' })
		};

		files['/node_modules/@martini-kit/phaser/index.js'] = { code: phaserBrowserBundle };
		files['/node_modules/@martini-kit/phaser/package.json'] = {
			code: JSON.stringify({ name: '@martini-kit/phaser', version: '2.0.0', main: './index.js', type: 'module' })
		};

		files['/node_modules/@martini-kit/transport-local/index.js'] = { code: localTransportBundle };
		files['/node_modules/@martini-kit/transport-local/package.json'] = {
			code: JSON.stringify({ name: '@martini-kit/transport-local', version: '1.0.0', main: './index.js', type: 'module' })
		};

		files['/node_modules/@martini-kit/transport-iframe-bridge/index.js'] = { code: iframeBridgeBundle };
		files['/node_modules/@martini-kit/transport-iframe-bridge/package.json'] = {
			code: JSON.stringify({ name: '@martini-kit/transport-iframe-bridge', version: '2.0.0', main: './index.js', type: 'module' })
		};

		// 3. Inject DevTools bundle
		files['/node_modules/@martini-kit/devtools/index.js'] = { code: devtoolsBrowserBundle };
		files['/node_modules/@martini-kit/devtools/package.json'] = {
			code: JSON.stringify({ name: '@martini-kit/devtools', version: '2.0.0', main: './index.js', type: 'module' })
		};

		// 4. Add Phaser stub module (Phaser loaded globally via script tag in HTML)
		files['/node_modules/phaser/package.json'] = {
			code: JSON.stringify({
				name: 'phaser',
				version: '3.80.1',
				main: './index.js',
				module: './index.js'
			})
		};

		// Create a module that exports the global Phaser object
		files['/node_modules/phaser/index.js'] = {
			code: `
// Phaser is loaded globally via script tag in index.html
// This stub module just exports the global Phaser object
export default window.Phaser;
			`.trim()
		};

		// 5. Add root package.json (required by Sandpack)
		files['/package.json'] = {
			code: JSON.stringify({
				name: 'martini-kit-game',
				version: '1.0.0',
				dependencies: {}
			})
		};

		// 6. Add custom HTML template with Phaser loaded globally
		files['/index.html'] = {
			code: this.createHTMLTemplate()
		};

		// Load Sandpack client
		try {
			this.client = await loadSandpackClient(
				this.iframe,
				{
					files,
					entry: entryPoint // Use the actual user entry point, not /index.js
				},
				{
					externalResources: ['https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js'],
					showOpenInCodeSandbox: false,
					showErrorScreen: true,
					showLoadingScreen: true
				}
			);

			// Listen for Sandpack messages
			this.client.listen((message: SandpackMessage) => {
				this.handleSandpackMessage(message);
			});
			this.options.onReady?.();
			this.bundlerHealthy = true;

		} catch (error) {
			console.error('[SandpackManager] Failed to load Sandpack:', error);
			this.bundlerHealthy = false;
			this.options.onError?.({
				type: 'runtime',
				message: error instanceof Error ? error.message : 'Failed to initialize Sandpack'
			});
			throw error;
		}
	}

	/**
	 * Update code (for HMR)
	 */
	async updateCode(vfs: VirtualFileSystem, entryPoint: string): Promise<void> {
		if (!this.client) {
			console.warn('[SandpackManager] Client not initialized, calling run() instead');
			return this.run(vfs, entryPoint);
		}
		const online = typeof navigator === 'undefined' ? true : navigator.onLine;
		if (!online || !this.bundlerHealthy) {
			console.warn('[SandpackManager] Skipping hot update (bundler offline/unavailable)');
			return;
		}
		if (typeof (this.client as any).updateSandbox !== 'function') {
			console.warn('[SandpackManager] updateSandbox not available, falling back to run()');
			return this.run(vfs, entryPoint);
		}

		// Build updated files - inject config into entry point
		const files: Record<string, { code: string }> = {};

		for (const path of vfs.getFilePaths()) {
			let content = vfs.readFile(path);
			if (content !== undefined) {
				// Inject __martini-kit_CONFIG__ and DevTools bridge at the top of the entry file
				if (path === entryPoint) {
					const configSetup = `// Injected by martini-kit IDE - setup config before any imports
window.__martini-kit_CONFIG__ = ${JSON.stringify({
	transport: {
		type: this.options.transportType,
		roomId: this.options.roomId,
		isHost: this.options.role === 'host'
	}
})};

`;
					const devtoolsBridge = this.createDevToolsBridge();
					content = configSetup + devtoolsBridge + content;
				}
				files[path] = { code: content };
			}
		}

		// Re-inject pre-bundled martini-kit SDK packages
		files['/node_modules/@martini-kit/core/index.js'] = { code: coreBrowserBundle };
		files['/node_modules/@martini-kit/phaser/index.js'] = { code: phaserBrowserBundle };
		files['/node_modules/@martini-kit/transport-local/index.js'] = { code: localTransportBundle };
		files['/node_modules/@martini-kit/transport-iframe-bridge/index.js'] = { code: iframeBridgeBundle };
		files['/node_modules/@martini-kit/devtools/index.js'] = { code: devtoolsBrowserBundle };

		// Add Phaser stub module
		files['/node_modules/phaser/package.json'] = {
			code: JSON.stringify({
				name: 'phaser',
				version: '3.80.1',
				main: './index.js',
				module: './index.js'
			})
		};

		files['/node_modules/phaser/index.js'] = {
			code: `
export default window.Phaser;
			`.trim()
		};

		// Add root package.json
		files['/package.json'] = {
			code: JSON.stringify({
				name: 'martini-kit-game',
				version: '1.0.0',
				dependencies: {}
			})
		};

		files['/index.html'] = { code: this.createHTMLTemplate() };

		// Update Sandpack with new files (triggers HMR indirectly)
		try {
			await (this.client as any).updateSandbox?.({
				files,
				entry: entryPoint
			});
			this.bundlerHealthy = true;
		} catch (err) {
			console.warn('[SandpackManager] Hot update failed, marking bundler unhealthy:', err);
			this.bundlerHealthy = false;
		}
	}

	/**
	 * Destroy Sandpack instance
	 */
	destroy(): void {
		// CRITICAL: Disconnect transport BEFORE removing iframe
		// This notifies the iframe-bridge relay to remove stale peers
		// Prevents phantom players from appearing in subsequent game sessions
		if (this.iframe?.contentWindow) {
			this.iframe.contentWindow.postMessage({
				type: 'martini-kit:transport:disconnect'
			}, '*');
		}

		if (this.client) {
			this.client.destroy();
			this.client = null;
		}

		if (this.iframe) {
			this.iframe.remove();
			this.iframe = null;
		}
	}

	// ============================================================================
	// Private helper methods
	// ============================================================================

	private handleSandpackMessage(message: SandpackMessage): void {
		switch (message.type) {
			case 'done':
				break;

			case 'action':
				if (message.action === 'show-error') {
					// Sandpack error overlay is shown automatically
					console.error('[SandpackManager] Error:', message);
				}
				break;

			case 'console':
				// Forward console logs
				this.options.onConsoleLog?.({
					message: message.log?.map(arg => {
						if (typeof arg === 'object') {
							try {
								return JSON.stringify(arg);
							} catch {
								return String(arg);
							}
						}
						return String(arg);
					}).join(' ') || '',
					level: message.method as 'log' | 'warn' | 'error',
					timestamp: Date.now()
				});
				break;

			case 'error':
				// Runtime error
				this.options.onError?.({
					type: 'runtime',
					message: message.message || 'Unknown error',
					stack: message.stack
				});
				break;
		}
	}

	/**
	 * Setup listener for DevTools postMessage events from iframe
	 */
	private setupDevToolsListener(): void {
		window.addEventListener('message', (event) => {
			// Only process messages from our Sandpack iframe
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

	/**
	 * Create DevTools bridge script to inject into entry point
	 */
	private createDevToolsBridge(): string {
		const initiallyEnabled = this.devToolsEnabled ? 'true' : 'false';

		return `
// ===== martini-kit DevTools Bridge =====
// Auto-injected by martini-kitIDE - forwards runtime data to parent window
import { StateInspector } from '/node_modules/@martini-kit/devtools/index.js';
import * as martini-kitPhaser from '/node_modules/@martini-kit/phaser/index.js';

// DevTools state (can be toggled at runtime)
let devToolsEnabled = ${initiallyEnabled};
let capturedRuntime = null;

// Create global inspector (accessible from game code)
// Reduced limits for memory safety: prevents tab freezing with long-running games
window.__martini-kit_INSPECTOR__ = new StateInspector({
  maxSnapshots: 200,        // Down from 500: ~3-5 min history at 250ms interval
  maxActions: 1000,          // Down from 2000: reasonable action history
  snapshotIntervalMs: 250,   // Keep at 250ms (4 snapshots/sec)
  actionAggregationWindowMs: 200,
  ignoreActions: ['tick'],
  maxMemoryBytes: 30 * 1024 * 1024  // 30MB hard limit to prevent tab freeze
});

// Listen for enable/disable commands from parent
window.addEventListener('message', (event) => {
  if (event.data?.type === 'martini-kit:devtools:enable') {
    if (!devToolsEnabled) {
      devToolsEnabled = true;
      console.log('[martini-kit DevTools] Enabled');

      // If we already captured the runtime, attach inspector now
      if (capturedRuntime) {
        window.__martini-kit_INSPECTOR__.attach(capturedRuntime);
        console.log('[martini-kit DevTools] Inspector attached to runtime');
      }
    }
  } else if (event.data?.type === 'martini-kit:devtools:disable') {
    if (devToolsEnabled) {
      devToolsEnabled = false;
      console.log('[martini-kit DevTools] Disabled');

      // Detach inspector to stop collecting data
      if (capturedRuntime) {
        window.__martini-kit_INSPECTOR__.detach();
        console.log('[martini-kit DevTools] Inspector detached from runtime');
      }
    }
  } else if (event.data?.type === 'martini-kit:devtools:pause') {
    window.__martini-kit_INSPECTOR__.setPaused(true);
  } else if (event.data?.type === 'martini-kit:devtools:resume') {
    window.__martini-kit_INSPECTOR__.setPaused(false);
  }
});

// Intercept initializeGame to capture runtime when user calls it
const originalInitializeGame = martini-kitPhaser.initializeGame;
martini-kitPhaser.initializeGame = function(...args) {
  // Call original function
  const result = originalInitializeGame.apply(this, args);

  // Store runtime reference
  capturedRuntime = result.runtime;

  // Only attach inspector if DevTools is enabled
  if (devToolsEnabled) {
    window.__martini-kit_INSPECTOR__.attach(result.runtime);
    console.log('[martini-kit DevTools] Inspector attached to runtime');
  }

  // Batch buffers for postMessage optimization
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

  // Forward state snapshots to parent window (batched)
  window.__martini-kit_INSPECTOR__.onStateChange((snapshot) => {
    if (devToolsEnabled) {
      stateSnapshotBatch.push(snapshot);
      scheduleFlush();
    }
  });

  // Forward actions to parent window (batched)
  window.__martini-kit_INSPECTOR__.onAction((action) => {
    if (devToolsEnabled) {
      actionBatch.push(action);
      scheduleFlush();
    }
  });

  // Return result to user code
  return result;
};

console.log('[martini-kit DevTools] Bridge initialized (enabled: ${initiallyEnabled})');
// ===== End DevTools Bridge =====

`;
	}

	/**
	 * Create HTML template (loads Phaser from CDN as a global)
	 */
	private createHTMLTemplate(): string {
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
  <!-- Load Phaser from CDN as a global -->
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
</head>
<body>
  <div id="game"></div>
</body>
</html>`;
	}

}
