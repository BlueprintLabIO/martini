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
