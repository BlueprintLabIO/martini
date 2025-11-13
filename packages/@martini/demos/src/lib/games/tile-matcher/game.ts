/**
 * Connect Four - Classic Turn-Based Strategy Game
 *
 * A 2-player game where players take turns dropping colored discs
 * into a 7-column, 6-row grid. First player to get 4 discs in a row
 * (horizontal, vertical, or diagonal) wins!
 */

import { defineGame } from '@martini/core';

const ROWS = 6;
const COLS = 7;

function createEmptyBoard(): (string | null)[][] {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
}

function checkWin(board: (string | null)[][], playerId: string): boolean {
  // Check horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS - 3; col++) {
      if (
        board[row][col] === playerId &&
        board[row][col + 1] === playerId &&
        board[row][col + 2] === playerId &&
        board[row][col + 3] === playerId
      ) {
        return true;
      }
    }
  }

  // Check vertical
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS - 3; row++) {
      if (
        board[row][col] === playerId &&
        board[row + 1][col] === playerId &&
        board[row + 2][col] === playerId &&
        board[row + 3][col] === playerId
      ) {
        return true;
      }
    }
  }

  // Check diagonal (down-right)
  for (let row = 0; row < ROWS - 3; row++) {
    for (let col = 0; col < COLS - 3; col++) {
      if (
        board[row][col] === playerId &&
        board[row + 1][col + 1] === playerId &&
        board[row + 2][col + 2] === playerId &&
        board[row + 3][col + 3] === playerId
      ) {
        return true;
      }
    }
  }

  // Check diagonal (down-left)
  for (let row = 0; row < ROWS - 3; row++) {
    for (let col = 3; col < COLS; col++) {
      if (
        board[row][col] === playerId &&
        board[row + 1][col - 1] === playerId &&
        board[row + 2][col - 2] === playerId &&
        board[row + 3][col - 3] === playerId
      ) {
        return true;
      }
    }
  }

  return false;
}

function isBoardFull(board: (string | null)[][]): boolean {
  return board[0].every(cell => cell !== null);
}

export const tileMatcherGame = defineGame({
  setup: ({ playerIds }) => ({
    board: createEmptyBoard(),
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          color: index === 0 ? 'red' : 'yellow',
          isMyTurn: index === 0,
        },
      ])
    ),
    currentTurn: playerIds[0],
    winner: null as string | null,
    isDraw: false,
    gameOver: false,
  }),

  actions: {
    dropDisc: {
      apply: (state, context, input) => {
        console.log('[dropDisc] action received', {
          currentTurn: state.currentTurn,
          contextPlayerId: context.playerId,
          contextTargetId: context.targetId,
          isHost: context.isHost,
          input,
        });

        // Validate it's player's turn
        if (state.currentTurn !== context.targetId) {
          console.log('[dropDisc] REJECTED: not player\'s turn');
          return;
        }
        if (state.gameOver) {
          console.log('[dropDisc] REJECTED: game over');
          return;
        }

        const { column } = input;
        if (column < 0 || column >= COLS) {
          console.log('[dropDisc] REJECTED: invalid column', column);
          return;
        }

        // Find lowest empty row in column
        let row = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (state.board[r][column] === null) {
            row = r;
            break;
          }
        }

        // Column is full
        if (row === -1) {
          console.log('[dropDisc] REJECTED: column full', column);
          return;
        }

        console.log('[dropDisc] ACCEPTED: placing disc at', { row, column });

        // Place disc
        state.board[row][column] = context.targetId;

        // Check for win
        if (checkWin(state.board, context.targetId)) {
          state.winner = context.targetId;
          state.gameOver = true;
          return;
        }

        // Check for draw
        if (isBoardFull(state.board)) {
          state.isDraw = true;
          state.gameOver = true;
          return;
        }

        // Switch turn
        const playerIds = Object.keys(state.players);
        const currentIndex = playerIds.indexOf(state.currentTurn);
        const nextIndex = (currentIndex + 1) % playerIds.length;
        state.currentTurn = playerIds[nextIndex];

        // Update turn flags
        for (const id of playerIds) {
          state.players[id].isMyTurn = id === state.currentTurn;
        }
      },
    },

    resetGame: {
      apply: (state) => {
        state.board = createEmptyBoard();
        state.winner = null;
        state.isDraw = false;
        state.gameOver = false;

        const playerIds = Object.keys(state.players);
        state.currentTurn = playerIds[0];

        for (const id of playerIds) {
          state.players[id].isMyTurn = id === state.currentTurn;
        }
      },
    },
  },

  onPlayerJoin: (state, playerId) => {
    const index = Object.keys(state.players).length;
    state.players[playerId] = {
      color: index === 0 ? 'red' : 'yellow',
      isMyTurn: false,
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];

    // End game if a player leaves
    if (Object.keys(state.players).length < 2) {
      state.gameOver = true;
    }
  },
});
