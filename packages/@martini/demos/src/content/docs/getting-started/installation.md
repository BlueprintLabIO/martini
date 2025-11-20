---
title: Installation
description: Get started with Martini in under a minute
section: getting-started
order: 1
---

<script>
  import CodeTabs from '$lib/components/docs/CodeTabs.svelte';
</script>

# Installation

Get started with Martini in under a minute.

## Prerequisites

- **Node.js** 18+ (18.x, 20.x, or 22.x)
- **Package manager**: npm, pnpm, or yarn

## Install Packages

Choose your development approach:

<CodeTabs tabs={['phaser', 'core']}>
{#snippet phaser()}

### Phaser Helpers (Recommended)

Install Martini with Phaser helpers for rapid game development:

```bash
# Using pnpm (recommended)
pnpm add @martini/core @martini/phaser phaser

# Using npm
npm install @martini/core @martini/phaser phaser

# Using yarn
yarn add @martini/core @martini/phaser phaser
```

**What's included:**
- `@martini/core` - Core multiplayer engine
- `@martini/phaser` - Phaser adapter + helpers (SpriteManager, InputManager, etc.)
- `phaser` - Phaser 3 game engine

{/snippet}

{#snippet core()}

### Core Primitives Only

For advanced users or custom integrations, install just the core:

```bash
# Using pnpm (recommended)
pnpm add @martini/core

# Using npm
npm install @martini/core

# Using yarn
yarn add @martini/core
```

**What's included:**
- `@martini/core` - Core multiplayer engine only

**Note:** Most games should use Phaser helpers. The core-only approach is for:
- Custom game engine integrations (Unity, Unreal, etc.)
- Headless game servers
- Non-Phaser rendering engines

{/snippet}
</CodeTabs>

## What's Included

### @martini/core

The core multiplayer engine. Provides:
- `defineGame()` - Declarative game definition
- `GameRuntime` - State management and sync
- Diff/patch algorithms for efficient networking
- Transport interface for custom backends

### @martini/phaser

Phaser 3 adapter with helpers:
- `PhaserAdapter` - Connects Martini to Phaser scenes
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
import { defineGame } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';

console.log('✅ Martini installed successfully!');
console.log('defineGame:', typeof defineGame);
console.log('PhaserAdapter:', typeof PhaserAdapter);
```

Run it:

```bash
node test.ts
```

You should see:
```
✅ Martini installed successfully!
defineGame: function
PhaserAdapter: function
```

{/snippet}

{#snippet core()}

```typescript
// test.ts
import { defineGame, GameRuntime } from '@martini/core';

console.log('✅ Martini Core installed successfully!');
console.log('defineGame:', typeof defineGame);
console.log('GameRuntime:', typeof GameRuntime);
```

Run it:

```bash
node test.ts
```

You should see:
```
✅ Martini Core installed successfully!
defineGame: function
GameRuntime: function
```

{/snippet}
</CodeTabs>

## TypeScript Setup (Recommended)

Martini is built with TypeScript and includes full type definitions.

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
