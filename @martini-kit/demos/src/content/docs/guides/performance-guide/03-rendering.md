---
title: Rendering Optimization
section: guides
subsection: performance-guide
order: 3
---

# Rendering Optimization 🎨

Phaser tips for high FPS.

### 1. Object Pooling
Creating/destroying sprites is expensive. Reuse them!

```ts
// BAD: Destroying and recreating
bullet.destroy();
new Bullet();

// GOOD: Disable and hide, then reuse
bullet.setActive(false).setVisible(false);
// Later...
bullet.setActive(true).setVisible(true);
```

### 2. Use Texture Atlases
Loading 100 separate images is slow. Pack them into one texture atlas.

```ts
// Load one file
this.load.atlas('characters', 'chars.png', 'chars.json');

// Use frames
this.add.sprite(0, 0, 'characters', 'hero_idle');
```

### 3. Limit Text Objects
Text is expensive to render. Use BitmapText for dynamic numbers (scores, damage).

```ts
// Expensive
this.add.text(0, 0, '100', { fontFamily: 'Arial' });

// Fast
this.add.bitmapText(0, 0, 'arcade-font', '100');
```
