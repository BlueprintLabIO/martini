---
title: UI Helpers
description: HUD and overlay helpers for Phaser (player UI, stats, round flow)
section: api
---

# UI Helpers

martini-kit ships several HUD helpers so you don't have to wire `onChange` handlers and text updates by hand.

## Player HUD
- **What:** High-level HUD for title/role/control hints.
- **Best for:** Quick UI scaffolding when you just need a header or role text.
- [Docs →](./helpers#playerhud)

## Player Stats Panel
- **What:** Small overlay for the **local player** with icons + values (powerups, ammo, buffs).
- **Highlights:** Per-stat visibility and highlighting; positions in any corner.
- **Snippet:**
  ```ts
  createPlayerStatsPanel(adapter, this, {
    position: 'top-left',
    stats: { speed: { icon: '⚡', getValue: p => `${p.speed}x` } }
  });
  ```
- [Full docs →](./player-stats-panel)

## Player UI Manager
- **What:** Per-player UI elements (labels/health bars) for all players, kept in sync automatically.
- **Best for:** Games with multiple players visible at once.

## Round Manager
- **What:** Timer UI, freeze-frame announcements, and scoreboard for round-based games.
- **Highlights:** Host-only winner detection via `checkWinner`, customizable MM:SS formatting and announcement text.
- [Full docs →](./round-manager)

### Related Guides
- [UI & HUD Guide](/docs/latest/guides/ui-and-hud/01-basics) – end-to-end HUD walkthrough.
- [Phaser Helpers](./helpers) – full list of helper utilities. 
