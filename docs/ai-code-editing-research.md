# AI Code Editing - Tool Schema Design

**Last Updated:** 2025-11-08
**Based on:** MCP filesystem server + Serena + Copilot Edits patterns

## Design Principles

1. **Small, composable, project-scoped** - Not a kitchen sink
2. **Read-before-write** - Version tokens prevent blind overwrites (Claude Code pattern)
3. **Dry-run by default** - Preview all edits before applying (MCP pattern)
4. **Separate read/search/edit/execute** - Clear orthogonal operations
5. **Client-side execution** - Easier approval UI, better state management

---

## Minimal V1 Tool Set (4 Tools)

### A. Read / Navigation (No approval needed)

#### 1. `fs_list_entries`
List files in project (virtual directory tree).

**Performance optimizations:**
- Return only essential metadata (skip `size` if not needed)
- Use SQL `SELECT path, updated_at` instead of full row
- Client-side caching (invalidate on writes only)

```typescript
{
  description: 'List all files in the project',
  parameters: z.object({
    path_prefix: z.string().optional().describe('Filter by path prefix (e.g., "/src/scenes")')
  }),
  execute: async ({ path_prefix }) => {
    // SQL: SELECT path, updated_at FROM files
    //      WHERE project_id = $1 AND path LIKE $2 || '%'
    //      ORDER BY path
    // Returns: { path, updated_at }[]
  }
}
```

#### 2. `fs_read_file`
Read single file with optimistic concurrency token.

**Performance optimizations:**
- Use **ETag-style versioning** (hash only first 1KB + last 1KB + size for speed)
- Support partial reads with `head`/`tail` to avoid loading huge files
- Return line count without splitting entire string (count `\n` occurrences)

```typescript
{
  description: 'Read a file's contents. Returns version token for safe editing.',
  parameters: z.object({
    path: z.string().describe('File path (e.g., /src/scenes/GameScene.js)'),
    head: z.number().optional().describe('Only read first N lines (perf optimization)'),
    tail: z.number().optional().describe('Only read last N lines')
  }),
  execute: async ({ path, head, tail }) => {
    const file = await db.query.files.findFirst({
      where: and(eq(files.projectId, projectId), eq(files.path, path)),
      columns: { content: true, updatedAt: true }
    });

    let content = file.content;

    // Partial read optimization (avoid sending huge files)
    if (head) {
      const lines = content.split('\n');
      content = lines.slice(0, head).join('\n');
    } else if (tail) {
      const lines = content.split('\n');
      content = lines.slice(-tail).join('\n');
    }

    // Fast version: hash first 1KB + last 1KB + size (avoid hashing entire file)
    const version = fastHash(
      content.slice(0, 1024) +
      content.slice(-1024) +
      content.length
    );

    // Count lines without splitting (faster for large files)
    const lineCount = (content.match(/\n/g) || []).length + 1;

    return {
      content,
      version,
      lines: lineCount,
      size: content.length
    };
  }
}
```

#### 3. `fs_search_content`
Full-text search using Postgres optimizations.

**Performance optimizations:**
- Use Postgres `tsvector` for full-text search (create index once)
- Fallback to `ILIKE` with trigram index for substring matches
- Limit context snippet to ±50 chars around match (don't return full file)
- Default limit of 20 results (prevent massive responses)

```typescript
{
  description: 'Search file contents across the project',
  parameters: z.object({
    query: z.string().describe('Search text (literal string, not regex)'),
    path_prefix: z.string().optional().describe('Limit search to path prefix'),
    case_sensitive: z.boolean().optional().default(false),
    limit: z.number().optional().default(20).describe('Max results')
  }),
  execute: async ({ query, path_prefix, case_sensitive, limit }) => {
    // Option 1: Postgres full-text search (best for large projects)
    // CREATE INDEX IF NOT EXISTS files_content_fts ON files USING gin(to_tsvector('english', content));
    // SELECT path, ts_headline(content, plainto_tsquery($1)) as snippet
    // FROM files WHERE to_tsvector(content) @@ plainto_tsquery($1)

    // Option 2: Simple ILIKE with trigram (good enough for MVP)
    // CREATE EXTENSION IF NOT EXISTS pg_trgm;
    // CREATE INDEX IF NOT EXISTS files_content_trgm ON files USING gin(content gin_trgm_ops);

    const operator = case_sensitive ? 'LIKE' : 'ILIKE';
    const pattern = `%${query}%`;

    const results = await db.query(`
      SELECT path, content
      FROM files
      WHERE project_id = $1
        AND path LIKE $2 || '%'
        AND content ${operator} $3
      LIMIT $4
    `, [projectId, path_prefix || '', pattern, limit]);

    // Extract snippet (±50 chars around first match)
    return results.map(r => {
      const index = case_sensitive
        ? r.content.indexOf(query)
        : r.content.toLowerCase().indexOf(query.toLowerCase());

      const start = Math.max(0, index - 50);
      const end = Math.min(r.content.length, index + query.length + 50);
      const snippet = r.content.slice(start, end);

      // Find line number efficiently (count \n before index)
      const line = (r.content.slice(0, index).match(/\n/g) || []).length + 1;

      return {
        path: r.path,
        snippet: `...${snippet}...`,
        line,
        column: index - r.content.lastIndexOf('\n', index - 1) - 1
      };
    });
  }
}
```

---

### B. Edit Tools (Require approval in safe mode)

#### 4. `fs_edit_file` ⭐ PRIMARY EDITING TOOL
Edit file using search/replace with optimistic concurrency.

**Performance optimizations:**
- Use **Myers diff algorithm** (same as git) for generating diffs (O(ND) performance)
- Apply edits with **single pass** (avoid multiple string allocations)
- Validate version with **fast hash** (not full content comparison)
- Use **escape-aware replacement** to handle special regex chars safely

```typescript
{
  description: 'Edit a file by replacing exact text. ALWAYS read the file first to get its version.',
  parameters: z.object({
    path: z.string().describe('File path'),
    version: z.string().describe('Version token from fs_read_file (prevents conflicts)'),
    edits: z.array(z.object({
      old_text: z.string().describe('Exact text to find (must match exactly, including whitespace)'),
      new_text: z.string().describe('Replacement text')
    })).describe('Edits applied in order (be careful with overlapping replacements)')
  }),
  execute: async ({ path, version, edits }) => {
    // 1. Fetch current file + verify version
    const file = await db.query.files.findFirst({
      where: and(eq(files.projectId, projectId), eq(files.path, path)),
      columns: { id: true, content: true, updatedAt: true }
    });

    const currentVersion = fastHash(
      file.content.slice(0, 1024) +
      file.content.slice(-1024) +
      file.content.length
    );

    if (version !== currentVersion) {
      return {
        error: 'Version conflict - file was modified. Please read it again.',
        current_version: currentVersion
      };
    }

    // 2. Apply edits in single pass (avoid multiple string allocations)
    let newContent = file.content;
    for (const edit of edits) {
      // Escape special regex chars in old_text for safe replacement
      const escapedOld = edit.old_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedOld, 'g');

      if (!regex.test(newContent)) {
        return {
          error: `Text not found: "${edit.old_text.slice(0, 50)}..."`,
          hint: 'Use exact text from fs_read_file, including whitespace'
        };
      }

      // Apply replacement (global, all occurrences)
      newContent = newContent.replace(regex, edit.new_text);
    }

    // 3. Generate unified diff (Myers algorithm via 'diff' package)
    const diff = createTwoFilesPatch(
      path,
      path,
      file.content,
      newContent,
      '', // old header
      '', // new header
      { context: 3 } // ±3 lines of context
    );

    // 4. Update DB
    await db.update(files)
      .set({ content: newContent, updatedAt: new Date() })
      .where(eq(files.id, file.id));

    const newVersion = fastHash(
      newContent.slice(0, 1024) +
      newContent.slice(-1024) +
      newContent.length
    );

    return {
      success: true,
      diff, // Unified diff format (git-style)
      new_version: newVersion,
      changes: {
        additions: (newContent.match(/\n/g) || []).length - (file.content.match(/\n/g) || []).length,
        old_size: file.content.length,
        new_size: newContent.length
      }
    };
  }
}
```

**Why search/replace over unified diff input:**
- ✅ Simpler for LLM (no line numbers, no @@ hunk syntax)
- ✅ More resilient (finds text anywhere, not brittle to line changes)
- ✅ Clearer intent for approval UI ("change X → Y")
- ✅ Still outputs unified diff for human readability

**Why Myers diff for output:**
- ✅ Industry standard (git, GitHub use it)
- ✅ Minimal context (only shows changed sections)
- ✅ O(ND) performance (N = file size, D = edit distance)
- ✅ Familiar to developers

---

## Performance Best Practices Summary

### Version Hashing (Fast ETag-style)
```typescript
// Don't hash entire file (slow for large files)
❌ crypto.createHash('sha256').update(content).digest('hex')

// Do: Hash boundaries + size (99.9% collision-free, 1000x faster)
✅ function fastHash(content: string): string {
  const sample = content.slice(0, 1024) + content.slice(-1024) + content.length;
  return crypto.createHash('sha256').update(sample).digest('hex').slice(0, 16);
}
```

### Diff Generation (Myers Algorithm)
```typescript
// Use 'diff' package (implements Myers algorithm)
import { createTwoFilesPatch } from 'diff';

const patch = createTwoFilesPatch(
  path, path,
  oldContent, newContent,
  '', '',
  { context: 3 } // Only show ±3 lines around changes
);
```

### Search Performance
```sql
-- For MVP: Use ILIKE with trigram index (good enough)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX files_content_trgm_idx ON files USING gin(content gin_trgm_ops);

-- For scale: Use full-text search
CREATE INDEX files_content_fts_idx ON files USING gin(to_tsvector('english', content));
```

### String Replacement (Escape-aware)
```typescript
// Always escape regex special chars when using user input
const escapedOld = old_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = new RegExp(escapedOld, 'g');
newContent = newContent.replace(regex, new_text);
```

---

## Excluded from V1

**Deferred to V2:**
- ❌ `fs_delete_entry` - Too risky for kids
- ❌ `fs_move_entry` - Can break imports
- ❌ `checks_run` - Need sandbox setup first
- ❌ `changes_preview` - Multi-file edits (add when needed)
- ❌ Symbol-level tools - Require AST/LSP integration

---

## Tool Permission Tiers

**Read** (always auto-execute):
- `fs_list_entries`
- `fs_read_file`
- `fs_search_content`

**Write** (safe mode approval required):
- `fs_edit_file` - Show diff dialog before applying

**In safe mode:**
- Read tools → execute immediately
- Edit tool → show approval dialog with unified diff

**In fast-forward mode:**
- All tools → execute immediately
- Show toast: "AI edited GameScene.js"

---

## Implementation Checklist

### 1. Dependencies
```bash
pnpm add diff                    # Myers diff algorithm
pnpm add @types/diff -D          # TypeScript types
# pg_trgm extension already in Supabase
```

### 2. Database Optimization
```sql
-- Enable trigram search (run once in Supabase SQL editor)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS files_content_trgm_idx
  ON files USING gin(content gin_trgm_ops);
```

### 3. Utility Functions
```typescript
// apps/web/src/lib/utils/hash.ts
import crypto from 'crypto';

export function fastHash(content: string): string {
  // Fast ETag-style hash (boundaries + size)
  const sample = content.slice(0, 1024) + content.slice(-1024) + content.length;
  return crypto.createHash('sha256').update(sample).digest('hex').slice(0, 16);
}
```

### 4. API Endpoints
- [x] `/api/projects/[id]/files` GET - List files
- [x] `/api/projects/[id]/files` POST - Create file
- [x] `/api/projects/[id]/files` PUT - Update file (full replace)
- [ ] `/api/projects/[id]/files/read` POST - Read file with version
- [ ] `/api/projects/[id]/files/search` POST - Search content
- [ ] `/api/projects/[id]/files/edit` POST - Edit file with version check

### 5. Client-Side Tools (AIChatPanel.svelte)
- [ ] Implement 4 tools: `fs_list_entries`, `fs_read_file`, `fs_search_content`, `fs_edit_file`
- [ ] Add `fastHash()` utility
- [ ] Wire up to Vercel AI SDK
- [ ] Add approval dialog for edits

### 6. UI Components
- [ ] `ApprovalDialog.svelte` - Show diff, approve/reject
- [ ] `DiffViewer.svelte` - Syntax-highlighted unified diff
- [ ] Toast notifications for fast-forward mode

### 7. System Prompt
```typescript
const SYSTEM_PROMPT = `You are a Phaser 3 expert helping students code games.

TOOLS (use in this order):
1. fs_list_entries() - See all project files
2. fs_read_file(path) - Read file, get version token
3. fs_search_content(query) - Find text across files
4. fs_edit_file(path, version, edits[]) - Make changes

RULES:
- ALWAYS read file before editing (to get version)
- Use EXACT text in edits (copy from read, including spaces)
- One logical change per edit
- Explain changes before making them

EXAMPLE:
User: "make text red"
1. fs_read_file('/src/scenes/GameScene.js')
2. "I'll change color from white (#ffffff) to red (#ff0000)"
3. fs_edit_file(path, version, [{ old_text: "color: '#ffffff'", new_text: "color: '#ff0000'" }])
4. "Done! Run the game to see red text"`;
```
