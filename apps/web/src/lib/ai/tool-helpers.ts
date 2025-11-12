/**
 * Utility functions for AI tool rendering and processing
 */

/**
 * Extract a preview snippet from edits showing before/after context
 *
 * Edits are search/replace operations with old_text and new_text properties.
 * This function finds where the first edit occurs and shows surrounding context.
 *
 * @param originalContent - The original file content before edits
 * @param edits - Array of edit operations with old_text and new_text
 * @returns Object with before/after snippets and line number, or null if no valid preview
 */
export function extractDiffPreview(
	originalContent: string,
	edits: Array<{ old_text: string; new_text: string }>
): { before: string; after: string; lineStart: number } | null {
	if (!edits || edits.length === 0) return null;

	const firstEdit = edits[0];
	if (!firstEdit.old_text || firstEdit.new_text === undefined) return null;

	// Find where the old_text appears in the original content
	const matchIndex = originalContent.indexOf(firstEdit.old_text);
	if (matchIndex === -1) {
		// Text not found, show first 200 chars of old_text and new_text
		return {
			before: firstEdit.old_text.slice(0, 200),
			after: firstEdit.new_text.slice(0, 200),
			lineStart: 1
		};
	}

	// Calculate line number from character position
	const beforeMatch = originalContent.slice(0, matchIndex);
	const lineNumber = beforeMatch.split('\n').length;

	// Extract context: 3 lines before + first changed line + 3 lines after
	const lines = originalContent.split('\n');
	const contextBefore = 3;
	const contextAfter = 3;

	// Find the first line where the change starts
	const changeStartLine = lineNumber - 1; // -1 for 0-indexed
	const startLine = Math.max(0, changeStartLine - contextBefore);
	const endLine = Math.min(lines.length, changeStartLine + 1 + contextAfter); // +1 to include the changed line itself

	// Extract before snippet (with context)
	const beforeLines = lines.slice(startLine, endLine);
	const before = beforeLines.join('\n');

	// Extract after snippet (replace old with new in context)
	const afterContent =
		originalContent.slice(0, matchIndex) +
		firstEdit.new_text +
		originalContent.slice(matchIndex + firstEdit.old_text.length);
	const afterLines = afterContent.split('\n').slice(startLine, endLine);
	const after = afterLines.join('\n');

	return {
		before: before || '(empty)',
		after: after || '(empty)',
		lineStart: lineNumber
	};
}

/**
 * Normalize a file path to always start with /
 *
 * @param path - File path that may or may not start with /
 * @returns Normalized path starting with /
 */
export function normalizeFilePath(path: string): string {
	return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted string like "1.5 KB"
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Count lines in text content
 *
 * @param content - Text content
 * @returns Number of lines
 */
export function countLines(content: string): number {
	return content.split('\n').length;
}
