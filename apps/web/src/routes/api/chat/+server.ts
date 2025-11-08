import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, files } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { SECRET_COMPLETION_URL, SECRET_COMPLETION_KEY } from '$env/static/private';

// DeepSeek client (OpenAI-compatible API)
const deepseek = createOpenAI({
	baseURL: SECRET_COMPLETION_URL,
	apiKey: SECRET_COMPLETION_KEY
});

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are an expert Phaser 3 game developer helping a student create their game.

CURRENT PROJECT STRUCTURE:
- /index.html - Main HTML file with Phaser CDN
- /src/main.js - Phaser configuration and game initialization
- /src/scenes/BootScene.js - Boot scene (runs first, minimal setup)
- /src/scenes/PreloadScene.js - Asset loading scene with progress bar
- /src/scenes/GameScene.js - Main game scene (where gameplay happens)
- /src/entities/Player.js - Player entity class

TOOLS AVAILABLE:
- readFile(path) - Read any file to understand current code
- listFiles() - See all files in the project

RULES:
1. ALWAYS read files before suggesting changes
2. Keep explanations simple and friendly
3. Focus on teaching, not just giving answers
4. Suggest one change at a time
5. Use Phaser 3 best practices

When the user asks questions:
1. Read relevant files first
2. Explain what the current code does
3. Suggest improvements or additions
4. Be encouraging and positive!`;

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Get projectId from query params
	const projectId = url.searchParams.get('projectId');

	if (!projectId) {
		return json({ error: 'Missing projectId' }, { status: 400 });
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

	// Get request body
	const body = await request.json();
	const { messages } = body;

	if (!messages || !Array.isArray(messages)) {
		return json({ error: 'Invalid messages format' }, { status: 400 });
	}

	// Define tools for the AI
	const tools = {
		readFile: {
			description: 'Read the contents of a file in the project',
			parameters: z.object({
				path: z.string().describe('File path, e.g., /src/scenes/GameScene.js')
			}),
			execute: async ({ path }: { path: string }) => {
				// Validate path
				if (!path.startsWith('/')) {
					return { error: 'Path must start with /', path };
				}

				// Fetch file from database
				const [file] = await db
					.select()
					.from(files)
					.where(and(eq(files.projectId, projectId), eq(files.path, path)))
					.limit(1);

				if (!file) {
					return {
						error: 'File not found',
						path,
						hint: 'Use listFiles() to see available files'
					};
				}

				return {
					path: file.path,
					content: file.content,
					lines: file.content.split('\n').length,
					size: file.content.length
				};
			}
		},

		listFiles: {
			description: 'List all files in the project to see the structure',
			parameters: z.object({}),
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
		}
	};

	try {
		// Stream response from DeepSeek
		const result = streamText({
			model: deepseek('deepseek-chat'),
			messages: [
				{
					role: 'system',
					content: SYSTEM_PROMPT
				},
				...messages
			],
			tools,
			maxSteps: 5, // Allow multiple tool calls
			temperature: 0.7
		});

		// Return streaming response
		return result.toDataStreamResponse();
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
