/**
 * Sandbox - Iframe manager for isolated game execution
 *
 * SIMPLIFIED VERSION - matches Vesper's approach
 * Uses static HTML file instead of dynamic HTML
 */

export interface SandboxOptions {
	/** Container element for the iframe */
	container: HTMLElement;

	/** Role (host or client) */
	role: 'host' | 'client';

	/** Error callback */
	onError?: (error: GameError) => void;

	/** Ready callback */
	onReady?: () => void;

	/** Console log callback */
	onConsoleLog?: (log: { message: string; level: 'log' | 'warn' | 'error'; timestamp: number; channel?: string }) => void;

	/** Connection status callback */
	onConnectionStatus?: (status: 'disconnected' | 'connecting' | 'connected') => void;
}

export interface GameError {
	type: 'runtime' | 'syntax';
	message: string;
	stack?: string;
}

export class Sandbox {
	private iframe: HTMLIFrameElement | null = null;
	private options: SandboxOptions;
	private messageHandler: ((event: MessageEvent) => void) | null = null;
	private runtimeReadyPromise: Promise<void>;
	private resolveRuntimeReady: (() => void) | null = null;

	constructor(options: SandboxOptions) {
		this.options = options;

		// Create promise that resolves when runtime is ready
		this.runtimeReadyPromise = new Promise<void>((resolve) => {
			this.resolveRuntimeReady = resolve;
		});
	}

	/**
	 * Create and initialize the sandbox iframe
	 */
	async create(): Promise<void> {

		// Create iframe pointing to static HTML file
		this.iframe = document.createElement('iframe');
		this.iframe.src = '/ide-sandbox.html';
		this.iframe.sandbox.add('allow-scripts');
		this.iframe.style.width = '100%';
		this.iframe.style.height = '100%';
		this.iframe.style.border = 'none';
		this.iframe.title = `Game Preview (${this.options.role})`;

		// Listen for messages from iframe
		this.messageHandler = (event: MessageEvent) => {
			if (!event.data || !event.data.type) return;

			const { type, payload } = event.data;

			switch (type) {
				case 'RUNTIME_READY':
					this.resolveRuntimeReady?.();
					break;

				case 'READY':
					this.options.onReady?.();
					break;

				case 'ERROR':
					this.options.onError?.(payload);
					break;

				case 'CONSOLE_LOG':
					this.options.onConsoleLog?.(payload);
					break;

				case 'CONNECTION_STATUS':
					this.options.onConnectionStatus?.(payload.status);
					break;

				case 'HEARTBEAT':
					// Ignore heartbeats for now
					break;
			}
		};

		window.addEventListener('message', this.messageHandler);

		// Wait for iframe to load before resolving
		await new Promise<void>((resolve) => {
			this.iframe!.addEventListener('load', () => resolve());
			// Append to container (this triggers the load)
			this.options.container.appendChild(this.iframe!);
		});

		// Wait for runtime to be ready before allowing run()
		await this.runtimeReadyPromise;
	}

	/**
	 * Run bundled code in the sandbox (send LOAD_CODE message)
	 */
	async run(
		bundledCode: string,
		roomId: string,
		transportType: 'local' | 'trystero' | 'iframe-bridge' = 'iframe-bridge'
	): Promise<void> {
		if (!this.iframe?.contentWindow) {
			throw new Error('Sandbox not created');
		}

		const message = {
			type: 'LOAD_CODE',
			payload: {
				code: bundledCode,
				roomId,
				isHost: this.options.role === 'host',
				transportType
			}
		};

		// Send code to iframe
		this.iframe.contentWindow.postMessage(message, '*');
	}

	/**
	 * Destroy the sandbox
	 */
	destroy(): void {
		if (this.messageHandler) {
			window.removeEventListener('message', this.messageHandler);
			this.messageHandler = null;
		}

		if (this.iframe) {
			this.iframe.remove();
			this.iframe = null;
		}
	}
}
