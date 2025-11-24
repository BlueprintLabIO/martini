---
title: "UI & HUD - Part 1: Basics"
description: Build reactive user interfaces, HUDs, and health bars for multiplayer games
section: guides
subsection: ui-and-hud
order: 4
scope: agnostic
---

<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# UI and HUD: Basics

Learn the fundamentals of building reactive user interfaces for martini-kit multiplayer games.

**In this guide:**
- UI Architecture principles
- Basic HUD setup with helpers
- Reactive patterns for state updates
- Health bars and indicators

**Next:** [Part 2: Components →](./02-components) covers scoreboards, timers, and damage numbers.

---

## UI Architecture

In multiplayer games, UI must be responsive to state changes from any player:

```
┌──────────────────────────────────────┐
│  Game State (Synchronized)           │
│  - player.health                     │
│  - player.score                      │
│  - gameMode.timeRemaining            │
└──────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────┐
│  UI Components (Local)               │
│  - Health Bar                        │
│  - Scoreboard                        │
│  - Timer                             │
└──────────────────────────────────────┘
```

**Key principle**: UI should be reactive to state, not the other way around.

---

## Basic HUD Setup

martini-kit offers two approaches for creating HUDs: the **Phaser Helpers** approach using `createPlayerHUD`, or the **Core Primitives** approach with manual text management.

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

### Using `createPlayerHUD` Helper

The `createPlayerHUD` helper eliminates HUD boilerplate by automatically managing title, role, and control hint text with reactive updates.

#### Basic Usage (Action Games)

For action games that only need player-specific data:

```typescript
import { createPlayerHUD } from '@martini-kit/phaser';

create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Create HUD with automatic updates
  this.hud = createPlayerHUD(this.adapter, this, {
    title: 'Blob Battle',
    titleStyle: { fontSize: '32px', color: '#fff', fontStyle: 'bold' },

    roleText: (myPlayer) => {
      if (!myPlayer) return 'Spectator';
      return `Size: ${myPlayer.size}`;
    },
    roleStyle: { fontSize: '18px', color: '#fff' },

    controlHints: () => 'Click anywhere to move your blob',
    controlsStyle: { fontSize: '14px', color: '#aaa' },

    layout: {
      title: { x: 400, y: 30 },
      role: { x: 400, y: 70 },
      controls: { x: 400, y: 575 }
    }
  });
}
```

**Benefits:**
- Automatic reactive updates when player state changes
- No manual `onChange` subscriptions needed
- Handles player join/leave automatically
- Deduplicates updates for performance

#### Advanced Usage (Turn-Based Games)

For turn-based games that need access to global game state:

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  this.hud = createPlayerHUD(this.adapter, this, {
    title: 'Connect Four',
    titleStyle: { fontSize: '28px', color: '#fff', fontStyle: 'bold' },

    // Second parameter provides full game state!
    roleText: (myPlayer, state) => {
      if (!myPlayer) return 'Spectator';
      if (!state) return 'Loading...';

      // Access global game state for turn-based logic
      if (state.gameOver) {
        if (state.isDraw) return 'Game Draw!';
        if (state.winner) {
          const winnerPlayer = state.players[state.winner];
          return state.winner === this.adapter.getMyPlayerId()
            ? \`You Win! (\${winnerPlayer?.color})\`
            : \`\${winnerPlayer?.color.toUpperCase()} Wins!\`;
        }
      }

      // Show whose turn it is
      const playerIds = Object.keys(state.players || {});
      const currentPlayerId = playerIds[state.currentTurn];
      const currentPlayer = state.players?.[currentPlayerId];

      if (currentPlayerId === this.adapter.getMyPlayerId()) {
        return \`Your Turn (\${myPlayer.color.toUpperCase()})\`;
      }

      return \`\${currentPlayer?.color?.toUpperCase() || 'Opponent'}'s Turn\`;
    },
    roleStyle: { fontSize: '18px', color: '#fff' },

    controlHints: () => 'Click a column to drop your token',
    controlsStyle: { fontSize: '14px', color: '#aaa' }
  });
}
```

{/snippet}

{#snippet core()}

### Manual Text HUD

For complete control over HUD rendering, create and update text objects manually:

```typescript
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini-kit/phaser';

export class GameScene extends Phaser.Scene {
  private adapter!: PhaserAdapter;
  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  create() {
    this.adapter = new PhaserAdapter(runtime, this);

    // Create HUD elements
    this.healthText = this.add.text(16, 16, 'Health: 100', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.healthText.setScrollFactor(0); // Fixed to camera

    this.scoreText = this.add.text(16, 40, 'Score: 0', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.scoreText.setScrollFactor(0);

    // Update HUD when state changes
    this.adapter.onChange((state) => {
      this.updateHUD(state);
    });

    // Initial update
    this.updateHUD(runtime.getState());
  }

  private updateHUD(state: any) {
    const myPlayer = state.players[this.adapter.getMyPlayerId()];
    if (!myPlayer) return;

    this.healthText.setText(`Health: ${myPlayer.health}`);
    this.scoreText.setText(`Score: ${myPlayer.score}`);

    // Color change based on health
    if (myPlayer.health <= 20) {
      this.healthText.setColor('#ff0000'); // Red when low
    } else if (myPlayer.health <= 50) {
      this.healthText.setColor('#ffaa00'); // Orange when medium
    } else {
      this.healthText.setColor('#ffffff'); // White when healthy
    }
  }
}
```

{/snippet}
</CodeTabs>

---

## Reactive UI Patterns

### Pattern 1: Using `watchMyPlayer()`

The most efficient way to update UI based on player state:

```typescript
create() {
  this.adapter = new PhaserAdapter(runtime, this);

  // Create health text
  this.healthText = this.add.text(16, 16, '', {
    fontSize: '18px',
    color: '#ffffff'
  });

  // Watch specific property - only updates when health changes
  this.adapter.watchMyPlayer(
    (player) => player?.health,
    (health) => {
      if (health === undefined) return;

      this.healthText.setText(`Health: ${health}`);

      // Update color based on health
      if (health <= 20) {
        this.healthText.setColor('#ff0000');
      } else if (health <= 50) {
        this.healthText.setColor('#ffaa00');
      } else {
        this.healthText.setColor('#ffffff');
      }
    }
  );

  // Watch score separately
  this.adapter.watchMyPlayer(
    (player) => player?.score,
    (score) => {
      this.scoreText.setText(`Score: ${score ?? 0}`);
    }
  );
}
```

**Benefits:**
- Only runs callback when the watched property changes
- Automatically unsubscribes when scene is destroyed
- More efficient than `onChange` for specific properties

### Pattern 2: HUD Manager Class

For complex UIs, create a dedicated manager that encapsulates all HUD logic:

```typescript
class HUDManager {
  private scene: Phaser.Scene;
  private adapter: PhaserAdapter;
  private elements: Map<string, Phaser.GameObjects.GameObject> = new Map();
  private unsubscribes: Array<() => void> = [];

  constructor(scene: Phaser.Scene, adapter: PhaserAdapter) {
    this.scene = scene;
    this.adapter = adapter;
  }

  create() {
    // Create health display
    const healthText = this.scene.add.text(16, 16, 'Health: 100', {
      fontSize: '18px',
      color: '#ffffff'
    });
    healthText.setScrollFactor(0);
    this.elements.set('health', healthText);

    // Create score display
    const scoreText = this.scene.add.text(16, 50, 'Score: 0', {
      fontSize: '18px',
      color: '#ffffff'
    });
    scoreText.setScrollFactor(0);
    this.elements.set('score', scoreText);

    // Watch player state
    const unsubHealth = this.adapter.watchMyPlayer(
      (player) => player?.health,
      (health) => {
        const text = this.elements.get('health') as Phaser.GameObjects.Text;
        text.setText(`Health: ${health ?? 0}`);
      }
    );

    const unsubScore = this.adapter.watchMyPlayer(
      (player) => player?.score,
      (score) => {
        const text = this.elements.get('score') as Phaser.GameObjects.Text;
        text.setText(`Score: ${score ?? 0}`);
      }
    );

    this.unsubscribes.push(unsubHealth, unsubScore);
  }

  destroy() {
    // Clean up subscriptions
    this.unsubscribes.forEach(unsub => unsub());

    // Destroy all UI elements
    this.elements.forEach(element => element.destroy());
    this.elements.clear();
  }
}

// Usage in scene
create() {
  this.hudManager = new HUDManager(this, this.adapter);
  this.hudManager.create();
}

shutdown() {
  this.hudManager?.destroy();
}
```

---

## Health Bars

### Simple Health Bar

A basic rectangular health bar:

```typescript
create() {
  // Create health bar container
  const x = 16;
  const y = 16;
  const width = 200;
  const height = 20;

  // Background
  this.healthBarBg = this.add.rectangle(x, y, width, height, 0x000000, 0.5);
  this.healthBarBg.setOrigin(0, 0);
  this.healthBarBg.setScrollFactor(0);

  // Fill (green bar)
  this.healthBarFill = this.add.rectangle(x + 2, y + 2, width - 4, height - 4, 0x00ff00);
  this.healthBarFill.setOrigin(0, 0);
  this.healthBarFill.setScrollFactor(0);
  this.healthBarFill.setData('maxWidth', width - 4);

  // Watch health changes
  this.adapter.watchMyPlayer(
    (player) => player?.health,
    (health) => this.updateHealthBar(health ?? 0, 100)
  );
}

private updateHealthBar(current: number, max: number) {
  const maxWidth = this.healthBarFill.getData('maxWidth');
  const percentage = Math.max(0, Math.min(1, current / max));

  // Update width
  this.healthBarFill.width = maxWidth * percentage;

  // Color based on health
  if (percentage <= 0.25) {
    this.healthBarFill.setFillStyle(0xff0000); // Red
  } else if (percentage <= 0.5) {
    this.healthBarFill.setFillStyle(0xff8800); // Orange
  } else {
    this.healthBarFill.setFillStyle(0x00ff00); // Green
  }
}
```

### Health Bar Above Sprite

Display health bars above each player sprite:

```typescript
// Create health bar for a sprite
createPlayerHealthBar(sprite: Phaser.GameObjects.Sprite, playerId: string) {
  const width = 50;
  const height = 6;
  const offsetY = -40;

  const container = this.add.container(sprite.x, sprite.y + offsetY);

  // Background
  const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);

  // Fill
  const fill = this.add.rectangle(0, 0, width - 2, height - 2, 0x00ff00);
  fill.setData('maxWidth', width - 2);

  container.add([bg, fill]);

  // Store reference
  this.healthBars.set(playerId, { container, fill, sprite });
}

// Update health bar position and fill
update() {
  this.adapter.onChange((state) => {
    for (const [playerId, player] of Object.entries(state.players)) {
      const healthBar = this.healthBars.get(playerId);
      if (!healthBar) continue;

      // Follow sprite
      healthBar.container.x = healthBar.sprite.x;
      healthBar.container.y = healthBar.sprite.y - 40;

      // Update fill
      const percentage = Math.max(0, Math.min(1, player.health / 100));
      const maxWidth = healthBar.fill.getData('maxWidth');
      healthBar.fill.width = maxWidth * percentage;

      // Update color
      if (percentage <= 0.25) {
        healthBar.fill.setFillStyle(0xff0000);
      } else if (percentage <= 0.5) {
        healthBar.fill.setFillStyle(0xff8800);
      } else {
        healthBar.fill.setFillStyle(0x00ff00);
      }
    }
  });
}
```

### Circular Health Indicator

A circular progress indicator for health:

```typescript
class CircularHealthBar extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Arc;
  private fill: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number = 30) {
    super(scene, x, y);

    // Background circle
    this.background = scene.add.circle(0, 0, radius, 0x000000, 0.3);

    // Health arc (starts at -90 degrees, sweeps clockwise)
    this.fill = scene.add.arc(0, 0, radius - 3, -90, 270, false, 0x00ff00);

    this.add([this.background, this.fill]);
    scene.add.existing(this);
  }

  updateHealth(current: number, max: number): void {
    const percentage = Math.max(0, Math.min(1, current / max));
    const angle = 360 * percentage;

    // Update arc sweep
    this.fill.setEndAngle(-90 + angle);

    // Color gradient
    if (percentage <= 0.25) {
      this.fill.setFillStyle(0xff0000);
    } else if (percentage <= 0.5) {
      this.fill.setFillStyle(0xff8800);
    } else {
      this.fill.setFillStyle(0x00ff00);
    }
  }
}

// Usage
create() {
  this.healthIndicator = new CircularHealthBar(this, 50, 50, 25);
  this.healthIndicator.setScrollFactor(0);

  this.adapter.watchMyPlayer(
    (player) => player?.health,
    (health) => {
      this.healthIndicator.updateHealth(health ?? 0, 100);
    }
  );
}
```

---

## Next Steps

Now that you understand the basics, continue to:

- **[Part 2: Components →](./02-components)** - Scoreboards, timers, damage numbers
- **[Part 3: Advanced →](./03-advanced)** - Minimaps, performance optimization

## See Also

- [Phaser Adapter API](/docs/api/phaser/adapter) - Reactive API methods
- [Best Practices](/docs/guides/optimization) - UI performance optimization
