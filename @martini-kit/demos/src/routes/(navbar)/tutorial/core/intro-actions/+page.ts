import { error } from '@sveltejs/kit';

const lessons = import.meta.glob('/src/content/tutorials/**/*.md', { eager: true });
const rawLessons = import.meta.glob('/src/content/tutorials/**/*.md', { query: '?raw', eager: true });
const configModules = import.meta.glob('/src/lib/tutorials/configs/*.ts', { eager: true });
const validatorModules = import.meta.glob('/src/lib/tutorials/validators/*.ts', { eager: true });

export function load() {
	const path = '/src/content/tutorials/core/intro-actions.md';
	const lesson = lessons[path];
	const rawLesson = rawLessons[path] as { default: string } | undefined;

	if (!lesson) {
		throw error(404, 'Tutorial not found');
	}

	// @ts-expect-error md modules have .metadata and .default
	const metadata = lesson.metadata || {};
	const component = lesson.default;

	const configId = metadata.config ? `/src/lib/tutorials/configs/${metadata.config}.ts` : null;
	const validatorId = metadata.validator ? `/src/lib/tutorials/validators/${metadata.validator}.ts` : null;

	const configModule = configId ? configModules[configId] : null;
	const validatorModule = validatorId ? validatorModules[validatorId] : null;

	return {
		component,
		metadata,
		rawMarkdown: rawLesson?.default || '',
		config: configModule ? (configModule as any).default : null,
		validator: validatorModule ? (validatorModule as any).default : null,
		solutionFiles: metadata.solutionFiles || null
	};
}

export const prerender = true;
