# AI Code Editing Research & Implementation Strategy

**Date:** 2025-11-08
**Purpose:** Research findings for implementing AI-powered code editing in Martini game editor

---

## Executive Summary

After researching current AI coding agent patterns, here are the key findings:

### Best Approaches for Our Use Case:
1. **Vercel AI SDK** - Modern, streaming-first tool calling framework
2. **Unified Diff Format** - 3x better performance than search/replace for code edits
3. **MCP (Model Context Protocol)** - Standardized tool interface for file operations
4. **Two-Model Pattern** (Optional) - Separate reasoning from applying edits

---

## 1. Tool Calling Frameworks

### Option A: Vercel AI SDK 5 (RECOMMENDED)
**Pros:**
- ✅ Built-in streaming with tool calls
- ✅ React/Svelte hooks for UI (`useChat`, `useAssistant`)
- ✅ Multi-step tool calling with `maxToolRoundtrips`
- ✅ TypeScript-first with Zod schema validation
- ✅ Works with OpenAI, Anthropic, Gemini, etc.

**Cons:**
- ⚠️ Learning curve for new API patterns
- ⚠️ Adds dependency (~200KB)

**Example Code:**
```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = streamText({
  model: openai('gpt-4o'),
  messages: conversationHistory,
  tools: {
    readFile: {
      description: 'Read contents of a file',
      parameters: z.object({
        path: z.string().describe('File path relative to project root')
      }),
      execute: async ({ path }) => {
        const response = await fetch(`/api/projects/${projectId}/files/${path}`);
        return await response.json();
      }
    },
    editFile: {
      description: 'Apply unified diff to edit a file',
      parameters: z.object({
        path: z.string(),
        diff: z.string().describe('Unified diff format')
      }),
      execute: async ({ path, diff }) => {
        // Apply diff logic here
      }
    },
    createFile: {
      description: 'Create a new file',
      parameters: z.object({
        path: z.string(),
        content: z.string()
      }),
      execute: async ({ path, content }) => {
        // Create file logic
      }
    }
  },
  maxToolRoundtrips: 5, // AI can call tools multiple times
  onFinish: async ({ usage, text, toolCalls }) => {
    // Save conversation history
  }
});

// Stream to client
for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

**Frontend Integration (SvelteKit):**
```svelte
<script lang="ts">
  import { useChat } from '@ai-sdk/svelte';

  const { messages, input, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: []
  });
</script>

<div class="chat-container">
  {#each $messages as message}
    <div class="message" class:user={message.role === 'user'}>
      {message.content}

      {#if message.toolInvocations}
        {#each message.toolInvocations as tool}
          <div class="tool-call">
            📝 {tool.toolName}({JSON.stringify(tool.args)})
            {#if tool.result}
              → {tool.result}
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  {/each}

  <form onsubmit={handleSubmit}>
    <input bind:value={$input} placeholder="Ask AI to edit your game..." />
    <button type="submit" disabled={$isLoading}>Send</button>
  </form>
</div>
```

### Option B: OpenAI SDK Direct
**Pros:**
- ✅ Direct control, no abstraction
- ✅ Smaller bundle size

**Cons:**
- ❌ Manual streaming implementation
- ❌ Manual UI state management
- ❌ More boilerplate code

### Option C: Claude Agent SDK (Python)
**Pros:**
- ✅ Official Anthropic agent framework
- ✅ Built-in permission system
- ✅ Context management (compact mode)

**Cons:**
- ❌ Python only (doesn't fit our SvelteKit stack)
- ❌ Would require separate Python service

**Verdict:** Use **Vercel AI SDK** for frontend + backend integration.

---

## 2. Code Editing Formats

### Format Comparison: Aider Benchmarks

| Format | GPT-4 Turbo Score | GPT-4 (0613) Score | Best For |
|--------|-------------------|--------------------| ---------|
| **Unified Diff** | **61%** ✅ | 59% | GPT-4 Turbo, reducing lazy coding |
| Search/Replace | 20% | 26% | Claude Opus, GPT-3.5 |
| Whole File | 15% | N/A | Simple changes, small files |

### Recommended: Unified Diff Format

**Why it's better:**
- ✅ **3x less lazy** - GPT-4 treats it as data, not conversation
- ✅ **Token efficient** - Only send changed sections
- ✅ **Familiar** - Standard git diff format
- ✅ **No escaping** - No syntax overhead like search/replace blocks

**Example Unified Diff:**
```diff
--- a/src/scenes/GameScene.js
+++ b/src/scenes/GameScene.js
@@ -10,7 +10,12 @@
   create() {
     this.add.text(400, 200, 'Hello Phaser!', {
       fontSize: '48px',
-      color: '#ffffff'
+      color: '#ff0000'
     }).setOrigin(0.5);
+
+    // Add player sprite
+    this.player = this.physics.add.sprite(400, 400, 'player');
+    this.player.setCollideWorldBounds(true);
   }
```

**Implementation with `diff` npm package:**
```typescript
import * as Diff from 'diff';

// Apply diff to file
async function applyUnifiedDiff(filePath: string, diffText: string) {
  const originalContent = await readFile(filePath);

  // Parse unified diff
  const patches = Diff.parsePatch(diffText);

  if (patches.length === 0) {
    throw new Error('Invalid diff format');
  }

  // Apply patch
  const newContent = Diff.applyPatch(originalContent, patches[0]);

  if (!newContent) {
    throw new Error('Failed to apply diff - content mismatch');
  }

  return newContent;
}
```

**Alternative: Search/Replace for Claude Opus**
```typescript
// Claude Opus performs better with search/replace
const searchReplaceFormat = `
  create() {
    this.add.text(400, 200, 'Hello Phaser!', {
      fontSize: '48px',
      color: '#ff0000'
    }).setOrigin(0.5);

    // Add player sprite
    this.player = this.physics.add.sprite(400, 400, 'player');
    this.player.setCollideWorldBounds(true);
  }
`;
```

---

## 3. MCP (Model Context Protocol)

### What is MCP?

MCP is Anthropic's standardized protocol for connecting AI models to external tools and data sources.

**Core Concepts:**
- **Resources** - Read-only data (files, docs, APIs)
- **Tools** - Actions the model can take (edit, create, delete)
- **Prompts** - Reusable prompt templates

### MCP Filesystem Server Features

```typescript
// Example MCP tools exposed by filesystem server
{
  read_file: { path: string },
  write_file: { path: string, content: string },
  list_directory: { path: string },
  create_directory: { path: string },
  move_file: { source: string, destination: string },
  search_files: { pattern: string, path?: string },
  get_file_info: { path: string }
}
```

### Should We Use MCP?

**Pros:**
- ✅ Standardized tool interface
- ✅ Built-in safety (allowlist directories)
- ✅ Read-only mode available
- ✅ Future-proof (Anthropic standard)

**Cons:**
- ⚠️ We already have our own API endpoints
- ⚠️ MCP is primarily for desktop apps (Claude Desktop, VSCode)
- ⚠️ Web implementation would require custom MCP server

**Verdict:** **Don't use MCP directly**, but **adopt the tool design patterns**:
- Clear tool descriptions
- Zod schemas for validation
- Safety allowlists
- Read-only vs write permissions

---

## 4. Two-Model Architecture (Cursor Pattern)

### How Cursor Does It

**Model 1: Planning Agent (GPT-4o/Claude)**
- Reads code context
- Decides what changes to make
- Outputs high-level instructions + diff

**Model 2: Apply Model (Custom/Fast)**
- Takes the diff/instructions
- Applies changes to actual file
- Handles edge cases (indentation, line matching)
- Fast inference (1000 tokens/sec)

### Do We Need This?

**For Martini: NO (at least not for MVP)**

**Why:**
- 🎯 Our code files are small (200-500 lines max)
- 🎯 Phaser games have simple structure
- 🎯 One model (GPT-4o) can handle planning + editing
- 🎯 Complexity not worth it for MVP

**When to consider:**
- ⏳ Phase 2: If users edit 1000+ line files
- ⏳ If we see frequent diff application failures
- ⏳ If latency becomes an issue

---

## 5. UI/UX Patterns

### Option A: Chat Interface (RECOMMENDED)

Similar to Claude Code, Cursor Chat, GitHub Copilot Chat.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ File Tree │ Code Editor  │ Game Preview        │
│           │              │                      │
│           │              │                      │
│           │              │                      │
├───────────┴──────────────┴──────────────────────┤
│ 💬 AI Chat Panel (resizable)                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ User: Add a red square that moves with      │ │
│ │       arrow keys                             │ │
│ │                                              │ │
│ │ AI: I'll add a player sprite to GameScene.js│ │
│ │     [Show Diff] [Apply] [Reject]            │ │
│ │                                              │ │
│ │ ✅ Applied changes to GameScene.js           │ │
│ └─────────────────────────────────────────────┘ │
│ [Type your message...] [Send]                   │
└─────────────────────────────────────────────────┘
```

**Features:**
- ✅ Conversational (natural for kids)
- ✅ Show diff previews before applying
- ✅ Undo/redo support
- ✅ Tool call visibility (what AI is doing)

### Option B: Inline Command Palette

User types `/ai add red square` in code editor.

**Pros:**
- ✅ Fast for power users
- ✅ No extra UI space

**Cons:**
- ❌ Less discoverable
- ❌ Harder for kids
- ❌ No conversation history

### Option C: Prompt Input Only

Like original spec - single prompt box, direct file modification.

**Pros:**
- ✅ Simplest implementation

**Cons:**
- ❌ No way to iterate
- ❌ No preview before apply
- ❌ All-or-nothing changes

**Verdict:** Start with **Chat Interface** (Option A).

---

## 6. Proposed Implementation for Martini

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│ Frontend (SvelteKit)                            │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Chat Component (@ai-sdk/svelte)          │  │
│  │  - useChat hook                          │  │
│  │  - Message history                       │  │
│  │  - Diff preview modal                    │  │
│  └──────────────┬───────────────────────────┘  │
│                 │ POST /api/chat               │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │ API Route: /api/chat/+server.ts          │  │
│  │  - streamText() from Vercel AI SDK       │  │
│  │  - Tool definitions                      │  │
│  │  - Permission checks                     │  │
│  └──────────────┬───────────────────────────┘  │
│                 │ Calls tools                  │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │ Tools (registered with AI SDK)           │  │
│  │  - readFile()                            │  │
│  │  - editFile() - uses unified diff        │  │
│  │  - createFile()                          │  │
│  │  - listFiles()                           │  │
│  │  - runGame() - trigger preview           │  │
│  └──────────────┬───────────────────────────┘  │
│                 │ Call existing APIs           │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │ Existing API Endpoints                   │  │
│  │  - /api/projects/[id]/files              │  │
│  │  - /api/projects/[id]/bundle             │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Tool Definitions

```typescript
// src/routes/api/chat/tools.ts
import { z } from 'zod';
import { tool } from 'ai';

export const tools = {
  readFile: tool({
    description: 'Read the contents of a file in the project',
    parameters: z.object({
      path: z.string().describe('File path, e.g., /src/scenes/GameScene.js')
    }),
    execute: async ({ path }, { projectId, userId }) => {
      // Permission check
      const project = await getProject(projectId, userId);

      // Fetch file
      const file = await db.query.files.findFirst({
        where: and(
          eq(files.projectId, projectId),
          eq(files.path, path)
        )
      });

      if (!file) {
        return { error: 'File not found', path };
      }

      return {
        path: file.path,
        content: file.content,
        lines: file.content.split('\n').length
      };
    }
  }),

  editFile: tool({
    description: 'Edit a file using unified diff format. Only include the sections that need changes.',
    parameters: z.object({
      path: z.string(),
      diff: z.string().describe('Unified diff (--- +++ format) with changes'),
      explanation: z.string().describe('Brief explanation of what changed')
    }),
    execute: async ({ path, diff, explanation }, { projectId, userId }) => {
      // Read original file
      const originalFile = await getFile(projectId, path);

      // Apply diff
      const newContent = await applyUnifiedDiff(originalFile.content, diff);

      // Validate new code (AST check, no syntax errors)
      const validation = await validateCode(newContent);
      if (!validation.valid) {
        return {
          error: 'Code validation failed',
          details: validation.errors
        };
      }

      // Save to database
      await db.update(files)
        .set({ content: newContent, updatedAt: new Date() })
        .where(and(
          eq(files.projectId, projectId),
          eq(files.path, path)
        ));

      return {
        success: true,
        path,
        explanation,
        linesChanged: countChangedLines(diff)
      };
    }
  }),

  createFile: tool({
    description: 'Create a new file in the project',
    parameters: z.object({
      path: z.string().describe('File path, must start with / and end with .js'),
      content: z.string().describe('Initial file content'),
      description: z.string().describe('What this file does')
    }),
    execute: async ({ path, content, description }, { projectId, userId }) => {
      // Validate path
      if (!path.startsWith('/') || !path.endsWith('.js')) {
        return { error: 'Invalid path format' };
      }

      // Check if file exists
      const existing = await getFile(projectId, path);
      if (existing) {
        return { error: 'File already exists', path };
      }

      // Validate content
      const validation = await validateCode(content);
      if (!validation.valid) {
        return { error: 'Invalid JavaScript', details: validation.errors };
      }

      // Create file
      await db.insert(files).values({
        projectId,
        path,
        content,
        createdAt: new Date()
      });

      return {
        success: true,
        path,
        description
      };
    }
  }),

  listFiles: tool({
    description: 'List all files in the project',
    parameters: z.object({}),
    execute: async ({}, { projectId, userId }) => {
      const projectFiles = await db.query.files.findMany({
        where: eq(files.projectId, projectId),
        columns: {
          path: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        files: projectFiles.map(f => ({
          path: f.path,
          name: f.path.split('/').pop(),
          folder: f.path.split('/').slice(0, -1).join('/')
        }))
      };
    }
  }),

  runGame: tool({
    description: 'Trigger the game preview to reload and run the latest code',
    parameters: z.object({
      reason: z.string().describe('Why the game should be run (e.g., "Testing new player movement")')
    }),
    execute: async ({ reason }, { projectId }) => {
      // This would trigger a client-side event to reload the game preview
      // Implementation depends on your real-time communication setup

      return {
        success: true,
        message: 'Game preview will reload',
        reason
      };
    }
  })
};
```

### System Prompt

```typescript
const SYSTEM_PROMPT = `You are an expert Phaser 3 game developer helping a student create their game.

CURRENT PROJECT STRUCTURE:
- /index.html - Main HTML file
- /src/main.js - Phaser configuration and game initialization
- /src/scenes/BootScene.js - Boot scene (runs first)
- /src/scenes/PreloadScene.js - Asset loading scene
- /src/scenes/GameScene.js - Main game scene
- /src/entities/Player.js - Player entity class

TOOLS AVAILABLE:
- readFile(path) - Read any file to understand current code
- listFiles() - See all files in the project
- editFile(path, diff, explanation) - Edit a file using unified diff format
- createFile(path, content, description) - Create a new file
- runGame(reason) - Reload the game preview to test changes

RULES:
1. ALWAYS read files before editing them
2. Use unified diff format (--- +++ style) for edits
3. Keep changes focused - don't rewrite entire files
4. Explain what you're doing in simple terms
5. After making changes, suggest running the game to test
6. Follow Phaser 3 best practices
7. Keep code simple and understandable for students

UNIFIED DIFF FORMAT EXAMPLE:
\`\`\`diff
--- a/src/scenes/GameScene.js
+++ b/src/scenes/GameScene.js
@@ -10,6 +10,10 @@
   create() {
     this.add.text(400, 200, 'Hello!', {
       fontSize: '48px'
     });
+
+    // Add player
+    this.player = this.add.circle(400, 400, 20, 0x00aaff);
   }
\`\`\`

When the user asks you to make changes:
1. Read the relevant file(s)
2. Explain what you'll change
3. Apply the changes with editFile()
4. Suggest running the game`;
```

### Frontend Chat Component

```svelte
<!-- src/routes/editor/[projectId]/AIChatPanel.svelte -->
<script lang="ts">
  import { useChat } from '@ai-sdk/svelte';
  import { ChevronDown, ChevronUp, Play, Undo } from 'lucide-svelte';

  let { projectId } = $props<{ projectId: string }>();

  const { messages, input, handleSubmit, isLoading, reload } = useChat({
    api: `/api/chat?projectId=${projectId}`,
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hi! I can help you build your game. Try asking me to add features like:\n\n- "Add a red square that moves with arrow keys"\n- "Create a jumping animation"\n- "Add background music"\n\nWhat would you like to add?'
      }
    ]
  });

  let expanded = $state(true);
  let showDiffModal = $state(false);
  let currentDiff = $state<any>(null);

  function toggleExpanded() {
    expanded = !expanded;
  }

  function handleToolCall(toolCall: any) {
    if (toolCall.toolName === 'editFile' && toolCall.args.diff) {
      currentDiff = toolCall.args;
      showDiffModal = true;
    }
  }
</script>

<div class="ai-chat-panel" class:expanded>
  <!-- Header -->
  <div class="header" onclick={toggleExpanded}>
    <div class="title">
      <span class="icon">🤖</span>
      <span>AI Assistant</span>
      {#if $isLoading}
        <span class="loading-indicator">●</span>
      {/if}
    </div>
    <button class="toggle-btn">
      {#if expanded}
        <ChevronDown class="h-4 w-4" />
      {:else}
        <ChevronUp class="h-4 w-4" />
      {/if}
    </button>
  </div>

  {#if expanded}
    <!-- Messages -->
    <div class="messages">
      {#each $messages as message}
        <div class="message" class:user={message.role === 'user'}>
          <div class="content">
            {message.content}
          </div>

          {#if message.toolInvocations}
            <div class="tool-calls">
              {#each message.toolInvocations as tool}
                <div class="tool-call">
                  <div class="tool-name">
                    {#if tool.toolName === 'readFile'}
                      📖 Reading {tool.args.path}
                    {:else if tool.toolName === 'editFile'}
                      ✏️ Editing {tool.args.path}
                    {:else if tool.toolName === 'createFile'}
                      ➕ Creating {tool.args.path}
                    {:else if tool.toolName === 'runGame'}
                      ▶️ Running game
                    {/if}
                  </div>

                  {#if tool.result}
                    <div class="tool-result">
                      {#if tool.result.success}
                        ✅ {tool.result.explanation || 'Done'}
                      {:else}
                        ❌ {tool.result.error}
                      {/if}
                    </div>
                  {/if}

                  {#if tool.toolName === 'editFile' && tool.args.diff}
                    <button
                      class="view-diff-btn"
                      onclick={() => handleToolCall(tool)}
                    >
                      View Diff
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Input -->
    <form class="input-form" onsubmit={handleSubmit}>
      <input
        bind:value={$input}
        placeholder="Ask AI to add a feature..."
        disabled={$isLoading}
      />
      <button type="submit" disabled={$isLoading || !$input.trim()}>
        Send
      </button>
    </form>
  {/if}
</div>

<style>
  .ai-chat-panel {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--border);
    background: var(--background);
    height: 60px;
    transition: height 0.3s ease;
  }

  .ai-chat-panel.expanded {
    height: 400px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  .loading-indicator {
    color: var(--primary);
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .message {
    max-width: 80%;
    padding: 12px;
    border-radius: 8px;
    background: var(--muted);
  }

  .message.user {
    align-self: flex-end;
    background: var(--primary);
    color: white;
  }

  .tool-calls {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .tool-call {
    padding: 6px;
    font-size: 0.875rem;
    font-family: monospace;
    background: var(--background);
    border-radius: 4px;
    margin-bottom: 6px;
  }

  .input-form {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
  }

  .input-form input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .input-form button {
    padding: 8px 16px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  .input-form button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

---

## 7. Implementation Phases

### Phase 1: Basic Chat (Week 1)
- ✅ Install Vercel AI SDK
- ✅ Create `/api/chat` endpoint
- ✅ Implement `readFile` and `listFiles` tools
- ✅ Basic chat UI component
- ✅ Test AI can read and understand code

### Phase 2: Code Editing (Week 2)
- ✅ Implement `editFile` tool with unified diff
- ✅ Add diff preview modal
- ✅ AST validation before saving
- ✅ Undo/redo support
- ✅ Test: "Add a red square that moves"

### Phase 3: File Creation (Week 3)
- ✅ Implement `createFile` tool
- ✅ File tree auto-refresh
- ✅ Test: "Create a new Enemy.js class"

### Phase 4: Polish (Week 4)
- ✅ Better error messages
- ✅ Syntax highlighting in diffs
- ✅ Auto-run game after edits
- ✅ Save conversation history
- ✅ Rate limiting (prevent API abuse)

---

## 8. Open Questions

### 1. **How much autonomy should AI have?**
   - **Option A:** Always ask before applying changes (show diff modal)
   - **Option B:** Auto-apply, allow undo
   - **Option C:** User setting (auto vs manual mode)

   **Recommendation:** Start with Option A (always ask), add Option C later.

### 2. **Should AI be able to delete files?**
   - **Concern:** Kids might accidentally delete important files
   - **Solution:** Don't add `deleteFile` tool in MVP. Manual deletion only.

### 3. **Multi-file changes - atomic or incremental?**
   - **Example:** User says "add a new scene"
   - **Option A:** Apply all changes at once (create scene, update main.js)
   - **Option B:** Apply one at a time, user approves each

   **Recommendation:** Option A (atomic), but show preview of all changes.

### 4. **How to handle merge conflicts?**
   - If user edits file while AI is also editing it
   - **Solution:** Lock file during AI edit, or detect conflicts and ask user

### 5. **Cost control?**
   - GPT-4o is ~$5/million input tokens, ~$15/million output tokens
   - Average chat: ~5k tokens in, ~2k tokens out = $0.055 per conversation
   - **Solution:** Free tier: 100 messages/month, paid: unlimited

---

## 9. Dependencies to Install

```bash
# Vercel AI SDK
pnpm add ai @ai-sdk/openai @ai-sdk/svelte

# Diff handling
pnpm add diff @types/diff

# Zod (for schemas)
pnpm add zod

# Optional: Syntax highlighting for diffs
pnpm add shiki
```

---

## 10. Security Considerations

### 1. **Prompt Injection Prevention**
```typescript
// Sanitize user input
function sanitizePrompt(input: string): string {
  // Remove attempts to override system prompt
  const dangerous = [
    'ignore previous instructions',
    'you are now',
    'system:',
    'assistant:'
  ];

  let sanitized = input;
  dangerous.forEach(phrase => {
    sanitized = sanitized.replace(new RegExp(phrase, 'gi'), '[FILTERED]');
  });

  return sanitized;
}
```

### 2. **File Path Validation**
```typescript
function isValidPath(path: string, projectId: string): boolean {
  // Must start with /
  if (!path.startsWith('/')) return false;

  // Must end with .js or .html
  if (!path.match(/\.(js|html)$/)) return false;

  // No path traversal
  if (path.includes('..')) return false;

  // No absolute paths outside project
  if (path.includes('/etc') || path.includes('/var')) return false;

  return true;
}
```

### 3. **Code Validation**
```typescript
import * as acorn from 'acorn';

function validateCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // Parse with Acorn
    acorn.parse(code, { ecmaVersion: 2020 });
  } catch (e) {
    errors.push(`Syntax error: ${e.message}`);
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /new\s+Function/,
    /<script/i,
    /document\.write/
  ];

  dangerousPatterns.forEach(pattern => {
    if (pattern.test(code)) {
      errors.push(`Dangerous pattern detected: ${pattern}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## 11. Final Recommendation

### MVP Implementation (4 weeks):

1. **Week 1: Setup**
   - Install Vercel AI SDK
   - Create chat API endpoint
   - Basic chat UI
   - `readFile` and `listFiles` tools

2. **Week 2: Editing**
   - `editFile` tool with unified diff
   - Diff preview modal
   - AST validation

3. **Week 3: File Creation**
   - `createFile` tool
   - Auto-refresh file tree
   - Test end-to-end

4. **Week 4: Polish**
   - Error handling
   - Conversation history
   - Rate limiting
   - User testing

### Success Metrics:
- ✅ AI can successfully edit files 80% of the time
- ✅ Average response time < 5 seconds
- ✅ Zero security incidents (prompt injection, file access)
- ✅ Kids can add simple features without touching code

---

**Next Step:** Get approval to proceed with Week 1 implementation! 🚀
