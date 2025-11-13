import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, assets } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

// POST /api/projects/[id]/chat-images - Upload chat image (hidden from AI/game assets)
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

	// Parse multipart form data
	const formData = await request.formData();
	const file = formData.get('file') as File;

	if (!file) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	// Validate file type
	if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
		return json(
			{
				error: 'Invalid file type',
				details: `Allowed types: PNG, JPEG, GIF, WebP`
			},
			{ status: 400 }
		);
	}

	// Validate file size
	if (file.size > MAX_FILE_SIZE) {
		return json(
			{
				error: 'File too large',
				details: `Maximum file size is 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
			},
			{ status: 400 }
		);
	}

	// Generate unique filename with timestamp to avoid collisions
	const timestamp = Date.now();
	const sanitizedFilename = file.name
		.replace(/[^a-zA-Z0-9.-]/g, '_')
		.replace(/_{2,}/g, '_');
	const uniqueFilename = `chat_${timestamp}_${sanitizedFilename}`;

	// Storage path: project-assets/{projectId}/chat/{uniqueFilename}
	const storagePath = `${params.id}/chat/${uniqueFilename}`;

	// Upload to Supabase Storage
	const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
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

	const { data: uploadData, error: uploadError } = await supabase.storage
		.from('project-assets')
		.upload(storagePath, file, {
			cacheControl: '3600',
			upsert: false // Don't overwrite - each chat image is unique
		});

	if (uploadError) {
		console.error('Supabase upload error:', uploadError);
		return json(
			{
				error: 'Failed to upload file',
				details: uploadError.message
			},
			{ status: 500 }
		);
	}

	// Save metadata to database with isChat flag
	try {
		const [newAsset] = await db
			.insert(assets)
			.values({
				projectId: params.id,
				filename: uniqueFilename,
				storagePath: uploadData.path,
				fileType: 'image',
				assetType: 'image',
				sizeBytes: file.size,
				metadata: { isChat: true } // Mark as chat image (hidden from AI/game assets)
			})
			.returning();

		// Get public URL
		const { data: urlData } = supabase.storage
			.from('project-assets')
			.getPublicUrl(uploadData.path);

		return json(
			{
				success: true,
				asset: {
					id: newAsset.id,
					filename: newAsset.filename,
					url: urlData.publicUrl,
					sizeBytes: newAsset.sizeBytes,
					mediaType: file.type // Return the media type for AI SDK
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Database insert error:', error);
		// Cleanup: delete from storage if DB insert failed
		await supabase.storage.from('project-assets').remove([uploadData.path]);

		return json(
			{
				error: 'Failed to save asset metadata',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
