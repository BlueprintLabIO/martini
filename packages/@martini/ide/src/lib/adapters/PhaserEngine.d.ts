/**
 * PhaserEngine - Phaser 3 engine adapter
 *
 * Provides Phaser-specific configuration for the IDE
 */
export interface EngineAdapter {
    /** Engine name */
    readonly name: string;
    /** Required CDN scripts */
    getScripts(): string[];
    /** Global variable mappings for imports */
    getGlobals(): Record<string, string>;
}
export declare class PhaserEngine implements EngineAdapter {
    readonly name = "phaser";
    getScripts(): string[];
    getGlobals(): Record<string, string>;
}
