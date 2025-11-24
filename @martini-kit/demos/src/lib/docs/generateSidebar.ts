import type { DocsSection, DocsSubsection, DocsPage } from './navigation';

// Map directory names to section titles
const SECTION_TITLES: Record<string, string> = {
  'getting-started': 'Getting Started',
  'concepts': 'Core Concepts',
  'guides': 'Guides',
  'engine-tracks': 'Engine Tracks',
  'examples': 'Examples',
  'recipes': 'Recipes',
  'api': 'API Reference',
  'contributing': 'Contributing',
  'troubleshooting': 'Operate',
  'faq': 'Operate',
  'help': 'Operate',
  'changelog': 'Operate',
  'operate': 'Operate'
};

// Map subdirectory names to subsection titles (if needed)
const SUBSECTION_TITLES: Record<string, string> = {
  'core': 'Core',
  'phaser': 'Phaser',
  'transports': 'Transports',
  'devtools': 'DevTools',
  'shooting-mechanics': 'Shooting Mechanics',
  'performance-guide': 'Client-Side Performance Guide',
  'networking': 'Networking',
  'movement': 'Movement',
  'game-modes': 'Game Modes',
  'collectibles': 'Collectibles',
  'first-game': 'First Game',
  'actions': 'Actions',
  'testing': 'Testing',
  'deployment': 'Deployment',
  'ui-and-hud': 'UI & HUD'
};

// Manual ordering for subsections to avoid alphabetical shuffle
const SUBSECTION_ORDER: Record<string, number> = {
  'core': 1,
  'movement': 2,
  'physics': 3,
  'networking': 4,
  'performance-guide': 5,
  'ui-and-hud': 6,
  'testing': 7,
  'deployment': 8,
  'phaser': 1, // Engine Tracks
  'first-game': 1,
  'actions': 3
};

export function generateSidebar(
  modules: Record<string, any>
): DocsSection[] {
  const sections: Record<string, DocsSection> = {};

  // Helper to get or create section
  const getSection = (key: string, title: string) => {
    if (!sections[key]) {
      sections[key] = {
        title: SECTION_TITLES[key] || title,
        items: [],
        subsections: []
      };
    }
    return sections[key];
  };

  const formatSubsectionTitle = (key: string, title: string) =>
    SUBSECTION_TITLES[key] || capitalize(title.replace(/-/g, ' '));

  // Helper to get or create subsection
  const getSubsection = (section: DocsSection, key: string, title: string) => {
    if (!section.subsections) section.subsections = [];
    const resolvedTitle = formatSubsectionTitle(key, title);
    let subsection = section.subsections.find(s => s.title === resolvedTitle);
    if (!subsection) {
      subsection = {
        title: resolvedTitle,
        id: key,
        items: []
      };
      section.subsections.push(subsection);
    }
    return subsection;
  };

  for (const path in modules) {
    const mod = modules[path];
    const metadata = mod.metadata || {};
    
    // Skip if hidden
    if (metadata.hidden) continue;

    // Extract info from path
    // Path format: /src/content/docs/section/file.md or /src/content/docs/section/subsection/file.md
    const relativePath = path.replace('/src/content/docs/', '').replace('.md', '');
    const parts = relativePath.split('/');
    
    // Skip index page
    if (relativePath === 'index') continue;

    const sectionKey = metadata.section || parts[0];
    const sectionTitle = SECTION_TITLES[sectionKey] || capitalize(sectionKey);
    const section = getSection(sectionTitle, sectionTitle);

    const page: DocsPage = {
      title: metadata.title || capitalize(parts[parts.length - 1].replace(/^\d+-/, '')),
      href: `/docs/latest/${relativePath}`.replace(/\/index$/, ''),
      sdks: metadata.sdks,
      external: metadata.external,
      scope: metadata.scope
    };

    // Determine placement
    if (metadata.subsection) {
      // Explicit subsection from frontmatter
      const subsection = getSubsection(section, metadata.subsection, metadata.subsection);
      subsection.items.push({ ...page, order: metadata.order || 999 } as any);
    } else if (parts.length > 2) {
      // Implicit subsection from directory structure (e.g. recipes/shooting-mechanics/01-basics)
      const subsectionKey = parts[1];
      const subsectionTitle = formatSubsectionTitle(subsectionKey, subsectionKey);
      const subsection = getSubsection(section, subsectionKey, subsectionTitle);
      subsection.items.push({ ...page, order: metadata.order || 999 } as any);
    } else {
      // Direct item in section
      section.items.push({ ...page, order: metadata.order || 999 } as any);
    }
  }

  // Sort everything
  const sortedSections = Object.values(sections).sort((a, b) => {
    const orderA = getSectionOrder(a.title);
    const orderB = getSectionOrder(b.title);
    return orderA - orderB;
  });

  sortedSections.forEach(section => {
    section.items.sort((a: any, b: any) => (a.order || 999) - (b.order || 999));
    
    if (section.subsections) {
      section.subsections.sort((a, b) => {
        const orderA = getSubsectionOrder(a.id, a.title);
        const orderB = getSubsectionOrder(b.id, b.title);
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title);
      });
      section.subsections.forEach(sub => {
        sub.items.sort((a: any, b: any) => (a.order || 999) - (b.order || 999));
      });
    }
  });

  return sortedSections;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getSectionOrder(title: string): number {
  const order = [
    'Getting Started',
    'Core Concepts',
    'Guides',
    'Engine Tracks',
    'Examples',
    'Recipes',
    'API Reference',
    'Operate',
    'Contributing',
    'Changelog'
  ];
  const idx = order.indexOf(title);
  return idx === -1 ? 999 : idx;
}

function getSubsectionOrder(key: string | undefined, title: string): number {
  if (key && SUBSECTION_ORDER[key] !== undefined) return SUBSECTION_ORDER[key];
  const normalized = title.toLowerCase().replace(/\s+/g, '-');
  return SUBSECTION_ORDER[normalized] ?? 999;
}
