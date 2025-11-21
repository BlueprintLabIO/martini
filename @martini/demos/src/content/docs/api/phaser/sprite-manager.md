---
title: SpriteManager
description: Automatic sprite synchronization and lifecycle management
---

# SpriteManager

`SpriteManager` automatically handles sprite creation, physics setup, and synchronization between host and clients. It eliminates boilerplate code for managing sprite lifecycles in multiplayer games.

## Quick Start

```typescript
// Create sprite manager
const playerManager = adapter.createSpriteManager({
  onCreate: (key, data) => {
    return this.add.sprite(data.x, data.y, 'player');
  },
  onCreatePhysics: (sprite) => {
    this.physics.add.existing(sprite);
    sprite.body.setCollideWorldBounds(true);
  }
});

// Add sprites (host only)
if (adapter.isHost()) {
  playerManager.add('player-1', { x: 100, y: 100 });
  playerManager.add('player-2', { x: 700, y: 100 });
}

// Sprites automatically appear on clients!
```

## API Reference

```typescript
interface SpriteManager<TData extends SpriteData> {
  // Properties
  readonly namespace: string;
  readonly group: Phaser.GameObjects.Group;

  // Methods
  add(key: string, data: TData): Phaser.GameObjects.Sprite;
  remove(key: string): void;
  get(key: string): Phaser.GameObjects.Sprite | undefined;
  has(key: string): boolean;
  getAllSprites(): Map<string, Phaser.GameObjects.Sprite>;
  destroy(): void;
}

interface SpriteManagerConfig<TData> {
  onCreate: (key: string, data: TData) => Phaser.GameObjects.Sprite;
  onCreatePhysics?: (sprite: any, key: string, data: TData) => void;
  onUpdate?: (sprite: any, data: TData) => void;
  onDestroy?: (sprite: any, key: string) => void;
  onAdd?: (sprite: any, key: string, data: TData, context: AddContext) => void;
  staticProperties?: string[];
  sync?: SyncConfig;
  label?: LabelConfig;
  namespace?: string;
}
```

## Creating a SpriteManager

```typescript
const manager = adapter.createSpriteManager<PlayerData>({
  onCreate: (key, data) => Phaser.GameObjects.Sprite,
  // ... other options
});
```

### onCreate (Required)

Factory function to create sprites. Called on **both host and clients**.

```typescript
onCreate: (key: string, data: TData) => Phaser.GameObjects.Sprite
```

**Example:**

```typescript
const manager = adapter.createSpriteManager({
  onCreate: (key, data) => {
    const sprite = this.add.sprite(data.x, data.y, data.texture);
    sprite.setTint(data.color);
    return sprite;
  }
});
```

### onCreatePhysics (Optional)

Setup physics bodies. **HOST ONLY** - automatically skipped on clients.

```typescript
onCreatePhysics?: (sprite: any, key: string, data: TData) => void
```

**Example:**

```typescript
const manager = adapter.createSpriteManager({
  onCreate: (key, data) => this.add.sprite(data.x, data.y, 'player'),

  onCreatePhysics: (sprite, key, data) => {
    // Enable physics
    this.physics.add.existing(sprite);

    // Configure physics body
    sprite.body.setCollideWorldBounds(true);
    sprite.body.setBounce(0.2);
    sprite.body.setGravityY(300);

    // Add colliders
    this.physics.add.collider(sprite, this.platforms);
  }
});
```

### onUpdate (Optional)

Update sprite properties when data changes. **Clients only**.

```typescript
onUpdate?: (sprite: any, data: TData) => void
```

**Example:**

```typescript
interface PlayerData extends SpriteData {
  x: number;
  y: number;
  color: number;
  health: number;
}

const manager = adapter.createSpriteManager<PlayerData>({
  onCreate: (key, data) => this.add.sprite(data.x, data.y, 'player'),

  onUpdate: (sprite, data) => {
    // Update color based on health
    if (data.health < 30) {
      sprite.setTint(0xff0000);  // Red when low health
    } else {
      sprite.setTint(data.color);
    }

    // Update scale
    sprite.setScale(data.health / 100);
  }
});
```

### onDestroy (Optional)

Cleanup when sprite is removed.

```typescript
onDestroy?: (sprite: any, key: string) => void
```

**Example:**

```typescript
const manager = adapter.createSpriteManager({
  onCreate: (key, data) => {
    const sprite = this.add.sprite(data.x, data.y, 'player');

    // Attach particle emitter
    sprite.particles = this.add.particles(sprite.x, sprite.y, 'particle');
    sprite.particles.startFollow(sprite);

    return sprite;
  },

  onDestroy: (sprite, key) => {
    // Clean up particles
    if (sprite.particles) {
      sprite.particles.destroy();
    }

    console.log(`${key} was removed`);
  }
});
```

### onAdd (Optional)

Called after sprite is fully created and ready. Fires for both initial and late-joining sprites.

```typescript
onAdd?: (sprite: any, key: string, data: TData, context: AddContext) => void

interface AddContext {
  manager: SpriteManager;
  allSprites: Map<string, any>;
}
```

**Use cases:**
- Inter-sprite setup
- Collision detection between specific sprites
- Attaching effects that depend on other sprites

**Example:**

```typescript
const manager = adapter.createSpriteManager({
  onCreate: (key, data) => this.add.sprite(data.x, data.y, 'player'),

  onAdd: (sprite, key, data, { allSprites }) => {
    // Add collision with boss (if it exists)
    if (this.boss) {
      this.physics.add.collider(sprite, this.boss, () => {
        console.log(`${key} hit boss!`);
      });
    }

    // Add collision with all existing players
    for (const [otherKey, otherSprite] of allSprites) {
      if (otherKey !== key) {
        this.physics.add.collider(sprite, otherSprite);
      }
    }

    console.log(`${key} joined! Now ${allSprites.size} players`);
  }
});
```

### sync (Optional)

Configure automatic property synchronization.

```typescript
sync?: {
  properties?: string[];        // Default: ['x', 'y', 'rotation', 'alpha']
  direction?: 'toState' | 'toSprite';  // Default: 'toState'
  interval?: number;             // Default: 50ms (20 FPS)
}
```

**Example:**

```typescript
// Default: Sync sprite → state (physics-driven)
const manager = adapter.createSpriteManager({
  onCreate: (key, data) => this.add.sprite(data.x, data.y, 'player'),

  sync: {
    properties: ['x', 'y', 'rotation', 'alpha', 'scaleX', 'scaleY'],
    interval: 33  // 30 FPS
  }
});

// Rare: State → sprite (state-driven, use StateDrivenSpawner instead)
sync: {
  properties: ['x', 'y'],
  direction: 'toSprite'
}
```

### staticProperties (Optional)

Properties that sync once and don't change.

```typescript
staticProperties?: string[]
```

**Example:**

```typescript
interface PlayerData extends SpriteData {
  x: number;
  y: number;
  role: 'fire' | 'ice';  // Static
  color: number;         // Static
  name: string;          // Static
}

const manager = adapter.createSpriteManager<PlayerData>({
  onCreate: (key, data) => {
    const sprite = this.add.sprite(data.x, data.y, `player-${data.role}`);
    sprite.setTint(data.color);
    return sprite;
  },

  staticProperties: ['role', 'color', 'name']
  // These are sent once, not every sync interval
});
```

### label (Optional)

Automatically render text labels above sprites.

```typescript
label?: {
  getText: (data: TData) => string;
  offset?: { x?: number; y?: number };
  style?: Phaser.Types.GameObjects.Text.TextStyle;
}
```

**Example:**

```typescript
const manager = adapter.createSpriteManager<PlayerData>({
  onCreate: (key, data) => this.add.sprite(data.x, data.y, 'player'),

  label: {
    getText: (data) => `${data.name}\nHP: ${data.health}`,
    offset: { x: 0, y: -40 },
    style: {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      backgroundColor: '#000000',
      padding: { x: 5, y: 2 }
    }
  }
});
```

### namespace (Optional)

Custom namespace for sprite data in state.

```typescript
namespace?: string  // Default: '_sprites'
```

**Example:**

```typescript
// Separate managers for different sprite types
const playerMgr = adapter.createSpriteManager({
  namespace: 'players',  // → state.players.*
  onCreate: (key, data) => this.add.sprite(data.x, data.y, 'player')
});

const enemyMgr = adapter.createSpriteManager({
  namespace: 'enemies',  // → state.enemies.*
  onCreate: (key, data) => this.add.sprite(data.x, data.y, 'enemy')
});
```

## Methods

### add()

Add a sprite. **HOST ONLY**.

```typescript
add(key: string, data: TData): Phaser.GameObjects.Sprite
```

**Example:**

```typescript
if (adapter.isHost()) {
  manager.add('player-1', { x: 100, y: 100, health: 100 });
  manager.add('player-2', { x: 700, y: 100, health: 100 });
}
```

### remove()

Remove a sprite.

```typescript
remove(key: string): void
```

**Example:**

```typescript
manager.remove('player-1');
```

### get()

Get a sprite by key.

```typescript
get(key: string): Phaser.GameObjects.Sprite | undefined
```

**Example:**

```typescript
const sprite = manager.get('player-1');
if (sprite) {
  sprite.setAlpha(0.5);
}
```

### has()

Check if sprite exists.

```typescript
has(key: string): boolean
```

**Example:**

```typescript
if (manager.has('player-1')) {
  console.log('Player 1 is alive');
}
```

### getAllSprites()

Get all managed sprites.

```typescript
getAllSprites(): Map<string, Phaser.GameObjects.Sprite>
```

**Example:**

```typescript
for (const [key, sprite] of manager.getAllSprites()) {
  console.log(`${key} at (${sprite.x}, ${sprite.y})`);
}
```

## Properties

### group

Phaser Group containing all managed sprites. **Perfect for collision detection**.

```typescript
readonly group: Phaser.GameObjects.Group
```

**Example:**

```typescript
const playerMgr = adapter.createSpriteManager({ ... });
const enemyMgr = adapter.createSpriteManager({ ... });

// Collision between all players and all enemies
this.physics.add.collider(
  playerMgr.group,
  enemyMgr.group,
  (player, enemy) => {
    console.log('Player hit enemy!');
  }
);

// Collision with a single object
this.physics.add.collider(ball, playerMgr.group);
```

**Why use `group`?**

```typescript
// ❌ BAD: Forgot to add collider for new players
manager.add('player-1', { ... });
this.physics.add.collider(manager.get('player-1'), this.boss);

manager.add('player-2', { ... });
// Oops! Forgot collider for player-2

// ✅ GOOD: Automatic collision for ALL players
this.physics.add.collider(manager.group, this.boss);
manager.add('player-1', { ... });  // Auto-collides
manager.add('player-2', { ... });  // Auto-collides
```

## Complete Example

```typescript
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini-kit/phaser';

interface PlayerData {
  x: number;
  y: number;
  role: 'fire' | 'ice';
  health: number;
  name: string;
}

class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private playerManager!: SpriteManager<PlayerData>;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    // Create player manager
    this.playerManager = this.adapter.createSpriteManager<PlayerData>({
      // Create sprite visual
      onCreate: (key, data) => {
        const sprite = this.add.sprite(data.x, data.y, `player-${data.role}`);
        return sprite;
      },

      // Add physics (host only)
      onCreatePhysics: (sprite, key, data) => {
        this.physics.add.existing(sprite);
        sprite.body.setCollideWorldBounds(true);
        sprite.body.setBounce(0.2);
        this.physics.add.collider(sprite, this.platforms);
      },

      // Update visuals based on health
      onUpdate: (sprite, data) => {
        if (data.health <= 0) {
          sprite.setAlpha(0.3);
        } else if (data.health < 30) {
          sprite.setTint(0xff0000);
        } else {
          sprite.clearTint();
        }
      },

      // Setup after sprite is ready
      onAdd: (sprite, key, data) => {
        console.log(`${data.name} joined as ${data.role}`);
      },

      // Cleanup
      onDestroy: (sprite, key) => {
        console.log(`${key} left the game`);
      },

      // Show player name and health
      label: {
        getText: (data) => `${data.name}\n${data.health} HP`,
        offset: { y: -40 },
        style: { fontSize: '12px', color: '#fff' }
      },

      // Static data
      staticProperties: ['role', 'name'],

      // Sync config
      sync: {
        properties: ['x', 'y', 'rotation', 'health'],
        interval: 50
      }
    });

    // Host: Create initial players
    if (this.adapter.isHost()) {
      this.playerManager.add('player-1', {
        x: 200,
        y: 400,
        role: 'fire',
        health: 100,
        name: 'Alice'
      });

      this.playerManager.add('player-2', {
        x: 600,
        y: 400,
        role: 'ice',
        health: 100,
        name: 'Bob'
      });
    }

    // Both host and client: Setup collisions
    this.physics.add.collider(
      this.playerManager.group,
      this.boss,
      this.handlePlayerHitBoss,
      undefined,
      this
    );
  }

  handlePlayerHitBoss(player: any, boss: any) {
    console.log('Player hit boss!');
  }
}
```

## Best Practices

### ✅ Do

- **Use `onCreate` for visuals** - Both host and clients
- **Use `onCreatePhysics` for physics** - Host only (automatic)
- **Use `group` for collisions** - Handles late-joiners automatically
- **Use `label` for player names** - Automatic positioning
- **Use `staticProperties` for metadata** - Reduce bandwidth

### ❌ Don't

- **Don't call `add()` on clients** - Host only
- **Don't add physics in `onCreate`** - Use `onCreatePhysics`
- **Don't forget `destroy()`** - Memory leaks
- **Don't manually track sprites** - Use `get()` / `has()`

## See Also

- [PhaserAdapter](./adapter) - Creating sprite managers
- [InputManager](./input-manager) - Handling input
- [Phaser Integration Guide](/docs/guides/phaser-integration) - Full guide
