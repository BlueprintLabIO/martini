# Martini Implementation Plan

## Tech Stack Summary

### Frontend (SvelteKit)
- **Framework:** SvelteKit + TypeScript
- **State Management:** Svelte stores + @tanstack/svelte-query
- **UI:** Tailwind CSS + shadcn-svelte
- **Code Editor:** CodeMirror 6 (lightweight, Yjs-ready for collaborative editing)
- **Game Engine:** Phaser 3 (CDN)
- **Forms:** sveltekit-superforms + Zod
- **Multiplayer:** simple-peer + Socket.io-client

### Backend Services
- **Auth/Storage:** Supabase (direct from frontend)
- **Database:** Supabase (via SvelteKit API routes)
- **AI API:** SvelteKit API routes → OpenAI
- **Signaling:** Socket.io server (separate service)

### Monorepo (Turborepo)
```
martini/
├── apps/
│   ├── web/              # SvelteKit app
│   └── signaling/        # Socket.io server
├── packages/
│   ├── shared/           # Types, schemas, constants
│   └── game-templates/   # Template code
└── turbo.json
```

### Tooling
- **Build:** Vite (SvelteKit default)
- **Validation:** Zod
- **Code Parsing:** Acorn + Babel
- **Testing:** Vitest + Playwright
- **Deployment:** Cloudflare Pages (web) + Coolify (signaling)

---

## Project Structure

```
martini/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── components/
│   │   │   │   │   ├── ui/              # shadcn components
│   │   │   │   │   ├── editor/
│   │   │   │   │   │   ├── CodeEditor.svelte
│   │   │   │   │   │   └── EditorToolbar.svelte
│   │   │   │   │   ├── game/
│   │   │   │   │   │   ├── GameCanvas.svelte
│   │   │   │   │   │   ├── GameSandbox.svelte
│   │   │   │   │   │   └── GameControls.svelte
│   │   │   │   │   ├── multiplayer/
│   │   │   │   │   │   ├── ShareDialog.svelte
│   │   │   │   │   │   └── PlayerList.svelte
│   │   │   │   │   └── auth/
│   │   │   │   │       ├── SignupForm.svelte
│   │   │   │   │       └── LoginForm.svelte
│   │   │   │   ├── stores/
│   │   │   │   │   ├── auth.ts          # User session
│   │   │   │   │   ├── editor.ts        # Editor state
│   │   │   │   │   ├── sandbox.ts       # Game sandbox manager
│   │   │   │   │   └── multiplayer.ts   # P2P connection state
│   │   │   │   ├── api/
│   │   │   │   │   ├── queries.ts       # TanStack Query hooks
│   │   │   │   │   └── supabase.ts      # Supabase client
│   │   │   │   ├── sandbox/
│   │   │   │   │   ├── SandboxManager.ts    # iframe lifecycle
│   │   │   │   │   ├── gameAPI.ts           # Runtime API
│   │   │   │   │   ├── validator.ts         # AST validation
│   │   │   │   │   ├── transformer.ts       # Loop guards
│   │   │   │   │   └── watchdog.ts          # Freeze detection
│   │   │   │   ├── multiplayer/
│   │   │   │   │   ├── P2PHost.ts           # Host logic
│   │   │   │   │   ├── P2PClient.ts         # Client logic
│   │   │   │   │   ├── SignalingClient.ts   # Socket.io wrapper
│   │   │   │   │   └── inputSync.ts         # Input sync helpers
│   │   │   │   └── utils/
│   │   │   │       ├── shareCode.ts         # Generate 6-char codes
│   │   │   │       ├── coppa.ts             # Age verification
│   │   │   │       └── errors.ts            # Error handling
│   │   │   ├── routes/
│   │   │   │   ├── +layout.svelte           # Root layout
│   │   │   │   ├── +layout.server.ts        # Auth guard
│   │   │   │   ├── +page.svelte             # Home/dashboard
│   │   │   │   ├── auth/
│   │   │   │   │   ├── signup/
│   │   │   │   │   │   └── +page.svelte
│   │   │   │   │   └── login/
│   │   │   │   │       └── +page.svelte
│   │   │   │   ├── editor/
│   │   │   │   │   └── [projectId]/
│   │   │   │   │       ├── +page.svelte      # Main editor
│   │   │   │   │       └── +page.server.ts   # Load project
│   │   │   │   ├── play/
│   │   │   │   │   └── [shareCode]/
│   │   │   │   │       ├── +page.svelte      # Game player
│   │   │   │   │       └── +page.server.ts   # Load game, OG tags
│   │   │   │   └── api/
│   │   │   │       ├── generate/
│   │   │   │       │   └── +server.ts        # AI code generation
│   │   │   │       ├── projects/
│   │   │   │       │   └── +server.ts        # CRUD projects
│   │   │   │       └── assets/
│   │   │   │           └── upload/
│   │   │   │               └── +server.ts    # Asset upload
│   │   │   ├── app.html
│   │   │   └── app.css                       # Tailwind entry
│   │   ├── static/
│   │   │   ├── sandbox-runtime.html          # iframe template
│   │   │   └── assets/
│   │   │       └── kenney/                   # Starter assets
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── validator.test.ts
│   │   │   │   ├── transformer.test.ts
│   │   │   │   └── shareCode.test.ts
│   │   │   └── e2e/
│   │   │       ├── sandbox-security.spec.ts
│   │   │       └── multiplayer.spec.ts
│   │   ├── svelte.config.js
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── package.json
│   └── signaling/
│       ├── src/
│       │   ├── server.ts                     # Socket.io server
│       │   ├── rooms.ts                      # Room management
│       │   └── types.ts                      # Message types
│       ├── tests/
│       │   └── signaling.test.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.ts
│   │   │   │   ├── project.ts
│   │   │   │   ├── game.ts
│   │   │   │   └── multiplayer.ts
│   │   │   ├── schemas/                      # Zod schemas
│   │   │   │   ├── auth.ts
│   │   │   │   ├── project.ts
│   │   │   │   └── api.ts
│   │   │   └── constants/
│   │   │       ├── limits.ts                 # Rate limits, quotas
│   │   │       └── config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── game-templates/
│       ├── src/
│       │   ├── shooter.ts
│       │   ├── platformer.ts
│       │   ├── building.ts
│       │   └── blank.ts
│       └── package.json
├── docs/
├── specs/
├── turbo.json
├── package.json                              # Workspace root
└── pnpm-workspace.yaml                       # pnpm workspace config
```

---

## Package Versions & Installation

### Root Setup

```bash
# Initialize pnpm workspace
pnpm init
```

**package.json:**
```json
{
  "name": "martini",
  "private": true,
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.3"
  }
}
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".svelte-kit/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

---

### apps/web (SvelteKit)

**package.json:**
```json
{
  "name": "@martini/web",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/svelte-query": "^5.17.0",
    "simple-peer": "^9.11.1",
    "socket.io-client": "^4.6.1",
    "codemirror": "^6.0.1",
    "@codemirror/lang-javascript": "^6.2.1",
    "@codemirror/theme-one-dark": "^6.1.2",
    "yjs": "^13.6.10",
    "y-codemirror.next": "^0.3.5",
    "y-websocket": "^1.5.0",
    "acorn": "^8.11.3",
    "@babel/core": "^7.23.7",
    "@babel/preset-env": "^7.23.7",
    "prettier": "^3.1.1",
    "zod": "^3.22.4",
    "nanoid": "^5.0.4"
  },
  "devDependencies": {
    "@sveltejs/adapter-cloudflare": "^4.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "svelte": "^4.2.8",
    "vite": "^5.0.0",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "vitest": "^1.1.0",
    "@playwright/test": "^1.40.0",
    "@testing-library/svelte": "^4.0.5",
    "sveltekit-superforms": "^2.8.1",
    "shadcn-svelte": "^0.11.0"
  }
}
```

**svelte.config.js:**
```js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      '$lib': './src/lib',
      '@martini/shared': '../../../packages/shared/src',
      '@martini/templates': '../../../packages/game-templates/src'
    }
  }
};
```

**vite.config.ts:**
```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom'
  },
  optimizeDeps: {
    include: ['codemirror', '@codemirror/lang-javascript']
  }
});
```

**tailwind.config.js:**
```js
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {}
  },
  plugins: []
};
```

---

### apps/signaling (Socket.io)

**package.json:**
```json
{
  "name": "@martini/signaling",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "vitest": "^1.1.0"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### packages/shared

**package.json:**
```json
{
  "name": "@martini/shared",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./schemas": "./src/schemas/index.ts",
    "./constants": "./src/constants/index.ts"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

---

### packages/game-templates

**package.json:**
```json
{
  "name": "@martini/templates",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./shooter": "./src/shooter.ts",
    "./platformer": "./src/platformer.ts",
    "./building": "./src/building.ts"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

---

## Environment Variables

### apps/web/.env

```bash
# Supabase (public - safe for frontend)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Signaling Server
PUBLIC_SIGNALING_URL=wss://signal.yourdomain.com

# OpenAI (server-side only)
OPENAI_API_KEY=sk-...

# App Config
PUBLIC_APP_URL=https://yourdomain.com
```

### apps/signaling/.env

```bash
PORT=3001
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
```

---

## Implementation Phases (8-10 Weeks)

### **Week 1-2: Foundation**

**Tasks:**
1. ✅ Setup Turborepo monorepo
2. ✅ Initialize SvelteKit app with Tailwind
3. ✅ Setup Supabase project + database schema
4. ✅ Implement auth flow (signup/login)
5. ✅ Create project CRUD (list, create, delete)
6. ✅ Integrate CodeMirror 6 (basic)
7. ✅ Setup TanStack Query for API state

**Deliverables:**
- Users can sign up, log in
- Create/save/load projects
- Edit code in CodeMirror 6
- No AI generation yet (manual code entry)

---

### **Week 3-4: AI Code Generation**

**Tasks:**
1. ✅ OpenAI API integration (SvelteKit API route)
2. ✅ Implement AST validation (Acorn)
3. ✅ Add Babel loop guard transforms
4. ✅ Create prompt engineering system
5. ✅ Add template system (shooter, platformer, building)
6. ✅ Error handling + retry logic
7. ✅ Rate limiting (20 prompts/hour)

**Deliverables:**
- User prompts → AI generates code
- Code validated + transformed
- Auto-retry on errors
- Template selection UI

---

### **Week 5-6: Game Runtime Sandbox**

**Tasks:**
1. ✅ Create sandboxed iframe setup
2. ✅ Implement postMessage bridge
3. ✅ Build gameAPI wrapper
4. ✅ Integrate Phaser 3 (CDN)
5. ✅ Hot reload on Ctrl+S
6. ✅ Runtime watchdog (freeze detection)
7. ✅ Error display UI
8. ✅ Console logging from sandbox

**Deliverables:**
- User code runs in secure sandbox
- Edit → Save → Reload < 5s
- Runtime errors shown in UI
- Games are playable (single-player)

---

### **Week 7-8: Multiplayer P2P**

**Tasks:**
1. ✅ Build Socket.io signaling server
2. ✅ Implement P2P connection (simple-peer)
3. ✅ Add input sync logic
4. ✅ Host/client architecture
5. ✅ Share code generation (6-char)
6. ✅ Enhanced share links (OG tags, SSR)
7. ✅ Host disconnect handling
8. ✅ Player list UI

**Deliverables:**
- Host creates game → gets share link
- Friends join via link
- 2-6 players can play together
- < 100ms latency on local network

---

### **Week 9-10: Polish & Assets**

**Tasks:**
1. ✅ Add 3 starter templates (fully functional)
2. ✅ Implement asset upload (Supabase Storage)
3. ✅ Download Kenney.nl starter assets (50 sprites/sounds)
4. ✅ Build asset picker UI
5. ✅ Project versioning (last 10 saves)
6. ✅ Add "Upgrade for 7+ players" placeholder
7. ✅ Basic analytics tracking
8. ✅ COPPA parent verification flow
9. ✅ Write tests (sandbox security)
10. ✅ Deploy to Cloudflare + Coolify

**Deliverables:**
- Complete MVP ready to launch
- 3 templates users can modify
- Asset uploads working
- Share links with previews
- Basic analytics

---

## Key Implementation Details

### 1. Supabase Setup

**Database Schema (SQL):**
```sql
-- Run this in Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (length(username) >= 3 AND length(username) <= 20),
  birthdate DATE NOT NULL,
  parent_email TEXT,
  parent_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  share_code TEXT UNIQUE,
  thumbnail_url TEXT,
  template_type TEXT CHECK (template_type IN ('shooter', 'platformer', 'building', 'blank')),
  forked_from UUID REFERENCES projects(id),
  state TEXT DEFAULT 'draft' CHECK (state IN ('draft', 'published')),
  play_count INTEGER DEFAULT 0,
  remix_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'game.js',
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- File versions (last 10)
CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(file_id, version)
);

-- Assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('image', 'audio')),
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics table
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_share_code ON projects(share_code);
CREATE INDEX idx_projects_featured ON projects(featured) WHERE state = 'published';
CREATE INDEX idx_analytics_event ON analytics(event_type, created_at);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can read their own projects
CREATE POLICY "Users can read own projects" ON projects
  FOR SELECT USING (auth.uid() = owner_id);

-- Anyone can read published projects
CREATE POLICY "Anyone can read published projects" ON projects
  FOR SELECT USING (state = 'published');

-- Users can create projects
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update own projects
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete own projects
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = owner_id);

-- Files inherit project permissions
CREATE POLICY "Users can read project files" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = files.project_id
      AND (projects.owner_id = auth.uid() OR projects.state = 'published')
    )
  );

CREATE POLICY "Users can manage own project files" ON files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = files.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Similar policies for file_versions, assets, analytics...
```

**Storage Buckets:**
```sql
-- Create storage bucket for assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true);

-- Policy: Anyone can read assets
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'assets');

-- Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assets'
    AND auth.role() = 'authenticated'
  );
```

---

### 2. TanStack Query Setup

**src/lib/api/queryClient.ts:**
```ts
import { QueryClient } from '@tanstack/svelte-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1
    }
  }
});
```

**src/routes/+layout.svelte:**
```svelte
<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from '$lib/api/queryClient';
</script>

<QueryClientProvider client={queryClient}>
  <slot />
</QueryClientProvider>
```

**src/lib/api/queries.ts:**
```ts
import { createQuery, createMutation } from '@tanstack/svelte-query';
import { supabase } from './supabase';

export const useProjects = () =>
  createQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

export const useCreateProject = () =>
  createMutation({
    mutationFn: async (project: { title: string; template_type: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

export const useGenerateCode = () =>
  createMutation({
    mutationFn: async (params: { prompt: string; projectId: string }) => {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) throw new Error('Generation failed');
      return response.json();
    }
  });
```

---

### 3. Sandbox Runtime Template

**static/sandbox-runtime.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; media-src 'self' data: blob:;">
  <style>
    * { margin: 0; padding: 0; }
    body { overflow: hidden; background: #000; }
  </style>
</head>
<body>
  <div id="game"></div>

  <!-- Phaser 3 from CDN -->
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>

  <script>
    // gameAPI implementation
    const gameAPI = {
      _frameCounter: 0,
      _randomSeed: Date.now(),
      _isHost: false,
      _entities: [],
      _sounds: [],

      random() {
        const x = Math.sin(this._randomSeed++) * 10000;
        return x - Math.floor(x);
      },

      getFrame() {
        return this._frameCounter;
      },

      isHost() {
        return this._isHost;
      },

      createSprite(type, x, y, config = {}) {
        if (this._entities.length >= 1000) {
          throw new Error('Entity limit reached');
        }
        const sprite = scene.add.sprite(x, y, type);
        this._entities.push(sprite);
        return sprite;
      },

      playSound(name) {
        if (this._sounds.length >= 10) return;
        const sound = scene.sound.play(name);
        this._sounds.push(sound);
        sound.once('complete', () => {
          const idx = this._sounds.indexOf(sound);
          if (idx > -1) this._sounds.splice(idx, 1);
        });
      },

      log(msg) {
        parent.postMessage({ type: 'LOG', payload: { message: msg } }, '*');
      },

      onUpdate(callback) {
        scene.events.on('update', () => {
          this._frameCounter++;
          try {
            callback();
          } catch (error) {
            parent.postMessage({
              type: 'ERROR',
              payload: { message: error.message, stack: error.stack }
            }, '*');
          }
        });
      },

      _sendHeartbeat() {
        parent.postMessage({ type: 'HEARTBEAT' }, '*');
      }
    };

    // Phaser config
    let scene;
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game',
      physics: { default: 'arcade' },
      scene: {
        preload: function() { scene = this; },
        create: function() {
          scene = this;
          parent.postMessage({ type: 'READY' }, '*');
        }
      }
    };

    const game = new Phaser.Game(config);

    // Listen for code loading
    window.addEventListener('message', (event) => {
      if (event.data.type === 'LOAD_CODE') {
        try {
          eval(event.data.payload.code);
          parent.postMessage({ type: 'READY' }, '*');
        } catch (error) {
          parent.postMessage({
            type: 'ERROR',
            payload: { message: error.message, stack: error.stack }
          }, '*');
        }
      }
    });

    // Heartbeat
    setInterval(() => gameAPI._sendHeartbeat(), 1000);

    // Block dangerous APIs
    delete window.fetch;
    delete window.XMLHttpRequest;
    delete window.WebSocket;
    delete window.localStorage;
    delete window.sessionStorage;
  </script>
</body>
</html>
```

---

## Testing Strategy

### Security Tests (Priority 1)

**tests/unit/validator.test.ts:**
```ts
import { describe, it, expect } from 'vitest';
import { validateAST } from '$lib/sandbox/validator';

describe('AST Validator', () => {
  it('should reject eval', () => {
    const code = 'eval("alert(1)")';
    const result = validateAST(code);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Forbidden API: eval');
  });

  it('should reject fetch', () => {
    const code = 'fetch("https://evil.com")';
    const result = validateAST(code);
    expect(result.valid).toBe(false);
  });

  it('should reject localStorage', () => {
    const code = 'localStorage.setItem("key", "value")';
    const result = validateAST(code);
    expect(result.valid).toBe(false);
  });

  it('should allow safe code', () => {
    const code = 'const x = 10; console.log(x);';
    const result = validateAST(code);
    expect(result.valid).toBe(true);
  });
});
```

**tests/e2e/sandbox-security.spec.ts:**
```ts
import { test, expect } from '@playwright/test';

test('sandbox blocks localStorage access', async ({ page }) => {
  await page.goto('/editor/test-project');

  // Load malicious code
  await page.evaluate(() => {
    const iframe = document.querySelector('iframe');
    iframe?.contentWindow?.postMessage({
      type: 'LOAD_CODE',
      payload: { code: 'localStorage.setItem("test", "data")' }
    }, '*');
  });

  // Check for error
  const error = await page.waitForSelector('[data-testid="error-message"]');
  expect(await error.textContent()).toContain('localStorage is not defined');
});
```

---

## Deployment

### Cloudflare Pages (Frontend)

1. Connect GitHub repo
2. Build settings:
   - Build command: `cd apps/web && pnpm build`
   - Output directory: `apps/web/.svelte-kit/cloudflare`
3. Environment variables: Add from `.env`
4. Deploy!

### Coolify (Signaling Server)

**Dockerfile (apps/signaling/Dockerfile):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
```

Deploy via Coolify:
1. Add new service (Docker)
2. Point to `apps/signaling`
3. Set port 3001
4. Add environment variables
5. Deploy!

---

## Next Steps

1. **Setup monorepo:** Run `pnpm install` in root
2. **Initialize Supabase:** Create project, run schema SQL
3. **Start coding:** Begin with Week 1-2 tasks
4. **Security audit:** Before launch, test sandbox escapes

---

## Notes

- **Frame-based sync:** Lock to 60fps update loop
- **Share codes:** 6 chars, exclude I/O/0/1 for clarity
- **Rate limits:** 20 AI prompts/hour, 10 projects max
- **COPPA:** Parent verification required for <13 users
- **Asset limits:** 5MB per file, 1000 entities per game
