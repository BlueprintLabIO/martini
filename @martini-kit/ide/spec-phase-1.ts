/**
 * @martini-kit/ide - Phase 1 Spec (MVP)
 *
 * Embeddable Multiplayer Game IDE - Minimal Viable Product
 *
 * Built with: Svelte 5, CodeMirror 6, esbuild-wasm, @typescript/vfs
 *
 * PHASE 1 (MVP) Features:
 * ✅ Dual-view local testing (unique!)
 * ✅ CodeMirror editor (syntax highlighting, TypeScript support)
 * ✅ @typescript/vfs (type checking, autocomplete)
 * ✅ esbuild-wasm bundler (TS→JS compilation)
 * ✅ Sandbox iframe manager (isolated execution)
 * ✅ Local transport only (dual-view mode)
 * ✅ Phaser engine only
 * ✅ Svelte component only
 * ✅ Error display (runtime + type errors)
 *
 * Total Custom Code: ~1,600 lines
 * Bundle Size: ~300KB (minified + gzipped)
 */

// ============================================================================
// CORE API (Phase 1)
// ============================================================================

export interface martini-kitIDEConfig {
  /** Initial project files (reactive - can be updated externally) */
  files: Record<string, string>;

  /** Game engine (Phase 1: Phaser only) */
  engine: 'phaser';

  /** Multiplayer transport (Phase 1: Local only) */
  transport: {
    type: 'local';
  };

  /** Layout mode */
  layout?: 'dual' | 'code-only';

  /** Editor settings */
  editor?: {
    theme?: 'dark' | 'light';
    fontSize?: number;
    showLineNumbers?: boolean;
  };

  /** Callbacks */
  onChange?: (files: Record<string, string>) => void;
  onError?: (error: GameError) => void;
  onReady?: () => void;
  onRun?: () => void;
}

// ============================================================================
// USAGE EXAMPLE (Phase 1)
// ============================================================================

/**
 * Example: Dual-View Local Testing
 *
 * Shows two game previews side-by-side simulating two players
 * in the same browser tab. Perfect for testing multiplayer locally.
 */
const dualViewConfig: martini-kitIDEConfig = {
  files: {
    '/src/game.ts': `
      import { defineGame } from '@martini-kit/core';

      export const game = defineGame({
        minPlayers: 2,
        maxPlayers: 2,
        setup: () => ({
          players: {}
        }),
        actions: {
          move: (state, playerId, { x, y }) => {
            state.players[playerId] = { x, y };
          }
        }
      });
    `,
    '/src/scene.ts': `
      export function createScene(runtime) {
        return class GameScene extends Phaser.Scene {
          create() {
            // Game rendering
          }
        };
      }
    `,
    '/src/main.ts': `
      import { game } from './game';
      import { createScene } from './scene';

      // Runtime initialized by IDE
    `
  },
  engine: 'phaser',
  transport: { type: 'local' },
  layout: 'dual',
  editor: {
    theme: 'dark',
    fontSize: 14
  },
  onChange: (files) => {
    // Auto-save to parent app
    console.log('Files changed:', Object.keys(files));
  },
  onError: (error) => {
    console.error('IDE Error:', error);
  }
};

// ============================================================================
// SVELTE COMPONENT API
// ============================================================================

/**
 * Svelte Component Usage
 *
 * <script lang="ts">
 *   import { martini-kitIDE } from '@martini-kit/ide';
 *   import type { martini-kitIDEConfig } from '@martini-kit/ide';
 *
 *   let config: martini-kitIDEConfig = {
 *     files: $projectFiles,
 *     engine: 'phaser',
 *     transport: { type: 'local' },
 *     layout: 'dual',
 *     onChange: (files) => {
 *       projectFiles.set(files);
 *     }
 *   };
 * </script>
 *
 * <martini-kitIDE {config} />
 */

// ============================================================================
// LAYOUT MODES (Phase 1)
// ============================================================================

/**
 * Layout: 'dual' (DEFAULT)
 *
 * ┌─────────────────────────┬──────────┬──────────┐
 * │                         │  Host    │  Client  │
 * │   Code Editor           │  Player  │  Player  │
 * │   (CodeMirror)          │          │          │
 * │                         │  Canvas  │  Canvas  │
 * │   - Type errors inline  │          │          │
 * │   - Autocomplete        │  WASD    │  Arrows  │
 * └─────────────────────────┴──────────┴──────────┘
 *
 * Features:
 * - Both previews run in same browser
 * - LocalTransport connects them
 * - See multiplayer interactions instantly
 * - Type checking with @typescript/vfs
 * - Error display (type + runtime)
 */

/**
 * Layout: 'code-only'
 *
 * ┌──────────────────────────────────────────────┐
 * │                                              │
 * │          Code Editor (Full Width)            │
 * │          - Type checking enabled             │
 * │          - No game preview                   │
 * │                                              │
 * └──────────────────────────────────────────────┘
 *
 * Use case: Documentation examples, code snippets
 */

// ============================================================================
// CORE RUNTIME (Phase 1)
// ============================================================================

export class martini-kitIDERuntime {
  /** Virtual file system (simple Record<string, string>) */
  readonly vfs: VirtualFileSystem;

  /** Code bundler (esbuild-wasm) */
  readonly bundler: Bundler;

  /** Sandbox iframe manager */
  readonly sandbox: Sandbox;

  /** TypeScript environment (@typescript/vfs) */
  readonly tsEnv: TypeScriptEnvironment;

  constructor(config: martini-kitIDEConfig);

  /** Bundle and run the game */
  async run(): Promise<void>;

  /** Get type diagnostics */
  async getTypeDiagnostics(): Promise<TypeDiagnostic[]>;

  /** Update file content */
  updateFile(path: string, content: string): void;

  /** Cleanup */
  destroy(): void;
}

// ============================================================================
// ERROR HANDLING (Phase 1)
// ============================================================================

export interface GameError {
  type: 'syntax' | 'type' | 'runtime';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
}

export interface TypeDiagnostic {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// FILE STRUCTURE (Phase 1)
// ============================================================================

/**
 * @martini-kit/ide/
 *   src/
 *     components/
 *       martini-kitIDE.svelte         # Main component
 *       CodeEditor.svelte         # CodeMirror wrapper
 *       GamePreview.svelte        # Dual-view game preview
 *       ErrorDisplay.svelte       # Type + runtime errors
 *     core/
 *       VirtualFS.ts              # Simple Record<string, string> wrapper
 *       Bundler.ts                # esbuild-wasm wrapper
 *       Sandbox.ts                # iframe manager
 *       TypeScriptEnv.ts          # @typescript/vfs wrapper
 *     adapters/
 *       PhaserEngine.ts           # Phaser setup helper
 *     index.ts                    # Main exports
 *   package.json
 *   tsconfig.json
 *   README.md
 */

// ============================================================================
// DEPENDENCIES (Phase 1)
// ============================================================================

/**
 * package.json dependencies:
 *
 * {
 *   "dependencies": {
 *     // Editor
 *     "@codemirror/state": "^6.5.2",
 *     "@codemirror/view": "^6.38.6",
 *     "@codemirror/lang-javascript": "^6.2.4",
 *     "codemirror": "^6.0.2",
 *
 *     // TypeScript
 *     "@typescript/vfs": "^1.5.0",
 *     "typescript": "^5.9.3",
 *
 *     // Bundler
 *     "esbuild-wasm": "^0.25.0",
 *
 *     // martini-kit packages
 *     "@martini-kit/core": "workspace:*",
 *     "@martini-kit/transport-local": "workspace:*",
 *     "@martini-kit/phaser": "workspace:*"
 *   },
 *   "peerDependencies": {
 *     "svelte": "^5.0.0",
 *     "phaser": "^3.80.0"
 *   }
 * }
 */

// ============================================================================
// PACKAGE INFO (Phase 1)
// ============================================================================

/**
 * Package: @martini-kit/ide
 * Version: 0.1.0 (Phase 1 - MVP)
 * License: MIT
 *
 * Phase 1 Features:
 * ✅ Dual-view local testing
 * ✅ CodeMirror editor
 * ✅ TypeScript type checking (@typescript/vfs)
 * ✅ esbuild bundler
 * ✅ Sandbox iframes
 * ✅ Local transport only
 * ✅ Phaser engine only
 * ✅ Error display
 *
 * Bundle Size: ~300KB (minified + gzipped)
 * Custom Code: ~1,600 lines
 *
 * See spec-phase-2.ts for planned future enhancements
 */
