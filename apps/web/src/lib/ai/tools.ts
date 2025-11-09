import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { files } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { fastHash } from '$lib/utils/hash';

/**
 * Define AI tools for file operations
 *
 * These tools allow the AI to read, list, and edit files in the project.
 * All tools are scoped to a specific project ID for security.
 *
 * @param projectId - The project to scope tools to
 * @param planMode - If true, provides planning tools (writeSpec); if false, provides coding tools (editFile)
 */
export function createProjectTools(projectId: string, planMode: boolean = false) {
	// Common tools available in both modes
	const commonTools = {
		readFile: tool({
			description: 'Read the contents of a file in the project. Returns version token for safe editing.',
			inputSchema: zodSchema(
				z.object({
					path: z.string().describe('File path, e.g., /src/scenes/GameScene.js')
				})
			),
			execute: async ({ path }: { path: string }) => {
				// Normalize path: auto-prepend / if missing (be forgiving!)
				const normalizedPath = path.startsWith('/') ? path : `/${path}`;

				// Fetch file from database
				const [file] = await db
					.select()
					.from(files)
					.where(and(eq(files.projectId, projectId), eq(files.path, normalizedPath)))
					.limit(1);

				if (!file) {
					return {
						error: 'File not found',
						path: normalizedPath,
						hint: 'Use listFiles() to see available files'
					};
				}

				return {
					path: file.path,
					content: file.content,
					version: fastHash(file.content),
					lines: file.content.split('\n').length,
					size: file.content.length
				};
			}
		}),

		listFiles: tool({
			description: 'List all files in the project to see the structure',
			inputSchema: zodSchema(z.object({})),
			execute: async () => {
				const projectFiles = await db
					.select({
						path: files.path,
						updatedAt: files.updatedAt
					})
					.from(files)
					.where(eq(files.projectId, projectId));

				return {
					files: projectFiles.map((f) => ({
						path: f.path,
						name: f.path.split('/').pop(),
						folder: f.path.split('/').slice(0, -1).join('/') || '/'
					})),
					total: projectFiles.length
				};
			}
		}),

		createFile: tool({
			description:
				'Create a new file in the project. Use this for creating design docs, new game files, or any new content.',
			inputSchema: zodSchema(
				z.object({
					path: z
						.string()
						.describe(
							'File path starting with /, e.g., /docs/game-concept.md or /src/scenes/Level2.js'
						),
					content: z.string().describe('Content of the new file')
				})
			),
			execute: async ({ path, content }: { path: string; content: string }) => {
				// Normalize path
				const normalizedPath = path.startsWith('/') ? path : `/${path}`;

				try {
					// Check if file already exists
					const [existingFile] = await db
						.select()
						.from(files)
						.where(and(eq(files.projectId, projectId), eq(files.path, normalizedPath)))
						.limit(1);

					if (existingFile) {
						return {
							error: 'File already exists',
							path: normalizedPath,
							hint: 'Use editFile() to modify existing files, or readFile() to see current content first'
						};
					}

					// Create new file
					await db.insert(files).values({
						projectId,
						path: normalizedPath,
						content,
						createdAt: new Date(),
						updatedAt: new Date()
					});

					return {
						success: true,
						path: normalizedPath,
						lines: content.split('\n').length,
						size: content.length
					};
				} catch (error) {
					return {
						error: 'Failed to create file',
						details: error instanceof Error ? error.message : String(error)
					};
				}
			}
		})
	};

	// Both modes get editFile, but Plan mode should only edit /docs/ files
	// (validation happens client-side in approval flow)
	return {
		...commonTools,
		editFile: tool({
			description: planMode
				? 'Edit a design document in /docs folder. ALWAYS read the file first to get the version token. Only use for files in /docs/'
				: 'Edit a file by replacing exact text. ALWAYS read the file first to get the version token.',
			inputSchema: zodSchema(
				z.object({
					path: z.string().describe('File path to edit'),
					version: z.string().describe('Version token from readFile (prevents conflicts)'),
					edits: z
						.array(
							z.object({
								old_text: z.string().describe('Exact text to replace'),
								new_text: z.string().describe('New text to insert')
							})
						)
						.describe('Array of search/replace edits to apply sequentially')
				})
			),
			needsApproval: true // 🔑 Require user approval for file modifications
			// ⚠️ NO execute function - client-side execution only!
			// Reasons for client-side mutations:
			// 1. Enables Y.js/CRDT integration - client must own document mutations
			// 2. No race conditions - direct state updates, no fetch/refresh cycles
			// 3. Optimistic UI - instant feedback, async server persistence
			// 4. Version control ready - client tracks each edit operation
			// 5. Future-proof for real-time collaboration
		})
	};
}
