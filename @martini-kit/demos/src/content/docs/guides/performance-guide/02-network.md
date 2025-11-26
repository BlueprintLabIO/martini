---
title: Network Optimization
section: guides
subsection: performance-guide
order: 2
---

# Network Optimization 🌐

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

### 2. Snapshot Interpolation (always on)
Rendering is always smoothed with a snapshot buffer ~32ms in the past. The buffer auto-sizes to your sync rate: `Math.ceil(32 / syncInterval)`.

```ts
// Optional: trade latency for extra smoothing
const adapter = new PhaserAdapter(runtime, scene, {
  snapshotBufferSize: 3 // delay = 3 * syncInterval
});
```

### 3. Tune Sync Interval
Default is 16ms (60Hz). For slow-paced games, 50-100ms (20-10Hz) can be enough.

```ts
// When tracking sprites on host
adapter.trackSprite(sprite, 'player-1', { syncInterval: 100 }); // 10 updates per second
```
