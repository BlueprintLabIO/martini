/**
 * Fire & Ice - Cooperative Platformer Demo
 *
 * A 2-player cooperative platformer where players must work together
 * to navigate through obstacles. One player controls fire (red),
 * the other controls ice (blue).
 */

import { defineGame } from '@martini/core';

export const fireAndIceGame = defineGame({
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: index === 0 ? 200 : 600,
          y: 400,
          role: index === 0 ? 'fire' : 'ice',
        },
      ])
    ),
    inputs: {},
  }),

  actions: {
    move: {
      apply: (state, context, input) => {
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      },
    },
  },

  onPlayerJoin: (state, playerId) => {
    const existingCount = Object.keys(state.players).length;
    state.players[playerId] = {
      x: existingCount === 0 ? 200 : 600,
      y: 400,
      role: existingCount === 0 ? 'fire' : 'ice',
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  },
});
