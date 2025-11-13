import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { PhaserAdapter } from '@martini/phaser';

const ROWS = 6;
const COLS = 7;
const CELL_SIZE = 70;
const BOARD_X = 150;
const BOARD_Y = 100;

const PLAYER_COLORS: Record<string, number> = {
	red: 0xef4444,
	yellow: 0xeab308,
};

export function createTileMatcherScene(
	runtime: GameRuntime,
	transport: LocalTransport,
	isHost: boolean,
	playerId: string,
	role: 'host' | 'client',
	keys: { host: { left: boolean; right: boolean; up: boolean }; client: { left: boolean; right: boolean; up: boolean } }
) {
	return {
		create: function (this: Phaser.Scene) {
			// Background
			this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

			// Create adapter
			const adapter = new PhaserAdapter(runtime, this);
			(this as any).adapter = adapter;

			// Title
			this.add
				.text(400, 30, 'CONNECT FOUR', {
					fontSize: '32px',
					color: '#ffffff',
					fontStyle: 'bold',
				})
				.setOrigin(0.5);

			// Draw board background (blue with holes)
			const boardBg = this.add.rectangle(
				BOARD_X + (COLS * CELL_SIZE) / 2,
				BOARD_Y + (ROWS * CELL_SIZE) / 2,
				COLS * CELL_SIZE + 20,
				ROWS * CELL_SIZE + 20,
				0x2563eb
			);

			// Create grid cells and holes
			(this as any).discs = [];

			for (let row = 0; row < ROWS; row++) {
				for (let col = 0; col < COLS; col++) {
					const x = BOARD_X + col * CELL_SIZE + CELL_SIZE / 2;
					const y = BOARD_Y + row * CELL_SIZE + CELL_SIZE / 2;

					// Draw hole (empty space in blue board)
					const hole = this.add.circle(x, y, CELL_SIZE / 2 - 5, 0x1a1a2e);
					hole.setStrokeStyle(2, 0x1e40af);
				}
			}

			// WORKAROUND: Use native DOM events instead of Phaser's input system
			// This prevents conflicts between dual Phaser instances
			const canvas = this.game.canvas;

			const handleCanvasClick = (event: MouseEvent) => {
				const state = runtime.getState();

				// Get canvas-relative coordinates
				const rect = canvas.getBoundingClientRect();
				const scaleX = canvas.width / rect.width;
				const scaleY = canvas.height / rect.height;
				const canvasX = (event.clientX - rect.left) * scaleX;
				const canvasY = (event.clientY - rect.top) * scaleY;

				// Check if click is on reset button (400, 570, 120x35)
				if (
					canvasX >= 400 - 60 &&
					canvasX <= 400 + 60 &&
					canvasY >= 570 - 17.5 &&
					canvasY <= 570 + 17.5
				) {
					console.log(`[UI ${role}] Reset button clicked`);
					runtime.submitAction('resetGame', undefined);
					return;
				}

				// Check if click is within the board area
				if (
					canvasX >= BOARD_X &&
					canvasX <= BOARD_X + COLS * CELL_SIZE &&
					canvasY >= BOARD_Y &&
					canvasY <= BOARD_Y + ROWS * CELL_SIZE
				) {
					// Calculate which column was clicked
					const col = Math.floor((canvasX - BOARD_X) / CELL_SIZE);

					console.log(`[UI ${role}] Column clicked`, {
						column: col,
						playerId,
						currentTurn: state.currentTurn,
						isMyTurn: state.currentTurn === playerId,
						gameOver: state.gameOver,
						coords: { canvasX, canvasY },
					});

					if (state.currentTurn === playerId && !state.gameOver && col >= 0 && col < COLS) {
						console.log(`[UI ${role}] Submitting dropDisc action`);
						runtime.submitAction('dropDisc', { column: col });
					} else {
						console.log(`[UI ${role}] Click ignored - not my turn or game over or invalid column`);
					}
				}
			};

			// Attach DOM event listener
			canvas.addEventListener('click', handleCanvasClick);

			// Store cleanup function
			(this as any).cleanupCanvasClick = () => {
				canvas.removeEventListener('click', handleCanvasClick);
			};

			// Turn indicator
			const turnIndicator = this.add.text(400, 70, '', {
				fontSize: '20px',
				color: '#ffffff',
				fontStyle: 'bold',
			});
			turnIndicator.setOrigin(0.5);
			(this as any).turnIndicator = turnIndicator;

			// Game status text
			const statusText = this.add.text(400, 550, '', {
				fontSize: '24px',
				color: '#ffffff',
				fontStyle: 'bold',
			});
			statusText.setOrigin(0.5);
			(this as any).statusText = statusText;

			// Reset button (visual only, uses DOM events)
			const resetButton = this.add.rectangle(400, 570, 120, 35, 0x10b981);
			const resetButtonText = this.add.text(400, 570, 'Reset (R)', {
				fontSize: '14px',
				color: '#ffffff',
			});
			resetButtonText.setOrigin(0.5);

			// Handle reset via click detection in the main canvas click handler
			// (checking Y coordinate near button area)

			// Keyboard shortcut for reset
			this.input.keyboard?.on('keydown-R', () => {
				console.log(`[UI ${role}] Reset via keyboard`);
				runtime.submitAction('resetGame', undefined);
			});
		},

		update: function (this: Phaser.Scene) {
			const state = runtime.getState();

			// Clear old discs
			if ((this as any).discs) {
				(this as any).discs.forEach((disc: Phaser.GameObjects.GameObject) => disc.destroy());
			}
			(this as any).discs = [];

			// Render discs from board state
			if (state.board) {
				for (let row = 0; row < ROWS; row++) {
					for (let col = 0; col < COLS; col++) {
						const cell = state.board[row][col];
						if (cell) {
							const x = BOARD_X + col * CELL_SIZE + CELL_SIZE / 2;
							const y = BOARD_Y + row * CELL_SIZE + CELL_SIZE / 2;

							const playerData = state.players[cell];
							const color = playerData ? PLAYER_COLORS[playerData.color] : 0xffffff;

							const disc = this.add.circle(x, y, CELL_SIZE / 2 - 8, color);
							disc.setStrokeStyle(3, 0xffffff, 0.3);
							(this as any).discs.push(disc);
						}
					}
				}
			}

			// Update turn indicator
			if ((this as any).turnIndicator) {
				const isMyTurn = state.currentTurn === playerId;
				const myColor = state.players[playerId]?.color || 'red';
				const opponentColor = myColor === 'red' ? 'yellow' : 'red';

				if (state.gameOver) {
					(this as any).turnIndicator.setText('');
				} else {
					(this as any).turnIndicator.setText(isMyTurn ? 'YOUR TURN!' : "Opponent's Turn");
					(this as any).turnIndicator.setColor(isMyTurn ? '#10b981' : '#ef4444');
				}
			}

			// Update status text
			if ((this as any).statusText) {
				if (state.winner) {
					const isWinner = state.winner === playerId;
					(this as any).statusText.setText(isWinner ? '🎉 YOU WIN! 🎉' : '😞 YOU LOSE 😞');
					(this as any).statusText.setColor(isWinner ? '#10b981' : '#ef4444');
				} else if (state.isDraw) {
					(this as any).statusText.setText("It's a DRAW!");
					(this as any).statusText.setColor('#eab308');
				} else {
					(this as any).statusText.setText('');
				}
			}
		},

		shutdown: function (this: Phaser.Scene) {
			// Cleanup DOM event listeners
			if ((this as any).cleanupCanvasClick) {
				(this as any).cleanupCanvasClick();
			}
		},
	};
}
