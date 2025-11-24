---
title: Guides Overview
description: How to follow the martini-kit guides and pick the right scope for your project
section: guides
order: 0
scope: agnostic
---

# Guides Overview

Use these guides when you're ready to build beyond the quick start. Topics are split into **engine-agnostic** patterns (works with any renderer/physics) and **engine tracks** for specific integrations.

## What You Will Learn

- **Core Patterns**: How to structure your game logic and state
- **Movement & Physics**: Implementing smooth, authoritative movement
- **Networking**: Choosing the right transport and securing your game
- **Production**: Testing, optimizing, and deploying your game

## Learning Path (Engine-Agnostic)

Follow this path to master martini-kit:

1. [Core Game Logic](/docs/latest/guides/core/game-logic) - Host-authoritative loops and action patterns
2. [Movement](/docs/latest/guides/movement) - Input flow and movement behaviors
3. [Physics & Collisions](/docs/latest/guides/physics-and-collisions) - Host-side simulation, collision patterns
4. [Networking](/docs/latest/guides/networking) - Transports, secure sessions, local testing
5. [Performance Guide](/docs/latest/guides/performance-guide) - Bandwidth, rendering, asset tips
6. [UI & HUD](/docs/latest/guides/ui-and-hud/01-basics) - Reactive HUDs and indicators
7. [Testing](/docs/latest/guides/testing) - Deterministic loops and action testing
8. [Deployment](/docs/latest/guides/deployment) - Shipping, versioning, and ops handoff

## Engine Tracks

Specific integrations for your game engine of choice:

- [Phaser](/docs/latest/engine-tracks/phaser) - Adapter setup, sprites/attachments, physics/input, UI/HUD
- **Unity / Godot / Three.js** - Coming soon

## When to use Recipes vs Guides

- Use **Guides** for patterns and reasoning (e.g., "How does movement work?").
- Use **Recipes** for task-focused implementations (e.g., "How do I make a Capture the Flag mode?").

## Related Reference

- Architecture and determinism: [Core Concepts](/docs/latest/concepts)
- APIs by package: [API Reference](/docs/latest/api/core)
- Troubleshooting: [Operate](/docs/latest/operate/troubleshooting/common-issues)
