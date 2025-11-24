---
title: Physics & Collisions (Engine-Agnostic)
description: Host-side physics and collision patterns that work with any engine
section: guides
order: 2
scope: agnostic
---

# Physics & Collisions (Engine-Agnostic)

These patterns apply to any physics engine (Arcade Physics, Matter.js, Rapier, Cannon.js, etc.). For Phaser-specific APIs, see [Phaser Physics & Input](/docs/latest/engine-tracks/phaser/input-physics).

## Core Principle

The most important rule for multiplayer physics is **Host Authority**:

1. **Host runs the simulation**: The host calculates physics, collisions, and movement.
2. **Clients mirror the state**: Clients receive positions/velocities and render them.
3. **Clients predict (optional)**: For smoother gameplay, clients can predict movement locally, but the host is always the source of truth.

## Guides

- [Phaser Physics & Input](/docs/latest/engine-tracks/phaser/input-physics) - Using Arcade Physics with Phaser
