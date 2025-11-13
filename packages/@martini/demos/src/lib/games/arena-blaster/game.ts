/**
 * Arena Blaster - Top-Down Shooter Demo
 *
 * A fast-paced multiplayer arena shooter where 2-4 players
 * compete to eliminate each other in a confined arena.
 */

import { defineGame } from '@martini/core';

export const arenaBlasterGame = defineGame({
  setup: ({ playerIds }) => {
    const spawnPoints = [
      { x: 100, y: 100 },
      { x: 700, y: 100 },
      { x: 100, y: 500 },
      { x: 700, y: 500 },
    ];

    return {
      players: Object.fromEntries(
        playerIds.map((id, index) => [
          id,
          {
            x: spawnPoints[index].x,
            y: spawnPoints[index].y,
            health: 100,
            score: 0,
            rotation: 0,
          },
        ])
      ),
      bullets: [],
      inputs: {},
      nextBulletId: 0,
    };
  },

  actions: {
    move: {
      apply: (state, context, input) => {
        if (!state.inputs) state.inputs = {};
        state.inputs[context.targetId] = input;
      },
    },

    shoot: {
      apply: (state, context, input) => {
        const player = state.players[context.targetId];
        if (!player) return;

        state.bullets.push({
          id: state.nextBulletId++,
          x: player.x,
          y: player.y,
          velocityX: Math.cos(input.angle) * 300,
          velocityY: Math.sin(input.angle) * 300,
          ownerId: context.targetId,
        });
      },
    },

    hit: {
      apply: (state, context, input) => {
        const player = state.players[context.targetId];
        if (!player) return;

        player.health -= input.damage;
        if (player.health <= 0) {
          // Respawn
          player.health = 100;
          player.x = 400;
          player.y = 300;

          // Award point to shooter
          if (input.shooterId && state.players[input.shooterId]) {
            state.players[input.shooterId].score += 1;
          }
        }
      },
    },
  },

  onPlayerJoin: (state, playerId) => {
    const spawnPoints = [
      { x: 100, y: 100 },
      { x: 700, y: 100 },
      { x: 100, y: 500 },
      { x: 700, y: 500 },
    ];
    const index = Object.keys(state.players).length;

    state.players[playerId] = {
      x: spawnPoints[index % 4].x,
      y: spawnPoints[index % 4].y,
      health: 100,
      score: 0,
      rotation: 0,
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  },
});
