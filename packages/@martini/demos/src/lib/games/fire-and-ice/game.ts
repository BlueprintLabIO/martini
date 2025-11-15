/**
 * Fire & Ice - Cooperative Platformer Demo
 *
 * A 2-player cooperative platformer where players must work together
 * to navigate through obstacles. One player controls fire (red),
 * the other controls ice (blue).
 */

import { defineGame, createPlayerManager, createInputAction } from '@martini/core';

// Create a player manager to handle player lifecycle
const playerManager = createPlayerManager({
  roles: ['fire', 'ice'],
  factory: (playerId, index) => ({
    x: index === 0 ? 200 : 600,
    y: 400,
    role: index === 0 ? 'fire' : 'ice',
  }),
});

export const fireAndIceGame = defineGame({
  setup: ({ playerIds }) => ({
    players: playerManager.initialize(playerIds),
    inputs: {},
  }),

  actions: {
    move: createInputAction('inputs'),
  },

  onPlayerJoin: (state, playerId) => {
    playerManager.handleJoin(state.players, playerId);
  },

  onPlayerLeave: (state, playerId) => {
    playerManager.handleLeave(state.players, playerId);
  },
});
