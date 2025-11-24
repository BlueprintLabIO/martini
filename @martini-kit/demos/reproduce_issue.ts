
import { generateSidebar } from './src/lib/docs/generateSidebar';

// Mock modules
const modules = {
  '/src/content/docs/troubleshooting/index.md': {
    metadata: { title: 'Troubleshooting' }
  },
  '/src/content/docs/faq.md': {
    metadata: { title: 'FAQ' }
  },
  '/src/content/docs/migration/guide.md': {
    metadata: { title: 'Migration' }
  }
};

console.log('Generating sidebar...');
const sidebar = generateSidebar(modules);

console.log('Sections found:');
sidebar.forEach(section => {
  console.log(`- ${section.title} (${section.items.length} items)`);
});

const helpSections = sidebar.filter(s => s.title === 'Help');
console.log(`\nNumber of "Help" sections: ${helpSections.length}`);

if (helpSections.length > 1) {
  console.log('FAIL: Multiple Help sections found.');
} else {
  console.log('PASS: Single Help section found.');
}
