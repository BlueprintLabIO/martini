/**
 * SeededRandom - Deterministic Pseudo-Random Number Generator
 *
 * Provides a deterministic PRNG that produces the same sequence of
 * random numbers given the same seed. This ensures all clients in a
 * multiplayer game generate identical random values during setup and gameplay.
 *
 * Uses a simple Linear Congruential Generator (LCG) algorithm which is
 * fast, deterministic, and sufficient for game randomness (not cryptography).
 *
 * @example
 * ```typescript
 * const rng = new SeededRandom(12345);
 *
 * // Generate random numbers
 * rng.next();              // 0.0 to 1.0
 * rng.range(10, 20);       // 10 to 19 (integer)
 * rng.float(0, 100);       // 0.0 to 100.0 (float)
 * rng.choice(['a', 'b']);  // Random element
 * rng.shuffle([1, 2, 3]);  // Shuffled array
 * rng.boolean(0.7);        // 70% chance of true
 * ```
 */
export declare class SeededRandom {
    private state;
    private readonly m;
    private readonly a;
    private readonly c;
    /**
     * Creates a new SeededRandom instance
     *
     * @param seed - Initial seed value (any integer)
     */
    constructor(seed: number);
    /**
     * Generate next random number in sequence
     *
     * @returns Random float in range [0, 1)
     */
    next(): number;
    /**
     * Generate random integer in range [min, max)
     *
     * @param min - Minimum value (inclusive)
     * @param max - Maximum value (exclusive)
     * @returns Random integer in [min, max)
     *
     * @example
     * ```typescript
     * rng.range(0, 10);   // 0-9
     * rng.range(10, 20);  // 10-19
     * rng.range(-5, 5);   // -5 to 4
     * ```
     */
    range(min: number, max: number): number;
    /**
     * Generate random float in range [min, max)
     *
     * @param min - Minimum value (inclusive)
     * @param max - Maximum value (exclusive)
     * @returns Random float in [min, max)
     *
     * @example
     * ```typescript
     * rng.float(0, 1);      // 0.0 to 0.999...
     * rng.float(0, 100);    // 0.0 to 99.999...
     * rng.float(-1, 1);     // -1.0 to 0.999...
     * ```
     */
    float(min: number, max: number): number;
    /**
     * Choose random element from array
     *
     * @param array - Array to choose from
     * @returns Random element from array
     * @throws Error if array is empty
     *
     * @example
     * ```typescript
     * rng.choice(['red', 'blue', 'green']);
     * rng.choice([1, 2, 3, 4, 5]);
     * ```
     */
    choice<T>(array: T[]): T;
    /**
     * Shuffle array (Fisher-Yates algorithm)
     * Returns a new shuffled array without modifying the original
     *
     * @param array - Array to shuffle
     * @returns New shuffled array
     *
     * @example
     * ```typescript
     * const cards = ['A', 'K', 'Q', 'J'];
     * const shuffled = rng.shuffle(cards);
     * // cards is unchanged, shuffled is randomized
     * ```
     */
    shuffle<T>(array: T[]): T[];
    /**
     * Generate random boolean with optional probability
     *
     * @param probability - Probability of returning true (0.0 to 1.0, default 0.5)
     * @returns true or false based on probability
     *
     * @example
     * ```typescript
     * rng.boolean();      // 50% chance of true
     * rng.boolean(0.7);   // 70% chance of true
     * rng.boolean(1.0);   // Always true
     * rng.boolean(0.0);   // Always false
     * ```
     */
    boolean(probability?: number): boolean;
}
//# sourceMappingURL=SeededRandom.d.ts.map