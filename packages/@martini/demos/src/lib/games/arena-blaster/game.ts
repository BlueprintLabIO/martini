/**
 * Arena Blaster - Top-Down Shooter Demo
 *
 * A fast-paced multiplayer arena shooter where 2 players
 * compete to eliminate each other. Features continuous 360° rotation,
 * bullet physics, and health management.
 */

import { defineGame } from '@martini/core';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const WALL_THICKNESS = 20;

export const arenaBlasterGame = defineGame({
  setup: ({ playerIds }) => {
    const spawnPoints = [
      { x: 100, y: 100 },
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
            rotation: 0, // Radians, facing direction
            isInvulnerable: false,
            invulnerabilityTimer: 0, // ms remaining
          },
        ])
      ),
      bullets: [] as Array<{
        id: number;
        x: number;
        y: number;
        velocityX: number;
        velocityY: number;
        ownerId: string;
        lifetime: number; // ms remaining
      }>,
      inputs: {} as Record<string, {
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
        shoot: boolean;
      }>,
      shootCooldowns: {} as Record<string, number>, // ms until next shot
      nextBulletId: 0,
      winner: null as string | null,
      gameOver: false,
    };
  },

  actions: {
    move: {
      apply: (state, context, input) => {
        if (!state.inputs) state.inputs = {};

        // Store the full input including shoot button
        state.inputs[context.targetId] = {
          left: input.left || false,
          right: input.right || false,
          up: input.up || false,
          down: input.down || false,
          shoot: input.shoot || false,
        };

        // Calculate rotation from movement direction (continuous 360°)
        const player = state.players[context.targetId];
        if (!player) return;

        const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

        // Update rotation if moving
        if (dx !== 0 || dy !== 0) {
          player.rotation = Math.atan2(dy, dx);
        }
      },
    },

    shoot: {
      apply: (state, context) => {
        console.log('[shoot action] Called for', context.targetId);

        const player = state.players[context.targetId];
        if (!player) {
          console.log('[shoot action] No player found');
          return;
        }
        if (state.gameOver) {
          console.log('[shoot action] Game over');
          return;
        }

        // Check cooldown
        const cooldown = state.shootCooldowns[context.targetId] || 0;
        if (cooldown > 0) {
          console.log('[shoot action] On cooldown:', cooldown);
          return;
        }

        // Create bullet
        const BULLET_SPEED = 400;
        console.log('[shoot action] Creating bullet at', player.x, player.y, 'rotation', player.rotation);
        state.bullets.push({
          id: state.nextBulletId++,
          x: player.x,
          y: player.y,
          velocityX: Math.cos(player.rotation) * BULLET_SPEED,
          velocityY: Math.sin(player.rotation) * BULLET_SPEED,
          ownerId: context.targetId,
          lifetime: 2000, // 2 seconds
        });

        console.log('[shoot action] Bullet created, total bullets:', state.bullets.length);

        // Set cooldown (500ms)
        state.shootCooldowns[context.targetId] = 500;
      },
    },

    hit: {
      apply: (state, context, input) => {
        const player = state.players[context.targetId];
        if (!player) return;
        if (player.isInvulnerable) return;

        const { damage, shooterId } = input;

        // Apply damage
        player.health -= damage;

        // Check for elimination
        if (player.health <= 0) {
          // Award point to shooter
          if (shooterId && state.players[shooterId]) {
            state.players[shooterId].score += 1;

            // Check win condition (first to 5)
            if (state.players[shooterId].score >= 5) {
              state.winner = shooterId;
              state.gameOver = true;
            }
          }

          // Respawn player at their starting position
          const spawnPoints = [
            { x: 100, y: 100 },
            { x: 700, y: 500 },
          ];
          const playerIds = Object.keys(state.players);
          const playerIndex = playerIds.indexOf(context.targetId);

          player.health = 100;
          player.x = spawnPoints[playerIndex]?.x || 400;
          player.y = spawnPoints[playerIndex]?.y || 300;
          player.isInvulnerable = true;
          player.invulnerabilityTimer = 1000; // 1 second
        }
      },
    },

    reset: {
      apply: (state) => {
        // Reset scores and game state
        for (const playerId of Object.keys(state.players)) {
          state.players[playerId].score = 0;
          state.players[playerId].health = 100;
          state.players[playerId].isInvulnerable = false;
          state.players[playerId].invulnerabilityTimer = 0;
        }

        // Reset players to starting positions
        const spawnPoints = [
          { x: 100, y: 100 },
          { x: 700, y: 500 },
        ];
        const playerIds = Object.keys(state.players);
        playerIds.forEach((playerId, index) => {
          state.players[playerId].x = spawnPoints[index].x;
          state.players[playerId].y = spawnPoints[index].y;
          state.players[playerId].rotation = 0;
        });

        // Clear bullets
        state.bullets = [];
        state.shootCooldowns = {};
        state.winner = null;
        state.gameOver = false;
      },
    },
  },

  onPlayerJoin: (state, playerId) => {
    const spawnPoints = [
      { x: 100, y: 100 },
      { x: 700, y: 500 },
    ];
    const index = Object.keys(state.players).length;

    state.players[playerId] = {
      x: spawnPoints[index % 2].x,
      y: spawnPoints[index % 2].y,
      health: 100,
      score: 0,
      rotation: 0,
      isInvulnerable: false,
      invulnerabilityTimer: 0,
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  },
});
