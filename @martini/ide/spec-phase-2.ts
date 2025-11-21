/**
 * @martini-kit/ide - Phase 2 Spec (Future Enhancements)
 *
 * Advanced features to add after Phase 1 MVP is stable
 *
 * PHASE 2 Features (Coming Soon):
 * ⏭ Hot Module Replacement (HMR)
 * ⏭ Code formatting (Biome-wasm)
 * ⏭ Multi-transport support (Trystero P2P, WebSocket Relay)
 * ⏭ Transport toggle UI
 * ⏭ Web Component wrapper
 * ⏭ Three.js engine support
 * ⏭ Advanced editor features (minimap, multiple cursors)
 * ⏭ File tree UI component
 * ⏭ Asset manager integration
 */

// ============================================================================
// ENHANCED API (Phase 2)
// ============================================================================

export interface martini-kitIDEConfigPhase2 {
  /** Initial project files */
  files: Record<string, string>;

  /** Game engine (Phase 2: Phaser + Three.js) */
  engine: 'phaser' | 'threejs';

  /** Multiplayer transport (Phase 2: All transports) */
  transport: {
    type: 'local' | 'trystero' | 'websocket';
    config?: TransportConfig;
  };

  /** Layout mode */
  layout?: 'single' | 'dual' | 'code-only';

  /** Advanced editor settings */
  editor?: {
    theme?: 'dark' | 'light';
    fontSize?: number;
    formatOnSave?: boolean;  // ← Phase 2
    showMinimap?: boolean;    // ← Phase 2
    tabSize?: number;
  };

  /** Hot reload settings (Phase 2) */
  hmr?: {
    enabled: boolean;
    preserveState?: boolean;
  };

  /** Callbacks */
  onChange?: (files: Record<string, string>) => void;
  onError?: (error: GameError) => void;
  onReady?: () => void;
  onRun?: () => void;
  onFormatComplete?: () => void;
}

// ============================================================================
// TRANSPORT ABSTRACTION (Phase 2)
// ============================================================================

export type TransportConfig =
  | { type: 'local' }
  | {
      type: 'trystero';
      strategy?: 'mqtt' | 'nostr' | 'supabase';
      appId?: string;
      roomId?: string
    }
  | {
      type: 'websocket';
      url?: string;
      apiKey?: string
    };

/**
 * Transport Toggle UI (Phase 2)
 *
 * ┌─────────────────────────────────────┐
 * │ Transport: [Local ▼]                │
 * │            │                         │
 * │            ├─ Local (Dual-View)     │
 * │            ├─ Trystero (P2P)        │
 * │            └─ WebSocket (Relay)     │
 * └─────────────────────────────────────┘
 *
 * When switching to 'local':
 * - Layout changes to 'dual'
 * - Two game previews appear
 * - LocalTransport connects them
 *
 * When switching to 'trystero' or 'websocket':
 * - Layout changes to 'single'
 * - Shows room code / connection UI
 * - Real P2P or relay connection
 */

export interface TransportToggleProps {
  value: 'local' | 'trystero' | 'websocket';
  options?: TransportOption[];
  onChange: (transport: string) => void;
}

export interface TransportOption {
  type: 'local' | 'trystero' | 'websocket';
  label: string;
  description: string;
  icon?: string;
}

// ============================================================================
// HOT MODULE REPLACEMENT (Phase 2)
// ============================================================================

/**
 * HMR enables updating game code without full page reload
 * while preserving game state.
 *
 * Implementation Strategy:
 * 1. Detect file changes
 * 2. Re-bundle only changed module
 * 3. Send update to sandbox iframe
 * 4. Sandbox applies patch without destroying Phaser game
 * 5. Re-run scene's update() but preserve state
 *
 * Use case: Tweak game logic/rendering without restarting
 */

export interface HMRConfig {
  enabled: boolean;
  preserveState?: boolean;
}

// ============================================================================
// CODE FORMATTING (Phase 2)
// ============================================================================

/**
 * Biome-wasm for fast in-browser formatting
 *
 * Features:
 * - Format on save
 * - Format on paste
 * - Manual format (Cmd+Shift+F)
 * - 10x faster than Prettier
 */

import { Biome, Distribution } from '@biomejs/wasm-web';

export class BiomeFormatter {
  private biome: Biome;

  async initialize(): Promise<void> {
    this.biome = await Biome.create({
      distribution: Distribution.NODE
    });
  }

  formatCode(code: string, filePath: string): string {
    return this.biome.formatContent(code, { filePath }).content;
  }
}

// ============================================================================
// WEB COMPONENT API (Phase 2)
// ============================================================================

/**
 * Custom element wrapper for use in React, Vue, Angular, etc.
 *
 * import '@martini-kit/ide/web-component';
 *
 * <martini-kit-ide
 *   files='{"src/game.ts": "..."}'
 *   engine="phaser"
 *   transport-type="local"
 *   layout="dual"
 * ></martini-kit-ide>
 *
 * Implementation: Wrap Svelte component in custom element
 */

export class martini-kitIDEElement extends HTMLElement {
  private ide: any; // Svelte component instance

  connectedCallback() {
    // Initialize Svelte component
  }

  disconnectedCallback() {
    // Cleanup
  }

  static get observedAttributes() {
    return ['files', 'engine', 'transport-type', 'layout'];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    // Update config
  }
}

// ============================================================================
// THREE.JS ENGINE (Phase 2)
// ============================================================================

/**
 * Three.js Engine Adapter
 *
 * Similar to PhaserEngine but for 3D games
 */
export class ThreeJSEngine implements EngineAdapter {
  name = 'threejs';

  getScripts() {
    return [
      'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
      '/martini-kit-multiplayer.browser.js'
    ];
  }

  getGlobals() {
    return {
      'three': 'window.THREE',
      '@martini-kit/core': 'window.martini-kitMultiplayer'
    };
  }

  createGame(config: {
    container: HTMLElement;
    runtime: any;
    width: number;
    height: number;
  }): void {
    // Three.js setup
  }

  destroyGame(): void {
    // Cleanup
  }
}

// ============================================================================
// ADVANCED UI COMPONENTS (Phase 2)
// ============================================================================

/**
 * File Tree UI
 *
 * - Expandable folders
 * - File icons
 * - Context menu (rename, delete, new file)
 * - Drag-and-drop
 *
 * Library: Build custom or use svelte-file-tree
 */

/**
 * Asset Manager UI
 *
 * - Upload images/sounds
 * - Preview assets
 * - Manage asset library
 * - Drag into code editor
 */

/**
 * Console Panel
 *
 * - Runtime console.log() output
 * - Error stack traces
 * - Clear console
 * - Filter by type
 */

// ============================================================================
// KEYBOARD SHORTCUTS (Phase 2)
// ============================================================================

import { tinykeys } from 'tinykeys';

export const shortcuts = {
  '$mod+s': 'Save and reload game',
  '$mod+Shift+f': 'Format all files',
  '$mod+/': 'Toggle comment',
  '$mod+d': 'Duplicate line',
  'Alt+Up': 'Move line up',
  'Alt+Down': 'Move line down',
  '$mod+p': 'Quick file switcher'
};

// ============================================================================
// ADDITIONAL DEPENDENCIES (Phase 2)
// ============================================================================

/**
 * Additional package.json dependencies for Phase 2:
 *
 * {
 *   "dependencies": {
 *     // Formatting
 *     "@biomejs/wasm-web": "^1.5.0",
 *
 *     // UI Components
 *     "svelte-file-tree": "^1.0.0",
 *     "svelte-resizable-panes": "^1.0.0",
 *     "svelte-sonner": "^0.3.0", // Toast notifications
 *
 *     // Utilities
 *     "tinykeys": "^2.1.0",
 *
 *     // Additional engines
 *     "three": "^0.160.0",
 *
 *     // Additional transports
 *     "@martini-kit/transport-trystero": "workspace:*"
 *   }
 * }
 */

// ============================================================================
// MIGRATION FROM PHASE 1 TO PHASE 2
// ============================================================================

/**
 * Phase 1 → Phase 2 Migration Guide:
 *
 * 1. Add new dependencies:
 *    pnpm add @biomejs/wasm-web tinykeys svelte-sonner
 *
 * 2. Update config (backwards compatible):
 *    config.editor.formatOnSave = true;
 *    config.hmr = { enabled: true };
 *
 * 3. Enable transport toggle:
 *    config.transport.type = 'trystero'; // Instead of just 'local'
 *
 * 4. Optional: Use Web Component:
 *    import '@martini-kit/ide/web-component';
 */

// ============================================================================
// PACKAGE INFO (Phase 2)
// ============================================================================

/**
 * Package: @martini-kit/ide
 * Version: 0.2.0 (Phase 2)
 * License: MIT
 *
 * Phase 2 Additions:
 * ✅ HMR (hot module replacement)
 * ✅ Biome formatting
 * ✅ Multi-transport support
 * ✅ Web Component wrapper
 * ✅ Three.js engine
 * ✅ File tree UI
 * ✅ Advanced editor features
 *
 * Bundle Size: ~450KB (with all features)
 *
 * Backwards compatible with Phase 1 configs
 */
