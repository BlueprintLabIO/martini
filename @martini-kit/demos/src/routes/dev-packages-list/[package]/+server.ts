import { json } from '@sveltejs/kit';
import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';

/**
 * List files in a directory recursively
 */
function listFilesRecursive(dir: string, baseDir: string = dir): string[] {
	const files: string[] = [];
	
	try {
		const entries = readdirSync(dir);
		
		for (const entry of entries) {
			const fullPath = join(dir, entry);
			const stat = statSync(fullPath);
			
			if (stat.isDirectory()) {
				files.push(...listFilesRecursive(fullPath, baseDir));
			} else if (stat.isFile()) {
				// Return path relative to baseDir
				const relativePath = fullPath.substring(baseDir.length + 1);
				files.push(relativePath);
			}
		}
	} catch (err) {
		console.error('[dev-packages-list] Error reading directory:', err);
	}
	
	return files;
}

/**
 * GET /dev-packages-list/:package
 * Returns a JSON array of all files in the package
 */
export const GET: RequestHandler = ({ params }) => {
	const { package: pkgName } = params;
	
	// Security: basic validation
	if (!pkgName || pkgName.includes('..') || !pkgName.startsWith('@martini-kit/')) {
		return json({ error: 'Invalid package name' }, { status: 403 });
	}
	
	const pkgDir = join(process.cwd(), 'static/dev-packages', pkgName);
	
	if (!existsSync(pkgDir)) {
		return json({ error: 'Package not found' }, { status: 404 });
	}
	
	const files = listFilesRecursive(pkgDir);
	
	return json({ files });
};
