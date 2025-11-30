import type { MartiniKitIDEConfig } from '@martini-kit/ide';

// Tile Matcher - Classic Connect Four game
const config: MartiniKitIDEConfig = {
	files: {
		'/src/game.ts': `import { defineGame, createPlayerManager } from '@martini-kit/core';

const COLS = 7;
const ROWS = 6;

// PlayerManager for assigning player colors and turn order
const playerManager = createPlayerManager({
	factory: (playerId, index) => ({
		color: index === 0 ? 'red' : 'yellow',
		turnOrder: index
	})
});

export const game = defineGame({
	lobby: {
		minPlayers: 2,
		maxPlayers: 2,
		requireAllReady: true,
		autoStartTimeout: 30000,
		allowLateJoin: false
	},

	setup: ({ playerIds, random }) => ({
		players: playerManager.initialize(playerIds),
		// Grid: array of columns, each column is array of tokens (null = empty)
		// grid[col][row] where row 0 is bottom
		grid: Array.from({ length: COLS }, () => Array(ROWS).fill(null)),
		currentTurn: 0, // Index into playerIds array
		winner: null as string | null,
		winningLine: null as { col: number; row: number }[] | null,
		gameOver: false,
		isDraw: false
	}),

	actions: {
		dropToken: {
			apply: (state, context, input: { col: number }) => {
				// Validate it's this player's turn
				const playerIds = Object.keys(state.players);
				const currentPlayerId = playerIds[state.currentTurn];

				if (context.targetId !== currentPlayerId) {
					console.warn('Not your turn!');
					return;
				}

				if (state.gameOver) {
					console.warn('Game is over!');
					return;
				}

				const { col } = input;

				// Validate column
				if (col < 0 || col >= COLS) return;

				const column = state.grid[col];

				// Find lowest empty row (gravity)
				const row = column.indexOf(null);
				if (row === -1) {
					console.warn('Column is full!');
					return;
				}

				// Place token
				const player = state.players[context.targetId];
				column[row] = player.color;

				// Check for winner
				const winLine = checkWinner(state.grid, col, row, player.color);
				if (winLine) {
					state.winner = context.targetId;
					state.winningLine = winLine;
					state.gameOver = true;
					return;
				}

				// Check for draw (board full)
				const isFull = state.grid.every(col => col[ROWS - 1] !== null);
				if (isFull) {
					state.isDraw = true;
					state.gameOver = true;
					return;
				}

				// Next turn
				state.currentTurn = (state.currentTurn + 1) % playerIds.length;
			}
		},

		resetGame: {
			apply: (state) => {
				state.grid = Array.from({ length: COLS }, () => Array(ROWS).fill(null));
				state.currentTurn = 0;
				state.winner = null;
				state.winningLine = null;
				state.gameOver = false;
				state.isDraw = false;
			}
		}
	},

	onPhaseChange: (state, { from, to, reason }) => {
		console.log(\`[Tile Matcher] Phase: \${from} -> \${to} (\${reason})\`);
	},

	onPlayerReady: (state, playerId, ready) => {
		console.log(\`[Tile Matcher] Player \${playerId} is \${ready ? 'ready' : 'not ready'}\`);
	},

	onPlayerJoin: (state, playerId) => {
		playerManager.handleJoin(state.players, playerId);
	},

	onPlayerLeave: (state, playerId) => {
		playerManager.handleLeave(state.players, playerId);
	}
});

// Win detection helper
function checkWinner(
	grid: (string | null)[][],
	col: number,
	row: number,
	color: string
): { col: number; row: number }[] | null {
	// Check horizontal
	const horizontal = checkDirection(grid, col, row, color, 1, 0);
	if (horizontal) return horizontal;

	// Check vertical
	const vertical = checkDirection(grid, col, row, color, 0, 1);
	if (vertical) return vertical;

	// Check diagonal (bottom-left to top-right)
	const diag1 = checkDirection(grid, col, row, color, 1, 1);
	if (diag1) return diag1;

	// Check diagonal (top-left to bottom-right)
	const diag2 = checkDirection(grid, col, row, color, 1, -1);
	if (diag2) return diag2;

	return null;
}

function checkDirection(
	grid: (string | null)[][],
	col: number,
	row: number,
	color: string,
	dx: number,
	dy: number
): { col: number; row: number }[] | null {
	const line: { col: number; row: number }[] = [{ col, row }];

	// Check positive direction
	let c = col + dx;
	let r = row + dy;
	while (c >= 0 && c < COLS && r >= 0 && r < ROWS && grid[c][r] === color) {
		line.push({ col: c, row: r });
		c += dx;
		r += dy;
	}

	// Check negative direction
	c = col - dx;
	r = row - dy;
	while (c >= 0 && c < COLS && r >= 0 && r < ROWS && grid[c][r] === color) {
		line.push({ col: c, row: r });
		c -= dx;
		r -= dy;
	}

	return line.length >= 4 ? line : null;
}
`,

		'/src/scene.ts': `import type { GameRuntime } from '@martini-kit/core';
import { PhaserAdapter, createPlayerHUD, LobbyUI } from '@martini-kit/phaser';
import Phaser from 'phaser';

const COLS = 7;
const ROWS = 6;
const CELL_SIZE = 80;
const TOKEN_RADIUS = 30;
const BOARD_X = 100;
const BOARD_Y = 100;

export function createScene(runtime: GameRuntime) {
	return class TileMatcherScene extends Phaser.Scene {
		private adapter!: PhaserAdapter;
		private hud: any;
		private tokens: Phaser.GameObjects.Arc[][] = [];
		private gridHelper: any; // GridClickHelper
		private winLineGraphics!: Phaser.GameObjects.Graphics;
		private hud: any;
		private lobbyUI?: LobbyUI;

		create() {
			this.adapter = new PhaserAdapter(runtime, this);

			// Create lobby UI
			this.lobbyUI = new LobbyUI(this.adapter, this, {
				title: 'Tile Matcher',
				subtitle: 'Waiting for players...',
				position: { x: 400, y: 200 },
				showInstructions: true
			});

			// Update lobby UI on state changes
			this.adapter.onChange((state: any) => {
				if (this.lobbyUI && state.__lobby) {
					this.lobbyUI.update(state.__lobby);
					if (state.__lobby.phase === 'lobby') {
						this.lobbyUI.show();
					} else {
						this.lobbyUI.hide();
					}
				}
			});

			// Background
			this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

			// HUD Helper
			this.hud = createPlayerHUD(this.adapter, this, {
				title: 'Connect Four',
				titleStyle: { fontSize: '28px', color: '#fff', fontStyle: 'bold' },

				roleText: (myPlayer: any, state: any) => {
					if (!myPlayer) return 'Spectator';
					if (!state) return 'Loading...';

					if (state.gameOver) {
						if (state.isDraw) return 'Game Draw!';
						if (state.winner) {
							const winnerPlayer = state.players[state.winner];
							return state.winner === this.adapter.getMyPlayerId()
								? \`You Win! (\${winnerPlayer?.color})\`
								: \`\${winnerPlayer?.color.toUpperCase()} Wins!\`;
						}
					}

					const playerIds = Object.keys(state.players || {});
					const currentPlayerId = playerIds[state.currentTurn];
					const currentPlayer = state.players?.[currentPlayerId];

					if (currentPlayerId === this.adapter.getMyPlayerId()) {
						return \`Your Turn (\${myPlayer.color.toUpperCase()})\`;
					}

					return \`\${currentPlayer?.color?.toUpperCase() || 'Opponent'}'s Turn\`;
				},
				roleStyle: { fontSize: '18px', color: '#fff' },

				controlHints: () => 'Click a column to drop your token',
				controlsStyle: { fontSize: '14px', color: '#aaa' },

				layout: {
					title: { x: 400, y: 30 },
					role: { x: 400, y: 65 },
					controls: { x: 400, y: 575 }
				}
			});

			// Draw board background
			const boardBg = this.add.rectangle(
				BOARD_X + (COLS * CELL_SIZE) / 2,
				BOARD_Y + (ROWS * CELL_SIZE) / 2,
				COLS * CELL_SIZE,
				ROWS * CELL_SIZE,
				0x0066cc
			);

			// Create grid cells and token placeholders
			for (let col = 0; col < COLS; col++) {
				this.tokens[col] = [];
				for (let row = 0; row < ROWS; row++) {
					const x = BOARD_X + col * CELL_SIZE + CELL_SIZE / 2;
					const y = BOARD_Y + (ROWS - 1 - row) * CELL_SIZE + CELL_SIZE / 2;

					// Cell hole
					this.add.circle(x, y, TOKEN_RADIUS, 0x1a1a2e);

					// Token placeholder
					const token = this.add.circle(x, y, TOKEN_RADIUS, 0x444444, 0);
					this.tokens[col][row] = token;
				}
			}

			// Grid click helper - robust click handling that works in any scale mode
			this.gridHelper = this.adapter.createClickableGrid({
				columns: COLS,
				rows: ROWS,
				cellWidth: CELL_SIZE,
				cellHeight: CELL_SIZE,
				offsetX: BOARD_X,
				offsetY: BOARD_Y,
				origin: 'bottom-left', // Connect Four: row 0 is bottom
				highlightColor: 0xffffff,
				highlightAlpha: 0.15,
				onCellClick: (col, row) => {
					const state = runtime.getState();
					runtime.submitAction('dropToken', { col });
				},
				canClick: (col, row) => {
					const state = runtime.getState();
					if (state.gameOver) return false;

					// Check if it's this player's turn
					const playerIds = Object.keys(state.players);
					const currentPlayerId = playerIds[state.currentTurn];
					if (currentPlayerId !== this.adapter.getMyPlayerId()) return false;

					// Check if column is not full
					return state.grid[col][ROWS - 1] === null;
				},
				canHighlight: (col, row) => {
					const state = runtime.getState();
					if (state.gameOver) return false;

					// Show highlight even if not your turn (for visual feedback)
					// But check if column is full
					return state.grid[col][ROWS - 1] === null;
				}
			});

			// Win line graphics
			this.winLineGraphics = this.add.graphics();

			// Listen for game state changes
			this.adapter.onChange((state: any) => {
				this.updateBoard(state);
				this.updateResetButton(state);
			});

			// Initial render
			const initialState = runtime.getState();
			this.updateBoard(initialState);
			this.updateResetButton(initialState);
		}

		private updateBoard(state: any) {
			// Update token colors
			for (let col = 0; col < COLS; col++) {
				for (let row = 0; row < ROWS; row++) {
					const color = state.grid[col][row];
					const token = this.tokens[col][row];

					if (color === 'red') {
						token.setFillStyle(0xff4444, 1);
					} else if (color === 'yellow') {
						token.setFillStyle(0xffdd44, 1);
					} else {
						token.setFillStyle(0x444444, 0);
					}
				}
			}

			// Draw winning line
			this.winLineGraphics.clear();
			if (state.winningLine && state.winningLine.length >= 4) {
				this.winLineGraphics.lineStyle(8, 0xffffff, 0.8);

				const firstCell = state.winningLine[0];
				const lastCell = state.winningLine[state.winningLine.length - 1];

				const x1 = BOARD_X + firstCell.col * CELL_SIZE + CELL_SIZE / 2;
				const y1 = BOARD_Y + (ROWS - 1 - firstCell.row) * CELL_SIZE + CELL_SIZE / 2;
				const x2 = BOARD_X + lastCell.col * CELL_SIZE + CELL_SIZE / 2;
				const y2 = BOARD_Y + (ROWS - 1 - lastCell.row) * CELL_SIZE + CELL_SIZE / 2;

				this.winLineGraphics.lineBetween(x1, y1, x2, y2);
			}
		}

		private updateResetButton(state: any) {
			if (state.gameOver && !this.resetButton) {
				// Create reset button
				const bg = this.add.rectangle(0, 0, 140, 40, 0x4a9eff);
				bg.setInteractive({ useHandCursor: true });

				const text = this.add.text(0, 0, 'Play Again', {
					fontSize: '16px',
					color: '#fff',
					fontStyle: 'bold'
				});
				text.setOrigin(0.5, 0.5);

				this.resetButton = this.add.container(400, 520, [bg, text]);

				bg.on('pointerover', () => {
					bg.setFillStyle(0x6ab0ff);
				});

				bg.on('pointerout', () => {
					bg.setFillStyle(0x4a9eff);
				});

				bg.on('pointerdown', () => {
					runtime.submitAction('resetGame', {});
				});
			} else if (!state.gameOver && this.resetButton) {
				this.resetButton.destroy();
				this.resetButton = undefined;
			}
		}

		update() {
			// No continuous updates needed - everything is event-driven
		}
	};
}
`,

		'/src/main.ts': `import { initializeGame } from '@martini-kit/phaser';
import { game } from './game';
import { createScene } from './scene';

initializeGame({
  game,
  scene: createScene,
  phaserConfig: {
    width: 800,
    height: 600,
    backgroundColor: '#1a1a2e'
  }
});
`
	},
	engine: 'phaser',
	transport: { type: 'iframe-bridge' },
	layout: 'dual'
};

export default config;
