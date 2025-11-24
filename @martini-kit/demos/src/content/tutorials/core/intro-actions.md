---
title: State & Actions (Core Intro)
description: Define game state and a simple input action to move a player.
track: core
category: Basics
order: 1
config: core-intro
validator: core-intro
hints:
  - Use defineGame with setup returning players and inputs.
  - createInputAction stores client input in state.inputs.
  - Move players on the host by reading state.inputs in onTick.
solutionFiles:
  /src/game.ts: |
    import { defineGame, createInputAction } from '@martini-kit/core';

    type Input = { x?: number; y?: number };

    export const game = defineGame({
      setup: ({ playerIds }) => ({
        players: Object.fromEntries(
          playerIds.map((id, index) => [id, { x: 200 + index * 200, y: 300 }])
        ),
        inputs: {} as Record<string, Input>
      }),

      actions: {
        move: createInputAction('inputs')
      },

      onTick: (state, context) => {
        // Only host applies movement
        if (!context.isHost) return;

        for (const [playerId, input] of Object.entries(state.inputs)) {
          const player = state.players[playerId];
          if (!player) continue;

          const speed = 4;
          player.x += (input.x ?? 0) * speed;
          player.y += (input.y ?? 0) * speed;

          // Clamp to viewport
          player.x = Math.max(32, Math.min(768, player.x));
          player.y = Math.max(32, Math.min(568, player.y));
        }
      }
    });
  /src/scene.ts: |
    import Phaser from 'phaser';
    import type { GameRuntime } from '@martini-kit/core';
    import { PhaserAdapter } from '@martini-kit/phaser';

    export function createScene(runtime: GameRuntime<any>) {
      return class IntroScene extends Phaser.Scene {
        adapter!: PhaserAdapter;
        inputManager: any;
        sprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();

        create() {
          this.adapter = new PhaserAdapter(runtime, this);
          this.cameras.main.setBackgroundColor('#0b1021');

          this.inputManager = this.adapter.createInputManager();
          this.inputManager.bindKeys({
            W: { action: 'move', input: { y: -1 }, mode: 'continuous' },
            S: { action: 'move', input: { y: 1 }, mode: 'continuous' },
            A: { action: 'move', input: { x: -1 }, mode: 'continuous' },
            D: { action: 'move', input: { x: 1 }, mode: 'continuous' }
          });
        }

        update() {
          const state = runtime.getState() as any;

          // Create or update sprites from state
          for (const [playerId, player] of Object.entries(state.players ?? {})) {
            if (!this.sprites.has(playerId)) {
              const color = this.adapter.isHost() ? 0x4ade80 : 0x60a5fa;
              const rect = this.add.rectangle(player.x, player.y, 32, 32, color);
              this.sprites.set(playerId, rect);
            }
            const sprite = this.sprites.get(playerId)!;
            sprite.setPosition(player.x, player.y);
          }

          // Remove sprites for players that left
          for (const key of Array.from(this.sprites.keys())) {
            if (!state.players?.[key]) {
              this.sprites.get(key)?.destroy();
              this.sprites.delete(key);
            }
          }

          // Capture input (host/client)
          this.inputManager?.update();
        }
      };
    }
  /src/main.ts: |
    import { initializeGame } from '@martini-kit/phaser';
    import { game } from './game';
    import { createScene } from './scene';

    initializeGame({
      game,
      scene: createScene,
      phaserConfig: {
        width: 800,
        height: 600,
        backgroundColor: '#0f172a',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
          }
        }
      }
    });
---

# State & Actions (Core Intro)

In this lesson you'll set up a minimal martini-kit game:

- Define state for two players.
- Capture player input with `createInputAction`.
- Apply movement on the host in `onTick`.
- Render squares in Phaser that follow state.

## Your tasks
1. Add an `inputs` action using `createInputAction('inputs')`.
2. In `onTick`, move players based on `state.inputs` (dx/dy) and clamp positions.
3. Make sure movement only happens on the host.

## What to watch for
- Clients should only submit actions; the host applies movement.
- State should be deterministic (no Math.random in movement).

## Need a hint?
- Look for `// TODO` comments in `game.ts`.
- The scene already reads positions from state; you only need to keep state updated.
