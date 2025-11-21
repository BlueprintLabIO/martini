/**
 * SandpackManager - Manages Sandpack client for live code execution
 *
 * Replaces both Bundler.ts and Sandbox.ts with Sandpack's built-in bundler
 */

import { loadSandpackClient, type SandpackClient, type SandpackMessage } from '@codesandbox/sandpack-client';
import type { VirtualFileSystem } from './VirtualFS';
import type { StateSnapshot, ActionRecord } from '@martini-kit/devtools';

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
				// Inject __MARTINI_KIT_CONFIG__ and DevTools bridge at the top of the entry file
				if (path === entryPoint) {
					const configSetup = `// Injected by martini-kit IDE - setup config before any imports
window.__MARTINI_KIT_CONFIG__ = ${JSON.stringify({
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

		// 2. Add root package.json (required by Sandpack)
		files['/package.json'] = {
			code: JSON.stringify({
				name: 'martini-kit-game',
				version: '1.0.0',
				dependencies: {
					'@martini-kit/core': '^0.1.0',
					'@martini-kit/phaser': '^0.1.0',
					'@martini-kit/devtools': '^0.1.0',
					'@martini-kit/transport-local': '^0.1.0',
					'@martini-kit/transport-iframe-bridge': '^0.1.0',
					phaser: '^3.80.1'
				}
			})
		};

		// 3. Add custom HTML template (Phaser pulled from npm dependency)
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
				// Inject __MARTINI_KIT_CONFIG__ and DevTools bridge at the top of the entry file
				if (path === entryPoint) {
					const configSetup = `// Injected by martini-kit IDE - setup config before any imports
	window.__MARTINI_KIT_CONFIG__ = ${JSON.stringify({
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

		// Add root package.json
		files['/package.json'] = {
			code: JSON.stringify({
				name: 'martini-kit-game',
				version: '1.0.0',
				dependencies: {
					'@martini-kit/core': '^0.1.0',
					'@martini-kit/phaser': '^0.1.0',
					'@martini-kit/devtools': '^0.1.0',
					'@martini-kit/transport-local': '^0.1.0',
					'@martini-kit/transport-iframe-bridge': '^0.1.0',
					phaser: '^3.80.1'
				}
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
// Auto-injected by martini-kit IDE - forwards runtime data to parent window
import { StateInspector } from '@martini-kit/devtools';
import * as MartiniKitPhaser from '@martini-kit/phaser';

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

const originalInitializeGame = MartiniKitPhaser.initializeGame;
MartiniKitPhaser.initializeGame = function(...args) {
  const result = originalInitializeGame.apply(this, args);
  capturedRuntime = result.runtime;

  if (devToolsEnabled) {
    window.__MARTINI_KIT_INSPECTOR__.attach(result.runtime);
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

  return result;
};
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
