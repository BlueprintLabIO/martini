import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, assets } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES];

// GET /api/projects/[id]/assets - List all assets for a project
export const GET: RequestHandler = async ({ params, locals }) => {
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

	// Get all assets for this project
	const projectAssets = await db
		.select()
		.from(assets)
		.where(eq(assets.projectId, params.id))
		.orderBy(assets.createdAt);

	// Get public URLs for each asset
	const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return [];
			}
		}
	});

	const assetsWithUrls = projectAssets.map((asset) => {
		const { data } = supabase.storage
			.from('project-assets')
			.getPublicUrl(asset.storagePath);

		return {
			...asset,
			url: data.publicUrl
		};
	});

	return json({ assets: assetsWithUrls });
};

// POST /api/projects/[id]/assets - Upload a new asset
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
	if (!ALLOWED_TYPES.includes(file.type)) {
		return json(
			{
				error: 'Invalid file type',
				details: `Allowed types: Images (PNG, JPEG, GIF, WebP) and Audio (MP3, WAV, OGG)`
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

	// Determine file type and asset type
	const fileType = ALLOWED_IMAGE_TYPES.includes(file.type) ? 'image' : 'audio';
	const assetType = fileType; // For now, assetType === fileType. Later: spritesheet, atlas, etc.

	// Sanitize filename (remove special chars, spaces)
	const sanitizedFilename = file.name
		.replace(/[^a-zA-Z0-9.-]/g, '_')
		.replace(/_{2,}/g, '_');

	// Storage path: project-assets/{projectId}/{filename}
	const storagePath = `${params.id}/${sanitizedFilename}`;

	// Upload to Supabase Storage
	const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, options);
				});
			}
		}
	});

	const { data: uploadData, error: uploadError } = await supabase.storage
		.from('project-assets')
		.upload(storagePath, file, {
			cacheControl: '3600',
			upsert: true // Overwrite if exists
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

	// Save metadata to database
	try {
		const [newAsset] = await db
			.insert(assets)
			.values({
				projectId: params.id,
				filename: sanitizedFilename,
				storagePath: uploadData.path,
				fileType,
				assetType,
				sizeBytes: file.size,
				metadata: null // Future: store image dimensions, audio duration, etc.
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
					...newAsset,
					url: urlData.publicUrl
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
