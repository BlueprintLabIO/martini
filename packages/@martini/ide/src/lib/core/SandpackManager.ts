/**
 * SandpackManager - Manages Sandpack client for live code execution
 *
 * Replaces both Bundler.ts and Sandbox.ts with Sandpack's built-in bundler
 */

import { loadSandpackClient, type SandpackClient, type SandpackMessage } from '@codesandbox/sandpack-client';
import type { VirtualFileSystem } from './VirtualFS';

// Import pre-bundled ESM modules (single file per package)
import coreBrowserBundle from '@martini/core/dist/browser.js?raw';
import phaserBrowserBundle from '@martini/phaser/dist/browser.js?raw';
import localTransportBundle from '@martini/transport-local/dist/browser.js?raw';
import iframeBridgeBundle from '@martini/transport-iframe-bridge/dist/browser.js?raw';

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
}

export class SandpackManager {
	private client: SandpackClient | null = null;
	private iframe: HTMLIFrameElement | null = null;
	private options: SandpackManagerOptions;

	constructor(options: SandpackManagerOptions) {
		this.options = options;
	}

	/**
	 * Initialize Sandpack - setup iframe
	 */
	async initialize(): Promise<void> {
		console.log('[SandpackManager] Using Martini SDK browser bundles (ESM)');
		console.log(`  @martini/core: ${(coreBrowserBundle.length / 1024).toFixed(1)}KB`);
		console.log(`  @martini/phaser: ${(phaserBrowserBundle.length / 1024).toFixed(1)}KB`);
		console.log(`  @martini/transport-local: ${(localTransportBundle.length / 1024).toFixed(1)}KB`);
		console.log(`  @martini/transport-iframe-bridge: ${(iframeBridgeBundle.length / 1024).toFixed(1)}KB`);

		// Create iframe
		this.iframe = document.createElement('iframe');
		this.iframe.style.width = '100%';
		this.iframe.style.height = '100%';
		this.iframe.style.border = 'none';
		this.iframe.title = `Game Preview (${this.options.role})`;

		// Append to container
		this.options.container.appendChild(this.iframe);

		console.log('[SandpackManager] Initialized successfully');
	}

	/**
	 * Load and run code in Sandpack
	 */
	async run(vfs: VirtualFileSystem, entryPoint: string): Promise<void> {
		console.log('[SandpackManager] run() called with entryPoint:', entryPoint);

		if (!this.iframe) {
			throw new Error('SandpackManager not initialized. Call initialize() first.');
		}

		// Build Sandpack files object with user code + Martini SDK source
		const files: Record<string, { code: string }> = {};

		// 1. Add user files from VFS, injecting config into entry point
		for (const path of vfs.getFilePaths()) {
			let content = vfs.readFile(path);
			if (content !== undefined) {
				// Inject __MARTINI_CONFIG__ at the top of the entry file
				if (path === entryPoint) {
					const configSetup = `// Injected by Martini IDE - setup config before any imports
window.__MARTINI_CONFIG__ = ${JSON.stringify({
	transport: {
		type: this.options.transportType,
		roomId: this.options.roomId,
		isHost: this.options.role === 'host'
	}
})};
console.log('[IDE] __MARTINI_CONFIG__ injected:', JSON.stringify(window.__MARTINI_CONFIG__, null, 2));

`;
					content = configSetup + content;
					console.log('[SandpackManager] Injected config into entry file:', path);
				}
				files[path] = { code: content };
				console.log('[SandpackManager] Added user file:', path, `(${content.length} chars)`);
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

		console.log('[SandpackManager] Injected 4 pre-bundled Martini SDK packages');

		// 3. Add Phaser stub module (Phaser loaded globally via script tag in HTML)
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

		// 4. Add root package.json (required by Sandpack)
		files['/package.json'] = {
			code: JSON.stringify({
				name: 'martini-game',
				version: '1.0.0',
				dependencies: {}
			})
		};

		// 5. Add custom HTML template with Phaser loaded globally
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

			console.log('[SandpackManager] Sandpack client loaded successfully');
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
				// Inject __MARTINI_CONFIG__ at the top of the entry file
				if (path === entryPoint) {
					const configSetup = `// Injected by Martini IDE - setup config before any imports
window.__MARTINI_CONFIG__ = ${JSON.stringify({
	transport: {
		type: this.options.transportType,
		roomId: this.options.roomId,
		isHost: this.options.role === 'host'
	}
})};
console.log('[IDE] __MARTINI_CONFIG__ injected:', JSON.stringify(window.__MARTINI_CONFIG__, null, 2));

`;
					content = configSetup + content;
				}
				files[path] = { code: content };
			}
		}

		// Re-inject pre-bundled Martini SDK packages
		files['/node_modules/@martini/core/index.js'] = { code: coreBrowserBundle };
		files['/node_modules/@martini/phaser/index.js'] = { code: phaserBrowserBundle };
		files['/node_modules/@martini/transport-local/index.js'] = { code: localTransportBundle };
		files['/node_modules/@martini/transport-iframe-bridge/index.js'] = { code: iframeBridgeBundle };

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

		console.log('[SandpackManager] Code updated with HMR');
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
				console.log('[SandpackManager] Compilation done');
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
