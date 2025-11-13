/**
 * PhaserEngine - Phaser 3 engine adapter
 *
 * Provides Phaser-specific configuration for the IDE
 */

export interface EngineAdapter {
	/** Engine name */
	readonly name: string;

	/** Required CDN scripts */
	getScripts(): string[];

	/** Global variable mappings for imports */
	getGlobals(): Record<string, string>;
}

export class PhaserEngine implements EngineAdapter {
	readonly name = 'phaser';

	getScripts(): string[] {
		return [
			'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js',
			'/martini-multiplayer.browser.js' // Served from static folder
		];
	}

	getGlobals(): Record<string, string> {
		return {
			phaser: 'window.Phaser',
			'@martini/phaser': 'window.MartiniMultiplayer',
			'@martini/core': 'window.MartiniMultiplayer'
		};
	}
}
