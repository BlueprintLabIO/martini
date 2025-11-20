import Fuse from 'fuse.js';
import { json } from '@sveltejs/kit';
import { docsSections } from '$lib/docs/navigation';
import { defaultVersion } from '$lib/docs/versions';
import {
	type SearchDoc,
	SEARCH_KEYS,
	SEARCH_OPTIONS,
	type SerializedFuseIndex
} from '$lib/search/config';
import type { RequestHandler } from './$types';

type MarkdownModule = {
	metadata?: {
		title?: string;
		description?: string;
		section?: string;
	};
};

type RawMarkdownModule = {
	default: string;
};

const docModules = import.meta.glob<MarkdownModule>('/src/content/docs/**/*.md', { eager: true });
const rawDocModules = import.meta.glob<RawMarkdownModule>('/src/content/docs/**/*.md', {
	query: '?raw',
	eager: true
});

const sectionLookup = buildSectionLookup();

export const GET: RequestHandler = () => {
	const docs: SearchDoc[] = Object.entries(docModules).map(([path, module]) => {
		const raw = rawDocModules[path]?.default ?? '';
		const markdown = stripFrontmatter(raw);
		const docPath = filePathToRoute(path);

		return {
			id: normalizeId(docPath),
			title: module.metadata?.title ?? deriveTitleFromPath(docPath),
			description: module.metadata?.description ?? extractSummary(markdown),
			section: module.metadata?.section ?? getSectionForPath(docPath),
			path: docPath,
			headings: extractHeadings(markdown),
			content: truncateContent(sanitizeMarkdown(markdown))
		};
	});

	const fuseIndex = Fuse.createIndex<SearchDoc>(Array.from(SEARCH_KEYS), docs);
	const payload: { docs: SearchDoc[]; index: SerializedFuseIndex } = {
		docs,
		index: fuseIndex.toJSON()
	};

	return json(payload);
};

export const prerender = true;

function buildSectionLookup() {
	const map = new Map<string, string>();

	const register = (href: string, section: string) => {
		const normalized = normalizePath(href);
		if (!map.has(normalized)) {
			map.set(normalized, section);
		}
	};

	for (const section of docsSections) {
		section.items.forEach((item) => register(item.href, section.title));
		section.subsections?.forEach((sub) =>
			sub.items.forEach((item) => register(item.href, section.title))
		);
	}

	return map;
}

function normalizePath(path: string) {
	return path.replace(/\/docs\/(latest|next|v[\d.]+)\//, '/docs/').replace(/\/$/, '');
}

function normalizeId(path: string) {
	return normalizePath(path).replace('/docs', '').replace(/^\//, '') || 'index';
}

function filePathToRoute(path: string) {
	const withoutPrefix = path.replace('/src/content/docs', '').replace(/\.md$/, '');
	const slug = withoutPrefix === '/index' ? '' : withoutPrefix;
	return `/docs/${defaultVersion}${slug}`;
}

function deriveTitleFromPath(path: string) {
	if (path === `/docs/${defaultVersion}` || path === '/docs') {
		return 'Documentation';
	}
	const lastSegment = path.split('/').filter(Boolean).pop() ?? 'Documentation';
	return lastSegment
		.replace(/-/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSectionForPath(path: string) {
	return sectionLookup.get(normalizePath(path)) ?? 'General';
}

function stripFrontmatter(markdown: string) {
	return markdown.replace(/^---[\s\S]*?---\s*/, '');
}

function sanitizeMarkdown(markdown: string) {
	return markdown
		.replace(/```[\s\S]*?```/g, ' ') // code fences
		.replace(/`[^`]*`/g, ' ') // inline code
		.replace(/!\[[^\]]*]\([^)]*\)/g, ' ') // images
		.replace(/\[([^\]]+)]\([^)]+\)/g, '$1') // links
		.replace(/[*_~>#-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function extractSummary(markdown: string) {
	const cleaned = sanitizeMarkdown(markdown);
	return truncate(cleaned, 300);
}

function truncateContent(content: string) {
	return truncate(content, 1200);
}

function truncate(value: string, length: number) {
	if (value.length <= length) return value;
	return `${value.slice(0, length).trim()}…`;
}

function extractHeadings(markdown: string) {
	const matches = Array.from(markdown.matchAll(/^#{1,4}\s+(.*)$/gm));
	return matches.map((match) => match[1].trim());
}
