# CLAUDE.md - Implementation Guide

## Project Overview
Browser-based multiplayer game platform for kids. AI generates Phaser 3 games, sandboxed iframes, P2P WebRTC multiplayer.

**Stack:** SvelteKit + TypeScript + Tailwind + Supabase + Phaser 3

use psql and SECRET_DATABASE_URL if necessary to view the db.
do not run ops on the db without asking for permission.
use src/lib/db/schema.ts for basic structure check

run pnpm commands to guarantee latest versions

### UI Component Libraries
- **shadcn-svelte**: Pre-built accessible components (tree-view, collapsible, etc.)
- **CodeMirror 6**: Code editor with JavaScript syntax highlighting
- **bits-ui**: Low-level UI primitives (used by shadcn)
- **lucide-svelte**: Icon library

### Key Dependencies
```json
{
  "shadcn-svelte": "^1.0.10",
  "codemirror": "^6.0.2",
  "@codemirror/lang-javascript": "^6.2.4",
  "@codemirror/state": "^6.5.2",
  "@codemirror/view": "^6.38.6"
}
```

## Critical Patterns

### Supabase Authentication (SSR Pattern)

**Required Files:**
```
src/hooks.server.ts          → Server-side Supabase client
src/routes/+layout.server.ts → Pass session/cookies to client
src/routes/+layout.ts        → Create browser/server client
src/routes/+layout.svelte    → Listen for auth changes
```

**1. Server Hook** (`hooks.server.ts`)
```ts
import { createServerClient } from '@supabase/ssr';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(URL, KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' });
        });
      }
    }
  });

  event.locals.safeGetSession = async () => {
    const { data: { session } } = await event.locals.supabase.auth.getSession();

    if (!session) {
      return { session: null, user: null };
    }

    const { data: { user }, error } = await event.locals.supabase.auth.getUser();

    if (error) {
      // JWT validation has failed
      return { session: null, user: null };
    }

    return { session, user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};
```

**2. Layout Server Load** (`+layout.server.ts`)
```ts
export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  const { session } = await locals.safeGetSession();
  return {
    session,
    cookies: cookies.getAll()
  };
};
```

**3. Layout Load** (`+layout.ts`)
```ts
import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
  depends('supabase:auth');

  const supabase = isBrowser()
    ? createBrowserClient(URL, KEY, { global: { fetch } })
    : createServerClient(URL, KEY, {
        global: { fetch },
        cookies: { getAll() { return data.cookies; } }
      });

  const { data: { session } } = await supabase.auth.getSession();

  return { supabase, session };
};
```

**4. Layout Component** (`+layout.svelte`)
```svelte
<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';

  let { children, data } = $props();

  onMount(() => {
    const { data: { subscription } } = data.supabase.auth.onAuthStateChange(() => {
      invalidate('supabase:auth');
    });
    return () => subscription.unsubscribe();
  });
</script>

{@render children()}
```

**Usage in Pages:**
```svelte
<script lang="ts">
  import { goto, invalidate } from '$app/navigation';
  let { data } = $props();

  async function login(email: string, password: string) {
    const { error } = await data.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await invalidate('supabase:auth');
    goto('/dashboard');
  }

  async function logout() {
    await data.supabase.auth.signOut();
    await invalidate('supabase:auth');
    goto('/');
  }
</script>
```

**Protected Routes:**
```ts
// +page.server.ts
export const load: PageServerLoad = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) throw redirect(303, '/auth/login');
  return { user };
};
```

### Database Schema (Multi-File Virtual File System)

**Industry Standard: One Row Per File** (NOT JSONB)

```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Files table (separate row for each file)
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,           -- '/src/scenes/GameScene.js'
  content TEXT NOT NULL,        -- File contents
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, path)
);

-- Assets table (metadata only, files in Supabase Storage)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,       -- 'player.png'
  storage_path TEXT NOT NULL,   -- 'projects/{id}/sprites/player.png'
  file_type TEXT CHECK (file_type IN ('image', 'audio')),
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Why rows, not JSONB?**
- ✅ Industry standard (CodeSandbox, Glitch, Replit use this)
- ✅ Query individual files easily
- ✅ Row-level security per file
- ✅ Version history support
- ✅ Scalable (Postgres handles millions of rows)

**Phaser Project Structure:**
```
/index.html                    -- Phaser HTML template
/src/main.js                   -- Phaser config
/src/scenes/GameScene.js       -- Game scene
/src/scenes/MenuScene.js       -- Menu scene
/src/entities/Player.js        -- Player class
```

### Environment Variables

**Location:** `apps/web/.env` (NOT root)

```bash
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
OPENAI_API_KEY=sk-xxx
```

**Note:** Project uses new `sb_publishable_*` format (not legacy `SUPABASE_ANON_KEY`).

### State Management

- **Local UI:** Svelte `$state` runes
- **Server data:** `@tanstack/svelte-query`
- **Auth:** Layout data (see above)

### Security Critical

**Sandbox Rules:**
- NEVER use `allow-same-origin` in iframe
- AST validation before executing user code
- Loop guards on all user code
- 5s watchdog timeout

**Red Flags:**
- `eval()` in user code
- Network requests from sandbox
- Unbounded loops/entity creation

### File Organization

```
apps/web/
  src/
    routes/
      +layout.server.ts       → Pass session to client
      +layout.ts              → Create Supabase client
      +layout.svelte          → Auth change listener
      auth/
        login/+page.svelte
        signup/+page.svelte
      dashboard/
        +page.server.ts       → Protected route check
        +page.svelte
      api/
        [...]/+server.ts      → API endpoints
    lib/
      sandbox/                → Security (AST, transforms)
      multiplayer/            → P2P logic
    hooks.server.ts           → Server Supabase client
    app.d.ts                  → TypeScript types for locals
```

### Naming Conventions

- Components: `PascalCase.svelte`
- Stores: `camelCase.svelte.ts`
- Types: `PascalCase` interfaces
- API routes: `+server.ts`

### Common Commands

```bash
pnpm dev                # Run dev server
pnpm build              # Build for production
pnpm test               # Unit tests
pnpm test:e2e           # E2E tests
```

### Performance Targets

- Prompt → game: < 60s
- Code edit → reload: < 5s
- P2P connection: < 3s
- Game: 60fps
- Multiplayer latency: < 100ms

### Security Limits

- 1000 entities per game
- 5MB per asset
- 10 simultaneous sounds
- 100k loop iterations max
- 5s iframe timeout

### Key Dependencies

```json
{
  "@supabase/supabase-js": "^2.80.0",
  "@supabase/ssr": "^0.7.0",
  "@sveltejs/kit": "^2.47.1",
  "svelte": "^5.41.0"
}
```

---

**Last Updated:** 2025-11-08 (Added canonical Supabase SSR auth pattern)
