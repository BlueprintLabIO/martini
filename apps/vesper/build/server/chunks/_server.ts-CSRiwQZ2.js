import { streamText, stepCountIs, convertToModelMessages, tool, zodSchema } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { j as json } from './index-Djsj11qr.js';
import { d as db, p as projects, f as files, a as assets } from './index3-Cd3ryqyN.js';
import { eq, and } from 'drizzle-orm';
import { S as SECRET_COMPLETION_KEY } from './private-B9JdXzlJ.js';
import { z } from 'zod';
import crypto from 'crypto';
import { g as getConsoleLogs } from './game-console-output-Cf653Jc9.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

const MARTINI_SDK_DOCS = `
# Martini SDK - What Makes It Different

## Core Architecture
**Host-authoritative**: Host runs Phaser physics, clients ONLY render.
**Auto-sync**: PhaserAdapter syncs state automatically via trackSprite().
**Direct mutation**: state.x = 10 (NOT {...state, x: 10}).

## Critical Implementation Patterns

### 1. Host Creates Physics Objects, Client Creates Visual Objects

**WITH TEXTURES (when assets available):**
\`\`\`typescript
// Host
if (isHost) {
  const sprite = this.physics.add.sprite(100, 100, 'player');
  sprite.body.setCollideWorldBounds(true);
  this.physics.add.collider(sprite, platforms);
  adapter.trackSprite(sprite, 'player-' + playerId);
}

// Client (CRITICAL - check state._sprites)
if (!isHost) {
  adapter.onChange((state) => {
    if (!state._sprites) return; // REQUIRED CHECK!
    for (const [key, data] of Object.entries(state._sprites)) {
      if (!this.sprites[key]) {
        const sprite = this.add.sprite(data.x, data.y, 'player');
        this.sprites[key] = sprite;
        adapter.registerRemoteSprite(key, sprite); // NOT trackSprite!
      }
    }
  });
}
\`\`\`

**WITHOUT TEXTURES (shape-based games - COMMON PATTERN):**
\`\`\`typescript
// Host - Rectangle with physics
if (isHost) {
  const rect = this.add.rectangle(100, 100, 32, 32, 0xff0000);
  this.physics.add.existing(rect); // Add physics AFTER creating shape
  rect.body.setCollideWorldBounds(true);
  this.physics.add.collider(rect, platforms);
  adapter.trackSprite(rect, 'player-' + playerId);
}

// Client - Same rectangle, NO physics
if (!isHost) {
  adapter.onChange((state) => {
    if (!state._sprites) return;
    for (const [key, data] of Object.entries(state._sprites)) {
      if (!this.sprites[key]) {
        const rect = this.add.rectangle(data.x, data.y, 32, 32, 0xff0000);
        this.sprites[key] = rect;
        adapter.registerRemoteSprite(key, rect);
      }
    }
  });
}
\`\`\`

**PLATFORMS / STATIC OBJECTS:**
\`\`\`typescript
// CORRECT - Visible platform
const plat = this.add.rectangle(400, 500, 200, 20, 0x34495e);
this.physics.add.existing(plat, true); // true = static
platforms.add(plat);

// WRONG - Invisible (undefined texture)
platforms.create(400, 500, undefined); // DON'T DO THIS!
\`\`\`

### 2. Input Storage Pattern

**game.ts:**
\`\`\`typescript
setup: () => ({
  players: {},
  inputs: {} // Store inputs here
}),

actions: {
  move: {
    apply: (state, ctx, input) => {
      if (!state.inputs) state.inputs = {}; // Safety check
      state.inputs[ctx.targetId] = input;
    }
  }
}
\`\`\`

**scene.ts:**
\`\`\`typescript
update() {
  // Everyone submits input
  runtime.submitAction('move', { left: true, right: false });

  if (isHost) {
    // Host reads inputs and applies physics
    const state = runtime.getState();
    for (const [pid, input] of Object.entries(state.inputs || {})) {
      if (input.left) sprite.body.setVelocityX(-200);
    }
  }
}
\`\`\`

### 3. Client Interpolation (REQUIRED)

\`\`\`typescript
update() {
  if (!isHost) {
    this.adapter.updateInterpolation(); // MUST call every frame!
  }
}
\`\`\`

### 4. Player Join/Leave Hooks

\`\`\`typescript
defineGame({
  onPlayerJoin: (state, playerId) => {
    state.players[playerId] = { x: 100, y: 100 };
  },
  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  }
});
\`\`\`

**In scene (check existing peers for LocalTransport):**
\`\`\`typescript
if (isHost) {
  // CRITICAL: Check existing peers (LocalTransport connects instantly!)
  transport.getPeerIds().forEach(peerId => createPeerSprite(peerId));

  // Also listen for future joins
  transport.onPeerJoin(peerId => createPeerSprite(peerId));
}
\`\`\`

### 5. Target Specific Players

\`\`\`typescript
// Third argument = targetId
runtime.submitAction('score', undefined, winnerId);
// context.targetId will be winnerId

actions: {
  score: {
    apply: (state, context) => {
      state.players[context.targetId].score += 1;
    }
  }
}
\`\`\`

## Essential Checklist

Host pattern:
- [ ] Create physics object: \`this.physics.add.sprite()\` OR \`this.add.rectangle() + this.physics.add.existing()\`
- [ ] \`adapter.trackSprite(object, key)\` once in create()
- [ ] Host reads \`state.inputs\` to apply physics

Client pattern:
- [ ] Check \`if (!state._sprites) return\`
- [ ] Create visual object (NO physics): \`this.add.sprite()\` OR \`this.add.rectangle()\`
- [ ] \`adapter.registerRemoteSprite(key, object)\`
- [ ] Call \`adapter.updateInterpolation()\` in update()

Both:
- [ ] Store inputs: \`state.inputs = {}\`
- [ ] Safety checks: \`if (!state.inputs) state.inputs = {}\`
- [ ] Use \`onPlayerJoin\`/\`onPlayerLeave\` hooks

Shape-based games (no textures):
- [ ] Use \`this.add.rectangle()\` or \`this.add.circle()\` NOT \`sprite()\`
- [ ] Add physics AFTER: \`this.physics.add.existing(shape)\`
- [ ] Platforms: create rectangle, then add to static group
`;
const SYSTEM_PROMPT = `You help create multiplayer Phaser games with Martini SDK!

DEFAULTS (don't ask):
- Multiplayer (Martini SDK always)
- 1 level to start
- Basic shapes (rectangles/circles - no art until working)
- 2-player cooperative

BE CONCISE:
- 1-2 sentences max, then code
- Make smart assumptions
- Act first, explain briefly after

CRITICAL MARTINI PATTERNS:

1. **Host = physics, Client = visual only**
   Shapes: this.add.rectangle() + this.physics.add.existing() + adapter.trackSprite()
   Sprites: this.physics.add.sprite() + adapter.trackSprite()
   Client: Same shape/sprite (NO physics) + adapter.registerRemoteSprite()

2. **Client MUST check state._sprites**
   if (!state._sprites) return;

3. **Client MUST call updateInterpolation()**
   if (!isHost) adapter.updateInterpolation();

4. **Store inputs in state**
   state.inputs = {}; // In setup
   state.inputs[ctx.targetId] = input; // In move action

5. **Host reads inputs to apply physics**
   for (const [pid, input] of Object.entries(state.inputs || {})) { ... }

6. **NO TEXTURES = Use Shapes (Common!)**
   Player: this.add.rectangle(x, y, 32, 32, 0xff0000)
   Platform: this.add.rectangle(x, y, w, h, 0x888888)
   Then: this.physics.add.existing(shape) to add physics

---

${MARTINI_SDK_DOCS}`;
const PLANNING_PROMPT = `You help plan game ideas!

Create markdown docs in /docs/:
- game-concept.md - Vision
- mechanics.md - Rules
- levels.md - Design

Be concise. Ask questions. Switch to Act mode to code.`;
function buildSystemPrompt(projectFiles, projectAssets = [], planMode = false) {
  const fileListSection = projectFiles.length > 0 ? `

PROJECT FILES:
${projectFiles.map((f) => f.path).join("\n")}` : "";
  let assetSection = "";
  if (projectAssets.length > 0) {
    const images = projectAssets.filter((a) => a.fileType === "image");
    const audio = projectAssets.filter((a) => a.fileType === "audio");
    assetSection = "\n\nASSETS:";
    if (images.length > 0) {
      assetSection += "\nImages: " + images.map((img) => {
        const name = img.filename.replace(/\.[^/.]+$/, "");
        return `'${name}'`;
      }).join(", ");
    }
    if (audio.length > 0) {
      assetSection += "\nAudio: " + audio.map((snd) => {
        const name = snd.filename.replace(/\.[^/.]+$/, "");
        return `'${name}'`;
      }).join(", ");
    }
    assetSection += "\n(Assets preloaded - just use names in code)";
  }
  const basePrompt = planMode ? PLANNING_PROMPT : SYSTEM_PROMPT;
  return basePrompt + fileListSection + assetSection;
}
function fastHash(content) {
  const sample = content.slice(0, 1024) + // First 1KB
  content.slice(-1024) + // Last 1KB
  content.length;
  return crypto.createHash("sha256").update(sample).digest("hex").slice(0, 16);
}
function createProjectTools(projectId, planMode = false) {
  const commonTools = {
    getConsoleLogs: tool({
      description: "Get recent console output from the game (errors, gameAPI.log() messages). Use this to see runtime errors and verify code execution.",
      inputSchema: zodSchema(
        z.object({
          limit: z.number().default(20).describe("Number of recent logs to return (default: 20)")
        })
      ),
      execute: async ({ limit }) => {
        const logs = getConsoleLogs(projectId, limit);
        if (logs.length === 0) {
          return {
            logs: [],
            message: "No console logs yet. Game may not be running or no logs have been generated.",
            hint: "Ask user to run the game and try an action that should generate logs"
          };
        }
        return {
          logs: logs.map((l) => `[Frame ${l.frame}] ${l.message}`),
          total: logs.length
        };
      }
    }),
    readFile: tool({
      description: "Read the contents of a file in the project. Returns version token for safe editing.",
      inputSchema: zodSchema(
        z.object({
          path: z.string().describe("File path, e.g., /src/scenes/GameScene.js")
        })
      ),
      execute: async ({ path }) => {
        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        const [file] = await db.select().from(files).where(and(eq(files.projectId, projectId), eq(files.path, normalizedPath))).limit(1);
        if (!file) {
          return {
            error: "File not found",
            path: normalizedPath,
            hint: "Use listFiles() to see available files"
          };
        }
        return {
          path: file.path,
          content: file.content,
          version: fastHash(file.content),
          lines: file.content.split("\n").length,
          size: file.content.length
        };
      }
    }),
    listFiles: tool({
      description: "List all files in the project to see the structure",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const projectFiles = await db.select({
          path: files.path,
          updatedAt: files.updatedAt
        }).from(files).where(eq(files.projectId, projectId));
        return {
          files: projectFiles.map((f) => ({
            path: f.path,
            name: f.path.split("/").pop(),
            folder: f.path.split("/").slice(0, -1).join("/") || "/"
          })),
          total: projectFiles.length
        };
      }
    }),
    createFile: tool({
      description: "Create a new file in the project. Can also be used to completely rewrite an existing file with new content. Use this for creating design docs, new game files, or when you need to replace an entire file.",
      inputSchema: zodSchema(
        z.object({
          path: z.string().describe(
            "File path starting with /, e.g., /docs/game-concept.md or /src/scenes/Level2.js"
          ),
          content: z.string().describe("Content of the new file. IMPORTANT: Use actual newline characters (not escaped \\n sequences). Multi-line content should have real line breaks, not literal backslash-n.")
        })
      ),
      needsApproval: true
      // 🔑 Require user approval for file creation
      // ⚠️ NO execute function - client-side execution only!
      //
      // ARCHITECTURE: All mutation operations MUST run client-side
      // Reasons for client-side file creation:
      // 1. Client ownership - filesMap state is the source of truth
      // 2. Instant reactivity - file tree updates immediately without fetch cycles
      // 3. Race condition prevention - no DB write → fetch → refresh loops
      // 4. CRDT/Y.js compatibility - future real-time collaboration requires client mutations
      // 5. Optimistic UI - new file visible instantly, async server persistence
      // 6. Consistent pattern - all mutations (create/edit/delete) work the same way
    }),
    captureScreenshot: tool({
      description: "Capture a screenshot of the game canvas. Use this to debug visual bugs, collision issues, or sprite positioning problems.",
      inputSchema: zodSchema(z.object({})),
      needsApproval: false
      // No approval needed - just captures current state
      // ⚠️ NO execute function - client-side execution only!
      // Screenshot capture must happen client-side to access the canvas element
    })
  };
  return {
    ...commonTools,
    editFile: tool({
      description: planMode ? "Edit a design document in /docs folder. ALWAYS read the file first to get the version token. Only use for files in /docs/" : "Edit a file by replacing exact text. ALWAYS read the file first to get the version token.",
      inputSchema: zodSchema(
        z.object({
          path: z.string().describe("File path to edit"),
          version: z.string().describe("Version token from readFile (prevents conflicts)"),
          edits: z.array(
            z.object({
              old_text: z.string().describe("Exact text to replace"),
              new_text: z.string().describe("New text to insert")
            })
          ).describe("Array of search/replace edits to apply sequentially")
        })
      ),
      needsApproval: true
      // 🔑 Require user approval for file modifications
      // ⚠️ NO execute function - client-side execution only!
      // Reasons for client-side mutations:
      // 1. Enables Y.js/CRDT integration - client must own document mutations
      // 2. No race conditions - direct state updates, no fetch/refresh cycles
      // 3. Optimistic UI - instant feedback, async server persistence
      // 4. Version control ready - client tracks each edit operation
      // 5. Future-proof for real-time collaboration
    })
  };
}
const anthropic = createAnthropic({
  apiKey: SECRET_COMPLETION_KEY
});
function getRecentMessagesByUserTurns(messages, userTurnCount = 5) {
  if (messages.length === 0) return messages;
  const userMessageIndices = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "user") {
      userMessageIndices.push(i);
    }
  }
  if (userMessageIndices.length <= userTurnCount) {
    return messages;
  }
  const startIndex = userMessageIndices[userMessageIndices.length - userTurnCount];
  return messages.slice(startIndex);
}
const POST = async ({ request, locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const { messages } = await request.json();
  if (!messages || !Array.isArray(messages)) {
    return json({ error: "Invalid messages format" }, { status: 400 });
  }
  let projectId;
  let planMode = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    const metadata = messages[i]?.metadata;
    if (metadata?.projectId && !projectId) {
      projectId = metadata.projectId;
    }
    if (metadata?.planMode !== void 0 && planMode === false) {
      planMode = metadata.planMode;
    }
    if (projectId && planMode !== false) break;
  }
  console.log("=== CHAT API DEBUG ===");
  console.log("Extracted projectId from messages:", projectId);
  console.log("Extracted planMode from messages:", planMode);
  if (!projectId) {
    return json({ error: "Missing projectId in message metadata" }, { status: 400 });
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return json({ error: "Project not found" }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  const projectFiles = await db.select({
    path: files.path
  }).from(files).where(eq(files.projectId, projectId));
  const projectAssets = await db.select({
    filename: assets.filename,
    fileType: assets.fileType,
    assetType: assets.assetType,
    sizeBytes: assets.sizeBytes,
    metadata: assets.metadata
  }).from(assets).where(eq(assets.projectId, projectId));
  const dynamicSystemPrompt = buildSystemPrompt(projectFiles, projectAssets, planMode);
  const tools = createProjectTools(projectId, planMode);
  try {
    const recentMessages = getRecentMessagesByUserTurns(messages, 5);
    console.log(`📊 Message count: ${messages.length} total, sending last ${recentMessages.length} to model (${recentMessages.filter((m) => m.role === "user").length} user turns)`);
    const result = streamText({
      model: anthropic("claude-haiku-4-5"),
      system: dynamicSystemPrompt,
      messages: convertToModelMessages(recentMessages),
      tools,
      stopWhen: stepCountIs(5),
      // Allow up to 5 steps for multi-step tool calls
      temperature: 0.7
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return json(
      {
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-CSRiwQZ2.js.map
