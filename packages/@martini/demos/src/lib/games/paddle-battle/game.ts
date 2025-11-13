/**
 * Paddle Battle - Classic Multiplayer Pong Demo
 *
 * A modern take on the classic Pong game with multiplayer support.
 * 2 players compete to score goals by hitting the ball past their opponent.
 */

import { defineGame } from '@martini/core';

export const paddleBattleGame = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          y: 250,
          score: 0,
          side: index === 0 ? 'left' : 'right',
        },
      ])
    ),
    ball: {
      x: 400,
      y: 300,
      velocityX: 200,
      velocityY: 150,
    },
    inputs: {},
    gameStarted: false,
  }),

  actions: {
    move: {
      apply: (state, context, input) => {
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      },
    },

    score: {
      apply: (state, context) => {
        // context.targetId is the player who should receive the score
        const player = state.players[context.targetId];
        if (!player) return;

        player.score += 1;

        // Reset ball to center
        state.ball.x = 400;
        state.ball.y = 300;
        state.ball.velocityX = 200 * (Math.random() > 0.5 ? 1 : -1);
        state.ball.velocityY = 150 * (Math.random() > 0.5 ? 1 : -1);
      },
    },

    startGame: {
      apply: (state) => {
        state.gameStarted = true;
      },
    },
  },

  onPlayerJoin: (state, playerId) => {
    const index = Object.keys(state.players).length;
    state.players[playerId] = {
      y: 250,
      score: 0,
      side: index === 0 ? 'left' : 'right',
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  },
});
