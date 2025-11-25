---
title: Player Stats Panel
description: HUD widget that shows the current player's powerups and stats.
section: api
subsection: phaser
order: 14
---

# Player Stats Panel

Shows a small overlay with icons/values for the **current player**. Perfect for powerups, ammo, timers, or ability status.

## When to Use
- You need a lightweight HUD for the local player only.
- You want to highlight temporary buffs (speed boost, extra bombs, etc.).
- You want auto-updates when player state changes (no manual `onChange` wiring).

## Quick Start

```ts
import { createPlayerStatsPanel } from '@martini-kit/phaser';

// scene.create()
this.stats = createPlayerStatsPanel(this.adapter, this, {
  position: 'top-left',
  stats: {
    bombs: {
      icon: '💣',
      getValue: (player) => `${player.activeBombs}/${player.bombCount}`,
      tooltip: 'Current / max bombs'
    },
    speed: {
      icon: '⚡',
      getValue: (player) => `${Math.round(player.speed * 100)}%`,
      highlight: (player) => player.speed > 1.0
    },
    kick: {
      icon: '🦵',
      getValue: () => '✓',
      visible: (player) => player.canKick
    }
  }
});
```

## Key Options
- `position`: `'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | { x, y }`
- `stats`: record of stat configs:
  - `icon` (string/emoji)
  - `getValue(player)` → string/number to display
  - `visible(player)?` → conditionally show
  - `highlight(player)?` → adds highlight band behind the row
  - `tooltip?` → text for hover/title
- `style` (optional): `backgroundColor`, `padding`, `iconSize`, `fontSize`, `spacing`, `highlightColor`
- `playersKey`: key in state (default `players`)

## Behavior
- Reacts to state changes automatically (hooks into `adapter.onChange`).
- Hides itself if the local player does not exist.
- Handles dynamic stat visibility/highlighting per player.

## Tips
- Keep icons short (emoji or 1–2 chars) so the panel stays compact.
- Use `highlight` for buffs that expire, so players notice them.
- Pair with [Round Manager](./round-manager) for timers/announcements. 
