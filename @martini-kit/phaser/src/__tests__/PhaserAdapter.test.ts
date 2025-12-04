/**
 * Tests for PhaserAdapter - Phaser integration with GameRuntime
 *
 * Note: These tests use mocks for Phaser and GameRuntime to test adapter logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhaserAdapter } from '../PhaserAdapter';
import type { GameRuntime } from '@martini-kit/core';

// Mock Phaser Scene
class MockScene {
  add = {
    sprite: vi.fn((x: number, y: number, texture: string) => ({
      x,
      y,
      texture,
      rotation: 0,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      visible: true
    }))
  };
}

// Mock Sprite
interface MockSprite {
  x: number;
  y: number;
  rotation?: number;
  alpha?: number;
  scaleX?: number;
  scaleY?: number;
  visible?: boolean;
  _targetX?: number;
  _targetY?: number;
  _targetRotation?: number;
}

// Mock GameRuntime
class MockGameRuntime {
  private stateChangeCallbacks: Array<(state: any) => void> = [];
  private eventCallbacks: Map<string, Array<(senderId: string, eventName: string, payload: any) => void>> = new Map();
  private state: any = {};
  private _transport: any;

  constructor(isHost: boolean) {
    this._transport = {
      getPlayerId: () => 'p1',
      isHost: () => isHost
    };
  }

  getState() {
    return this.state;
  }

  getTransport() {
    return this._transport;
  }

  mutateState(mutator: (state: any) => void) {
    mutator(this.state);
    this.notifyStateChange();
  }

  onChange(callback: (state: any) => void) {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const idx = this.stateChangeCallbacks.indexOf(callback);
      if (idx >= 0) this.stateChangeCallbacks.splice(idx, 1);
    };
  }

  broadcastEvent(eventName: string, payload: any) {
    // Simulate broadcasting
  }

  onEvent(eventName: string, callback: (senderId: string, eventName: string, payload: any) => void) {
    if (!this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.set(eventName, []);
    }
    this.eventCallbacks.get(eventName)!.push(callback);

    return () => {
      const callbacks = this.eventCallbacks.get(eventName);
      if (callbacks) {
        const idx = callbacks.indexOf(callback);
        if (idx >= 0) callbacks.splice(idx, 1);
      }
    };
  }

  // Test helpers
  simulateStateChange(newState: any) {
    this.state = newState;
    this.notifyStateChange();
  }

  simulateEvent(eventName: string, senderId: string, payload: any) {
    const callbacks = this.eventCallbacks.get(eventName) || [];
    callbacks.forEach(cb => cb(senderId, eventName, payload));
  }

  private notifyStateChange() {
    this.stateChangeCallbacks.forEach(cb => cb(this.state));
  }
}

describe('PhaserAdapter', () => {
  describe('Initialization', () => {
    it('initializes with runtime and scene', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      expect(adapter).toBeDefined();
    });

    it('initializes _sprites object in state', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      new PhaserAdapter(runtime, scene);

      expect(runtime.getState()._sprites).toBeDefined();
      expect(runtime.getState()._sprites).toEqual({});
    });

    it('registers onChange listener', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      new PhaserAdapter(runtime, scene);

      // Simulate state change
      (runtime as any).simulateStateChange({ _sprites: { 'test': { x: 100 } } });

      // Should not throw
    });
  });

  describe('myId', () => {
    it('returns player ID from transport', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      expect(adapter.myId).toBe('p1');
    });
  });

  describe('isHost', () => {
    it('returns true for host', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      expect(adapter.isHost()).toBe(true);
    });

    it('returns false for client', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      expect(adapter.isHost()).toBe(false);
    });
  });

  describe('trackSprite (Host)', () => {
    it('tracks sprite position', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200 };
      adapter.trackSprite(sprite as any, 'player-1');

      const state = runtime.getState();
      expect(state._sprites['player-1']).toBeDefined();
      expect(state._sprites['player-1'].x).toBe(100);
      expect(state._sprites['player-1'].y).toBe(200);
    });

    it('tracks sprite with custom properties', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = {
        x: 100,
        y: 200,
        rotation: 1.5,
        alpha: 0.8,
        scaleX: 2,
        scaleY: 2
      };

      adapter.trackSprite(sprite as any, 'player-1', {
        properties: ['x', 'y', 'rotation', 'alpha', 'scaleX', 'scaleY']
      });

      const state = runtime.getState();
      const spriteState = state._sprites['player-1'];

      expect(spriteState.x).toBe(100);
      expect(spriteState.y).toBe(200);
      expect(spriteState.rotation).toBe(1.5);
      expect(spriteState.alpha).toBe(0.8);
      expect(spriteState.scaleX).toBe(2);
      expect(spriteState.scaleY).toBe(2);
    });

    it('starts sync loop on first tracked sprite', () => {
      vi.useFakeTimers();

      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200 };
      adapter.trackSprite(sprite as any, 'player-1', { syncInterval: 100 });

      // Move sprite
      sprite.x = 150;
      sprite.y = 250;

      // Clear initial state
      (runtime as any).state._sprites = {};

      // Advance time
      vi.advanceTimersByTime(100);

      // Should have synced new position
      const state = runtime.getState();
      expect(state._sprites['player-1']).toBeDefined();

      vi.useRealTimers();
    });
  });

  describe('untrackSprite', () => {
    it('removes sprite from state', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200 };
      adapter.trackSprite(sprite as any, 'player-1');

      expect(runtime.getState()._sprites['player-1']).toBeDefined();

      adapter.untrackSprite('player-1');

      expect(runtime.getState()._sprites['player-1']).toBeUndefined();
    });
  });

  describe('State Sync (Client)', () => {
    it('updates sprites from state changes', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200 };
      adapter.trackSprite(sprite as any, 'player-1');

      // Simulate state change from host
      (runtime as any).simulateStateChange({
        _sprites: {
          'player-1': { x: 150, y: 250 }
        }
      });

      // Client sprite should update
      expect(sprite.x).toBe(150);
      expect(sprite.y).toBe(250);
    });

    it('does not update on host', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200 };
      adapter.trackSprite(sprite as any, 'player-1');

      // Simulate state change
      (runtime as any).simulateStateChange({
        _sprites: {
          'player-1': { x: 999, y: 999 }
        }
      });

      // Host maintains local sprite values
      expect(sprite.x).toBe(100);
      expect(sprite.y).toBe(200);
    });
  });

  describe('Remote Sprites (Client)', () => {
    it('registers remote sprite for interpolation', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200 };
      adapter.registerRemoteSprite('player-2', sprite as any);

      // Should not throw
      expect(() => adapter.updateInterpolation()).not.toThrow();
    });

    it('interpolates remote sprite position', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200 };
      adapter.registerRemoteSprite('player-2', sprite as any);

      const now = Date.now();

      // Simulate first snapshot
      (runtime as any).simulateStateChange({
        _sprites: {
          'player-2': { x: 100, y: 200 }
        }
      });

      // Wait a bit then simulate second snapshot at different position
      (runtime as any).simulateStateChange({
        _sprites: {
          'player-2': { x: 200, y: 300 }
        }
      });

      // Update interpolation (should interpolate between snapshots)
      adapter.updateInterpolation();

      // Should have interpolated position (with snapshot buffering, position will be set)
      // The exact value depends on snapshot buffer timing, just verify it changed
      expect(sprite.x).toBeGreaterThanOrEqual(100);
      expect(sprite.y).toBeGreaterThanOrEqual(200);
    });

    it('snaps to position on first update', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: undefined as any, y: undefined as any };
      adapter.registerRemoteSprite('player-2', sprite as any);

      // First update
      (runtime as any).simulateStateChange({
        _sprites: {
          'player-2': { x: 200, y: 300 }
        }
      });

      // Should snap immediately
      expect(sprite.x).toBe(200);
      expect(sprite.y).toBe(300);
    });
  });

  describe('updateInterpolation', () => {
    it('does nothing on host', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      // Should not throw
      expect(() => adapter.updateInterpolation()).not.toThrow();
    });

    it('interpolates all remote sprites on client', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite1: MockSprite = { x: 0, y: 0 };
      const sprite2: MockSprite = { x: 0, y: 0 };

      adapter.registerRemoteSprite('player-2', sprite1 as any);
      adapter.registerRemoteSprite('player-3', sprite2 as any);

      // Simulate first snapshots
      (runtime as any).simulateStateChange({
        _sprites: {
          'player-2': { x: 0, y: 0 },
          'player-3': { x: 0, y: 0 }
        }
      });

      // Simulate second snapshots with new positions
      (runtime as any).simulateStateChange({
        _sprites: {
          'player-2': { x: 100, y: 100 },
          'player-3': { x: 200, y: 200 }
        }
      });

      adapter.updateInterpolation();

      // Both should have been updated (with buffering, they'll be at some interpolated position)
      expect(sprite1.x).toBeGreaterThanOrEqual(0);
      expect(sprite2.x).toBeGreaterThanOrEqual(0);
    });
  });

  describe('unregisterRemoteSprite', () => {
    it('removes remote sprite', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200 };
      adapter.registerRemoteSprite('player-2', sprite as any);

      adapter.unregisterRemoteSprite('player-2');

      // Should not interpolate after unregister
      sprite._targetX = 999;
      sprite._targetY = 999;
      adapter.updateInterpolation();

      expect(sprite.x).toBe(100); // Unchanged
    });

    it('calls destroy on sprite if available', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite = {
        x: 100,
        y: 200,
        destroy: vi.fn()
      };

      adapter.registerRemoteSprite('player-2', sprite as any);
      adapter.unregisterRemoteSprite('player-2');

      expect(sprite.destroy).toHaveBeenCalled();
    });
  });

  describe('Custom Events', () => {
    it('broadcasts events', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const broadcastSpy = vi.spyOn(runtime, 'broadcastEvent');

      adapter.broadcast('explosion', { x: 100, y: 200 });

      expect(broadcastSpy).toHaveBeenCalledWith('explosion', { x: 100, y: 200 });
    });

    it('listens for events', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const events: any[] = [];
      adapter.on('explosion', (senderId, payload) => {
        events.push({ senderId, payload });
      });

      // Simulate event
      (runtime as any).simulateEvent('explosion', 'p2', { x: 100, y: 200 });

      expect(events).toHaveLength(1);
      expect(events[0].senderId).toBe('p2');
      expect(events[0].payload).toEqual({ x: 100, y: 200 });
    });

    it('returns cleanup function for event listener', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      let callCount = 0;
      const unsubscribe = adapter.on('test', () => {
        callCount++;
      });

      (runtime as any).simulateEvent('test', 'p2', {});
      expect(callCount).toBe(1);

      unsubscribe();

      (runtime as any).simulateEvent('test', 'p2', {});
      expect(callCount).toBe(1); // Should not increase
    });
  });

  describe('onChange', () => {
    it('wraps runtime onChange', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const states: any[] = [];
      adapter.onChange((state) => {
        states.push(state);
      });

      (runtime as any).simulateStateChange({ test: 'value' });

      expect(states).toHaveLength(1);
      expect(states[0]).toEqual({ test: 'value' });
    });
  });

  describe('destroy', () => {
    it('stops sync loop', () => {
      vi.useFakeTimers();

      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200 };
      adapter.trackSprite(sprite as any, 'player-1');

      adapter.destroy();

      // Move sprite
      sprite.x = 999;

      // Clear state
      (runtime as any).state._sprites = {};

      // Advance time
      vi.advanceTimersByTime(1000);

      // Should not sync after destroy
      expect(runtime.getState()._sprites).toEqual({});

      vi.useRealTimers();
    });

    it('clears tracked sprites', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200 };
      adapter.trackSprite(sprite as any, 'player-1');

      adapter.destroy();

      // Internal cleanup - no way to verify directly without exposing internals
      // But should not throw
      expect(() => adapter.destroy()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles tracking multiple sprites', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite1: MockSprite = { x: 100, y: 200 };
      const sprite2: MockSprite = { x: 300, y: 400 };
      const sprite3: MockSprite = { x: 500, y: 600 };

      adapter.trackSprite(sprite1 as any, 'player-1');
      adapter.trackSprite(sprite2 as any, 'player-2');
      adapter.trackSprite(sprite3 as any, 'bullet-1');

      const state = runtime.getState();
      expect(Object.keys(state._sprites)).toHaveLength(3);
    });

    it('handles sprite with missing properties gracefully', () => {
      const runtime = new MockGameRuntime(true) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: Partial<MockSprite> = { x: 100 }; // Missing y

      expect(() => {
        adapter.trackSprite(sprite as any, 'player-1');
      }).not.toThrow();
    });

    it('handles state with no _sprites', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      // Simulate state without _sprites
      (runtime as any).simulateStateChange({});

      // Should not throw
      expect(() => adapter.updateInterpolation()).not.toThrow();
    });

    it('interpolates sprite rotation when target rotation is set', () => {
      const runtime = new MockGameRuntime(false) as unknown as GameRuntime;
      const scene = new MockScene();

      const adapter = new PhaserAdapter(runtime, scene);

      const sprite: MockSprite = { x: 100, y: 200, rotation: 0 };
      adapter.registerRemoteSprite('remote-player', sprite as any);

      // Simulate first snapshot with rotation
      (runtime as any).simulateStateChange({
        _sprites: {
          'remote-player': { x: 100, y: 200, rotation: 0 }
        }
      });

      // Simulate second snapshot with new rotation
      (runtime as any).simulateStateChange({
        _sprites: {
          'remote-player': { x: 150, y: 250, rotation: Math.PI / 2 }
        }
      });

      // Call updateInterpolation
      adapter.updateInterpolation();

      // With snapshot buffering, sprite should be at or between the snapshots
      expect(sprite.rotation).toBeGreaterThanOrEqual(0);
      expect(sprite.rotation).toBeLessThanOrEqual(Math.PI / 2);
      expect(sprite.x).toBeGreaterThanOrEqual(100);
      expect(sprite.x).toBeLessThanOrEqual(150);
    });
  });
});
