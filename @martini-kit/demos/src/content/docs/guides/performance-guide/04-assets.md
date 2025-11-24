---
title: Asset Management
section: guides
subsection: performance-guide
order: 4
---

# Asset Management 📦

### Preload Smartly
Don't load everything in `preload()`. Use a bootstrap scene for essential assets, then load level-specific assets in the background.

```ts
// BootstrapScene.ts
preload() {
  this.load.image('loading-bar', 'assets/ui/loading.png');
  // Load only what's needed for the menu
}

create() {
  this.scene.start('MenuScene');
  // Start loading game assets in background
  this.load.image('boss', 'assets/boss.png');
  this.load.start();
}
```
