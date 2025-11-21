/**
 * PlayerUIManager - Automatic UI synchronization for players
 *
 * Eliminates bugs caused by:
 * - Creating UI before player metadata (side, team, etc.) is synced
 * - Forgetting to update UI when player data changes
 * - Manual loops to create/update/destroy UI elements
 *
 * Features:
 * - Waits for staticProperties before creating UI (no race conditions!)
 * - Auto-repositions UI when metadata changes
 * - Auto-creates UI for late-joining players
 * - Auto-destroys UI when players leave
 *
 * Usage:
 * ```ts
 * const playerUI = adapter.createPlayerUIManager({
 *   score: {
 *     position: (player) => ({
 *       x: player.side === 'left' ? 200 : 600,
 *       y: 80
 *     }),
 *     getText: (player) => String(player.score || 0),
 *     style: { fontSize: '48px', color: '#fff' }
 *   },
 *
 *   health: {
 *     position: (player) => ({ x: player.x, y: player.y - 30 }),
 *     width: 50,
 *     height: 5,
 *     getValue: (player) => player.health / player.maxHealth,
 *     backgroundColor: 0x333333,
 *     foregroundColor: 0x00ff00
 *   }
 * });
 * ```
 */

import type { PhaserAdapter } from '../PhaserAdapter.js';

export interface TextUIConfig {
  /**
   * Position function - receives FULL player data (including staticProperties!)
   * Called when UI is created AND when metadata changes
   */
  position: (player: any, playerId: string) => { x: number; y: number };

  /**
   * Text content function
   */
  getText: (player: any, playerId: string) => string;

  /**
   * Phaser text style
   */
  style?: Phaser.Types.GameObjects.Text.TextStyle;

  /**
   * Text origin (default: 0.5 for centered)
   */
  origin?: number | { x: number; y: number };

  /**
   * Z-depth for layering
   */
  depth?: number;

  /**
   * Required static properties that must exist before creating this UI
   * Example: ['side', 'team'] - waits until these are synced
   */
  requiredMetadata?: string[];
}

export interface BarUIConfig {
  /**
   * Position function - receives FULL player data (including staticProperties!)
   */
  position: (player: any, playerId: string) => { x: number; y: number };

  /**
   * Value function (0-1 range)
   */
  getValue: (player: any, playerId: string) => number;

  /**
   * Bar dimensions
   */
  width: number;
  height: number;

  /**
   * Colors
   */
  backgroundColor: number;
  foregroundColor: number;

  /**
   * Bar origin (default: 0.5 for centered)
   */
  origin?: number | { x: number; y: number };

  /**
   * Z-depth for layering
   */
  depth?: number;

  /**
   * Required static properties that must exist before creating this UI
   */
  requiredMetadata?: string[];
}

export interface PlayerUIManagerConfig {
  /**
   * UI elements keyed by name
   * Each element can be text or bar type
   */
  [elementName: string]: TextUIConfig | BarUIConfig;
}

type UIElement = {
  type: 'text' | 'bar';
  config: TextUIConfig | BarUIConfig;
  gameObject: any; // Phaser.GameObjects.Text | Container with rectangles
};

export class PlayerUIManager {
  private adapter: PhaserAdapter;
  private scene: any; // Phaser.Scene
  private config: PlayerUIManagerConfig;
  private playerElements: Map<string, Map<string, UIElement>> = new Map(); // playerId -> elementName -> UIElement
  private unsubscribe?: () => void;

  constructor(adapter: PhaserAdapter, scene: any, config: PlayerUIManagerConfig) {
    this.adapter = adapter;
    this.scene = scene;
    this.config = config;

    // Subscribe to state changes
    this.unsubscribe = adapter.onChange((state: any) => {
      this.syncFromState(state);
    });
  }

  /**
   * Get UI element for a specific player
   */
  get(playerId: string, elementName: string): any {
    return this.playerElements.get(playerId)?.get(elementName)?.gameObject;
  }

  /**
   * Manually update all UI (also called automatically on state changes)
   */
  update(): void {
    const state = this.adapter.getRuntime().getState();
    this.syncFromState(state);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Destroy all UI elements
    for (const [playerId, elements] of this.playerElements.entries()) {
      for (const [elementName, element] of elements.entries()) {
        this.destroyElement(element);
      }
    }
    this.playerElements.clear();

    // Unsubscribe from state changes
    this.unsubscribe?.();
  }

  /**
   * Sync UI from state
   */
  private syncFromState(state: any): void {
    if (!state.players) return;

    const existingPlayers = new Set(this.playerElements.keys());

    // Create/update UI for each player
    for (const [playerId, playerData] of Object.entries(state.players) as [string, any][]) {
      existingPlayers.delete(playerId);

      // Get or create element map for this player
      let elements = this.playerElements.get(playerId);
      if (!elements) {
        elements = new Map();
        this.playerElements.set(playerId, elements);
      }

      // Create/update each UI element
      for (const [elementName, elementConfig] of Object.entries(this.config)) {
        const existing = elements.get(elementName);

        // Check if required metadata exists
        const requiredMetadata = (elementConfig as any).requiredMetadata || [];
        const hasMetadata = requiredMetadata.every((key: string) => key in playerData);

        if (!hasMetadata) {
          // Metadata not ready yet - skip creation
          continue;
        }

        if (!existing) {
          // Create new UI element
          const element = this.createElement(elementName, elementConfig, playerId, playerData);
          if (element) {
            elements.set(elementName, element);
          }
        } else {
          // Update existing UI element
          this.updateElement(existing, playerId, playerData);
        }
      }
    }

    // Remove UI for players who left
    for (const playerId of existingPlayers) {
      const elements = this.playerElements.get(playerId);
      if (elements) {
        for (const element of elements.values()) {
          this.destroyElement(element);
        }
      }
      this.playerElements.delete(playerId);
    }
  }

  /**
   * Create a UI element
   */
  private createElement(
    elementName: string,
    config: TextUIConfig | BarUIConfig,
    playerId: string,
    playerData: any
  ): UIElement | null {
    const pos = config.position(playerData, playerId);

    if (this.isTextConfig(config)) {
      // Create text element
      const text = this.scene.add.text(
        pos.x,
        pos.y,
        config.getText(playerData, playerId),
        config.style || {}
      );

      if (config.origin !== undefined) {
        if (typeof config.origin === 'number') {
          text.setOrigin(config.origin);
        } else {
          text.setOrigin(config.origin.x, config.origin.y);
        }
      }

      if (config.depth !== undefined) {
        text.setDepth(config.depth);
      }

      return {
        type: 'text',
        config,
        gameObject: text
      };
    } else {
      // Create bar element (container with two rectangles)
      const container = this.scene.add.container(pos.x, pos.y);

      const bg = this.scene.add.rectangle(0, 0, config.width, config.height, config.backgroundColor);
      const fg = this.scene.add.rectangle(
        0,
        0,
        config.width * config.getValue(playerData, playerId),
        config.height,
        config.foregroundColor
      );

      if (config.origin !== undefined) {
        const originX = typeof config.origin === 'number' ? config.origin : config.origin.x;
        const originY = typeof config.origin === 'number' ? config.origin : config.origin.y;
        bg.setOrigin(originX, originY);
        fg.setOrigin(originX, originY);
      }

      container.add([bg, fg]);

      if (config.depth !== undefined) {
        container.setDepth(config.depth);
      }

      // Store references for updates
      (container as any)._bg = bg;
      (container as any)._fg = fg;

      return {
        type: 'bar',
        config,
        gameObject: container
      };
    }
  }

  /**
   * Update a UI element
   */
  private updateElement(element: UIElement, playerId: string, playerData: any): void {
    const pos = element.config.position(playerData, playerId);

    if (element.type === 'text') {
      const config = element.config as TextUIConfig;
      const text = element.gameObject;

      text.setPosition(pos.x, pos.y);
      text.setText(config.getText(playerData, playerId));
    } else {
      const config = element.config as BarUIConfig;
      const container = element.gameObject;
      const fg = (container as any)._fg;

      container.setPosition(pos.x, pos.y);

      // Update bar width based on value
      const value = Math.max(0, Math.min(1, config.getValue(playerData, playerId)));
      fg.width = config.width * value;
    }
  }

  /**
   * Destroy a UI element
   */
  private destroyElement(element: UIElement): void {
    if (element.gameObject && element.gameObject.destroy) {
      element.gameObject.destroy();
    }
  }

  /**
   * Type guard for TextUIConfig
   */
  private isTextConfig(config: TextUIConfig | BarUIConfig): config is TextUIConfig {
    return 'getText' in config;
  }
}
