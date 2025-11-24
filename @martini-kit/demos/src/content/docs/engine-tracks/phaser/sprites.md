---
title: "Sprite Management"
description: Managing sprite lifecycle and shapes in Phaser
section: engine-tracks
subsection: phaser
order: 2
scope: phaser
---

# Sprite Management

Real games have entities that spawn and despawn. Use `SpriteManager` for automatic lifecycle handling.

## Sprite Lifecycle Management

### Enemy Spawning Example

```typescript
// game.ts - Add enemies to state
export const game = defineGame({
  setup: ({ playerIds }) => ({
    players: createPlayers(playerIds),
    enemies: {} as Record<string, { x: number; y: number; health: number }>,
    inputs: {}
  }),

  actions: {
    spawnEnemy: {
      apply(state, context) {
        const id = `enemy-${Date.now()}`;
        state.enemies[id] = {
          x: context.random.range(50, 750),
          y: context.random.range(50, 550),
          health: 100
        };
      }
    },

    killEnemy: {
      apply(state, context, { enemyId }: { enemyId: string }) {
        delete state.enemies[enemyId];
      }
    }
  }
});
```

```typescript
// scene.ts - Automatic sprite creation/destruction
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  const enemyManager = this.adapter.createSpriteManager({
    stateKey: 'enemies',

    // HOST: Create enemy with physics
    onCreatePhysics: (scene, id, data) => {
      const enemy = scene.physics.add.sprite(data.x, data.y, 'enemy');
      enemy.setCollideWorldBounds(true);
      return enemy;
    },

    // CLIENT: Create visual enemy
    onCreate: (scene, id, data) => {
      return scene.add.sprite(data.x, data.y, 'enemy');
    },

    // Both host and client: Update sprite properties
    onUpdate: (sprite, data) => {
      // Example: Change tint based on health
      if (data.health < 30) {
        sprite.setTint(0xff0000);
      }
    },

    // Both host and client: Cleanup
    onDestroy: (sprite) => {
      sprite.destroy();
    }
  });
}
```

**What SpriteManager does:**
- Detects when `state.enemies[id]` is added → calls `onCreate` or `onCreatePhysics`
- Calls `onUpdate` every frame for existing sprites
- Detects when `state.enemies[id]` is deleted → calls `onDestroy`
- Handles host vs client creation automatically

---

## Shape-Based Games

Not all games need texture assets. Shapes are perfect for prototypes, web IDEs, and minimalist games.

### Creating Shape Sprites

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  if (this.adapter.isHost()) {
    // HOST: Rectangle with physics
    const rect = this.add.rectangle(100, 100, 32, 32, 0xff0000);
    this.physics.add.existing(rect);

    const body = rect.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setVelocity(100, 0);

    this.adapter.trackSprite(rect, `player-${playerId}`);

  } else {
    // CLIENT: Rectangle without physics
    this.adapter.onChange((state) => {
      if (!state._sprites) return;

      for (const [key, data] of Object.entries(state._sprites)) {
        if (!this.remoteSprites.has(key)) {
          const rect = this.add.rectangle(
            data.x,
            data.y,
            32,
            32,
            0xff0000
          );
          this.adapter.registerRemoteSprite(key, rect);
          this.remoteSprites.set(key, rect);
        }
      }
    });
  }
}
```

### Available Shapes

All work with `trackSprite()` and `registerRemoteSprite()`:

```typescript
// Rectangles
const rect = this.add.rectangle(x, y, width, height, color);

// Circles
const circle = this.add.circle(x, y, radius, color);

// Ellipses
const ellipse = this.add.ellipse(x, y, width, height, color);

// Polygons
const triangle = this.add.triangle(x, y, x1, y1, x2, y2, x3, y3, color);

// Graphics (for complex shapes)
const graphics = this.add.graphics();
graphics.fillStyle(0xff0000);
graphics.fillRect(0, 0, 32, 32);
```

**Add physics to any shape:**
```typescript
this.physics.add.existing(shape);
const body = shape.body as Phaser.Physics.Arcade.Body;
```
