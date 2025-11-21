---
title: Installation
description: Get started with martini-kit in under a minute
section: getting-started
order: 1
---

<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Installation

Get started with martini-kit in under a minute.

## Prerequisites

- **Node.js** 18+ (18.x, 20.x, or 22.x)
- **Package manager**: npm, pnpm, or yarn

## Install Packages

Choose your development approach:

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

### Phaser Helpers (Recommended)

Install martini-kit with Phaser helpers for rapid game development:

```bash
# Using pnpm (recommended)
pnpm add @martini-kit/core @martini-kit/phaser phaser

# Using npm
npm install @martini-kit/core @martini-kit/phaser phaser

# Using yarn
yarn add @martini-kit/core @martini-kit/phaser phaser
```

**What's included:**
- `@martini-kit/core` - Core multiplayer engine
- `@martini-kit/phaser` - Phaser adapter + helpers (SpriteManager, InputManager, etc.)
- `phaser` - Phaser 3 game engine

{/snippet}

{#snippet core()}

### Core Primitives Only

For advanced users or custom integrations, install just the core:

```bash
# Using pnpm (recommended)
pnpm add @martini-kit/core

# Using npm
npm install @martini-kit/core

# Using yarn
yarn add @martini-kit/core
```

**What's included:**
- `@martini-kit/core` - Core multiplayer engine only

**Note:** Most games should use Phaser helpers. The core-only approach is for:
- Custom game engine integrations (Unity, Unreal, etc.)
- Headless game servers
- Non-Phaser rendering engines

{/snippet}
</CodeTabs>

## What's Included

### @martini-kit/core

The core multiplayer engine. Provides:
- `defineGame()` - Declarative game definition
- `GameRuntime` - State management and sync
- Diff/patch algorithms for efficient networking
- Transport interface for custom backends

### @martini-kit/phaser

Phaser 3 adapter with helpers:
- `PhaserAdapter` - Connects martini-kit to Phaser scenes
- `SpriteManager` - Automatic sprite synchronization
- `InputManager` - Simplified input handling
- `PhysicsManager` - Physics behavior presets

### phaser

Phaser 3 game engine (peer dependency).

## Verify Installation

Create a test file to verify everything installed correctly:

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

```typescript
// test.ts
import { defineGame } from '@martini-kit/core';
import { PhaserAdapter } from '@martini-kit/phaser';

console.log('✅ martini-kit installed successfully!');
console.log('defineGame:', typeof defineGame);
console.log('PhaserAdapter:', typeof PhaserAdapter);
```

Run it:

```bash
node test.ts
```

You should see:
```
✅ martini-kit installed successfully!
defineGame: function
PhaserAdapter: function
```

{/snippet}

{#snippet core()}

```typescript
// test.ts
import { defineGame, GameRuntime } from '@martini-kit/core';

console.log('✅ martini-kit Core installed successfully!');
console.log('defineGame:', typeof defineGame);
console.log('GameRuntime:', typeof GameRuntime);
```

Run it:

```bash
node test.ts
```

You should see:
```
✅ martini-kit Core installed successfully!
defineGame: function
GameRuntime: function
```

{/snippet}
</CodeTabs>

## TypeScript Setup (Recommended)

martini-kit is built with TypeScript and includes full type definitions.

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## Next Steps

Ready to build your first game? Continue to the [Quick Start](/docs/getting-started/quick-start) guide!
