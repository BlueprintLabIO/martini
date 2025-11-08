import { createTwoFilesPatch } from 'diff';

export interface Edit {
	old_text: string;
	new_text: string;
}

/**
 * Apply search/replace edits to content.
 *
 * Applies edits sequentially in order. Each edit replaces ALL occurrences
 * of old_text with new_text (global replacement).
 *
 * @param content - Original file content
 * @param edits - Array of {old_text, new_text} edits
 * @returns New content with edits applied
 * @throws Error if old_text not found in content
 */
export function applyEdits(content: string, edits: Edit[]): string {
	let newContent = content;

	for (const edit of edits) {
		// Escape regex special characters for safe replacement
		const escapedOld = edit.old_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(escapedOld, 'g');

		// Check if text exists
		if (!regex.test(newContent)) {
			throw new Error(
				`Text not found: "${edit.old_text.slice(0, 50)}${edit.old_text.length > 50 ? '...' : ''}"`
			);
		}

		// Apply global replacement
		newContent = newContent.replace(regex, edit.new_text);
	}

	return newContent;
}

/**
 * Generate unified diff (git-style) between old and new content.
 *
 * Uses Myers diff algorithm (same as git) for minimal, human-readable diffs.
 *
 * @param path - File path (for diff header)
 * @param oldContent - Original content
 * @param newContent - New content after edits
 * @param context - Number of context lines (default: 3, industry standard)
 * @returns Unified diff string with +/- lines
 */
export function generateUnifiedDiff(
	path: string,
	oldContent: string,
	newContent: string,
	context = 3
): string {
	return createTwoFilesPatch(
		path, // old file header
		path, // new file header
		oldContent,
		newContent,
		'', // old file timestamp (empty for simplicity)
		'', // new file timestamp
		{ context } // ±N lines around changes
	);
}

/**
 * Count changes in a diff.
 */
export function countChanges(oldContent: string, newContent: string) {
	const oldLines = oldContent.split('\n').length;
	const newLines = newContent.split('\n').length;

	return {
		additions: Math.max(0, newLines - oldLines),
		deletions: Math.max(0, oldLines - newLines),
		old_size: oldContent.length,
		new_size: newContent.length
	};
}
