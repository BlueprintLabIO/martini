import fs from 'node:fs';
import path from 'node:path';
import { generateSidebar } from '../@martini-kit/demos/src/lib/docs/generateSidebar';

type ModuleMeta = { metadata?: Record<string, any> };

const DOCS_ROOT = path.resolve(process.cwd(), '@martini-kit/demos/src/content/docs');
const CONTENT_PREFIX = '/src/content/docs/';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const lines = match[1].split('\n');
  const meta: Record<string, any> = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (!key) continue;
    meta[key.trim()] = rest.join(':').trim();
  }
  return meta;
}

// Build modules object similar to import.meta.glob eager output
function buildModules(): Record<string, ModuleMeta> {
  const modules: Record<string, ModuleMeta> = {};
  const files = walk(DOCS_ROOT).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const rel = path.relative(path.resolve(process.cwd(), '@martini-kit/demos/src'), file);
    const globKey = `/${rel.replace(/\\/g, '/')}`;
    const content = fs.readFileSync(file, 'utf-8');
    const metadata = parseFrontmatter(content);
    modules[globKey] = { metadata };
  }

  return modules;
}

function buildValidSlugs(): Set<string> {
  const valid = new Set<string>();
  const files = walk(DOCS_ROOT).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const rel = path.relative(DOCS_ROOT, file).replace(/\\/g, '/').replace(/\.md$/, '');
    valid.add(rel);
    if (rel.endsWith('/index')) {
      valid.add(rel.replace(/\/index$/, ''));
    }
  }
  return valid;
}

function navItemsFromSections(sections: ReturnType<typeof generateSidebar>) {
  return sections.flatMap((section) => [
    ...section.items,
    ...(section.subsections?.flatMap((s) => s.items) ?? [])
  ]);
}

function main() {
  const modules = buildModules();
  const sections = generateSidebar(modules as any);
  const navItems = navItemsFromSections(sections);
  const validSlugs = buildValidSlugs();

  const errors: string[] = [];

  for (const item of navItems) {
    const slug = item.href.replace(/^\/docs\/(latest|next|v[\d.]+)\//, '');
    if (!validSlugs.has(slug)) {
      errors.push(`Missing content for nav item: ${item.title} (${item.href})`);
    }
  }

  if (errors.length) {
    console.error('Docs nav validation failed:');
    errors.forEach((e) => console.error(`- ${e}`));
    process.exit(1);
  } else {
    console.log('Docs nav validation passed.');
  }
}

main();
