/**
 * Share Code Generation Utilities
 *
 * Generates unique 6-digit codes for multiplayer game sessions.
 * Excludes ambiguous characters (I, O, 0, 1) to prevent user confusion.
 */

import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Character set for share codes
 * Excludes: I, O, 0, 1 (ambiguous characters)
 * Total: 32 characters (26 letters - 2 + 10 digits - 2)
 */
const SHARE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Length of share code
 */
const SHARE_CODE_LENGTH = 6;

/**
 * Maximum attempts to generate unique code before giving up
 */
const MAX_GENERATION_ATTEMPTS = 10;

/**
 * Generate a random 6-digit share code
 *
 * @returns 6-character uppercase alphanumeric string (excludes I, O, 0, 1)
 * @example "ABC123", "XY4567", "DRAGON"
 */
function generateRandomCode(): string {
	let code = '';

	for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
		const randomIndex = Math.floor(Math.random() * SHARE_CODE_CHARS.length);
		code += SHARE_CODE_CHARS[randomIndex];
	}

	return code;
}

/**
 * Check if a share code already exists in the database
 *
 * @param code - Share code to check
 * @returns true if code exists, false otherwise
 */
async function shareCodeExists(code: string): Promise<boolean> {
	const result = await db.select().from(projects).where(eq(projects.shareCode, code)).limit(1);

	return result.length > 0;
}

/**
 * Generate a unique share code for multiplayer
 *
 * Attempts to generate a random code up to MAX_GENERATION_ATTEMPTS times.
 * If collision occurs, tries again with a new random code.
 *
 * @returns Promise<string> Unique 6-digit share code
 * @throws Error if unable to generate unique code after max attempts
 *
 * @example
 * const code = await generateUniqueShareCode();
 * // => "ABC123"
 */
export async function generateUniqueShareCode(): Promise<string> {
	for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
		const code = generateRandomCode();

		// Check if code already exists
		const exists = await shareCodeExists(code);

		if (!exists) {
			return code;
		}

		console.log(`[ShareCode] Collision on attempt ${attempt + 1}: ${code} already exists`);
	}

	// If we get here, we failed to generate a unique code
	throw new Error(
		`Failed to generate unique share code after ${MAX_GENERATION_ATTEMPTS} attempts. This is extremely unlikely and may indicate a database issue.`
	);
}

/**
 * Validate share code format
 *
 * @param code - Code to validate
 * @returns true if valid format, false otherwise
 */
export function isValidShareCode(code: string): boolean {
	if (!code || typeof code !== 'string') {
		return false;
	}

	// Must be exactly 6 characters
	if (code.length !== SHARE_CODE_LENGTH) {
		return false;
	}

	// Must be uppercase
	if (code !== code.toUpperCase()) {
		return false;
	}

	// Must only contain allowed characters
	for (const char of code) {
		if (!SHARE_CODE_CHARS.includes(char)) {
			return false;
		}
	}

	return true;
}

/**
 * Get project by share code
 *
 * @param code - Share code to look up
 * @returns Project with files, or null if not found
 */
export async function getProjectByShareCode(code: string) {
	if (!isValidShareCode(code)) {
		return null;
	}

	const result = await db.select().from(projects).where(eq(projects.shareCode, code)).limit(1);

	if (result.length === 0) {
		return null;
	}

	return result[0];
}

/**
 * Clear share code (unpublish multiplayer game)
 *
 * @param projectId - Project ID to unpublish
 */
export async function clearShareCode(projectId: string): Promise<void> {
	await db
		.update(projects)
		.set({
			shareCode: null,
			state: 'draft'
		})
		.where(eq(projects.id, projectId));
}
