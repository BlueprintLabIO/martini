/**
 * RoundManager - Complete round-based game system with timer, announcements, and scoring
 *
 * Eliminates 200+ lines of boilerplate for round-based games.
 * Perfect for fighting games, battle royales, sports games, etc.
 *
 * Features:
 * - Round timer with visual warnings
 * - Automatic round end detection
 * - Freeze frames and announcements between rounds
 * - Score tracking UI
 * - Match winner detection
 * - Customizable UI and flow
 *
 * @example
 * ```ts
 * import { createRoundManager } from '@martini-kit/phaser';
 *
 * // In scene.create()
 * this.rounds = createRoundManager(this.adapter, this, {
 *   roundsToWin: 3,
 *   
 *   // State keys
 *   timerStateKey: 'roundTimer',
 *   roundStateKey: 'round',
 *   
 *   // Win detection
 *   checkWinner: (state) => {
 *     const alive = Object.entries(state.players).filter(([, p]) => p.alive);
 *     if (alive.length === 1) return alive[0][0];
 *     if (state.roundTimer <= 0) return null; // Draw
 *     return undefined; // Continue
 *   },
 *   
 *   ui: {
 *     timer: {
 *       position: { x: 400, y: 50 },
 *       format: (ms) => `${Math.ceil(ms / 1000)}s`,
 *       warningAt: 30000
 *     }
 *   }
 * });
 * ```
 */

import type { PhaserAdapter } from '../PhaserAdapter.js';

export interface TimerUIConfig {
	/** Position of timer display */
	position: { x: number; y: number };

	/**
	 * Format timer value for display
	 * @param milliseconds - Time remaining in milliseconds
	 * @returns Formatted string (e.g., "1:23", "90s")
	 */
	format: (milliseconds: number) => string;

	/**
	 * Show warning color when time is below this threshold (ms)
	 * Default: 30000 (30 seconds)
	 */
	warningAt?: number;

	/** Style for timer text */
	style?: Phaser.Types.GameObjects.Text.TextStyle;

	/** Warning style (overrides style when warning) */
	warningStyle?: Phaser.Types.GameObjects.Text.TextStyle;
}

export interface AnnouncementUIConfig<TPlayer = any> {
	/**
	 * Get announcement text when a player wins the round
	 */
	winner: (player: TPlayer, winnerId: string) => string;

	/**
	 * Get announcement text when round ends in a draw
	 */
	draw: () => string;

	/**
	 * Get announcement text when a player wins the match
	 */
	matchWin: (player: TPlayer, winnerId: string) => string;

	/**
	 * Duration to show announcement (ms)
	 * Default: 3000
	 */
	freezeDuration?: number;

	/**
	 * Position of announcement
	 * Default: center of screen
	 */
	position?: { x: number; y: number };

	/** Style for announcement text */
	style?: Phaser.Types.GameObjects.Text.TextStyle;
}

export interface ScoreboardUIConfig<TPlayer = any> {
	/** Position of scoreboard */
	position: { x: number; y: number };

	/**
	 * Format score display for each player
	 * @param player - Player data
	 * @param index - Player index
	 * @param playerId - Player ID
	 * @returns Formatted string
	 */
	format: (player: TPlayer, index: number, playerId: string) => string;

	/** Style for score text */
	style?: Phaser.Types.GameObjects.Text.TextStyle;

	/** Spacing between score lines */
	spacing?: number;
}

export interface RoundManagerConfig<TPlayer = any, TState = any> {
	/**
	 * Number of rounds to win the match
	 */
	roundsToWin: number;

	/**
	 * State key where round timer is stored (in milliseconds)
	 * Default: 'roundTimer'
	 */
	timerStateKey?: string;

	/**
	 * State key where current round number is stored
	 * Default: 'round'
	 */
	roundStateKey?: string;

	/**
	 * State key where players are stored
	 * Default: 'players'
	 */
	playersKey?: string;

	/**
	 * State key where game over flag is stored
	 * Default: 'gameOver'
	 */
	gameOverKey?: string;

	/**
	 * State key where winner ID is stored
	 * Default: 'winner'
	 */
	winnerKey?: string;

	/**
	 * Check if round should end and determine winner
	 * @param state - Full game state
	 * @returns winnerId (string), null (draw), or undefined (continue playing)
	 */
	checkWinner: (state: TState) => string | null | undefined;

	/**
	 * UI configuration
	 */
	ui: {
		/** Timer display config */
		timer?: TimerUIConfig;

		/** Announcement config */
		announcement?: AnnouncementUIConfig<TPlayer>;

		/** Scoreboard config */
		scoreboard?: ScoreboardUIConfig<TPlayer>;
	};
}

export interface RoundManager {
	/** Update UI (automatically called on state changes) */
	update: () => void;
	/** Destroy UI elements */
	destroy: () => void;
	/** Get timer text object */
	getTimerText: () => Phaser.GameObjects.Text | null;
	/** Get announcement text object */
	getAnnouncementText: () => Phaser.GameObjects.Text | null;
}

/**
 * Create a round manager with timer, announcements, and scoring
 *
 * @param adapter - PhaserAdapter instance
 * @param scene - Phaser scene
 * @param config - Round manager configuration
 * @returns RoundManager instance
 */
export function createRoundManager<TPlayer = any, TState = any>(
	adapter: PhaserAdapter,
	scene: Phaser.Scene,
	config: RoundManagerConfig<TPlayer, TState>
): RoundManager {
	const runtime = adapter.getRuntime();

	// State keys
	const timerKey = config.timerStateKey || 'roundTimer';
	const roundKey = config.roundStateKey || 'round';
	const playersKey = config.playersKey || 'players';
	const gameOverKey = config.gameOverKey || 'gameOver';
	const winnerKey = config.winnerKey || 'winner';

	// UI elements
	let timerText: Phaser.GameObjects.Text | null = null;
	let announcementText: Phaser.GameObjects.Text | null = null;
	const scoreTexts: Phaser.GameObjects.Text[] = [];

	// Create timer UI
	if (config.ui.timer) {
		const timerConfig = config.ui.timer;
		const defaultStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			fontSize: '24px',
			color: '#ffffff',
			fontStyle: 'bold',
			...timerConfig.style
		};

		timerText = scene.add.text(
			timerConfig.position.x,
			timerConfig.position.y,
			'',
			defaultStyle
		);
		timerText.setOrigin(0.5);
	}

	// Create announcement UI (hidden initially)
	if (config.ui.announcement) {
		const announcementConfig = config.ui.announcement;
		const camera = scene.cameras.main;
		const pos = announcementConfig.position || { x: camera.width / 2, y: camera.height / 2 };

		const defaultStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			fontSize: '48px',
			color: '#fbbf24',
			fontStyle: 'bold',
			stroke: '#000',
			strokeThickness: 6,
			...announcementConfig.style
		};

		announcementText = scene.add.text(pos.x, pos.y, '', defaultStyle);
		announcementText.setOrigin(0.5);
		announcementText.setVisible(false);
		announcementText.setDepth(1000); // Always on top
	}

	// Freeze state
	let isFrozen = false;
	let freezeTimer = 0;

	/**
	 * Show announcement and freeze gameplay
	 */
	const showAnnouncement = (text: string, duration: number) => {
		if (!announcementText) return;

		announcementText.setText(text);
		announcementText.setVisible(true);

		// Fade in
		announcementText.setAlpha(0);
		scene.tweens.add({
			targets: announcementText,
			alpha: 1,
			duration: 200,
			ease: 'Cubic.easeOut'
		});

		// Freeze gameplay
		isFrozen = true;
		freezeTimer = duration;

		// Auto-hide after duration
		scene.time.delayedCall(duration, () => {
			if (!announcementText) return;

			// Fade out
			scene.tweens.add({
				targets: announcementText,
				alpha: 0,
				duration: 300,
				ease: 'Cubic.easeIn',
				onComplete: () => {
					announcementText?.setVisible(false);
					isFrozen = false;
				}
			});
		});
	};

	/**
	 * Update all UI elements
	 */
	const update = () => {
		const state = runtime.getState() as any;

		// Update timer
		if (timerText && config.ui.timer) {
			const timerValue = state[timerKey] || 0;
			const formatted = config.ui.timer.format(timerValue);
			timerText.setText(formatted);

			// Apply warning style
			const warningAt = config.ui.timer.warningAt ?? 30000;
			if (timerValue <= warningAt && config.ui.timer.warningStyle) {
				timerText.setStyle(config.ui.timer.warningStyle);
			} else if (config.ui.timer.style) {
				timerText.setStyle(config.ui.timer.style);
			}
		}

		// Update scoreboard
		if (config.ui.scoreboard) {
			const scoreConfig = config.ui.scoreboard;
			const players = state[playersKey] || {};
			const playerEntries = Object.entries(players) as [string, TPlayer][];

			// Remove old score texts
			scoreTexts.forEach((text) => text.destroy());
			scoreTexts.length = 0;

			// Create new score texts
			let yOffset = 0;
			const spacing = scoreConfig.spacing ?? 25;

			playerEntries.forEach(([playerId, player], index) => {
				const text = scene.add.text(
					scoreConfig.position.x,
					scoreConfig.position.y + yOffset,
					scoreConfig.format(player, index, playerId),
					scoreConfig.style || { fontSize: '16px', color: '#ffffff' }
				);

				scoreTexts.push(text);
				yOffset += spacing;
			});
		}

		// Check for round end (host only)
		if (adapter.isHost() && !isFrozen && !state[gameOverKey]) {
			const winnerId = config.checkWinner(state);

			if (winnerId !== undefined) {
				// Round ended!
				const players = state[playersKey] || {};

				if (winnerId === null) {
					// Draw
					if (config.ui.announcement) {
						const text = config.ui.announcement.draw();
						const duration = config.ui.announcement.freezeDuration ?? 3000;
						showAnnouncement(text, duration);
					}

					// Submit endRound action with null winner
					runtime.submitAction('endRound', { winnerId: null });
				} else {
					// Player won
					const winner = players[winnerId];

					// Check for match win
					const score = (winner as any).score || 0;
					const isMatchWin = score + 1 >= config.roundsToWin;

					if (config.ui.announcement) {
						const text = isMatchWin
							? config.ui.announcement.matchWin(winner, winnerId)
							: config.ui.announcement.winner(winner, winnerId);
						const duration = config.ui.announcement.freezeDuration ?? 3000;
						showAnnouncement(text, duration);
					}

					// Submit endRound action
					runtime.submitAction('endRound', { winnerId });
				}
			}
		}

		// Show game over announcement
		if (state[gameOverKey] && state[winnerKey]) {
			const players = state[playersKey] || {};
			const winner = players[state[winnerKey]];

			if (winner && config.ui.announcement && announcementText && !announcementText.visible) {
				const text = config.ui.announcement.matchWin(winner, state[winnerKey]);
				announcementText.setText(text);
				announcementText.setVisible(true);
				announcementText.setAlpha(1);
			}
		}
	};

	// Subscribe to state changes
	const unsubscribe = adapter.onChange(() => {
		update();
	});

	// Initial update
	update();

	return {
		update,
		destroy: () => {
			unsubscribe();
			timerText?.destroy();
			announcementText?.destroy();
			scoreTexts.forEach((text) => text.destroy());
		},
		getTimerText: () => timerText,
		getAnnouncementText: () => announcementText
	};
}
