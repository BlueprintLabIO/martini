/**
 * LobbyUI - Simple, reusable lobby UI for Phaser games
 *
 * Shows lobby state, player list, ready indicators, and start button
 *
 * @example
 * ```ts
 * this.lobbyUI = this.adapter.createLobbyUI({
 *   title: 'Paddle Battle',
 *   subtitle: 'Waiting for players...',
 *   position: { x: 400, y: 200 }
 * });
 * ```
 */
import type { PhaserAdapter } from '../PhaserAdapter.js';
import type Phaser from 'phaser';
import type { LobbyState } from '@martini-kit/core';
export interface LobbyUIConfig {
    /** Title text */
    title?: string;
    /** Subtitle text (shown below title) */
    subtitle?: string;
    /** Position of the lobby UI */
    position?: {
        x: number;
        y: number;
    };
    /** Title style */
    titleStyle?: Phaser.Types.GameObjects.Text.TextStyle;
    /** Subtitle style */
    subtitleStyle?: Phaser.Types.GameObjects.Text.TextStyle;
    /** Player list style */
    playerStyle?: Phaser.Types.GameObjects.Text.TextStyle;
    /** Button style */
    buttonStyle?: {
        fill: number;
        textColor: string;
        fontSize: string;
    };
    /** Show instructions */
    showInstructions?: boolean;
}
export declare class LobbyUI {
    private adapter;
    private scene;
    private container;
    private titleText?;
    private subtitleText?;
    private playerListText?;
    private readyButton?;
    private readyButtonText?;
    private startButton?;
    private startButtonText?;
    private instructionsText?;
    private statusText?;
    private isReady;
    private config;
    constructor(adapter: PhaserAdapter, scene: Phaser.Scene, config?: LobbyUIConfig);
    private createUI;
    private createButton;
    private toggleReady;
    private startGame;
    /**
     * Update the lobby UI based on current state
     * Call this in your scene's update() or onChange() callback
     */
    update(lobbyState: LobbyState): void;
    private updatePlayerList;
    private updateStatusText;
    private canStartGame;
    /**
     * Show the lobby UI
     */
    show(): void;
    /**
     * Hide the lobby UI
     */
    hide(): void;
    /**
     * Destroy the lobby UI
     */
    destroy(): void;
    /**
     * Check if lobby UI is visible
     */
    isVisible(): boolean;
}
/**
 * Helper method to create LobbyUI on PhaserAdapter
 */
export declare function attachLobbyUI(adapter: PhaserAdapter, scene: Phaser.Scene, config?: LobbyUIConfig): LobbyUI;
//# sourceMappingURL=LobbyUI.d.ts.map