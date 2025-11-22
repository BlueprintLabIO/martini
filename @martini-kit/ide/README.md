# @martini-kit/ide

Embeddable multiplayer game IDE with dual-view local testing.

## Features (Phase 1 MVP)

- ✅ **Dual-view local testing** - See two players side-by-side in the same browser
- ✅ **CodeMirror editor** - Syntax highlighting for TypeScript/JavaScript
- ✅ **Sandpack bundler** - In-browser bundling using CodeSandbox's Sandpack
- ✅ **Sandbox execution** - Isolated iframe for safe code execution
- ✅ **Local transport** - Test multiplayer without network
- ✅ **Phaser engine** - Built for Phaser 3 games
- ✅ **File management** - Virtual file system with multiple files
- ✅ **DevTools overlay** - Per-player debugging with console logs, state inspection, and action history

**Note:** TypeScript type checking is deferred to Phase 2

## Installation

```bash
pnpm add @martini-kit/ide
```

## Usage

```svelte
<script lang="ts">
  import { martini-kitIDE, type martini-kitIDEConfig } from '@martini-kit/ide';

  const config: martini-kitIDEConfig = {
    files: {
      '/src/game.ts': `
        import { defineGame } from '@martini-kit/core';

        export const game = defineGame({
          minPlayers: 2,
          maxPlayers: 2,
          setup: () => ({ players: {} }),
          actions: {
            move: (state, playerId, input) => {
              state.players[playerId] = input;
            }
          }
        });
      `,
      '/src/scene.ts': '...',
      '/src/main.ts': '...'
    },
    engine: 'phaser',
    transport: { type: 'local' },
    layout: 'dual',
    onChange: (files) => {
      console.log('Files changed:', Object.keys(files));
    }
  };
</script>

<martini-kitIDE {config} />
```

## API

### `martini-kitIDEConfig`

```typescript
interface martini-kitIDEConfig {
  /** Initial project files */
  files: Record<string, string>;

  /** Game engine (Phase 1: phaser only) */
  engine: 'phaser';

  /** Multiplayer transport (Phase 1: local only) */
  transport: { type: 'local' };

  /** Layout mode */
  layout?: 'dual' | 'code-only';

  /** Editor settings */
  editor?: {
    theme?: 'dark' | 'light';
    fontSize?: number;
  };

  /** Callbacks */
  onChange?: (files: Record<string, string>) => void;
  onError?: (error: GameError) => void;
  onReady?: () => void;
  onRun?: () => void;
}
```

## DevTools

Each game preview has a built-in DevTools overlay that can be toggled with the 🛠️ button in the preview header.

### Features

- **Console Tab** - View console.log(), console.warn(), and console.error() from each player
- **State Tab** - Real-time game state inspection (coming soon)
- **Actions Tab** - Action history with timestamps (coming soon)
- **Draggable** - Move the overlay anywhere within the game preview
- **Minimize** - Click the minimize button to collapse the overlay

### Console Messages

To send messages to the DevTools console from your game code, the sandbox runtime intercepts standard console methods:

```typescript
console.log('Player position:', x, y);     // Shows as info
console.warn('Low health!');               // Shows as warning
console.error('Failed to connect');        // Shows as error
```

Each console message includes:
- Timestamp (HH:MM:SS.mmm)
- Level indicator (ℹ️, ⚠️, ❌)
- Message content

## Architecture

```
@martini-kit/ide/
  src/
    lib/
      MartiniIDE.svelte            # Main IDE component
      components/
        CodeEditor.svelte          # CodeMirror wrapper
        GamePreview.svelte         # Dual-view game preview
        DevToolsPanel.svelte       # Per-game debugging overlay
      core/
        VirtualFS.ts               # In-memory file system
        SandpackManager.ts         # Sandpack integration & DevTools bridge
```

## Demo

Run the demo to see it in action:

```bash
cd @martini-kit/demos
pnpm dev
```

Then visit `http://localhost:5173/ide`

## Phase 2 (Coming Soon)

- ⏭ Hot Module Replacement (HMR)
- ⏭ Code formatting (Biome)
- ⏭ Multi-transport support (Trystero P2P, WebSocket)
- ⏭ Web Component wrapper
- ⏭ Three.js engine support

See [spec-phase-2.ts](./spec-phase-2.ts) for details.

## License

MIT
