# Client-Side Performance Guide

Lag isn't always network-related. This guide helps you diagnose and fix performance issues to ensure your game runs at a buttery smooth 60+ FPS.

---

## Part 1: Diagnosis 🩺

Is it **Network Lag** or **Rendering Lag**?

### The "Freeze" Test
If sprites stop moving but the UI animations (like a spinning loader) keep running smoothly, it's **Network Lag**.
If *everything* freezes or stutters, including UI, it's **Rendering Lag**.

### Use the FPS Meter
Enable the debug FPS meter to check your rendering performance:

```ts
// In your main.ts or game config
phaserConfig: {
  physics: {
    arcade: { debug: true } // Visualizes physics bodies
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  }
}
```

---

## Part 2: Network Optimization 🌐

Reduce bandwidth and improve smoothness.

### 1. Enable Adaptive Sync
Don't sync sprites that aren't moving. This can reduce bandwidth by 50%+.

```ts
// In SpriteManager config
sync: {
  adaptive: true,
  adaptiveThreshold: 1 // Only sync if moved > 1px
}
```

### 2. Choose the Right Interpolation
- **Fast-paced action?** Use `'time-based'` (Default).
- **Co-op / Strategy?** Use `'snapshot-buffer'` for maximum smoothness.

```ts
// In PhaserAdapter config
interpolationMode: 'snapshot-buffer',
snapshotBufferSize: 3
```

### 3. Tune Sync Interval
Default is 50ms (20Hz). For slow-paced games, 100ms (10Hz) might be enough.

```ts
// In PhaserAdapter config
syncInterval: 100 // 10 updates per second
```

---

## Part 3: Rendering Optimization 🎨

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

---

## Part 4: Asset Management 📦

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

---

## Summary Checklist

- [ ] Adaptive Sync enabled?
- [ ] Object Pooling for bullets/particles?
- [ ] Texture Atlases used?
- [ ] Interpolation mode matches gameplay style?
