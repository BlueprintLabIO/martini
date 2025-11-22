/**
 * SandpackManager - Manages Sandpack client for live code execution
 *
 * Replaces both Bundler.ts and Sandbox.ts with Sandpack's built-in bundler
 */

import { loadSandpackClient, type SandpackClient, type SandpackMessage } from '@codesandbox/sandpack-client';
import type { VirtualFileSystem } from './VirtualFS';
import type { StateSnapshot, ActionRecord } from '@martini-kit/devtools';
// @ts-ignore - Import raw content of local build
import martiniPhaserBuild from '@martini-kit/phaser/dist/browser.js?raw';

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
const __martiniKitConfig = ${JSON.stringify({
	transport: {
		type: this.options.transportType,
		roomId: this.options.roomId,
		isHost: this.options.role === 'host'
	}
})};
// Support both legacy and current config keys
window['__martini-kit_CONFIG__'] = __martiniKitConfig;
window['__MARTINI_KIT_CONFIG__'] = __martiniKitConfig;

`;
					const devtoolsBridge = this.createDevToolsBridge();
					content = configSetup + devtoolsBridge + content;
				}
				files[path] = { code: content };
			}
		}

		// 2. Add root package.json (required by Sandpack)
		const useLocalPackages = import.meta.env.DEV;
		let dependencies: Record<string, string> = {
			'phaser': '3.80.1'
		};

		if (useLocalPackages) {
			// In development, load local packages via import.meta.glob and inject them as files
			// This avoids network requests and ensures all files (including nested ones) are available
			const localPackageFiles = await this.loadLocalPackages();
			Object.assign(files, localPackageFiles);
		} else {
			// Production: use npm packages
			dependencies = {
				...dependencies,
				'@martini-kit/core': '0.1.1',
				'@martini-kit/phaser': '0.1.1',
				'@martini-kit/devtools': '0.1.1',
				'@martini-kit/transport-local': '0.1.1',
				'@martini-kit/transport-iframe-bridge': '0.1.1',
				'@martini-kit/transport-trystero': '0.1.1',
			};
		}

		files['/package.json'] = {
			code: JSON.stringify({
				name: 'martini-kit-game',
				version: '1.0.0',
				dependencies
			})
		};

		// 3. Provide a local Phaser module shim that proxies the global (loaded via CDN)
		// This avoids failures when the bundler cannot fetch phaser from npm
		files['/node_modules/phaser/index.js'] = { code: this.createPhaserModuleShim() };

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
				// Inject __martini-kit_CONFIG__ and DevTools bridge at the top of the entry file
				if (path === entryPoint) {
					const configSetup = `// Injected by martini-kit IDE - setup config before any imports
const __martiniKitConfig = ${JSON.stringify({
	transport: {
		type: this.options.transportType,
		roomId: this.options.roomId,
		isHost: this.options.role === 'host'
	}
})};
// Support both legacy and current config keys
window['__martini-kit_CONFIG__'] = __martiniKitConfig;
window['__MARTINI_KIT_CONFIG__'] = __martiniKitConfig;

	`;
					const devtoolsBridge = this.createDevToolsBridge();
					content = configSetup + devtoolsBridge + content;
				}
				files[path] = { code: content };
			}
		}

		// Add root package.json (use same logic as run())
		const useLocalPackages = import.meta.env.DEV;
		let dependencies: Record<string, string> = {
			'phaser': '3.80.1'
		};

		if (useLocalPackages) {
			const localPackageFiles = await this.loadLocalPackages();
			Object.assign(files, localPackageFiles);
		} else {
			dependencies = {
				...dependencies,
				'@martini-kit/core': '0.1.1',
				'@martini-kit/phaser': '0.1.1',
				'@martini-kit/devtools': '0.1.1',
				'@martini-kit/transport-local': '0.1.1',
				'@martini-kit/transport-iframe-bridge': '0.1.1',
				'@martini-kit/transport-trystero': '0.1.1',
			};
		}

		files['/package.json'] = {
			code: JSON.stringify({
				name: 'martini-kit-game',
				version: '1.0.0',
				dependencies
			})
		};

		// Add Phaser module shim
		files['/node_modules/phaser/index.js'] = { code: this.createPhaserModuleShim() };

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
	 * Load local packages by fetching all files from dev server
	 */
	private async loadLocalPackages(): Promise<Record<string, { code: string }>> {
		const files: Record<string, { code: string }> = {};
		const devOrigin = typeof window !== 'undefined' ? window.location.origin : '';

		const packages = [
			'@martini-kit/core',
			'@martini-kit/phaser',
			'@martini-kit/devtools',
			'@martini-kit/transport-local',
			'@martini-kit/transport-iframe-bridge',
			'@martini-kit/transport-trystero'
		];

		for (const pkgName of packages) {
			const baseUrl = devOrigin ? `${devOrigin}/dev-packages/${pkgName}` : `/dev-packages/${pkgName}`;

			try {
				// Fetch package.json
				const pkgJsonRes = await fetch(`${baseUrl}/package.json`);
				if (!pkgJsonRes.ok) {
					console.warn(`[SandpackManager] Failed to fetch package.json for ${pkgName}`);
					continue;
				}

				const pkgJsonText = await pkgJsonRes.text();
				let pkgJson;
				try {
					pkgJson = JSON.parse(pkgJsonText);
					// Keep essential fields, remove workspace dependencies
					const cleanedPkg = {
						name: pkgJson.name,
						version: pkgJson.version,
						main: pkgJson.main || './dist/index.js',
						type: pkgJson.type,
						exports: pkgJson.exports
					};
					pkgJson = cleanedPkg;
				} catch (e) {
					console.warn(`[SandpackManager] Failed to parse package.json for ${pkgName}`, e);
					pkgJson = { name: pkgName, version: '0.0.0', main: './dist/index.js', type: 'module' };
				}

				files[`/node_modules/${pkgName}/package.json`] = { code: JSON.stringify(pkgJson) };

				// Fetch file list from server
				const listUrl = devOrigin ? `${devOrigin}/dev-packages-list/${pkgName}` : `/dev-packages-list/${pkgName}`;
				const listRes = await fetch(listUrl);
				
				if (listRes.ok) {
					const { files: pkgFiles } = await listRes.json();
					
					// Fetch all files in parallel
					const fetchPromises = pkgFiles.map(async (file: string) => {
						try {
							const res = await fetch(`${baseUrl}/${file}`);
							if (res.ok) {
								const content = await res.text();
								files[`/node_modules/${pkgName}/${file}`] = { code: content };
							}
						} catch (e) {
							console.warn(`[SandpackManager] Failed to fetch ${file} from ${pkgName}`, e);
						}
					});
					
					await Promise.all(fetchPromises);
				} else {
					console.warn(`[SandpackManager] Failed to fetch file list for ${pkgName}`);
				}

			} catch (error) {
				console.warn(`[SandpackManager] Error loading package ${pkgName}:`, error);
			}
		}

		return files;
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
		const msg = message as any;
		switch (msg.type) {
			case 'done':
				break;

			case 'action':
				if (msg.action === 'show-error') {
					// Sandpack error overlay is shown automatically
					console.error('[SandpackManager] Error:', msg);
				}
				break;

			case 'console':
				// Forward console logs
				this.options.onConsoleLog?.({
					message: msg.log?.map((arg: any) => {
						if (typeof arg === 'object') {
							try {
								return JSON.stringify(arg);
							} catch {
								return String(arg);
							}
						}
						return String(arg);
					}).join(' ') || '',
					level: msg.method as 'log' | 'warn' | 'error',
					timestamp: Date.now()
				});
				break;

			case 'error':
				// Runtime error
				this.options.onError?.({
					type: 'runtime',
					message: msg.message || 'Unknown error',
					stack: msg.stack
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
  <script>
    // Config injected via entry point
  </script>
  <!-- Load Phaser from CDN as a global -->
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
</head>
<body>
  <div id="game"></div>
</body>
</html>`;
	}

	/**
	 * Shim module that maps the phaser import to the global Phaser loaded via CDN.
	 * Sandpack can fail to pull phaser from npm; this keeps the runtime stable.
	 */
	private createPhaserModuleShim(): string {
		return `
// Phaser shim: export the global Phaser injected via CDN
const PhaserGlobal = typeof window !== 'undefined' ? window.Phaser : undefined;
if (!PhaserGlobal) {
  throw new Error('Phaser global is not available. Ensure CDN script is loaded.');
}

export default PhaserGlobal;
export const Scene = PhaserGlobal.Scene;
export const Game = PhaserGlobal.Game;
export const AUTO = PhaserGlobal.AUTO;
export const Scale = PhaserGlobal.Scale;
`;
	}

	/**
	 * Returns the local build of @martini-kit/phaser
	 */
	private createMartiniPhaserLib(): string {
		return martiniPhaserBuild;
	}

}
