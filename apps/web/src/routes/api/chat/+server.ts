import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, files, assets } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { SECRET_COMPLETION_URL, SECRET_COMPLETION_KEY } from '$env/static/private';
import { buildSystemPrompt } from '$lib/ai/system-prompt';
import { createProjectTools } from '$lib/ai/tools';

// DeepSeek client (official provider)
const deepseek = createDeepSeek({
	baseURL: SECRET_COMPLETION_URL,
	apiKey: SECRET_COMPLETION_KEY
});

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

	// Extract projectId and planMode from ANY message's metadata (approval messages don't have it)
	// Search from newest to oldest to find the most recent values
	let projectId: string | undefined;
	let planMode: boolean = false;
	for (let i = messages.length - 1; i >= 0; i--) {
		const metadata = messages[i]?.metadata as { projectId?: string; planMode?: boolean } | undefined;
		if (metadata?.projectId && !projectId) {
			projectId = metadata.projectId;
		}
		if (metadata?.planMode !== undefined && planMode === false) {
			planMode = metadata.planMode;
		}
		// Break early if we found both
		if (projectId && planMode !== false) break;
	}

	console.log('=== CHAT API DEBUG ===');
	console.log('Extracted projectId from messages:', projectId);
	console.log('Extracted planMode from messages:', planMode);

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

	// Fetch project assets for system prompt context
	const projectAssets = await db
		.select({
			filename: assets.filename,
			fileType: assets.fileType,
			assetType: assets.assetType,
			sizeBytes: assets.sizeBytes,
			metadata: assets.metadata
		})
		.from(assets)
		.where(eq(assets.projectId, projectId));

	// Build dynamic system prompt with file tree and assets
	const dynamicSystemPrompt = buildSystemPrompt(projectFiles, projectAssets, planMode);

	// Create project-scoped tools (different tools for plan vs act mode)
	const tools = createProjectTools(projectId, planMode);

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
