/**
 * Bundler - esbuild-wasm wrapper for in-browser TypeScript compilation
 *
 * Takes TypeScript/JavaScript files and bundles them into a single executable module
 */
import type { VirtualFileSystem } from './VirtualFS';
export interface BundleResult {
    code: string;
    errors: BundleError[];
    warnings: BundleError[];
}
export interface BundleError {
    message: string;
    file?: string;
    line?: number;
    column?: number;
}
export declare class Bundler {
    private initialized;
    /**
     * Initialize esbuild-wasm
     * Must be called once before bundling
     */
    initialize(): Promise<void>;
    /**
     * Bundle files from virtual file system
     *
     * @param vfs Virtual file system containing source files
     * @param entryPoint Entry point file path (e.g., '/src/main.ts')
     * @param globals Global variable mappings for imports
     */
    bundle(vfs: VirtualFileSystem, entryPoint: string, globals?: Record<string, string>): Promise<BundleResult>;
    /**
     * Cleanup esbuild resources
     */
    stop(): void;
}
