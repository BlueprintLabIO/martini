/**
 * Tests for Blob Battle game logic
 *
 * Blob Battle is an Agar.io-inspired demo showcasing:
 * - WebSocket transport
 * - Server-authoritative multiplayer
 * - Dynamic join/leave
 * - Simple, fun gameplay
 */

import { describe, it, expect } from 'vitest';
import { blobBattleGame } from './game';

describe('Blob Battle Game', () => {
  describe('Setup', () => {
    it('creates initial state with players', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1', 'p2'] });

      expect(state.players).toHaveProperty('p1');
      expect(state.players).toHaveProperty('p2');
      expect(Object.keys(state.players)).toHaveLength(2);
    });

    it('initializes players with random positions', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1', 'p2'] });

      expect(state.players.p1.x).toBeGreaterThanOrEqual(0);
      expect(state.players.p1.x).toBeLessThanOrEqual(800);
      expect(state.players.p1.y).toBeGreaterThanOrEqual(0);
      expect(state.players.p1.y).toBeLessThanOrEqual(600);
    });

    it('initializes players with base size', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });

      expect(state.players.p1.size).toBe(20);
    });

    it('creates food pellets', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });

      expect(state.food).toBeDefined();
      expect(state.food.length).toBeGreaterThan(0);
    });

    it('initializes food with random positions', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });

      const food = state.food[0];
      expect(food.x).toBeGreaterThanOrEqual(0);
      expect(food.x).toBeLessThanOrEqual(800);
      expect(food.y).toBeGreaterThanOrEqual(0);
      expect(food.y).toBeLessThanOrEqual(600);
    });
  });

  describe('Player Join', () => {
    it('adds new player to game', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });

      blobBattleGame.onPlayerJoin!(state, 'p2');

      expect(state.players).toHaveProperty('p2');
      expect(Object.keys(state.players)).toHaveLength(2);
    });

    it('initializes new player with random position', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });

      blobBattleGame.onPlayerJoin!(state, 'p2');

      expect(state.players.p2.x).toBeGreaterThanOrEqual(0);
      expect(state.players.p2.y).toBeGreaterThanOrEqual(0);
    });

    it('initializes new player with base size', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });

      blobBattleGame.onPlayerJoin!(state, 'p2');

      expect(state.players.p2.size).toBe(20);
    });
  });

  describe('Player Leave', () => {
    it('removes player from game', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1', 'p2'] });

      blobBattleGame.onPlayerLeave!(state, 'p2');

      expect(state.players).not.toHaveProperty('p2');
      expect(Object.keys(state.players)).toHaveLength(1);
    });
  });

  describe('Move Action', () => {
    it('updates player position based on input', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });
      const initialX = state.players.p1.x;

      blobBattleGame.actions.move.apply(state, { targetId: 'p1' } as any, {
        x: initialX + 10,
        y: state.players.p1.y,
      });

      expect(state.players.p1.targetX).toBe(initialX + 10);
    });

    it('clamps position to world bounds', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });

      blobBattleGame.actions.move.apply(state, { targetId: 'p1' } as any, {
        x: 1000, // Beyond world width (800)
        y: -100, // Below world height
      });

      expect(state.players.p1.targetX).toBeLessThanOrEqual(800);
      expect(state.players.p1.targetY).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Tick Action', () => {
    it('moves players toward target position', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });
      const initialX = state.players.p1.x;

      state.players.p1.targetX = initialX + 100;
      state.players.p1.targetY = state.players.p1.y;

      blobBattleGame.actions.tick!.apply(state, { isHost: true } as any, {
        delta: 16,
      });

      // Player should have moved toward target
      expect(state.players.p1.x).toBeGreaterThan(initialX);
      expect(state.players.p1.x).toBeLessThan(initialX + 100);
    });

    it('detects food collision and grows player', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });

      // Place food at player position
      state.food = [{ id: 'f1', x: state.players.p1.x, y: state.players.p1.y }];
      const initialSize = state.players.p1.size;

      blobBattleGame.actions.tick!.apply(state, { isHost: true } as any, {
        delta: 16,
      });

      // Player should have eaten food and grown
      expect(state.players.p1.size).toBeGreaterThan(initialSize);
      expect(state.food).not.toContainEqual({ id: 'f1', x: expect.any(Number), y: expect.any(Number) });
    });

    it('spawns new food to replace eaten food', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });

      // Place food at player position
      const initialFoodCount = state.food.length;
      state.food = [{ id: 'f1', x: state.players.p1.x, y: state.players.p1.y }];

      blobBattleGame.actions.tick!.apply(state, { isHost: true } as any, {
        delta: 16,
      });

      // New food should have been spawned
      expect(state.food.length).toBeGreaterThanOrEqual(1);
    });

    it('detects player collision (larger eats smaller)', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1', 'p2'] });

      // Make p1 larger
      state.players.p1.size = 50;
      state.players.p2.size = 20;

      // Place p2 at p1's position
      state.players.p2.x = state.players.p1.x;
      state.players.p2.y = state.players.p1.y;

      blobBattleGame.actions.tick!.apply(state, { isHost: true } as any, {
        delta: 16,
      });

      // p1 should have eaten p2
      expect(state.players.p1.size).toBeGreaterThan(50);
      expect(state.players).not.toHaveProperty('p2');
    });

    it('does not allow smaller player to eat larger player', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1', 'p2'] });

      // Make p2 larger
      state.players.p1.size = 20;
      state.players.p2.size = 50;

      // Place them at same position
      state.players.p2.x = state.players.p1.x;
      state.players.p2.y = state.players.p1.y;

      const p1SizeBefore = state.players.p1.size;

      blobBattleGame.actions.tick!.apply(state, { isHost: true } as any, {
        delta: 16,
      });

      // p1 should have been eaten (not grown)
      expect(state.players).not.toHaveProperty('p1');
      expect(state.players.p2.size).toBeGreaterThan(50);
    });

    it('only runs on host', () => {
      const state = blobBattleGame.setup({ playerIds: ['p1'] });
      const initialX = state.players.p1.x;

      state.players.p1.targetX = initialX + 100;

      // Non-host should not process tick
      blobBattleGame.actions.tick!.apply(state, { isHost: false } as any, {
        delta: 16,
      });

      expect(state.players.p1.x).toBe(initialX);
    });
  });
});
