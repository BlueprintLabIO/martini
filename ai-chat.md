# AI Chat Panel Proposal for Martini Kit IDE

**Status:** Proposal
**Author:** AI Assistant
**Date:** 2025-11-29
**Version:** 1.0

---

## Executive Summary

This proposal outlines the integration of an AI-powered chat assistant into the Martini Kit IDE. The assistant will provide contextual help, code generation, debugging assistance, and automated file operations through a conversational interface with direct access to the Virtual File System (VFS).

**Key Goals:**
- Enable natural language interaction for game development tasks
- Provide AI-assisted code editing with full VFS access
- Integrate seamlessly with existing IDE architecture
- Maintain lightweight, embeddable design philosophy
- Future-proof for MCP (Model Context Protocol) adoption

---

## Architecture Overview

### Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **LLM Framework** | Vercel AI SDK v5.x | Provider-agnostic, streaming support, type-safe, lightweight (~30KB) |
| **Schema Validation** | Zod | Type-safe runtime validation, JSON Schema compatible |
| **UI Framework** | Svelte 5 | Consistent with existing IDE (runes-based reactivity) |
| **LLM Providers** | OpenAI GPT-4, Anthropic Claude, Ollama (local) | Flexibility, user choice |
| **Tool Protocol** | MCP-compatible JSON Schema | Future-proof, standardized |

### Integration Point

**Option A: DevTools Tab Integration** (Recommended for Phase 1)

```
┌─────────────────────────────────────────────────────────┐
│ MartiniIDE.svelte (Main Container)                      │
├─────────┬─────────────────┬──────────────────────────────┤
│ Sidebar │    Editor       │     Preview Pane             │
│ (Files) │  (CodeEditor)   │  ┌──────────────────────────┐│
│ 10%     │  25-35%         │  │ Game Previews - 50%      ││
│         │                 │  ├──────────────────────────┤│
│         │                 │  │ DevTools Panel - 50%     ││
│         │                 │  │ [Console|State|Actions|  ││
│         │                 │  │  Diff|Network|💬 Chat]   ││
│         │                 │  └──────────────────────────┘│
└─────────┴─────────────────┴──────────────────────────────┘
```

**Advantages:**
- ✅ Minimal UI changes required
- ✅ Contextual to development workflow
- ✅ Reuses existing styling/theming
- ✅ Fast implementation (~2-3 days)

**Option B: Dedicated Right Panel** (Future Enhancement)

Add 4th resizable panel for dedicated chat interface when assistant becomes primary feature.

---

## Component Architecture

### File Structure

```
@martini-kit/ide/src/lib/ai/
├── index.ts                          # Public API exports
├── AIService.ts                      # Main orchestration service
├── providers/
│   ├── base.ts                       # Provider interface
│   ├── OpenAIProvider.ts             # OpenAI GPT-4 integration
│   ├── AnthropicProvider.ts          # Claude integration
│   └── OllamaProvider.ts             # Local model support
├── tools/
│   ├── base.ts                       # Tool interfaces & helpers
│   ├── file-tools.ts                 # VFS CRUD operations (6 tools)
│   ├── code-tools.ts                 # Search, analysis (3 tools)
│   └── ide-tools.ts                  # State access (3 tools)
├── prompts/
│   ├── system.ts                     # System prompts for different contexts
│   └── templates.ts                  # Prompt templates (debugging, refactoring, etc.)
└── types.ts                          # TypeScript interfaces

@martini-kit/ide/src/lib/components/
├── AIChatPanel.svelte                # Main chat UI component
├── ChatMessage.svelte                # Individual message component
├── ToolCallIndicator.svelte          # Visual feedback for tool execution
└── ProviderSettings.svelte           # API key configuration UI
```

### Core Components

#### 1. AIService (Orchestration Layer)

```typescript
export class AIService {
  constructor(
    private vfs: VirtualFileSystem,
    private context: IDEContext,
    private config: AIConfig
  );

  // Main chat interface
  async chat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterator<StreamChunk>;

  // Tool execution
  private async executeTool(
    name: string,
    params: unknown
  ): Promise<ToolResult>;

  // Provider management
  setProvider(provider: 'openai' | 'anthropic' | 'ollama'): void;
  configure(apiKey: string, model?: string): void;
}
```

#### 2. Tool System (12 Essential Tools)

**File Operations (6 tools):**
- `read_file` - Read file contents from VFS
- `write_file` - Write/update file content
- `create_file` - Create new file with optional content
- `delete_file` - Delete file or folder (recursive)
- `rename_file` - Rename or move file/folder
- `list_files` - List all files in project

**Code Intelligence (3 tools):**
- `search_code` - Search text/regex across all files
- `get_file_structure` - Extract imports, exports, functions, classes
- `get_active_file` - Get currently open file path and content

**IDE State (3 tools):**
- `get_game_state` - Access runtime game state from devtools
- `get_console_logs` - Retrieve recent console output
- `open_file` - Switch active file in editor

#### 3. AIChatPanel Component

```svelte
<script lang="ts">
  interface Props {
    vfs: VirtualFileSystem;
    activeFile: string;
    gameState?: any;
    onFileChange?: (path: string, content: string) => void;
    onFileOpen?: (path: string) => void;
  }

  let { vfs, activeFile, gameState, onFileChange, onFileOpen }: Props = $props();

  let messages = $state<ChatMessage[]>([]);
  let input = $state('');
  let streaming = $state(false);
  let aiService = $state(new AIService(vfs, context, config));
</script>

<div class="ai-chat-panel">
  <div class="messages-container">
    {#each messages as message}
      <ChatMessage {message} />
    {/each}
  </div>

  <div class="input-container">
    <textarea bind:value={input} />
    <button onclick={handleSend}>Send</button>
  </div>
</div>
```

---

## Tool Schema Design (Gold Standard)

Based on [OpenAI](https://platform.openai.com/docs/guides/function-calling), [Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/tool-use), and [MCP](https://modelcontextprotocol.io/specification/2025-06-18/basic) best practices:

### Principles

1. **Detailed Descriptions** - 100-500 characters explaining when/how to use tool
2. **Flat Schemas** - Avoid deep nesting (max 2 levels)
3. **Strict Validation** - Use Zod for type safety + runtime validation
4. **MCP Compatible** - Convert Zod → JSON Schema for future-proofing
5. **Limited Count** - Keep under 20 tools total for optimal performance

### Example Tool Definition

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const readFile = tool({
  description: `Read the entire contents of a file from the virtual file system.

Returns the full text content of the file. Use this when you need to:
- View implementation details
- Inspect code structure
- Analyze file contents before making changes
- Reference existing code patterns

The file must exist in the VFS, otherwise an error is returned.`,

  parameters: z.object({
    path: z.string().describe(
      "Absolute file path starting with '/', e.g. '/src/game.ts'"
    )
  }),

  execute: async ({ path }, context) => {
    const content = context.vfs.readFile(path);
    if (!content) {
      throw new Error(`File not found: ${path}`);
    }

    return {
      success: true,
      path,
      content,
      lines: content.split('\n').length,
      size: content.length
    };
  }
});
```

### MCP Compatibility Layer

```typescript
// Convert Vercel AI SDK tool to MCP format
import { zodToJsonSchema } from 'zod-to-json-schema';

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: JSONSchema;
}

function toMCPFormat(vercelTool: Tool): MCPTool {
  return {
    name: vercelTool.name,
    description: vercelTool.description,
    inputSchema: {
      type: 'object',
      properties: zodToJsonSchema(vercelTool.parameters).properties,
      required: zodToJsonSchema(vercelTool.parameters).required || [],
      additionalProperties: false
    }
  };
}
```

---

## User Experience Flow

### 1. Initial Setup

```
User opens IDE → First time chat tab clicked
  ↓
Show provider selection modal:
  [ ] OpenAI (GPT-4 Turbo)
  [ ] Anthropic (Claude Sonnet 4.5)
  [ ] Ollama (Local - llama3.2)

  API Key: [________________]
  Model: [gpt-4-turbo ▼]

  [Save & Start]
```

### 2. Chat Interaction

```
User: "Add a health bar to the player sprite"
  ↓
AI: "I'll help you add a health bar. Let me first check
     the current player implementation."
  ↓
🔧 Tool: read_file(/src/entities/player.ts)
  ↓
AI: "I can see your player class. I'll add a health bar
     that displays above the sprite. Creating the component now..."
  ↓
🔧 Tool: create_file(/src/ui/HealthBar.ts)
🔧 Tool: write_file(/src/entities/player.ts, [...updated code...])
  ↓
AI: "✅ Health bar added! I've created HealthBar.ts and
     integrated it into Player. The bar will show above
     the player and update based on the health state."

[View Changes] [Undo] [Explain More]
```

### 3. Tool Execution Feedback

Real-time visual indicators during tool use:

```
💬 AI is thinking...
  ↓
🔍 Reading /src/game.ts...
  ↓
✏️  Writing /src/utils/helpers.ts...
  ↓
✅ Done! 2 files modified.
```

### 4. Multi-Step Operations

```
User: "Debug why the collision isn't working"
  ↓
AI: Let me investigate:
  1. 🔍 Reading collision handler
  2. 📊 Checking game state
  3. 📝 Reviewing console logs
  4. 🐛 Found issue: hitbox coordinates are inverted
  5. ✏️  Fixing collision detection
  ↓
✅ Fixed! The hitbox Y-coordinates were flipped.
```

---

## System Prompts

### Base System Prompt

```typescript
const SYSTEM_PROMPT = `You are an expert game development AI assistant embedded in Martini Kit IDE.

CAPABILITIES:
- Read, write, create, delete, and search files in the virtual file system
- Access current game state and console logs
- Understand Martini Kit framework (multiplayer game engine)
- Help with Phaser.js game development
- Debug runtime issues using DevTools data

TOOLS AVAILABLE:
- File Operations: read_file, write_file, create_file, delete_file, rename_file, list_files
- Code Intelligence: search_code, get_file_structure, get_active_file
- IDE State: get_game_state, get_console_logs, open_file

INSTRUCTIONS:
1. Always explain what you're about to do before using tools
2. When modifying code, read the file first to understand context
3. Make minimal, focused changes unless asked for larger refactors
4. Follow existing code style and patterns in the project
5. Test your changes by checking game state after modifications
6. If you encounter errors, read console logs before suggesting fixes

MARTINI KIT CONTEXT:
- Multiplayer game framework with deterministic state synchronization
- Uses Phaser.js for rendering
- State is managed through GameRuntime
- Network transport is abstracted (local, WebRTC, WebSocket)
- Games run in dual-view mode (Host + Client) for local testing

Be concise but thorough. Prioritize working code over explanations.`;
```

### Context-Specific Prompts

```typescript
const DEBUGGING_PROMPT = `Current context: Debugging mode

The user is experiencing an issue. Follow this process:
1. Ask clarifying questions if the problem is unclear
2. Use get_console_logs to check for errors
3. Use get_game_state to inspect runtime state
4. Use search_code to find related code
5. Read relevant files to understand implementation
6. Propose a fix with explanation
7. Apply the fix if user approves

Focus on root cause analysis, not band-aid solutions.`;

const REFACTORING_PROMPT = `Current context: Code refactoring

The user wants to improve code structure. Guidelines:
1. Read the target files first
2. Identify code smells (duplication, complexity, coupling)
3. Propose refactoring strategy before making changes
4. Show before/after snippets for major changes
5. Preserve functionality - no behavior changes
6. Update related files (imports, references)
7. Suggest testing steps after refactoring

Prioritize readability and maintainability.`;
```

---

## Configuration & Settings

### User-Configurable Options

```typescript
interface AIConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  apiKey?: string;
  model?: string;
  temperature?: number;        // 0.0-1.0, default 0.7
  maxTokens?: number;          // Default 2000
  enableAutoSave?: boolean;    // Auto-save after AI edits
  showToolCalls?: boolean;     // Show tool execution details
  confirmBeforeWrite?: boolean; // Require approval for file writes
}

// Stored in localStorage for persistence
const DEFAULT_CONFIG: AIConfig = {
  provider: 'openai',
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  enableAutoSave: false,
  showToolCalls: true,
  confirmBeforeWrite: false
};
```

### Settings UI

```svelte
<!-- ProviderSettings.svelte -->
<div class="settings-panel">
  <h3>AI Assistant Settings</h3>

  <label>
    Provider
    <select bind:value={config.provider}>
      <option value="openai">OpenAI</option>
      <option value="anthropic">Anthropic (Claude)</option>
      <option value="ollama">Ollama (Local)</option>
    </select>
  </label>

  {#if config.provider !== 'ollama'}
    <label>
      API Key
      <input type="password" bind:value={config.apiKey} />
    </label>
  {/if}

  <label>
    Model
    <select bind:value={config.model}>
      {#if config.provider === 'openai'}
        <option value="gpt-4-turbo">GPT-4 Turbo</option>
        <option value="gpt-4">GPT-4</option>
        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
      {:else if config.provider === 'anthropic'}
        <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
        <option value="claude-sonnet-3.5">Claude Sonnet 3.5</option>
        <option value="claude-haiku-3.5">Claude Haiku 3.5</option>
      {/if}
    </select>
  </label>

  <label>
    <input type="checkbox" bind:checked={config.showToolCalls} />
    Show tool execution details
  </label>

  <label>
    <input type="checkbox" bind:checked={config.confirmBeforeWrite} />
    Require confirmation before file edits
  </label>

  <button onclick={saveConfig}>Save Settings</button>
</div>
```

---

## Security & Privacy

### API Key Handling

- **Storage:** LocalStorage with optional encryption
- **Transmission:** Direct browser → LLM provider (no backend proxy)
- **Scope:** User's own API keys, never shared
- **Clear Warning:** "Your API key is stored locally and sent directly to [Provider]"

### Code Privacy

- **No telemetry:** Zero code uploaded to external services except chosen LLM provider
- **User control:** Explicit tool calls visible in UI
- **Opt-in only:** Chat panel disabled by default
- **Data retention:** Conversation history stored locally, cleared on session end

### Rate Limiting

```typescript
class RateLimiter {
  private requests: number[] = [];

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    // Allow 10 requests per minute
    this.requests = this.requests.filter(t => now - t < 60000);

    if (this.requests.length >= 10) {
      throw new Error('Rate limit exceeded. Please wait before sending more messages.');
    }

    this.requests.push(now);
    return true;
  }
}
```

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)

**Deliverables:**
- ✅ Chat UI as DevTools tab
- ✅ OpenAI provider integration
- ✅ 6 file operation tools (read, write, create, delete, rename, list)
- ✅ Basic system prompt
- ✅ Message history (session-only)
- ✅ Tool execution visualization

**Success Metrics:**
- Can read/write files through chat
- Streaming responses work
- Basic code generation functional

### Phase 2: Enhanced Functionality (Week 3-4)

**Deliverables:**
- ✅ Anthropic (Claude) provider
- ✅ Code intelligence tools (search, structure analysis)
- ✅ IDE state integration (game state, console logs)
- ✅ Settings UI with API key management
- ✅ Conversation persistence (localStorage)
- ✅ Undo/redo for AI changes

**Success Metrics:**
- Multi-step debugging workflows work
- Can analyze existing code effectively
- Provider switching is seamless

### Phase 3: Advanced Features (Week 5-6)

**Deliverables:**
- ✅ Ollama local model support
- ✅ Context-aware prompts (debugging, refactoring modes)
- ✅ File diff preview before applying changes
- ✅ Multi-file refactoring support
- ✅ Keyboard shortcuts (Cmd+K for quick chat)
- ✅ Export conversation as markdown

**Success Metrics:**
- Local models work offline
- Complex refactoring tasks successful
- User approval workflow smooth

### Phase 4: Future Enhancements

**Potential Features:**
- 🔮 MCP client integration (connect external tools)
- 🔮 RAG over Martini Kit documentation
- 🔮 Voice input/output
- 🔮 Collaborative chat (share sessions)
- 🔮 Custom tool creation UI
- 🔮 Web search integration (via backend proxy)

---

## Dependencies & Bundle Impact

### New Dependencies

```json
{
  "dependencies": {
    "ai": "^5.0.0",                    // ~30KB (core)
    "@ai-sdk/openai": "^1.0.0",        // ~15KB
    "@ai-sdk/anthropic": "^1.0.0",     // ~15KB
    "zod": "^3.23.0",                  // ~14KB (already in project)
    "zod-to-json-schema": "^3.22.0"    // ~8KB
  }
}
```

**Total Bundle Impact:** ~82KB (minified + gzipped: ~25KB)

**Trade-offs:**
- ✅ Minimal size increase (<3% of typical IDE bundle)
- ✅ Tree-shakeable (only used providers bundled)
- ✅ No heavy frameworks (no LangChain, no vector DBs)
- ✅ Lazy-loaded (only when chat tab opened)

---

## Testing Strategy

### Unit Tests

```typescript
// @martini-kit/ide/src/lib/ai/tools/__tests__/file-tools.test.ts
describe('File Tools', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = new VirtualFileSystem({
      '/src/game.ts': 'export class Game {}'
    });
  });

  test('read_file returns file content', async () => {
    const result = await readFile.execute({ path: '/src/game.ts' }, { vfs });
    expect(result.content).toBe('export class Game {}');
  });

  test('write_file updates VFS', async () => {
    await writeFile.execute({
      path: '/src/game.ts',
      content: 'export class Game { health = 100; }'
    }, { vfs });

    expect(vfs.readFile('/src/game.ts')).toContain('health = 100');
  });

  test('search_code finds matches across files', async () => {
    vfs.createFile('/src/player.ts', 'class Player { health = 100; }');
    const result = await searchCode.execute({ query: 'health' }, { vfs });

    expect(result.results).toHaveLength(2);
  });
});
```

### Integration Tests

```typescript
describe('AIService Integration', () => {
  test('multi-step file creation workflow', async () => {
    const service = new AIService(vfs, context, config);

    const messages = [
      { role: 'user', content: 'Create a HealthBar component' }
    ];

    const stream = await service.chat(messages);

    // Verify AI creates file
    for await (const chunk of stream) {
      if (chunk.type === 'tool-call' && chunk.toolName === 'create_file') {
        expect(chunk.params.path).toBe('/src/ui/HealthBar.ts');
      }
    }

    expect(vfs.exists('/src/ui/HealthBar.ts')).toBe(true);
  });
});
```

### Manual Testing Checklist

- [ ] Chat interface renders correctly in DevTools tab
- [ ] API key validation works for all providers
- [ ] Streaming responses display in real-time
- [ ] Tool execution shows visual feedback
- [ ] File changes reflect in editor immediately
- [ ] Console logs accessible to AI
- [ ] Game state inspection works
- [ ] Settings persist across sessions
- [ ] Rate limiting prevents spam
- [ ] Error messages are user-friendly

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   ```typescript
   // Only load AI service when chat tab opened
   let aiService: AIService | null = $state(null);

   $effect(() => {
     if (activeDevToolsTab === 'chat' && !aiService) {
       aiService = new AIService(vfs, context, config);
     }
   });
   ```

2. **Debounced VFS Access**
   ```typescript
   // Batch file reads in single tick
   const debouncedRead = debounce((paths: string[]) => {
     return paths.map(p => ({ path: p, content: vfs.readFile(p) }));
   }, 100);
   ```

3. **Streaming Optimization**
   ```typescript
   // Process chunks as they arrive, don't wait for full response
   for await (const chunk of stream) {
     if (chunk.type === 'text-delta') {
       appendToMessage(chunk.text);
       requestAnimationFrame(() => scrollToBottom());
     }
   }
   ```

4. **Message History Limits**
   ```typescript
   // Keep last 50 messages, summarize older context
   const MAX_MESSAGES = 50;

   if (messages.length > MAX_MESSAGES) {
     const summary = await summarizeHistory(messages.slice(0, -MAX_MESSAGES));
     messages = [{ role: 'system', content: summary }, ...messages.slice(-MAX_MESSAGES)];
   }
   ```

### Expected Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Initial Load | < 200ms | Lazy-loaded on tab open |
| Stream Start | < 1s | Time to first token |
| Tool Execution | < 100ms | VFS operations are synchronous |
| UI Responsiveness | 60fps | No blocking operations |
| Memory Usage | < 10MB | Chat history + service state |

---

## Documentation Plan

### User Documentation

**Location:** `@martini-kit/demos/src/content/docs/ai-assistant/`

**Sections:**
1. **Getting Started** - Setup API keys, first conversation
2. **Capabilities** - What the AI can/can't do
3. **Common Workflows** - Debugging, refactoring, feature development
4. **Tool Reference** - All 12 tools with examples
5. **Best Practices** - How to write effective prompts
6. **Troubleshooting** - Common issues & solutions

### Developer Documentation

**Location:** `@martini-kit/ide/src/lib/ai/README.md`

**Sections:**
1. Architecture overview
2. Adding custom tools
3. Provider integration guide
4. Schema design guidelines
5. Testing tools
6. Contributing guidelines

---

## Risk Analysis & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **API Rate Limits** | High | Medium | Client-side rate limiter, clear error messages |
| **Token Cost** | Medium | High | Configurable max tokens, conversation summarization |
| **Provider Outages** | Medium | High | Multi-provider support, graceful degradation |
| **Hallucinated Code** | High | High | Require user approval for writes, show diffs |
| **Bundle Size Growth** | Low | Medium | Tree-shaking, lazy loading, small library choice |

### User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Confusing UI** | Medium | Medium | Clear visual feedback for tool execution |
| **API Key Leaks** | Low | Critical | LocalStorage only, no logging, security warnings |
| **Slow Responses** | Medium | High | Streaming UX, show progress indicators |
| **Breaking Changes** | Medium | High | Always show diff, easy undo, backup VFS state |

---

## Success Metrics

### Quantitative Metrics

- **Adoption Rate:** % of IDE sessions with chat interaction
- **Tool Usage:** Avg tools called per conversation
- **Task Completion:** % of user requests successfully resolved
- **Response Time:** P50/P95 time to first token
- **Error Rate:** % of failed tool executions

### Qualitative Metrics

- **User Satisfaction:** Survey after 2 weeks of use
- **Code Quality:** AI-generated code passes lint/type checks
- **Workflow Impact:** Time saved on common tasks (debugging, boilerplate)

### Target Goals (3 Months Post-Launch)

- 📊 40% of users try chat feature at least once
- 📊 15% of users use it regularly (>3x/week)
- 📊 85% task completion rate for common workflows
- 📊 <2s P95 response time
- 📊 <5% tool execution error rate

---

## Open Questions

1. **Should we support custom tools via user-defined plugins?**
   - Pros: Extensibility, community tools
   - Cons: Security concerns, complexity

2. **Should conversations persist across browser sessions?**
   - Pros: Better context for recurring issues
   - Cons: Privacy concerns, storage limits

3. **Should we add a "AI diff review" mode before applying changes?**
   - Pros: Safety, learning opportunity
   - Cons: Extra friction, slower workflow

4. **Should we support team-shared API keys (via backend)?**
   - Pros: Easier onboarding, cost sharing
   - Cons: Security, rate limit conflicts

5. **Should we build Martini Kit RAG (documentation search)?**
   - Pros: Better framework-specific help
   - Cons: Maintenance burden, bundle size

---

## Conclusion

This proposal outlines a **lightweight, extensible AI chat assistant** for Martini Kit IDE that:

✅ Integrates seamlessly with existing architecture
✅ Provides powerful file manipulation through natural language
✅ Maintains embeddable philosophy (minimal dependencies)
✅ Future-proofs with MCP compatibility
✅ Delivers value in Phase 1 MVP

**Recommended Next Steps:**

1. **Approve architecture** - Review this proposal with team
2. **Spike implementation** - Build Phase 1 MVP (1-2 weeks)
3. **Internal testing** - Dogfood with real game development tasks
4. **Iterate on UX** - Refine based on feedback
5. **Public beta** - Release with documentation

---

## References

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [OpenAI Function Calling Best Practices](https://platform.openai.com/docs/guides/function-calling)
- [Anthropic Tool Use Guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic)
- [LangChain vs LlamaIndex Comparison](https://www.vellum.ai/blog/llamaindex-vs-langchain-comparison)

---

**End of Proposal**
