import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SECRET_SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

/**
 * GET /api/starter-assets - List all starter assets from the starter-assets bucket
 * Returns assets organized by category (spritesheets, sounds) with metadata
 *
 * Note: Uses service role key for listing bucket contents (required permission)
 */
export const GET: RequestHandler = async () => {
	// Use service role key - required to list bucket contents even for public buckets
	const supabase = createClient(PUBLIC_SUPABASE_URL, SECRET_SUPABASE_SERVICE_ROLE_KEY);

	try {
		// List all files in starter-assets bucket
		const { data: files, error } = await supabase.storage.from('starter-assets').list('', {
			limit: 1000,
			sortBy: { column: 'name', order: 'asc' }
		});

		if (error) {
			return json({
				error: 'Failed to fetch starter assets',
				details: error.message
			}, { status: 500 });
		}

		// Recursively list files in subdirectories
		const allFiles: Array<{ name: string; path: string; size: number }> = [];

		async function listDirectory(path: string) {
			const { data: items, error } = await supabase.storage.from('starter-assets').list(path, {
				limit: 1000,
				sortBy: { column: 'name', order: 'asc' }
			});

			if (error) {
				return;
			}

			for (const item of items || []) {
				const itemPath = path ? `${path}/${item.name}` : item.name;

				// Skip metadata.json
				if (item.name === 'metadata.json') {
					continue;
				}

				// If it's a folder, recurse
				if (!item.metadata && item.name.indexOf('.') === -1) {
					await listDirectory(itemPath);
				} else if (item.metadata) {
					// It's a file
					allFiles.push({
						name: item.name,
						path: itemPath,
						size: item.metadata.size || 0
					});
				}
			}
		}

		// List spritesheets and sounds directories
		await listDirectory('spritesheets');
		await listDirectory('sounds');

		// Organize assets by type
		const spritesheets = allFiles
			.filter(f => f.path.startsWith('spritesheets/') && f.name.match(/\.(png|jpg|jpeg|gif|webp)$/i))
			.map(f => {
				const { data } = supabase.storage.from('starter-assets').getPublicUrl(f.path);
				return {
					id: `starter-${f.path.replace(/[^a-zA-Z0-9]/g, '-')}`,
					filename: f.name,
					path: f.path,
					fileType: 'image' as const,
					assetType: 'spritesheet' as const,
					sizeBytes: f.size,
					url: data.publicUrl,
					isStarter: true
				};
			});

		const sounds = allFiles
			.filter(f => f.path.startsWith('sounds/') && f.name.match(/\.(mp3|wav|ogg|m4a)$/i))
			.map(f => {
				const { data } = supabase.storage.from('starter-assets').getPublicUrl(f.path);
				return {
					id: `starter-${f.path.replace(/[^a-zA-Z0-9]/g, '-')}`,
					filename: f.name,
					path: f.path,
					fileType: 'audio' as const,
					assetType: 'audio' as const,
					sizeBytes: f.size,
					url: data.publicUrl,
					isStarter: true
				};
			});

		return json({
			assets: {
				spritesheets,
				sounds,
				total: spritesheets.length + sounds.length
			}
		});
	} catch (error) {
		console.error('Unexpected error fetching starter assets:', error);
		return json(
			{
				error: 'Failed to fetch starter assets',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
