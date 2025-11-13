/**
 * Circuit Racer - Top-Down Racing Demo
 *
 * A multiplayer racing game where 2-4 players compete
 * to complete laps around a circuit track.
 */

import { defineGame } from '@martini/core';

export const circuitRacerGame = defineGame({
  setup: ({ playerIds }) => {
    const startPositions = [
      { x: 100, y: 300 },
      { x: 100, y: 330 },
      { x: 100, y: 360 },
      { x: 100, y: 390 },
    ];

    return {
      players: Object.fromEntries(
        playerIds.map((id, index) => [
          id,
          {
            x: startPositions[index].x,
            y: startPositions[index].y,
            rotation: 0,
            velocity: 0,
            lap: 0,
            checkpoint: 0,
            finished: false,
            color: ['#ff4444', '#4444ff', '#44ff44', '#ffff44'][index],
          },
        ])
      ),
      raceStarted: false,
      inputs: {},
    };
  },

  actions: {
    move: {
      apply: (state, context, input) => {
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      },
    },

    checkpoint: {
      apply: (state, context, input) => {
        const player = state.players[context.targetId];
        if (!player) return;

        player.checkpoint = input.checkpoint;

        // Check if lap completed
        if (input.checkpoint === 0 && player.lap > 0) {
          player.lap += 1;

          // Check if race finished (3 laps)
          if (player.lap >= 3) {
            player.finished = true;
          }
        } else if (input.checkpoint === 0) {
          player.lap = 1;
        }
      },
    },

    startRace: {
      apply: (state, context) => {
        state.raceStarted = true;
      },
    },
  },

  onPlayerJoin: (state, playerId) => {
    const startPositions = [
      { x: 100, y: 300 },
      { x: 100, y: 330 },
      { x: 100, y: 360 },
      { x: 100, y: 390 },
    ];
    const index = Object.keys(state.players).length;
    const colors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44'];

    state.players[playerId] = {
      x: startPositions[index % 4].x,
      y: startPositions[index % 4].y,
      rotation: 0,
      velocity: 0,
      lap: 0,
      checkpoint: 0,
      finished: false,
      color: colors[index % 4],
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  },
});
