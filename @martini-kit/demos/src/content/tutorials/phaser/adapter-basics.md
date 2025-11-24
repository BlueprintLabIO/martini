---
title: Phaser Adapter Basics
description: Wire up PhaserAdapter and sync sprites from martini-kit state.
track: phaser
category: Setup
order: 1
config: phaser-adapter-basics
validator: phaser-adapter-basics
hints:
  - Use PhaserAdapter in the scene and check adapter.isHost() before creating physics bodies.
  - SpriteManager maps state.players entries to Phaser sprites automatically.
  - Keep clients render-only; host owns physics.
solution: |
  - Initialize PhaserAdapter in create().
  - Create SpriteManager with stateKey 'players'.
  - On host only, set velocities from inputs in update(); clients skip physics changes.
---

# Phaser Adapter Basics

In this lesson you'll connect the martini state to Phaser rendering:

- Initialize `PhaserAdapter`.
- Sync player sprites from state with `SpriteManager`.
- Apply velocity from inputs on the host only.

## Your tasks
1) Create a `PhaserAdapter` in `create()` and keep a reference.
2) Use `createSpriteManager` to sync `state.players` to sprites.
3) In `update()`, set velocity from `state.inputs` **only on the host**.

## Need a hint?
- Check `scene.ts` for `// TODO` markers.
- The game already stores inputs in state; you just need to drive sprites from them.
