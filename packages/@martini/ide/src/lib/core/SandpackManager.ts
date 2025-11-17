/**
 * SandpackManager - Manages Sandpack client for live code execution
 *
 * Replaces both Bundler.ts and Sandbox.ts with Sandpack's built-in bundler
 */

import { loadSandpackClient, type SandpackClient, type SandpackMessage } from '@codesandbox/sandpack-client';
import type { VirtualFileSystem } from './VirtualFS';
import type { StateSnapshot, ActionRecord } from '@martini/devtools';

// Import pre-bundled ESM modules (single file per package)
import coreBrowserBundle from '@martini/core/dist/browser.js?raw';
import phaserBrowserBundle from '@martini/phaser/dist/browser.js?raw';
import localTransportBundle from '@martini/transport-local/dist/browser.js?raw';
import iframeBridgeBundle from '@martini/transport-iframe-bridge/dist/browser.js?raw';
import devtoolsBrowserBundle from '@martini/devtools/dist/martini-devtools.browser.js?raw';

export interface SandpackManagerOptions {
	/** Container element for the Sandpack iframe */
	container: HTMLElement;

	/** Role (host or client) for multiplayer setup */
	role: 'host' | 'client';

	/** Room ID for multiplayer */
	roomId: string;

	/** Transport type */
	transportType: 'local' | 'iframe-bridge';

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

	constructor(options: SandpackManagerOptions) {
		this.options = options;
		this.setupDevToolsListener();
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

		// Build Sandpack files object with user code + Martini SDK source
		const files: Record<string, { code: string }> = {};

		// 1. Add user files from VFS, injecting config into entry point
		for (const path of vfs.getFilePaths()) {
			let content = vfs.readFile(path);
			if (content !== undefined) {
				// Inject __MARTINI_CONFIG__ and DevTools bridge at the top of the entry file
				if (path === entryPoint) {
					const configSetup = `// Injected by Martini IDE - setup config before any imports
window.__MARTINI_CONFIG__ = ${JSON.stringify({
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

		// 2. Inject pre-bundled Martini SDK packages as single ESM files
		files['/node_modules/@martini/core/index.js'] = { code: coreBrowserBundle };
		files['/node_modules/@martini/core/package.json'] = {
			code: JSON.stringify({ name: '@martini/core', version: '2.0.0', main: './index.js', type: 'module' })
		};

		files['/node_modules/@martini/phaser/index.js'] = { code: phaserBrowserBundle };
		files['/node_modules/@martini/phaser/package.json'] = {
			code: JSON.stringify({ name: '@martini/phaser', version: '2.0.0', main: './index.js', type: 'module' })
		};

		files['/node_modules/@martini/transport-local/index.js'] = { code: localTransportBundle };
		files['/node_modules/@martini/transport-local/package.json'] = {
			code: JSON.stringify({ name: '@martini/transport-local', version: '1.0.0', main: './index.js', type: 'module' })
		};

		files['/node_modules/@martini/transport-iframe-bridge/index.js'] = { code: iframeBridgeBundle };
		files['/node_modules/@martini/transport-iframe-bridge/package.json'] = {
			code: JSON.stringify({ name: '@martini/transport-iframe-bridge', version: '2.0.0', main: './index.js', type: 'module' })
		};

		// 3. Inject DevTools bundle
		files['/node_modules/@martini/devtools/index.js'] = { code: devtoolsBrowserBundle };
		files['/node_modules/@martini/devtools/package.json'] = {
			code: JSON.stringify({ name: '@martini/devtools', version: '2.0.0', main: './index.js', type: 'module' })
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
				name: 'martini-game',
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

		} catch (error) {
			console.error('[SandpackManager] Failed to load Sandpack:', error);
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

		// Build updated files - inject config into entry point
		const files: Record<string, { code: string }> = {};

		for (const path of vfs.getFilePaths()) {
			let content = vfs.readFile(path);
			if (content !== undefined) {
				// Inject __MARTINI_CONFIG__ and DevTools bridge at the top of the entry file
				if (path === entryPoint) {
					const configSetup = `// Injected by Martini IDE - setup config before any imports
window.__MARTINI_CONFIG__ = ${JSON.stringify({
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

		// Re-inject pre-bundled Martini SDK packages
		files['/node_modules/@martini/core/index.js'] = { code: coreBrowserBundle };
		files['/node_modules/@martini/phaser/index.js'] = { code: phaserBrowserBundle };
		files['/node_modules/@martini/transport-local/index.js'] = { code: localTransportBundle };
		files['/node_modules/@martini/transport-iframe-bridge/index.js'] = { code: iframeBridgeBundle };
		files['/node_modules/@martini/devtools/index.js'] = { code: devtoolsBrowserBundle };

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
				name: 'martini-game',
				version: '1.0.0',
				dependencies: {}
			})
		};

		files['/index.html'] = { code: this.createHTMLTemplate() };

		// Update Sandpack with new files (triggers HMR!)
		this.client.updatePreview({
			files,
			entry: entryPoint
		});
	}

	/**
	 * Destroy Sandpack instance
	 */
	destroy(): void {
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

			// Handle DevTools messages
			if (data?.type === 'martini:devtools:state') {
				this.options.onStateSnapshot?.(data.snapshot);
			} else if (data?.type === 'martini:devtools:action') {
				this.options.onAction?.(data.action);
			} else if (data?.type === 'martini:devtools:network') {
				this.options.onNetworkPacket?.(data.packet);
			}
		});
	}

	/**
	 * Create DevTools bridge script to inject into entry point
	 */
	private createDevToolsBridge(): string {
		return `
// ===== Martini DevTools Bridge =====
// Auto-injected by MartiniIDE - forwards runtime data to parent window
import { StateInspector } from '@martini/devtools';
import * as MartiniPhaser from '@martini/phaser';

// Create global inspector (accessible from game code)
window.__MARTINI_INSPECTOR__ = new StateInspector({
  maxSnapshots: 500,
  maxActions: 2000,
  snapshotIntervalMs: 250,
  actionAggregationWindowMs: 200,
  ignoreActions: ['tick']
});

// Intercept initializeGame to capture runtime when user calls it
const originalInitializeGame = MartiniPhaser.initializeGame;
MartiniPhaser.initializeGame = function(...args) {
  // Call original function
  const result = originalInitializeGame.apply(this, args);

  // Attach inspector to the runtime
  window.__MARTINI_INSPECTOR__.attach(result.runtime);
  console.log('[Martini DevTools] Inspector attached to runtime');

  // Forward state snapshots to parent window
  window.__MARTINI_INSPECTOR__.onStateChange((snapshot) => {
    window.parent.postMessage({
      type: 'martini:devtools:state',
      snapshot
    }, '*');
  });

  // Forward actions to parent window
  window.__MARTINI_INSPECTOR__.onAction((action) => {
    window.parent.postMessage({
      type: 'martini:devtools:action',
      action
    }, '*');
  });

  // Return result to user code
  return result;
};

console.log('[Martini DevTools] Bridge initialized');
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
