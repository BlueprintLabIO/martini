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

export class SeededRandom {
  private state: number;

  // LCG parameters (from Numerical Recipes)
  private readonly m = 0x80000000; // 2^31
  private readonly a = 1103515245;
  private readonly c = 12345;

  /**
   * Creates a new SeededRandom instance
   *
   * @param seed - Initial seed value (any integer)
   */
  constructor(seed: number) {
    // Ensure seed is a positive integer
    this.state = Math.abs(Math.floor(seed)) % this.m;
    if (this.state === 0) this.state = 1;
  }

  /**
   * Generate next random number in sequence
   *
   * @returns Random float in range [0, 1)
   */
  next(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }

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
  range(min: number, max: number): number {
    if (min === max) return min;
    return Math.floor(this.next() * (max - min)) + min;
  }

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
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

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
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return array[this.range(0, array.length)];
  }

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
  shuffle<T>(array: T[]): T[] {
    if (array.length <= 1) return [...array];

    const result = [...array];

    // Fisher-Yates shuffle
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.range(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

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
  boolean(probability = 0.5): boolean {
    return this.next() < probability;
  }
}
