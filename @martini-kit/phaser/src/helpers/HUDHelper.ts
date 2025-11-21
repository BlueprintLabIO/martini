/**
 * HUD Helper - Unified player HUD/UI for multiplayer games
 *
 * Eliminates the manual HUD boilerplate by automatically creating and managing
 * title, role, and control hint text based on the current player state.
 *
 * @example
 * ```ts
 * import { createPlayerHUD } from '@martini-kit/phaser';
 *
 * // In scene.create()
 * this.hud = createPlayerHUD(this.adapter, this, {
 *   title: 'Fire & Ice - Cooperative Platformer',
 *
 *   roleText: (myPlayer) => {
 *     if (!myPlayer) return 'Spectator';
 *     return myPlayer.role === 'fire' ? 'Fire Player' : 'Ice Player';
 *   },
 *
 *   controlHints: (myPlayer) => {
 *     if (!myPlayer) return '';
 *     return 'Arrow Keys + SPACE to Jump';
 *   }
 * });
 * ```
 */

import type { PhaserAdapter } from '../PhaserAdapter.js';

export interface HUDLayout {
	/** Position for title text */
	title?: { x: number; y: number };
	/** Position for role text */
	role?: { x: number; y: number };
	/** Position for controls text */
	controls?: { x: number; y: number };
}

export interface HUDTextStyle {
	fontSize?: string;
	color?: string;
	fontStyle?: string;
	backgroundColor?: string;
	padding?: { x: number; y: number };
}

export interface PlayerHUDConfig<TPlayer = any, TState = any> {
	/** Title text (static) */
	title?: string;
	/** Title text style */
	titleStyle?: HUDTextStyle;

	/**
	 * Generate role text from player data and optionally game state
	 * @param myPlayer - Current player data or undefined if spectator
	 * @param state - Full game state (optional, for turn-based games)
	 * @returns Text to display
	 *
	 * @example
	 * // Simple usage (action games)
	 * roleText: (myPlayer) => {
	 *   if (!myPlayer) return 'Spectator';
	 *   return `Player ${myPlayer.id}`;
	 * }
	 *
	 * @example
	 * // With state (turn-based games)
	 * roleText: (myPlayer, state) => {
	 *   if (!myPlayer) return 'Spectator';
	 *   if (state?.gameOver) return 'Game Over!';
	 *   return state?.currentTurn === myPlayer.id ? 'Your Turn' : 'Waiting...';
	 * }
	 */
	roleText?: (myPlayer: TPlayer | undefined, state?: TState) => string;
	/** Role text style */
	roleStyle?: HUDTextStyle;

	/**
	 * Generate control hints from player data and optionally game state
	 * @param myPlayer - Current player data or undefined if spectator
	 * @param state - Full game state (optional)
	 * @returns Text to display
	 */
	controlHints?: (myPlayer: TPlayer | undefined, state?: TState) => string;
	/** Control hints text style */
	controlsStyle?: HUDTextStyle;

	/** Custom layout positions */
	layout?: HUDLayout;

	/** Key in state where players are stored (default: 'players') */
	playersKey?: string;
}

export interface PlayerHUD {
	/** Update HUD (automatically called when player changes) */
	update: () => void;
	/** Destroy HUD elements */
	destroy: () => void;
	/** Get title text object */
	getTitleText: () => Phaser.GameObjects.Text | null;
	/** Get role text object */
	getRoleText: () => Phaser.GameObjects.Text | null;
	/** Get controls text object */
	getControlsText: () => Phaser.GameObjects.Text | null;
}

/**
 * Create a player HUD with automatic role/control updates
 *
 * @param adapter - PhaserAdapter instance
 * @param scene - Phaser scene
 * @param config - HUD configuration
 * @returns PlayerHUD instance
 */
export function createPlayerHUD<TPlayer = any>(
	adapter: PhaserAdapter,
	scene: Phaser.Scene,
	config: PlayerHUDConfig<TPlayer>
): PlayerHUD {
	const playersKey = config.playersKey || 'players';

	// Default layout
	const layout = {
		title: config.layout?.title || { x: 400, y: 20 },
		role: config.layout?.role || { x: 400, y: 50 },
		controls: config.layout?.controls || { x: 400, y: 75 }
	};

	// Default styles
	const titleStyle = {
		fontSize: config.titleStyle?.fontSize || '24px',
		color: config.titleStyle?.color || '#000',
		fontStyle: config.titleStyle?.fontStyle || 'bold',
		backgroundColor: config.titleStyle?.backgroundColor,
		padding: config.titleStyle?.padding
	};

	const roleStyle = {
		fontSize: config.roleStyle?.fontSize || '16px',
		color: config.roleStyle?.color || '#000',
		fontStyle: config.roleStyle?.fontStyle,
		backgroundColor: config.roleStyle?.backgroundColor,
		padding: config.roleStyle?.padding
	};

	const controlsStyle = {
		fontSize: config.controlsStyle?.fontSize || '14px',
		color: config.controlsStyle?.color || '#333',
		fontStyle: config.controlsStyle?.fontStyle,
		backgroundColor: config.controlsStyle?.backgroundColor,
		padding: config.controlsStyle?.padding
	};

	// Create text objects
	let titleText: Phaser.GameObjects.Text | null = null;
	let roleText: Phaser.GameObjects.Text | null = null;
	let controlsText: Phaser.GameObjects.Text | null = null;

	// Create title (static)
	if (config.title) {
		titleText = scene.add.text(layout.title.x, layout.title.y, config.title, titleStyle);
		titleText.setOrigin(0.5);
	}

	// Create role text (dynamic)
	if (config.roleText) {
		roleText = scene.add.text(layout.role.x, layout.role.y, 'Loading...', roleStyle);
		roleText.setOrigin(0.5);
	}

	// Create controls text (dynamic)
	if (config.controlHints) {
		controlsText = scene.add.text(layout.controls.x, layout.controls.y, '', controlsStyle);
		controlsText.setOrigin(0.5);
	}

	// Update function
	const update = () => {
		const state = adapter.getState();
		const myPlayer = adapter.getMyPlayer<TPlayer>(playersKey);

		if (roleText && config.roleText) {
			roleText.setText(config.roleText(myPlayer, state));
		}

		if (controlsText && config.controlHints) {
			controlsText.setText(config.controlHints(myPlayer, state));
		}
	};

	// Subscribe to state changes to reactively update HUD
	// Uses onChange instead of watchMyPlayer to get full state access
	const unsubscribers: Array<() => void> = [];

	// Track last values to avoid unnecessary updates
	let lastRoleText: string | undefined;
	let lastControlsText: string | undefined;

	// Watch roleText changes (reactive to both player and state changes)
	if (roleText && config.roleText) {
		const unsubscribe = adapter.onChange((state: any) => {
			const players = state?.[playersKey];
			const myPlayer = players ? players[adapter.getMyPlayerId()] : undefined;
			const text = config.roleText!(myPlayer, state);

			// Only update if text changed
			if (text !== lastRoleText) {
				lastRoleText = text;
				roleText.setText(text);
			}
		});
		unsubscribers.push(unsubscribe);

		// Initial update
		const initialState = adapter.getState();
		const initialPlayer = adapter.getMyPlayer<TPlayer>(playersKey);
		lastRoleText = config.roleText(initialPlayer, initialState);
		roleText.setText(lastRoleText);
	}

	// Watch controlHints changes (reactive to both player and state changes)
	if (controlsText && config.controlHints) {
		const unsubscribe = adapter.onChange((state: any) => {
			const players = state?.[playersKey];
			const myPlayer = players ? players[adapter.getMyPlayerId()] : undefined;
			const text = config.controlHints!(myPlayer, state);

			// Only update if text changed
			if (text !== lastControlsText) {
				lastControlsText = text;
				controlsText.setText(text);
			}
		});
		unsubscribers.push(unsubscribe);

		// Initial update
		const initialState = adapter.getState();
		const initialPlayer = adapter.getMyPlayer<TPlayer>(playersKey);
		lastControlsText = config.controlHints(initialPlayer, initialState);
		controlsText.setText(lastControlsText);
	}

	// Return HUD interface
	return {
		update,
		destroy: () => {
			// Unsubscribe from all watchers
			unsubscribers.forEach((unsub) => unsub());
			titleText?.destroy();
			roleText?.destroy();
			controlsText?.destroy();
		},
		getTitleText: () => titleText,
		getRoleText: () => roleText,
		getControlsText: () => controlsText
	};
}
