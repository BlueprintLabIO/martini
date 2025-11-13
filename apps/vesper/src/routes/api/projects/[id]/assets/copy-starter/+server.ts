import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, assets } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { SECRET_SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

/**
 * POST /api/projects/[id]/assets/copy-starter
 * Copy a starter asset to a user's project
 *
 * Body: { starterPath: string } - Path in starter-assets bucket (e.g., "spritesheets/characters.png")
 */
export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Verify project ownership
	const [project] = await db
		.select()
		.from(projects)
		.where(eq(projects.id, params.id))
		.limit(1);

	if (!project) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	if (project.userId !== user.id) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	// Parse request body
	const body = await request.json();
	const { starterPath } = body;

	if (!starterPath || typeof starterPath !== 'string') {
		return json({ error: 'Invalid starter asset path' }, { status: 400 });
	}

	// Validate path is from allowed directories
	if (!starterPath.startsWith('spritesheets/') && !starterPath.startsWith('sounds/')) {
		return json({ error: 'Invalid starter asset path' }, { status: 400 });
	}

	// Extract filename from path
	const filename = starterPath.split('/').pop();
	if (!filename) {
		return json({ error: 'Invalid filename' }, { status: 400 });
	}

	// Check if asset already exists in this project
	const existingAsset = await db
		.select()
		.from(assets)
		.where(and(eq(assets.projectId, params.id), eq(assets.filename, filename)))
		.limit(1);

	if (existingAsset.length > 0) {
		return json(
			{
				error: 'Asset already exists',
				details: `"${filename}" is already in this project`,
				asset: existingAsset[0]
			},
			{ status: 409 }
		);
	}

	// Create service role client for downloading from starter-assets (requires elevated permissions)
	const serviceSupabase = createClient(PUBLIC_SUPABASE_URL, SECRET_SUPABASE_SERVICE_ROLE_KEY);

	// Create authenticated client for uploading to project-assets (uses user's session)
	const userSupabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: options.path ?? '/' });
				});
			}
		}
	});

	try {
		// Download the file from starter-assets bucket using service role key
		const { data: downloadData, error: downloadError } = await serviceSupabase.storage
			.from('starter-assets')
			.download(starterPath);

		if (downloadError) {
			console.error('Error downloading starter asset:', downloadError);
			return json(
				{
					error: 'Failed to download starter asset',
					details: downloadError.message
				},
				{ status: 500 }
			);
		}

		// Determine file type from extension
		const ext = filename.split('.').pop()?.toLowerCase();
		const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
		const audioExts = ['mp3', 'wav', 'ogg', 'm4a'];

		let fileType: 'image' | 'audio';
		let assetType: string;

		if (imageExts.includes(ext || '')) {
			fileType = 'image';
			assetType = starterPath.startsWith('spritesheets/') ? 'spritesheet' : 'image';
		} else if (audioExts.includes(ext || '')) {
			fileType = 'audio';
			assetType = 'audio';
		} else {
			return json({ error: 'Unsupported file type' }, { status: 400 });
		}

		// Upload to user's project-assets bucket using authenticated client
		const projectStoragePath = `${params.id}/${filename}`;
		const { data: uploadData, error: uploadError } = await userSupabase.storage
			.from('project-assets')
			.upload(projectStoragePath, downloadData, {
				cacheControl: '3600',
				upsert: true,
				contentType: downloadData.type
			});

		if (uploadError) {
			console.error('Error uploading to project-assets:', uploadError);
			return json(
				{
					error: 'Failed to copy asset to project',
					details: uploadError.message
				},
				{ status: 500 }
			);
		}

		// Save metadata to database
		const [newAsset] = await db
			.insert(assets)
			.values({
				projectId: params.id,
				filename,
				storagePath: uploadData.path,
				fileType,
				assetType,
				sizeBytes: downloadData.size,
				metadata: starterPath.startsWith('spritesheets/')
					? { isFromStarter: true, originalPath: starterPath }
					: { isFromStarter: true, originalPath: starterPath }
			})
			.returning();

		// Get public URL
		const { data: urlData } = userSupabase.storage
			.from('project-assets')
			.getPublicUrl(uploadData.path);

		return json(
			{
				success: true,
				asset: {
					...newAsset,
					url: urlData.publicUrl
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Unexpected error copying starter asset:', error);
		return json(
			{
				error: 'Failed to copy starter asset',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
