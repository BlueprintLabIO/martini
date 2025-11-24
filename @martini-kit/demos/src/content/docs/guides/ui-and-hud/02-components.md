---
title: "UI & HUD - Part 2: Components"
description: Scoreboards, timers, damage numbers, and notification systems
section: guides
subsection: ui-and-hud
order: 5
scope: agnostic
---

# UI and HUD: Components

Build common UI components like scoreboards, timers, and notifications.

**In this guide:**
- Scoreboards (simple and team-based)
- Game timers with warnings
- Floating damage numbers
- Notification systems

**Previous:** [← Part 1: Basics](./01-basics) | **Next:** [Part 3: Advanced →](./03-advanced)

---

## Scoreboards

### Simple Scoreboard

Display all players ranked by score:

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

  // Update scoreboard when state changes
  this.adapter.onChange((state) => {
    this.updateScoreboard(state);
  });
}

private updateScoreboard(state: any) {
  // Sort players by score (highest first)
  const players = Object.entries(state.players)
    .map(([id, player]: [string, any]) => ({ id, ...player }))
    .sort((a, b) => b.score - a.score);

  let y = 40;
  const existingIds = new Set<string>();

  for (const player of players) {
    existingIds.add(player.id);
    let text = this.playerScoreTexts.get(player.id);

    // Create new text if needed
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

**Key Features:**
- Automatically sorts by score
- Highlights current player
- Handles player join/leave
- Reuses text objects for performance

### Team Scoreboard

For team-based games, display team scores:

```typescript
interface TeamScores {
  [teamId: string]: {
    name: string;
    score: number;
    color: number;
  };
}

create() {
  this.teamScoreTexts = new Map();

  this.adapter.onChange((state) => {
    this.updateTeamScoreboard(state);
  });
}

private updateTeamScoreboard(state: any) {
  // Calculate team scores from player scores
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

  // Display team scores (sorted by score)
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

private getTeamColor(teamName: string): number {
  const colors: Record<string, number> = {
    red: 0xff0000,
    blue: 0x0000ff,
    green: 0x00ff00,
    yellow: 0xffff00
  };
  return colors[teamName.toLowerCase()] || 0xffffff;
}
```

---

## Game Timer

Display a countdown timer with visual warnings:

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
  if (!state.gameMode?.timeRemaining) return;

  const timeRemaining = state.gameMode.timeRemaining;

  // Convert milliseconds to minutes:seconds
  const totalSeconds = Math.ceil(timeRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  this.timerText.setText(formatted);

  // Warning color when time is low
  if (totalSeconds <= 10) {
    this.timerText.setColor('#ff0000');

    // Pulse effect for urgency
    if (totalSeconds % 2 === 0) {
      this.tweens.add({
        targets: this.timerText,
        scale: 1.2,
        duration: 200,
        yoyo: true,
        ease: 'Cubic.easeInOut'
      });
    }
  } else if (totalSeconds <= 30) {
    this.timerText.setColor('#ffaa00'); // Orange warning
  } else {
    this.timerText.setColor('#ffffff'); // Normal
  }
}
```

**Timer Features:**
- Formats time as MM:SS
- Color changes based on time remaining
- Pulse animation when critically low
- Automatically updates from state

---

## Damage Numbers

Floating damage numbers that appear when players take damage:

### Basic Damage Numbers

```typescript
// Listen for damage events
this.adapter.onChange((state, prevState) => {
  // Check if any player's health decreased
  for (const [playerId, player] of Object.entries(state.players)) {
    const prevPlayer = prevState?.players?.[playerId];
    if (!prevPlayer) continue;

    // Health decreased?
    if (player.health < prevPlayer.health) {
      const damage = prevPlayer.health - player.health;
      const sprite = this.playerSprites.get(playerId);
      if (sprite) {
        this.showDamageNumber(sprite.x, sprite.y, damage);
      }
    }
  }
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

### Critical Hit Numbers

Show different styling for critical hits:

```typescript
private showDamageNumber(x: number, y: number, damage: number, isCrit: boolean = false): void {
  const text = this.add.text(x, y - 40, `-${damage}${isCrit ? '!' : ''}`, {
    fontSize: isCrit ? '32px' : '24px',
    color: isCrit ? '#ff6600' : '#ff0000',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: isCrit ? 4 : 3
  });
  text.setOrigin(0.5, 0.5);

  // Different animation for crits
  this.tweens.add({
    targets: text,
    y: text.y - (isCrit ? 80 : 60),
    alpha: 0,
    scale: isCrit ? 2.0 : 1.5,
    duration: isCrit ? 1200 : 1000,
    ease: isCrit ? 'Back.easeOut' : 'Cubic.easeOut',
    onComplete: () => text.destroy()
  });
}
```

---

## Notification System

Display temporary notifications for game events:

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

    // Adjust offset for next notification
    this.yOffset += 35;
    this.scene.time.delayedCall(duration + 300, () => {
      this.yOffset -= 35;
    });
  }
}

// Usage
create() {
  this.notificationManager = new NotificationManager(this);

  // Show notification when player joins
  this.adapter.onChange((state, prevState) => {
    const currentPlayerIds = Object.keys(state.players);
    const prevPlayerIds = Object.keys(prevState?.players || {});

    // Check for new players
    for (const id of currentPlayerIds) {
      if (!prevPlayerIds.includes(id)) {
        const player = state.players[id];
        this.notificationManager.show(
          `${player.name || 'Player'} joined the game`,
          2000,
          '#00ff00'
        );
      }
    }

    // Check for players who left
    for (const id of prevPlayerIds) {
      if (!currentPlayerIds.includes(id)) {
        const player = prevState.players[id];
        this.notificationManager.show(
          `${player.name || 'Player'} left the game`,
          2000,
          '#ff0000'
        );
      }
    }
  });
}
```

**Notification Features:**
- Stacks multiple notifications
- Automatic fade in/out
- Custom duration and colors
- Auto-cleanup when done

---

## Next Steps

Continue to [Part 3: Advanced →](./03-advanced) for minimaps and performance optimization.

## See Also

- [← Part 1: Basics](./01-basics) - HUD setup and health bars
- [Best Practices](/docs/guides/optimization) - Performance tips
- [Phaser Integration Guide](/docs/guides/phaser/index) - Deep dive into Phaser patterns
