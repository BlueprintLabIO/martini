/**
 * Blob Battle - Agar.io-inspired Multiplayer Demo
 *
 * A simple, fun game showcasing WebSocket transport and server-authoritative multiplayer.
 *
 * Game Rules:
 * - Move your blob to eat food and grow
 * - Eat smaller blobs to grow even more
 * - Avoid larger blobs or get eaten!
 * - The largest blob wins
 *
 * Features Demonstrated:
 * - WebSocket transport
 * - Server-authoritative physics (tick action runs on host)
 * - Dynamic player join/leave
 * - Simple collision detection
 * - State synchronization
 */

import { defineGame } from '@martini/core';

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
const BASE_SIZE = 20;
const FOOD_COUNT = 50;
const FOOD_SIZE = 5;
const MOVE_SPEED = 2;
const GROWTH_PER_FOOD = 2;
const GROWTH_FACTOR = 0.5; // When eating another player

interface Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
}

interface Food {
  id: string;
  x: number;
  y: number;
}

interface GameState {
  players: Record<string, Player>;
  food: Food[];
}

function createFood(random): Food[] {
  // Use deterministic random for food positions
  return Array.from({ length: FOOD_COUNT }, (_, i) => ({
    id: `food-init-${i}`,
    x: random.range(0, WORLD_WIDTH),
    y: random.range(0, WORLD_HEIGHT),
  }));
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const blobBattleGame = defineGame({
  setup: ({ playerIds, random }) => ({
    players: Object.fromEntries(
      playerIds.map((id) => {
        // Use deterministic random for player starting positions
        const x = random.range(100, WORLD_WIDTH - 100);
        const y = random.range(100, WORLD_HEIGHT - 100);
        return [
          id,
          {
            x,
            y,
            targetX: x,
            targetY: y,
            size: BASE_SIZE,
          },
        ];
      })
    ),
    food: createFood(random),
  }),

  actions: {
    /**
     * Player moves their blob toward a target position
     */
    move: {
      apply: (state: GameState, context, input: { x: number; y: number }) => {
        const player = state.players[context.targetId];
        if (!player) return;

        // Clamp target to world bounds
        player.targetX = clamp(input.x, 0, WORLD_WIDTH);
        player.targetY = clamp(input.y, 0, WORLD_HEIGHT);
      },
    },

    /**
     * Server-side game tick (physics, collisions, etc.)
     * Only runs on the host
     */
    tick: {
      apply: (state: GameState, context, input: { delta: number }) => {
        // Only host processes game logic
        if (!context.isHost) return;

        const playerIds = Object.keys(state.players);

        // Move players toward their targets
        for (const playerId of playerIds) {
          const player = state.players[playerId];
          if (!player) continue;

          const dx = player.targetX - player.x;
          const dy = player.targetY - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 0) {
            // Speed decreases with size (larger = slower)
            const speed = MOVE_SPEED * (BASE_SIZE / player.size);
            const moveAmount = Math.min(speed, dist);

            player.x += (dx / dist) * moveAmount;
            player.y += (dy / dist) * moveAmount;
          }
        }

        // Check food collisions
        const eatenFood: string[] = [];

        for (const playerId of playerIds) {
          const player = state.players[playerId];
          if (!player) continue;

          for (const food of state.food) {
            const dist = distance(player.x, player.y, food.x, food.y);

            if (dist < player.size / 2 + FOOD_SIZE) {
              // Player ate the food
              player.size += GROWTH_PER_FOOD;
              eatenFood.push(food.id);
            }
          }
        }

        // Remove eaten food
        state.food = state.food.filter((food) => !eatenFood.includes(food.id));

        // Spawn new food to replace eaten food
        const newFoodCount = FOOD_COUNT - state.food.length;
        for (let i = 0; i < newFoodCount; i++) {
          state.food.push({
            id: `food-${Date.now()}-${i}`,
            x: context.random.range(0, WORLD_WIDTH),
            y: context.random.range(0, WORLD_HEIGHT),
          });
        }

        // Check player collisions
        const playersToRemove: string[] = [];

        for (let i = 0; i < playerIds.length; i++) {
          const id1 = playerIds[i];
          const p1 = state.players[id1];
          if (!p1 || playersToRemove.includes(id1)) continue;

          for (let j = i + 1; j < playerIds.length; j++) {
            const id2 = playerIds[j];
            const p2 = state.players[id2];
            if (!p2 || playersToRemove.includes(id2)) continue;

            const dist = distance(p1.x, p1.y, p2.x, p2.y);
            const threshold = (p1.size + p2.size) / 4;

            if (dist < threshold) {
              // Collision detected - larger eats smaller
              if (p1.size > p2.size) {
                // p1 eats p2
                p1.size += p2.size * GROWTH_FACTOR;
                playersToRemove.push(id2);
              } else {
                // p2 eats p1
                p2.size += p1.size * GROWTH_FACTOR;
                playersToRemove.push(id1);
                break; // p1 is dead, stop checking
              }
            }
          }
        }

        // Remove eaten players
        for (const playerId of playersToRemove) {
          delete state.players[playerId];
        }
      },
    },
  },

  onPlayerJoin: (state: GameState, playerId) => {
    // Deterministic position based on current player count
    const playerCount = Object.keys(state.players).length;
    const x = 200 + (playerCount * 400) % WORLD_WIDTH;
    const y = WORLD_HEIGHT / 2;

    state.players[playerId] = {
      x,
      y,
      targetX: x,
      targetY: y,
      size: BASE_SIZE,
    };
  },

  onPlayerLeave: (state: GameState, playerId) => {
    delete state.players[playerId];
  },
});
