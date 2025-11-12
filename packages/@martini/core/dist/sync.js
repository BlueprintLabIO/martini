/**
 * State synchronization using diffs/patches
 * Kept from v1 because it's efficient and engine-agnostic
 */
/**
 * Generate a minimal diff between two states
 */
export function generateDiff(oldState, newState) {
    const patches = [];
    function diff(oldVal, newVal, path = []) {
        // Type change or primitive difference
        if (typeof oldVal !== typeof newVal || oldVal === null || newVal === null) {
            if (oldVal !== newVal) {
                patches.push({ op: 'replace', path, value: newVal });
            }
            return;
        }
        // Array handling
        if (Array.isArray(newVal)) {
            if (!Array.isArray(oldVal) || oldVal.length !== newVal.length) {
                patches.push({ op: 'replace', path, value: newVal });
                return;
            }
            for (let i = 0; i < newVal.length; i++) {
                diff(oldVal[i], newVal[i], [...path, String(i)]);
            }
            return;
        }
        // Object handling
        if (typeof newVal === 'object') {
            const oldKeys = Object.keys(oldVal || {});
            const newKeys = Object.keys(newVal || {});
            // Check removed keys
            for (const key of oldKeys) {
                if (!(key in newVal)) {
                    patches.push({ op: 'remove', path: [...path, key] });
                }
            }
            // Check added/changed keys
            for (const key of newKeys) {
                if (!(key in oldVal)) {
                    patches.push({ op: 'add', path: [...path, key], value: newVal[key] });
                }
                else {
                    diff(oldVal[key], newVal[key], [...path, key]);
                }
            }
            return;
        }
        // Primitive comparison
        if (oldVal !== newVal) {
            patches.push({ op: 'replace', path, value: newVal });
        }
    }
    diff(oldState, newState);
    return patches;
}
/**
 * Apply a patch to state (mutates state)
 */
export function applyPatch(state, patch) {
    const { op, path, value } = patch;
    if (path.length === 0) {
        throw new Error('Cannot patch root - path must have at least one element');
    }
    // Navigate to parent
    let current = state;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (!(key in current)) {
            current[key] = {};
        }
        current = current[key];
    }
    const finalKey = path[path.length - 1];
    switch (op) {
        case 'add':
        case 'replace':
            current[finalKey] = value;
            break;
        case 'remove':
            if (Array.isArray(current)) {
                current.splice(Number(finalKey), 1);
            }
            else {
                delete current[finalKey];
            }
            break;
    }
}
/**
 * Deep clone an object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (obj instanceof Array)
        return obj.map(item => deepClone(item));
    const cloned = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}
//# sourceMappingURL=sync.js.map