/**
 * State synchronization using diffs/patches
 * Kept from v1 because it's efficient and engine-agnostic
 */
export interface Patch {
    op: 'replace' | 'add' | 'remove';
    path: string[];
    value?: any;
}
/**
 * Generate a minimal diff between two states
 */
export declare function generateDiff(oldState: any, newState: any): Patch[];
/**
 * Apply a patch to state (mutates state)
 */
export declare function applyPatch(state: any, patch: Patch): void;
/**
 * Deep clone an object
 */
export declare function deepClone<T>(obj: T): T;
//# sourceMappingURL=sync.d.ts.map