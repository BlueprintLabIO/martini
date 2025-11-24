---
title: Diagnosis
section: guides
subsection: performance-guide
order: 4
scope: agnostic
---

# Diagnosis 🩺

Lag isn't always network-related. This guide helps you diagnose and fix performance issues to ensure your game runs at a buttery smooth 60+ FPS.

## Is it Network Lag or Rendering Lag?

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
