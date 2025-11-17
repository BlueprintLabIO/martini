# UI and HUD

This guide covers building reactive user interfaces, HUDs (Heads-Up Displays), scoreboards, health bars, and other UI elements for Martini multiplayer games.

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

## Basic HUD Setup

### Simple Text HUD

```typescript
import Phaser from 'phaser';
import { PhaserAdapter } from '@martini/phaser';

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

  // Watch specific property
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

### Pattern 2: HUD Manager Class

For complex UIs, create a dedicated manager:

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
    // Health bar
    const healthBar = this.createHealthBar(16, 16);
    this.elements.set('healthBar', healthBar);

    // Score display
    const scoreText = this.scene.add.text(16, 50, 'Score: 0', {
      fontSize: '18px',
      color: '#ffffff'
    });
    scoreText.setScrollFactor(0);
    this.elements.set('scoreText', scoreText);

    // Watch player state
    const unsubHealth = this.adapter.watchMyPlayer(
      (player) => player?.health,
      (health) => this.updateHealthBar(health ?? 0)
    );

    const unsubScore = this.adapter.watchMyPlayer(
      (player) => player?.score,
      (score) => {
        const text = this.elements.get('scoreText') as Phaser.GameObjects.Text;
        text.setText(`Score: ${score ?? 0}`);
      }
    );

    this.unsubscribes.push(unsubHealth, unsubScore);
  }

  private createHealthBar(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);

    // Background
    const bg = this.scene.add.rectangle(0, 0, 200, 20, 0x000000, 0.5);
    bg.setOrigin(0, 0);

    // Fill
    const fill = this.scene.add.rectangle(2, 2, 196, 16, 0x00ff00);
    fill.setOrigin(0, 0);
    fill.setData('maxWidth', 196);

    container.add([bg, fill]);
    return container;
  }

  private updateHealthBar(health: number) {
    const healthBar = this.elements.get('healthBar') as Phaser.GameObjects.Container;
    const fill = healthBar.list[1] as Phaser.GameObjects.Rectangle;
    const maxWidth = fill.getData('maxWidth');

    const percentage = Math.max(0, Math.min(1, health / 100));
    fill.width = maxWidth * percentage;

    // Color based on health
    if (percentage <= 0.2) {
      fill.setFillStyle(0xff0000);
    } else if (percentage <= 0.5) {
      fill.setFillStyle(0xffaa00);
    } else {
      fill.setFillStyle(0x00ff00);
    }
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
    this.elements.forEach(element => element.destroy());
    this.elements.clear();
  }
}

// Usage in scene
create() {
  this.hudManager = new HUDManager(this, this.adapter);
  this.hudManager.create();
}
```

## Health Bars

### Player Health Bar (Above Sprite)

```typescript
class HealthBarManager {
  private scene: Phaser.Scene;
  private bars: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createBar(
    sprite: Phaser.GameObjects.Sprite,
    id: string,
    options: { width?: number; height?: number; offsetY?: number } = {}
  ): void {
    const { width = 50, height = 6, offsetY = -40 } = options;

    const container = this.scene.add.container(sprite.x, sprite.y + offsetY);

    // Background
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8);

    // Fill
    const fill = this.scene.add.rectangle(0, 0, width - 2, height - 2, 0x00ff00);
    fill.setData('maxWidth', width - 2);

    container.add([bg, fill]);
    this.bars.set(id, container);
  }

  updateBar(id: string, current: number, max: number, sprite?: Phaser.GameObjects.Sprite): void {
    const container = this.bars.get(id);
    if (!container) return;

    // Update position to follow sprite
    if (sprite) {
      container.x = sprite.x;
      container.y = sprite.y - 40;
    }

    // Update fill
    const fill = container.list[1] as Phaser.GameObjects.Rectangle;
    const maxWidth = fill.getData('maxWidth');
    const percentage = Math.max(0, Math.min(1, current / max));

    fill.width = maxWidth * percentage;

    // Color gradient
    if (percentage <= 0.25) {
      fill.setFillStyle(0xff0000); // Red
    } else if (percentage <= 0.5) {
      fill.setFillStyle(0xff8800); // Orange
    } else if (percentage <= 0.75) {
      fill.setFillStyle(0xffff00); // Yellow
    } else {
      fill.setFillStyle(0x00ff00); // Green
    }
  }

  removeBar(id: string): void {
    const container = this.bars.get(id);
    if (container) {
      container.destroy();
      this.bars.delete(id);
    }
  }
}

// Usage
create() {
  this.healthBarManager = new HealthBarManager(this);

  this.adapter.onChange((state) => {
    for (const [playerId, player] of Object.entries(state.players)) {
      const sprite = this.playerSprites.get(playerId);
      if (!sprite) continue;

      // Create bar if doesn't exist
      if (!this.healthBarManager.hasBar(playerId)) {
        this.healthBarManager.createBar(sprite, playerId);
      }

      // Update bar
      this.healthBarManager.updateBar(playerId, player.health, 100, sprite);
    }
  });
}
```

### Circular Health Indicator

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

## Scoreboards

### Simple Scoreboard

```typescript
create() {
  // Create scoreboard container
  this.scoreboard = this.add.container(
    this.cameras.main.width - 220,
    20
  );
  this.scoreboard.setScrollFactor(0);
  this.scoreboard.setDepth(1000);

  // Background
  const bg = this.add.rectangle(0, 0, 200, 300, 0x000000, 0.7);
  bg.setOrigin(0, 0);
  this.scoreboard.add(bg);

  // Title
  const title = this.add.text(100, 10, 'SCOREBOARD', {
    fontSize: '16px',
    color: '#ffffff',
    fontStyle: 'bold'
  });
  title.setOrigin(0.5, 0);
  this.scoreboard.add(title);

  this.playerScoreTexts = new Map();

  // Update scoreboard
  this.adapter.onChange((state) => {
    this.updateScoreboard(state);
  });
}

private updateScoreboard(state: any) {
  // Sort players by score
  const players = Object.entries(state.players)
    .map(([id, player]: [string, any]) => ({ id, ...player }))
    .sort((a, b) => b.score - a.score);

  let y = 40;
  const existingIds = new Set<string>();

  for (const player of players) {
    existingIds.add(player.id);
    let text = this.playerScoreTexts.get(player.id);

    if (!text) {
      text = this.add.text(10, y, '', {
        fontSize: '14px',
        color: '#ffffff'
      });
      this.scoreboard.add(text);
      this.playerScoreTexts.set(player.id, text);
    }

    // Highlight current player
    const isMe = player.id === this.adapter.getMyPlayerId();
    const color = isMe ? '#00ff00' : '#ffffff';
    const prefix = isMe ? '> ' : '  ';

    text.setText(`${prefix}${player.name || player.id.slice(0, 8)}: ${player.score}`);
    text.setColor(color);
    text.y = y;

    y += 25;
  }

  // Remove texts for players who left
  for (const [id, text] of this.playerScoreTexts) {
    if (!existingIds.has(id)) {
      text.destroy();
      this.playerScoreTexts.delete(id);
    }
  }
}
```

### Team Scoreboard

```typescript
interface TeamScores {
  [teamId: string]: {
    name: string;
    score: number;
    color: number;
  };
}

create() {
  this.adapter.onChange((state) => {
    this.updateTeamScoreboard(state);
  });
}

private updateTeamScoreboard(state: any) {
  // Calculate team scores
  const teamScores: TeamScores = {};

  for (const player of Object.values(state.players) as any[]) {
    if (!teamScores[player.team]) {
      teamScores[player.team] = {
        name: player.team,
        score: 0,
        color: this.getTeamColor(player.team)
      };
    }
    teamScores[player.team].score += player.score;
  }

  // Display team scores
  const teams = Object.values(teamScores).sort((a, b) => b.score - a.score);

  let x = this.cameras.main.width / 2 - (teams.length * 100) / 2;
  const y = 20;

  for (const team of teams) {
    if (!this.teamScoreTexts.has(team.name)) {
      const text = this.add.text(x, y, '', {
        fontSize: '24px',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      });
      text.setScrollFactor(0);
      this.teamScoreTexts.set(team.name, text);
    }

    const text = this.teamScoreTexts.get(team.name)!;
    text.setText(`${team.name}\n${team.score}`);
    text.setColor(`#${team.color.toString(16).padStart(6, '0')}`);
    text.x = x;

    x += 150;
  }
}
```

## Game Timer

```typescript
create() {
  this.timerText = this.add.text(
    this.cameras.main.width / 2,
    20,
    '',
    {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }
  );
  this.timerText.setOrigin(0.5, 0);
  this.timerText.setScrollFactor(0);

  this.adapter.onChange((state) => {
    this.updateTimer(state);
  });
}

private updateTimer(state: any) {
  if (!state.gameMode) return;

  const { timeRemaining } = state.gameMode;

  // Convert to minutes:seconds
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  this.timerText.setText(formatted);

  // Warning color when time is low
  if (timeRemaining <= 10) {
    this.timerText.setColor('#ff0000');

    // Pulse effect
    if (timeRemaining % 2 === 0) {
      this.tweens.add({
        targets: this.timerText,
        scale: 1.2,
        duration: 200,
        yoyo: true
      });
    }
  } else if (timeRemaining <= 30) {
    this.timerText.setColor('#ffaa00');
  } else {
    this.timerText.setColor('#ffffff');
  }
}
```

## Damage Numbers

Floating damage numbers that appear when players take damage:

```typescript
// Listen for damage events
runtime.onEvent('playerHit', (senderId, payload) => {
  const { playerId, damage } = payload;
  const sprite = this.playerSprites.get(playerId);
  if (!sprite) return;

  this.showDamageNumber(sprite.x, sprite.y, damage);
});

private showDamageNumber(x: number, y: number, damage: number): void {
  const text = this.add.text(x, y - 40, `-${damage}`, {
    fontSize: '24px',
    color: '#ff0000',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  });
  text.setOrigin(0.5, 0.5);

  // Animate upward and fade out
  this.tweens.add({
    targets: text,
    y: text.y - 60,
    alpha: 0,
    scale: 1.5,
    duration: 1000,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy()
  });
}
```

## Notification System

```typescript
class NotificationManager {
  private scene: Phaser.Scene;
  private notifications: Phaser.GameObjects.Text[] = [];
  private yOffset = 100;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(message: string, duration: number = 2000, color: string = '#ffffff'): void {
    const text = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.yOffset,
      message,
      {
        fontSize: '20px',
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
      }
    );
    text.setOrigin(0.5, 0);
    text.setScrollFactor(0);
    text.setAlpha(0);

    this.notifications.push(text);

    // Fade in
    this.scene.tweens.add({
      targets: text,
      alpha: 1,
      duration: 200
    });

    // Fade out and destroy
    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: text,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          text.destroy();
          const index = this.notifications.indexOf(text);
          if (index > -1) {
            this.notifications.splice(index, 1);
          }
        }
      });
    });

    this.yOffset += 35;
    this.scene.time.delayedCall(duration + 300, () => {
      this.yOffset -= 35;
    });
  }
}

// Usage
create() {
  this.notificationManager = new NotificationManager(this);

  runtime.onEvent('playerJoined', (senderId, payload) => {
    this.notificationManager.show(
      `${payload.playerName} joined the game`,
      2000,
      '#00ff00'
    );
  });

  runtime.onEvent('playerLeft', (senderId, payload) => {
    this.notificationManager.show(
      `${payload.playerName} left the game`,
      2000,
      '#ff0000'
    );
  });
}
```

## Minimap

```typescript
class Minimap extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private playerDots: Map<string, Phaser.GameObjects.Circle> = new Map();
  private worldWidth: number;
  private worldHeight: number;
  private mapWidth: number;
  private mapHeight: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    worldWidth: number,
    worldHeight: number,
    mapWidth: number = 150,
    mapHeight: number = 150
  ) {
    super(scene, x, y);

    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    // Background
    this.background = scene.add.rectangle(0, 0, mapWidth, mapHeight, 0x000000, 0.5);
    this.background.setStrokeStyle(2, 0xffffff, 0.8);
    this.add(this.background);

    this.setScrollFactor(0);
    scene.add.existing(this);
  }

  update(players: Record<string, any>, myPlayerId: string): void {
    const currentIds = new Set(Object.keys(players));

    // Remove dots for players who left
    for (const [id, dot] of this.playerDots) {
      if (!currentIds.has(id)) {
        dot.destroy();
        this.playerDots.delete(id);
      }
    }

    // Update or create dots
    for (const [id, player] of Object.entries(players)) {
      let dot = this.playerDots.get(id);

      if (!dot) {
        const isMe = id === myPlayerId;
        const color = isMe ? 0x00ff00 : 0xff0000;
        const radius = isMe ? 4 : 3;

        dot = this.scene.add.circle(0, 0, radius, color);
        this.add(dot);
        this.playerDots.set(id, dot);
      }

      // Scale world coordinates to minimap
      const x = ((player.x / this.worldWidth) * this.mapWidth) - (this.mapWidth / 2);
      const y = ((player.y / this.worldHeight) * this.mapHeight) - (this.mapHeight / 2);

      dot.x = x;
      dot.y = y;
    }
  }
}

// Usage
create() {
  this.minimap = new Minimap(
    this,
    this.cameras.main.width - 100, // x
    this.cameras.main.height - 100, // y
    800, // world width
    600, // world height
    120, // minimap width
    120  // minimap height
  );

  this.adapter.onChange((state) => {
    this.minimap.update(state.players, this.adapter.getMyPlayerId());
  });
}
```

## Performance Tips

### 1. Use Object Pooling for Frequent UI Updates

```typescript
class DamageNumberPool {
  private pool: Phaser.GameObjects.Text[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, poolSize: number = 20) {
    this.scene = scene;

    for (let i = 0; i < poolSize; i++) {
      const text = scene.add.text(0, 0, '', {
        fontSize: '24px',
        color: '#ff0000'
      });
      text.setVisible(false);
      this.pool.push(text);
    }
  }

  show(x: number, y: number, damage: number): void {
    const text = this.pool.find(t => !t.visible) || this.pool[0];

    text.setText(`-${damage}`);
    text.setPosition(x, y);
    text.setAlpha(1);
    text.setVisible(true);

    this.scene.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        text.setVisible(false);
      }
    });
  }
}
```

### 2. Debounce Expensive Updates

```typescript
private updateScoreboard = debounce((state: any) => {
  // Expensive rendering logic
  this.renderScoreboard(state);
}, 100); // Update at most every 100ms

// Helper function
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function(...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
```

### 3. Cache Text Objects

```typescript
// BAD - Creates new text every update
this.adapter.onChange((state) => {
  const text = this.add.text(16, 16, `Score: ${state.score}`);
});

// GOOD - Reuse text object
create() {
  this.scoreText = this.add.text(16, 16, '');

  this.adapter.onChange((state) => {
    this.scoreText.setText(`Score: ${state.score}`);
  });
}
```

## See Also

- [Phaser Adapter API](../api/phaser/adapter.md) - Reactive API methods
- [Best Practices](./best-practices.md) - UI performance optimization
- [State Management](../concepts/state-management.md) - Understanding state sync
