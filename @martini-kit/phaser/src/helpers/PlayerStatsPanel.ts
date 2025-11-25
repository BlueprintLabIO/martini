/**
 * PlayerStatsPanel - Display current player's stats/powerups overlay
 *
 * Eliminates the boilerplate of manually tracking and displaying player stats.
 * Perfect for showing equipped powerups, abilities, ammo, inventory, etc.
 *
 * Features:
 * - Auto-reactive to player stat changes
 * - Smart positioning (corners, custom coords)
 * - Icon-based display with optional tooltips
 * - Conditional visibility and highlighting
 * - Type-safe player property access
 *
 * @example
 * ```ts
 * import { createPlayerStatsPanel } from '@martini-kit/phaser';
 *
 * // In scene.create()
 * this.statsPanel = createPlayerStatsPanel(this.adapter, this, {
 *   position: 'top-left',
 *   stats: {
 *     bombs: {
 *       icon: '💣',
 *       getValue: (player) => `${player.activeBombs}/${player.bombCount}`,
 *       tooltip: 'Bombs (current/max)'
 *     },
 *     speed: {
 *       icon: '⚡',
 *       getValue: (player) => `${Math.round(player.speed * 100)}%`,
 *       highlight: (player) => player.speed > 1.0
 *     }
 *   }
 * });
 * ```
 */

import type { PhaserAdapter } from '../PhaserAdapter.js';

export type StatPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | { x: number; y: number };

export interface StatConfig<TPlayer = any> {
	/** Icon/emoji to display */
	icon: string;

	/**
	 * Get the value to display next to the icon
	 * @param player - Current player data
	 * @returns String to display (e.g., "3/5", "120%", "✓")
	 */
	getValue: (player: TPlayer) => string | number;

	/**
	 * Optional tooltip text (for accessibility/clarity)
	 */
	tooltip?: string;

	/**
	 * Show this stat only when condition is true
	 * Useful for abilities that are only visible when active
	 */
	visible?: (player: TPlayer) => boolean;

	/**
	 * Highlight this stat when condition is true (e.g., boosted)
	 * Adds a glow/color effect
	 */
	highlight?: (player: TPlayer) => boolean;
}

export interface PlayerStatsPanelConfig<TPlayer = any> {
	/**
	 * Position of the stats panel
	 * - 'top-left', 'top-right', 'bottom-left', 'bottom-right'
	 * - Or custom {x, y} coordinates
	 */
	position: StatPosition;

	/**
	 * Stats to display, keyed by stat name
	 */
	stats: Record<string, StatConfig<TPlayer>>;

	/**
	 * Optional styling
	 */
	style?: {
		/** Background color (CSS format) */
		backgroundColor?: string;
		/** Padding around content */
		padding?: number;
		/** Icon font size */
		iconSize?: number;
		/** Value text font size */
		fontSize?: string;
		/** Spacing between stat items */
		spacing?: number;
		/** Highlight color when stat.highlight() returns true */
		highlightColor?: string;
	};

	/**
	 * Key in state where players are stored (default: 'players')
	 */
	playersKey?: string;
}

export interface PlayerStatsPanel {
	/** Update panel (automatically called when player changes) */
	update: () => void;
	/** Destroy panel elements */
	destroy: () => void;
	/** Get container game object */
	getContainer: () => Phaser.GameObjects.Container | null;
}

/**
 * Create a player stats panel for displaying current player's stats/powerups
 *
 * @param adapter - PhaserAdapter instance
 * @param scene - Phaser scene
 * @param config - Panel configuration
 * @returns PlayerStatsPanel instance
 */
export function createPlayerStatsPanel<TPlayer = any>(
	adapter: PhaserAdapter,
	scene: Phaser.Scene,
	config: PlayerStatsPanelConfig<TPlayer>
): PlayerStatsPanel {
	const playersKey = config.playersKey || 'players';

	// Default styling
	const style = {
		backgroundColor: config.style?.backgroundColor || 'rgba(0, 0, 0, 0.7)',
		padding: config.style?.padding ?? 8,
		iconSize: config.style?.iconSize ?? 24,
		fontSize: config.style?.fontSize || '16px',
		spacing: config.style?.spacing ?? 6,
		highlightColor: config.style?.highlightColor || '#fbbf24'
	};

	// Calculate position
	const getPosition = (): { x: number; y: number } => {
		if (typeof config.position === 'object' && 'x' in config.position) {
			return config.position;
		}

		const camera = scene.cameras.main;
		const padding = 20;

		switch (config.position) {
			case 'top-left':
				return { x: padding, y: padding };
			case 'top-right':
				return { x: camera.width - padding, y: padding };
			case 'bottom-left':
				return { x: padding, y: camera.height - padding };
			case 'bottom-right':
				return { x: camera.width - padding, y: camera.height - padding };
			default:
				return { x: padding, y: padding };
		}
	};

	const pos = getPosition();

	// Create container
	const container = scene.add.container(pos.x, pos.y);

	// Background (will be sized dynamically)
	const background = scene.add.rectangle(0, 0, 100, 100, 0x000000, 0.7);
	container.add(background);

	// Track stat elements
	const statElements: Map<
		string,
		{
			iconText: Phaser.GameObjects.Text;
			valueText: Phaser.GameObjects.Text;
			highlight?: Phaser.GameObjects.Rectangle;
		}
	> = new Map();

	// Update function
	const update = () => {
		const state = adapter.getState();
		const myPlayer = adapter.getMyPlayer<TPlayer>(playersKey);

		if (!myPlayer) {
			// Hide panel if no player
			container.setVisible(false);
			return;
		}

		container.setVisible(true);

		// Calculate layout
		let currentY = style.padding;
		let maxWidth = 0;
		const visibleStats: Array<[string, StatConfig<TPlayer>]> = [];

		// First pass: determine visible stats
		for (const [statName, statConfig] of Object.entries(config.stats)) {
			if (statConfig.visible && !statConfig.visible(myPlayer)) {
				// Hide this stat
				const element = statElements.get(statName);
				if (element) {
					element.iconText.setVisible(false);
					element.valueText.setVisible(false);
					element.highlight?.setVisible(false);
				}
				continue;
			}

			visibleStats.push([statName, statConfig]);
		}

		// Second pass: create/update visible stats
		for (const [statName, statConfig] of visibleStats) {
			let element = statElements.get(statName);

			if (!element) {
				// Create new stat element
				const iconText = scene.add.text(style.padding, currentY, statConfig.icon, {
					fontSize: `${style.iconSize}px`
				});

				const valueText = scene.add.text(
					style.padding + style.iconSize + 4,
					currentY,
					String(statConfig.getValue(myPlayer)),
					{
						fontSize: style.fontSize,
						color: '#ffffff'
					}
				);

				// Highlight rectangle (behind text, shown conditionally)
				const highlight = scene.add.rectangle(
					0,
					currentY + style.iconSize / 2,
					0,
					style.iconSize + 4,
					parseInt(style.highlightColor.replace('#', '0x'), 16),
					0.3
				);
				highlight.setOrigin(0, 0.5);
				highlight.setVisible(false);

				container.add([highlight, iconText, valueText]);

				element = { iconText, valueText, highlight };
				statElements.set(statName, element);
			}

			// Update text
			element.iconText.setText(statConfig.icon);
			element.valueText.setText(String(statConfig.getValue(myPlayer)));

			// Update visibility
			element.iconText.setVisible(true);
			element.valueText.setVisible(true);

			// Update position
			element.iconText.setPosition(style.padding, currentY);
			element.valueText.setPosition(style.padding + style.iconSize + 4, currentY);

			// Update highlight
			const shouldHighlight = statConfig.highlight ? statConfig.highlight(myPlayer) : false;
			if (element.highlight) {
				element.highlight.setVisible(shouldHighlight);
				element.highlight.setPosition(style.padding - 2, currentY + style.iconSize / 2);
				const textWidth = element.valueText.width;
				element.highlight.width = style.iconSize + 4 + textWidth + 4;
			}

			// Track max width
			const elementWidth = style.iconSize + 4 + element.valueText.width;
			maxWidth = Math.max(maxWidth, elementWidth);

			currentY += style.iconSize + style.spacing;
		}

		// Size background
		const bgWidth = maxWidth + style.padding * 2;
		const bgHeight = currentY - style.spacing + style.padding;
		background.setSize(bgWidth, bgHeight);

		// Adjust container origin based on position
		if (config.position === 'top-right' || config.position === 'bottom-right') {
			background.setOrigin(1, 0);
			container.x = pos.x;
		} else {
			background.setOrigin(0, 0);
		}
	};

	// Subscribe to state changes
	const unsubscribe = adapter.onChange(() => {
		update();
	});

	// Initial update
	update();

	// Return interface
	return {
		update,
		destroy: () => {
			unsubscribe();
			container.destroy();
		},
		getContainer: () => container
	};
}
