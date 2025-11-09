import { streamText, convertToModelMessages, stepCountIs, tool, zodSchema, type UIMessage } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, files } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { SECRET_COMPLETION_URL, SECRET_COMPLETION_KEY } from '$env/static/private';
import { fastHash } from '$lib/utils/hash';
import { applyEdits, generateUnifiedDiff } from '$lib/utils/diff';
import { MULTIPLAYER_PROMPT_SHORT } from '$lib/ai/multiplayer-prompt';

// DeepSeek client (official provider)
const deepseek = createDeepSeek({
	baseURL: SECRET_COMPLETION_URL,
	apiKey: SECRET_COMPLETION_KEY
});

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are a friendly Phaser 3 game coding teacher helping kids create their first games! 🎮

YOUR TEACHING STYLE:
- Be SUPER encouraging and positive! Every question is a great question!
- Explain things simply, like you're talking to a curious 10-year-old
- Use fun analogies (e.g., "scenes are like different levels in Mario")
- Break down complex ideas into bite-sized pieces
- Celebrate their progress and creativity!

HOW TO HELP:
1. ALWAYS read files first before making changes (so you know what's there!)
2. Explain what the current code does in simple terms
3. Suggest ONE small improvement at a time (baby steps = better learning!)
4. Use fun examples: "Let's make the player jump higher like Mario!"
5. Teach WHY something works, not just HOW

PHASER BASICS TO TEACH:
- Sprites: Pictures that move (player, enemies, coins)
- Scenes: Different screens (menu, game, game over)
- Physics: Makes things fall, bounce, and collide
- Input: Keyboard arrows, mouse clicks
- Animations: Make sprites look alive!

BE EXTREMELY CONCISE:
- Keep responses SHORT (2-3 sentences max before taking action)
- Don't explain everything at once - let them ask follow-up questions!
- Example: "I see you want the player to jump! Let me check the Player.js file first." then DO IT.

Remember: You're not just writing code - you're teaching kids how to bring their game ideas to life! Make it FUN! 🚀

---

${MULTIPLAYER_PROMPT_SHORT}`;

export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Get request body
	const { messages }: { messages: UIMessage[] } = await request.json();

	if (!messages || !Array.isArray(messages)) {
		return json({ error: 'Invalid messages format' }, { status: 400 });
	}

	// Extract projectId from ANY message's metadata (approval messages don't have it)
	// Search from newest to oldest to find the most recent projectId
	let projectId: string | undefined;
	for (let i = messages.length - 1; i >= 0; i--) {
		const metadata = messages[i]?.metadata as { projectId?: string } | undefined;
		if (metadata?.projectId) {
			projectId = metadata.projectId;
			break;
		}
	}

	console.log('=== CHAT API DEBUG ===');
	console.log('Extracted projectId from messages:', projectId);

	if (!projectId) {
		return json({ error: 'Missing projectId in message metadata' }, { status: 400 });
	}

	// Verify project ownership
	const [project] = await db
		.select()
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);

	if (!project) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	if (project.userId !== user.id) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	// Fetch project files for system prompt context
	const projectFiles = await db
		.select({
			path: files.path
		})
		.from(files)
		.where(eq(files.projectId, projectId));

	// Build dynamic system prompt with file tree
	const fileListSection = projectFiles.length > 0
		? `\n\nPROJECT FILES:\n${projectFiles.map(f => f.path).join('\n')}\n\nUse readFile(path) to read any of these files. Paths must start with / (e.g., /src/scenes/GameScene.js)`
		: '';

	const dynamicSystemPrompt = SYSTEM_PROMPT + fileListSection;

	// Define tools for the AI using AI SDK 6 pattern
	const tools = {
		readFile: tool({
			description: 'Read the contents of a file in the project. Returns version token for safe editing.',
			inputSchema: zodSchema(z.object({
				path: z.string().describe('File path, e.g., /src/scenes/GameScene.js')
			})),
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

		editFile: tool({
			description:
				'Edit a file by replacing exact text. ALWAYS read the file first to get the version token.',
			inputSchema: zodSchema(z.object({
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
			})),
			needsApproval: true, // 🔑 Require user approval for file modifications
			execute: async ({ path, version, edits }: { path: string; version: string; edits: Array<{ old_text: string; new_text: string }> }) => {
				// Normalize path: auto-prepend / if missing (be forgiving!)
				const normalizedPath = path.startsWith('/') ? path : `/${path}`;

				// Fetch current file
				const [file] = await db
					.select()
					.from(files)
					.where(and(eq(files.projectId, projectId), eq(files.path, normalizedPath)))
					.limit(1);

				if (!file) {
					return { error: 'File not found', path: normalizedPath };
				}

				// Verify version token (optimistic concurrency)
				const currentVersion = fastHash(file.content);
				if (currentVersion !== version) {
					return {
						error: 'File has been modified since you read it',
						expected_version: version,
						current_version: currentVersion,
						hint: 'Read the file again to get the latest version'
					};
				}

				try {
					// Apply edits using search/replace
					const newContent = applyEdits(file.content, edits);

					// Generate unified diff for approval UI
					const diff = generateUnifiedDiff(normalizedPath, file.content, newContent);

					// Save to database
					await db
						.update(files)
						.set({
							content: newContent,
							updatedAt: new Date()
						})
						.where(and(eq(files.projectId, projectId), eq(files.path, normalizedPath)));

					return {
						success: true,
						path: normalizedPath,
						diff,
						old_version: version,
						new_version: fastHash(newContent),
						changes: {
							old_size: file.content.length,
							new_size: newContent.length,
							old_lines: file.content.split('\n').length,
							new_lines: newContent.split('\n').length
						}
					};
				} catch (error) {
					return {
						error: 'Failed to apply edits',
						details: error instanceof Error ? error.message : String(error)
					};
				}
			}
		})
	};

	try {
		// Stream response from DeepSeek
		const result = streamText({
			model: deepseek('deepseek-chat'),
			system: dynamicSystemPrompt,
			messages: convertToModelMessages(messages),
			tools,
			stopWhen: stepCountIs(5), // Allow up to 5 steps for multi-step tool calls
			temperature: 0.7
		});

		// Return streaming response (AI SDK v5 uses toUIMessageStreamResponse)
		return result.toUIMessageStreamResponse();
	} catch (error) {
		console.error('Chat API error:', error);
		return json(
			{
				error: 'Failed to generate response',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
