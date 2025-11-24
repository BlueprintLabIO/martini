---
title: "Phaser Integration"
description: Core concepts for integrating Phaser 3 with martini-kit
section: engine-tracks
subsection: phaser
order: 1
scope: phaser
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
</script>

# Phaser Integration

This guide teaches you how to properly integrate Phaser 3 with martini-kit's host-authoritative multiplayer model. You'll learn the critical patterns that make multiplayer Phaser games work correctly.

## The Core Principle

**martini-kit is host-authoritative.** One player (the host) runs the actual game logic and physics. Other players (clients) receive state updates and mirror what's happening on the host.

This means:
- **Host**: Creates physics sprites, runs collisions, applies game logic
- **Clients**: Create visual-only sprites, interpolate movement, display state

<Callout type="warning" title="Critical Rule">

The #1 beginner mistake is creating physics sprites on clients. This causes state desyncs, duplicate physics calculations, and broken gameplay.

**Always check `adapter.isHost()` before creating physics objects.**

</Callout>

---

## Host vs Client Pattern

This pattern appears in every martini-kit game. Master it and you'll avoid 90% of multiplayer bugs.

### The Pattern

```typescript
import { PhaserAdapter } from '@martini-kit/phaser';

class GameScene extends Phaser.Scene {
  adapter!: PhaserAdapter;
  remoteSprites = new Map<string, Phaser.GameObjects.Sprite>();

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    if (this.adapter.isHost()) {
      this.createHostSprites();
    } else {
      this.createClientSprites();
    }
  }

  createHostSprites() {
    // HOST: Create physics sprites
    const state = this.adapter.getState();

    for (const [playerId, playerData] of Object.entries(state.players)) {
      const sprite = this.physics.add.sprite(
        playerData.x,
        playerData.y,
        'player'
      );

      sprite.setCollideWorldBounds(true);
      sprite.setBounce(0.2);

      // Track sprite for automatic syncing
      this.adapter.trackSprite(sprite, `player-${playerId}`);
    }
  }

  createClientSprites() {
    // CLIENT: Create visual sprites from state updates
    this.adapter.onChange((state) => {
      if (!state._sprites) return; // Critical check

      for (const [key, data] of Object.entries(state._sprites)) {
        if (!this.remoteSprites.has(key)) {
          const sprite = this.add.sprite(data.x, data.y, 'player');

          // Register for interpolation
          this.adapter.registerRemoteSprite(key, sprite);
          this.remoteSprites.set(key, sprite);
        }
      }
    });
  }

  update() {
    // CLIENT: Apply interpolation for smooth movement
    if (!this.adapter.isHost()) {
      this.adapter.updateInterpolation();
    }
  }
}
```

### Why This Works

1. **Host creates `this.physics.add.sprite()`** - Gets a physics body that can move, collide, and respond to forces
2. **Host calls `trackSprite()`** - Automatically syncs position, rotation, velocity to state
3. **Client creates `this.add.sprite()`** - Visual-only sprite with no physics body
4. **Client calls `registerRemoteSprite()`** - Registers sprite for smooth interpolation
5. **Client calls `updateInterpolation()`** - Smoothly moves sprites to match host state
