# Architecture Overview

## Product Vision

A browser-based platform where kids create 2D multiplayer games by prompting an AI. Games run instantly in-browser with real-time peer-to-peer multiplayer and can be shared/remixed via short links.

**Core Loop:** Prompt → Code → Play → Share → Remix (repeat)

---

## Target Users & Scope

- **Age Groups:** All ages (COPPA compliance for under-13)
- **Platform:** Pure browser (desktop/laptop primary, tablet full support, phone play-only)
- **Game Engine:** Phaser 3 (2D only for MVP, Babylon.js deferred)
- **Multiplayer:** 1-6 players peer-to-peer WebRTC

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (SvelteKit App)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ CodeMirror 6 │  │   Phaser 3   │  │   WebRTC P2P         │  │
│  │   Editor     │  │   Renderer   │  │   (simple-peer)      │  │
│  │   (+Yjs)     │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                 │                     │                │
│         └─────────────────┴─────────────────────┘                │
│                           │                                      │
│                    ┌──────▼────────┐                             │
│                    │  Sandboxed    │                             │
│                    │  Game Code    │                             │
│                    │  (iframe)     │                             │
│                    └───────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼────────────────┐
            │              │                │
    ┌───────▼─────┐  ┌────▼──────┐  ┌─────▼──────┐
    │  Supabase   │  │  Node.js  │  │ Socket.io  │
    │  Auth + DB  │  │  AI API   │  │ Signaling  │
    │  + Storage  │  │           │  │  Server    │
    └─────────────┘  └───────────┘  └────────────┘
```

---

## Core Architecture Decisions

### **1. Multiplayer: Peer-to-Peer with Input Sync**

#### **Why P2P?**
- ✅ Zero server compute costs
- ✅ Instant multiplayer (no provisioning)
- ✅ Perfect for 2-6 player friend groups
- ✅ Clean upgrade path to dedicated servers

#### **Why Input Sync (not State Sync)?**
- ✅ Low latency (~50ms vs 82ms)
- ✅ Low bandwidth (36KB/s vs 1.8MB/s for 6 players)
- ✅ **Seamless upgrade path:** same game code works on dedicated servers later
- ⏱️ MVP skips client prediction (add in Phase 2 for 0ms latency)

#### **Network Model:**
```
Host Browser:                  Client Browsers:
┌──────────────┐              ┌──────────────┐
│ Game Logic   │              │ Game Logic   │
│ (authoritative)              │ (simulates)  │
│              │  Inputs      │              │
│              │◄─────────────│              │
│              │              │              │
│              │ State Update │              │
│              │─────────────►│              │
└──────────────┘              └──────────────┘
```

**Data Flow:**
1. All players run same game code in sandboxed iframes
2. Clients send inputs to host: `{ playerId, keys: ['left', 'space'], frame: 123 }`
3. Host simulates authoritative game state
4. Host broadcasts state snapshots: `{ frame: 123, players: [...], entities: [...] }`
5. Clients render received state

**Bandwidth (per player):**
- Inputs: ~6KB/s upload
- State: ~6KB/s download
- Total: ~12KB/s (works on mobile hotspots)

---

### **2. Code Execution: Sandboxed iframes**

User-generated game code runs in **each player's browser** (not on our servers).

#### **Security Layers:**

**Layer 1: AST Validation** (before loading)
- Parse AI-generated code with Acorn
- Reject dangerous patterns:
  - `eval`, `Function`, `fetch`, `WebSocket`, `XMLHttpRequest`
  - `window`, `document`, `localStorage`, `sessionStorage`, `indexedDB`
  - `import`, `require` (block dynamic module loading)
- Insert loop guards (Babel transform):
  ```js
  // Transform: while (cond) { body }
  // Into:
  let _loopCounter = 0;
  while (cond) {
    if (++_loopCounter > 100000) throw new Error("Loop limit");
    body
  }
  ```

**Layer 2: Sandboxed iframe**
```html
<iframe
  sandbox="allow-scripts"
  csp="script-src 'self'; connect-src 'self' wss://yourdomain.com"
>
```
- `allow-scripts` only (NO `allow-same-origin`)
- Opaque origin: cannot access parent's localStorage/cookies/DOM
- Strict CSP: blocks network access except to our domains

**Layer 3: Restricted Game API**
- Game code CANNOT access raw `Phaser` object
- Game code gets `gameAPI` object via postMessage:
  ```js
  gameAPI.createSprite(type, x, y)
  gameAPI.playSound(name)
  gameAPI.sendInput(keys)
  gameAPI.getState() // from host
  ```
- API enforces limits:
  - 1000 entities max
  - 5MB per texture
  - 10 sounds simultaneously

**Layer 4: Runtime Watchdog**
- Timeout: terminate iframe if unresponsive > 5s
- FPS monitor: restart if FPS < 10 for 10 seconds
- Memory: browser's native iframe limits

---

### **3. Technology Stack**

#### **Frontend**
- **Framework:** SvelteKit + TypeScript
- **Code Editor:** CodeMirror 6 (lightweight, ~200KB vs Monaco's 5MB)
- **Collaborative Editing:** Yjs + y-codemirror.next (Phase 2+)
- **Game Engine:** Phaser 3.80+ (2D, WebGL + Canvas fallback)
- **Multiplayer:** simple-peer (WebRTC) + Socket.io-client (signaling)
- **Build:** Vite (bundled with SvelteKit)
- **UI Components:** Tailwind CSS + Shadcn-Svelte

#### **Backend Services**
- **Database/Auth:** Supabase (Postgres + Auth + Storage)
- **AI Generation:** Node.js/Bun API → OpenAI GPT-4
- **Signaling Server:** Socket.io on Coolify
- **Hosting:** Cloudflare Pages (frontend), Coolify (backend)

#### **Asset Management**
- **Starter Assets:** 50 sprites/sounds from Kenney.nl
- **User Uploads:** Supabase Storage (5MB per file limit)
- **Asset Generation:** Deferred to Phase 2

---

## Data Architecture

### **Supabase Postgres Schema**

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL CHECK (length(username) >= 3 AND length(username) <= 20),
  password_hash TEXT NOT NULL,
  birthdate DATE NOT NULL,
  parent_email TEXT, -- required if under 13
  parent_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects (games)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  share_code TEXT UNIQUE, -- 6-char: ABC123
  thumbnail_url TEXT,
  template_type TEXT CHECK (template_type IN ('shooter', 'platformer', 'building', 'blank')),
  forked_from UUID REFERENCES projects(id), -- for remixes
  state TEXT DEFAULT 'draft', -- 'draft' or 'published'
  play_count INTEGER DEFAULT 0,
  remix_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Game code files
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'game.js', -- single file for MVP
  content TEXT NOT NULL, -- JS code
  version INTEGER DEFAULT 1, -- for history
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- Code history (last 10 versions)
CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(file_id, version)
);

-- Asset uploads
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  file_type TEXT CHECK (file_type IN ('image', 'audio')),
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics (simple)
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'signup', 'game_created', 'game_played', 'game_remixed', 'game_shared'
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
```

---

## Development Phases

### **Phase 1: MVP (8-10 weeks)**

**Week 1-2: Foundation**
- ✅ SvelteKit app setup + Supabase integration
- ✅ Auth flow (username/password, birthdate, parent email)
- ✅ CodeMirror 6 editor integration
- ✅ Basic UI layout (editor | canvas | controls)

**Week 3-4: AI Code Generation**
- ✅ OpenAI API integration
- ✅ Prompt → Phaser code generation
- ✅ AST validation + loop guards
- ✅ Error handling + auto-retry

**Week 5-6: Game Runtime**
- ✅ Sandboxed iframe setup
- ✅ Phaser 3 integration
- ✅ Game API wrapper (createSprite, playSound, etc.)
- ✅ Hot reload on Ctrl+S
- ✅ Console logging + error display

**Week 7-8: Multiplayer**
- ✅ Socket.io signaling server
- ✅ WebRTC P2P connection setup
- ✅ Input sync implementation
- ✅ Host/client architecture
- ✅ 6-char share codes

**Week 9-10: Polish**
- ✅ 3 starter templates (shooter, platformer, building)
- ✅ Project save/load
- ✅ Enhanced share links (Open Graph metadata)
- ✅ Basic asset library (50 sprites/sounds)
- ✅ File upload for assets
- ✅ "Upgrade for 7+ players" button (placeholder)

**MVP Success Criteria:**
- Time to first playable game: < 60 seconds
- Code edit → reload: < 5 seconds
- Join multiplayer game: < 3 seconds
- P2P latency: < 100ms (local network)

---

### **Phase 2: Community & Scaling (6-8 weeks post-MVP)**

- ✅ Public game gallery + search
- ✅ Remix/fork functionality
- ✅ Manual moderation dashboard
- ✅ Featured games curation
- ✅ Client-side prediction (0ms input latency)
- ✅ Stripe payment integration ($10/mo tier)
- ✅ Dedicated server deployment (K8s pods)
- ✅ Project versioning + rollback UI

---

### **Phase 3: Advanced Features (deferred)**

- **Real-time collaborative editing (Yjs + y-codemirror.next)** - Google Docs-style multi-user editing
- Voice chat (WebRTC audio)
- Asset generation (DALL-E, AI sounds)
- Babylon.js 3D support
- Mobile code editor (phone support)
- Community marketplace

**Note:** CodeMirror 6 has excellent official Yjs support via `y-codemirror.next`, making collaborative editing straightforward to implement in Phase 2+. The existing Socket.io signaling server can be reused for Yjs websocket connections.

---

## Key Non-Functional Requirements

### **Performance**
- First playable frame: < 1s after prompt
- Code edit → reload: < 5s
- P2P handshake: < 3s
- 60 FPS target for games
- Autosave: every 5s

### **Security**
- Zero iframe sandbox escapes (security audit before launch)
- All user code treated as hostile
- COPPA compliant (parental consent for <13)
- Rate limiting: 20 AI prompts/hour per user

### **Scalability**
- P2P has zero marginal cost per game
- Supabase Pro: supports 10k concurrent users
- Socket.io signaling: 10k concurrent connections per server

### **Browser Support**
- Chrome/Edge 100+ (primary)
- Firefox 100+ (full support)
- Safari 15+ (full support, including iPad)
- No IE11 support

### **Responsive Design**
- Desktop (1280px+): full editor + play
- Tablet (768-1024px): full editor + play (vertical layout)
- Phone (<768px): play-only mode (no editor)

---

## Cost Estimates

### **MVP Phase:**
- Supabase Pro: $25/mo (8GB DB, 100GB storage, 10GB egress)
- Coolify (Socket.io + AI API): $10/mo (2GB RAM VPS)
- OpenAI GPT-4: ~$100/mo (est. 10k prompts @ $0.01 avg)
- Cloudflare Pages: $0 (free tier)
- Kenney.nl assets: $0 (CC0 license)
- Domain: $12/year
- **Total: ~$135/mo**

### **Scaling (1000 active users):**
- Supabase: $25/mo (still within limits)
- OpenAI: ~$300/mo (30k prompts)
- Signaling servers: $20/mo (scale horizontally)
- **Total: ~$345/mo**

### **With Paid Tier (100 paid users @ $10/mo):**
- Revenue: $1000/mo
- K8s cluster (dedicated servers): ~$200/mo (10-20 concurrent games)
- Above costs: $345/mo
- **Net: +$455/mo**

---

## Success Metrics

### **Engagement (MVP):**
- Daily Active Users (DAU)
- Games created per user
- Average play session length
- Share link clicks
- Remix rate (% of games forked)

### **Technical:**
- P2P connection success rate (target: >95%)
- Average latency (target: <100ms)
- Sandbox escape attempts (target: 0)
- Code generation success rate (target: >80%)

### **Business (Post-MVP):**
- Paid conversion rate
- Monthly Recurring Revenue (MRR)
- Churn rate
- Cost per acquisition (CPA)

---

## Risk Mitigation

### **Technical Risks:**
| Risk | Mitigation |
|------|------------|
| Sandbox escape | Security audit, bug bounty program |
| P2P unreliable | Fallback to TURN server relay |
| AI generates broken code | Auto-retry + manual fix button |
| Bandwidth too high | Already using input sync (efficient) |

### **Product Risks:**
| Risk | Mitigation |
|------|------------|
| Kids don't understand prompting | Strong starter templates + examples |
| Games too simple/boring | Focus on multiplayer fun > complexity |
| No viral growth | Share links + remix feature built-in |
| COPPA violation | Parent email verification before sharing |

### **Business Risks:**
| Risk | Mitigation |
|------|------------|
| High AI costs | Rate limiting, caching common responses |
| No monetization | Free tier validates product-market fit first |
| Competition (Roblox) | Focus on speed: prompt → play in 60s |

---

## Upgrade Path: P2P → Dedicated Servers

**When user clicks "Upgrade for 7+ players" button:**

1. User pays $10/mo via Stripe
2. Backend provisions K8s pod with user's game code
3. Pod runs same code with isolated-vm sandbox
4. Share code changes: `/play/ABC123` → `/server/ABC123`
5. Old P2P links still work for testing
6. Server supports 7-100+ players with input sync

**No code changes required** - this is why we chose input sync from day 1!

---

## Next Steps

See detailed specs:
1. [01-ai-code-generation.md](./01-ai-code-generation.md)
2. [02-game-runtime-sandbox.md](./02-game-runtime-sandbox.md)
3. [03-multiplayer-p2p.md](./03-multiplayer-p2p.md)
4. [04-auth-storage.md](./04-auth-storage.md)
5. [05-api-contracts.md](./05-api-contracts.md)
6. [06-game-templates.md](./06-game-templates.md)
7. [../docs/coppa-compliance.md](../docs/coppa-compliance.md)
8. [../docs/ip-and-licensing.md](../docs/ip-and-licensing.md)
