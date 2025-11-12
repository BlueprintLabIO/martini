# AI SDK v6 Beta Usage Guide

**Version**: `ai@6.0.0-beta.94` | **Provider**: `@ai-sdk/deepseek@2.0.0-beta.32` | **UI**: `@ai-sdk/svelte@4.0.0-beta.94`

This guide covers AI SDK v6 usage patterns as implemented in Martini's multiplayer game platform.

---

## Table of Contents

1. [Installation](#installation)
2. [Core Concepts](#core-concepts)
3. [Server-Side Implementation](#server-side-implementation)
4. [Client-Side Implementation (Svelte)](#client-side-implementation-svelte)
   - [Sending Messages with Images](#sending-messages-with-images-vision)
5. [Tool Definition & Execution](#tool-definition--execution)
6. [Multi-Step Tool Calls](#multi-step-tool-calls)
7. [Tool Approval Flow](#tool-approval-flow)
8. [Message Types & Parts](#message-types--parts)
9. [Context Management](#context-management)
10. [Common Patterns](#common-patterns)
11. [Gotchas & Best Practices](#gotchas--best-practices)

---

## Installation

```bash
pnpm add ai@beta @ai-sdk/openai@beta @ai-sdk/svelte@beta
# Or your preferred provider
pnpm add @ai-sdk/deepseek@beta
```

**Important**: Pin to specific versions during beta as breaking changes may occur in patch releases.

---

## Core Concepts

### 1. Message Types

AI SDK v6 uses two message types:

- **`UIMessage`**: For application UI - includes metadata, timestamps, complete history
- **`ModelMessage`**: For LLM communication - stripped of metadata, optimized format

**Convert between them:**
```typescript
import { convertToModelMessages, type UIMessage } from 'ai';

const uiMessages: UIMessage[] = chat.messages;
const modelMessages = convertToModelMessages(uiMessages);
```

### 2. Message Parts

Each message contains an ordered `parts` array representing everything the model generated:

```typescript
message.parts.forEach(part => {
  if (part.type === 'text') {
    // Plain text response
    console.log(part.text);
  } else if (part.type === 'tool-weather') {
    // Tool invocation (type = 'tool-{toolName}')
    console.log(part.state, part.input, part.output);
  }
});
```

### 3. Tool States

Tools progress through states during execution:

- `input-streaming`: Tool input is being generated
- `approval-requested`: Waiting for user approval (`needsApproval: true`)
- `output-available`: Tool completed successfully
- `output-error`: Tool execution failed

---

## Server-Side Implementation

### Basic API Route (SvelteKit)

```typescript
// src/routes/api/chat/+server.ts
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { SECRET_COMPLETION_URL, SECRET_COMPLETION_KEY } from '$env/static/private';

const deepseek = createDeepSeek({
  baseURL: SECRET_COMPLETION_URL,
  apiKey: SECRET_COMPLETION_KEY
});

export async function POST({ request }) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: 'You are a helpful assistant.',
    messages: convertToModelMessages(messages),
    temperature: 0.7,
    stopWhen: stepCountIs(5) // Enable multi-step tool calls
  });

  return result.toUIMessageStreamResponse();
}
```

### With Tools

```typescript
import { tool, zodSchema, stepCountIs } from 'ai';
import { z } from 'zod';

export async function POST({ request }) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: deepseek('deepseek-chat'),
    messages: convertToModelMessages(messages),
    tools: {
      weather: tool({
        description: 'Get the weather in a location',
        inputSchema: zodSchema(
          z.object({
            location: z.string().describe('City name')
          })
        ),
        execute: async ({ location }) => {
          const temp = Math.round(Math.random() * 30) + 10;
          return { location, temperature: temp };
        }
      })
    },
    stopWhen: stepCountIs(5) // REQUIRED for multi-step tool calls
  });

  return result.toUIMessageStreamResponse();
}
```

**Key Points:**
- Use `zodSchema()` wrapper for Zod schemas (not raw `z.object()`)
- `stopWhen: stepCountIs(5)` allows model to use tool results to generate final response
- Without `stopWhen`, model stops after first tool call

---

## Client-Side Implementation (Svelte)

### Key Differences from React

| Aspect | React (`useChat`) | Svelte (`Chat`) |
|--------|------------------|----------------|
| State | Hook (reruns on changes) | Class instance (created once) |
| Destructuring | ✅ Works | ❌ Breaks reactivity |
| Props reactivity | Automatic | Must pass getters |

### Basic Usage

```svelte
<script lang="ts">
  import { Chat } from '@ai-sdk/svelte';

  let input = $state('');
  const chat = new Chat({});

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    chat.sendMessage({ text: input });
    input = '';
  }
</script>

<form onsubmit={handleSubmit}>
  {#each chat.messages as message}
    <div>
      <strong>{message.role}:</strong>
      {#each message.parts as part}
        {#if part.type === 'text'}
          <p>{part.text}</p>
        {/if}
      {/each}
    </div>
  {/each}

  <input bind:value={input} />
  <button type="submit">Send</button>
</form>
```

### Reactive Parameters (Getter Pattern)

```svelte
<script lang="ts">
  import { Chat } from '@ai-sdk/svelte';

  let { projectId } = $props(); // Dynamic prop

  // ✅ CORRECT - Pass getter for reactive projectId
  const chat = new Chat({
    get id() {
      return projectId;
    }
  });

  // ❌ WRONG - Copies value once, never updates
  // const chat = new Chat({ id: projectId });
</script>
```

### Sending Messages with Metadata

```typescript
chat.sendMessage({
  text: 'Hello!',
  metadata: { projectId, planMode: true }
});
```

**Extract metadata server-side:**
```typescript
// Search from newest to oldest
for (let i = messages.length - 1; i >= 0; i--) {
  const metadata = messages[i]?.metadata as { projectId?: string } | undefined;
  if (metadata?.projectId) {
    projectId = metadata.projectId;
    break;
  }
}
```

### Sending Messages with Images (Vision)

To send images to vision-capable models (Claude, GPT-4V, etc.):

```typescript
// Format images as FileUIPart objects
chat.sendMessage({
  text: 'What do you see in this screenshot?',
  files: [
    {
      type: 'file',
      mediaType: 'image/png',
      url: 'https://example.com/screenshot.png', // Public URL or Data URL
      filename: 'screenshot.png' // Optional
    }
  ],
  metadata: { projectId }
});
```

**Key Points:**
- Images must be sent as `files` parameter (not `parts`)
- Each file needs: `type: 'file'`, `mediaType`, and `url` (public URL or Data URL)
- The AI SDK will download the image from the URL and convert it to the model's expected format
- Supported formats: `image/png`, `image/jpeg`, `image/gif`, `image/webp`

**Display images in chat:**
```svelte
{#each message.parts as part}
  {#if part.type === 'file' && part.mediaType?.startsWith('image/')}
    <img src={part.url} alt={part.filename || 'Attached image'} />
  {:else if part.type === 'text'}
    <p>{part.text}</p>
  {/if}
{/each}
```

**Complete example with image upload:**
```typescript
// 1. Upload image to storage
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`/api/projects/${projectId}/chat-images`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  return { url: data.asset.url, mediaType: file.type };
}

// 2. Send message with image
const { url, mediaType } = await uploadImage(file);
chat.sendMessage({
  text: 'Describe this screenshot',
  files: [{
    type: 'file',
    mediaType,
    url // Use 'url' not 'data'
  }]
});
```

### Deriving Chat Status

```svelte
<script lang="ts">
  import { Chat } from '@ai-sdk/svelte';

  const chat = new Chat({});

  // Status: 'submitted' | 'streaming' | 'ready' | 'error'
  let chatStatus = $derived<'submitted' | 'streaming' | 'ready' | 'error'>(
    (chat as any)?.status ?? 'ready'
  );

  let isStreaming = $derived(
    chatStatus === 'submitted' || chatStatus === 'streaming'
  );
</script>

<button disabled={isStreaming}>
  {isStreaming ? 'Generating...' : 'Send'}
</button>
```

### Stop Generation

```typescript
async function handleStop() {
  await chat.stop();
}
```

---

## Tool Definition & Execution

### Server-Side Tools (Standard Pattern)

```typescript
import { tool, zodSchema } from 'ai';
import { z } from 'zod';

const tools = {
  readFile: tool({
    description: 'Read a file from the project',
    inputSchema: zodSchema(
      z.object({
        path: z.string().describe('File path starting with /')
      })
    ),
    execute: async ({ path }) => {
      const content = await readFileFromDB(path);
      return { path, content, lines: content.split('\n').length };
    }
  })
};
```

### Client-Side Tools (Approval + Manual Execution)

For operations requiring UI interaction or CRDT compatibility:

```typescript
const tools = {
  editFile: tool({
    description: 'Edit a file with search/replace operations',
    inputSchema: zodSchema(
      z.object({
        path: z.string(),
        edits: z.array(z.object({
          old_text: z.string(),
          new_text: z.string()
        }))
      })
    ),
    needsApproval: true
    // ❌ NO execute function - client handles it
  })
};
```

**Why client-side execution:**
- Y.js/CRDT compatibility (client owns document state)
- Instant UI updates without refetch cycles
- Optimistic updates for better UX
- Avoids race conditions

---

## Multi-Step Tool Calls

Enable the model to use tool results in follow-up responses:

```typescript
const result = streamText({
  model: deepseek('deepseek-chat'),
  messages: convertToModelMessages(messages),
  tools: { weather, convertTemp },
  stopWhen: stepCountIs(5) // Up to 5 steps
});
```

**Execution flow:**
1. User: "What's the weather in NYC in Celsius?"
2. Model → calls `weather('NYC')` → returns `72°F`
3. Model → calls `convertTemp(72)` → returns `22°C`
4. Model → responds: "It's 22°C in NYC"

**Without `stopWhen`**: Model stops after step 2, never generates final response.

---

## Tool Approval Flow

### Define Approval Requirements

```typescript
// Static approval
editFile: tool({
  needsApproval: true,
  // ...
})

// Dynamic approval
payment: tool({
  needsApproval: async ({ amount }) => amount > 1000,
  // ...
})
```

### Client-Side Approval Handling

```svelte
<script lang="ts">
  import { Chat } from '@ai-sdk/svelte';

  const chat = new Chat({});

  // React to approval requests using $effect
  $effect(() => {
    if (!chat) return;

    // Access messages to establish reactivity
    const messages = chat.messages;

    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type === 'tool-editFile' &&
          'state' in part &&
          (part as any).state === 'approval-requested'
        ) {
          const approvalId = (part as any).approval.id;
          showApprovalUI(part, approvalId);
        }
      }
    }
  });

  function approve(approvalId: string, toolCallId: string) {
    // 1. Approve the request
    chat.addToolApprovalResponse({ id: approvalId, approved: true });

    // 2. Execute the tool client-side
    const result = executeToolLocally();

    // 3. Send result back to AI
    chat.addToolResult({
      tool: 'editFile',
      toolCallId: toolCallId,
      output: result
    });
  }

  function deny(approvalId: string, toolCallId: string) {
    chat.addToolApprovalResponse({ id: approvalId, approved: false });
    chat.addToolResult({
      state: 'output-error',
      tool: 'editFile',
      toolCallId: toolCallId,
      errorText: 'User denied the edit'
    });
  }
</script>
```

### Auto-Submit After Approvals (Server-Side Tools)

**For server-side tools** that execute during streaming:

```typescript
const chat = new Chat({
  sendAutomaticallyWhen: ({ messages }) => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return false;

    let hasCompletedTools = false;
    let hasPendingApprovals = false;

    for (const part of lastMessage.parts) {
      if (part.type.startsWith('tool-') && 'state' in part) {
        if ((part as any).state === 'output-available') {
          hasCompletedTools = true;
        }
        if ((part as any).state === 'approval-requested') {
          hasPendingApprovals = true;
        }
      }
    }

    // Continue conversation when tools complete and no pending approvals
    // Don't check hasTextResponse - let AI output thinking text freely
    return hasCompletedTools && !hasPendingApprovals;
  }
});
```

**Important:** This is **only evaluated during server streaming**. For client-side tools, use `triggerContinuationIfNeeded()` (see [Client-Side Tool Results & Auto-Send](#client-side-tool-results--auto-send)).

---

## Message Types & Parts

### Rendering Different Part Types

```svelte
{#each message.parts as part}
  {#if part.type === 'text'}
    <div>{part.text}</div>

  {:else if part.type === 'tool-readFile'}
    {#if 'state' in part && (part as any).state === 'output-available'}
      <pre>{JSON.stringify((part as any).output, null, 2)}</pre>
    {/if}

  {:else if part.type === 'tool-editFile'}
    {#if 'state' in part && (part as any).state === 'approval-requested'}
      <button onclick={() => approve((part as any).approval.id)}>
        Approve Edit
      </button>
    {:else if 'state' in part && (part as any).state === 'output-available'}
      <div>✅ Edit completed</div>
    {/if}
  {/if}
{/each}
```

### Tool Part Structure

```typescript
// Tool part (type = 'tool-{toolName}')
{
  type: 'tool-readFile',
  toolCallId: 'call_abc123',
  state: 'output-available', // or 'approval-requested' | 'input-streaming' | 'output-error'
  input: { path: '/src/game.js' },
  output: { path: '/src/game.js', content: '...', lines: 42 },
  // If state === 'approval-requested':
  approval: { id: 'approval_xyz' }
}
```

---

## Context Management

### Keep Recent Messages (Sliding Window)

```typescript
export async function POST({ request }) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  // Keep only last 5 messages to avoid token limits
  const recentMessages = messages.slice(-5);

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: dynamicSystemPrompt, // Not counted in message limit
    messages: convertToModelMessages(recentMessages)
  });

  return result.toUIMessageStreamResponse();
}
```

**Note**: Each message can contain multiple parts (text + tool calls), so 5 messages ≈ 2-3 conversation turns.

---

## Common Patterns

### 1. Programmatic Message Sending

```typescript
// Export method from component
export function sendMessage(message: string) {
  chat.sendMessage({
    text: message,
    metadata: { projectId }
  });
}
```

Usage:
```svelte
<script>
  let chatPanel;
</script>

<AIChatPanel bind:this={chatPanel} />
<button onclick={() => chatPanel.sendMessage('Fix the bug')}>
  Fix with AI
</button>
```

### 2. Prevent Duplicate Approval Triggers

```svelte
<script lang="ts">
  let processedApprovals = $state<Set<string>>(new Set());

  $effect(() => {
    for (const message of chat.messages) {
      for (const part of message.parts) {
        if (
          part.type === 'tool-editFile' &&
          (part as any).state === 'approval-requested'
        ) {
          const approvalId = (part as any).approval.id;

          if (!processedApprovals.has(approvalId)) {
            processedApprovals.add(approvalId);
            handleApproval(approvalId);
          }
        }
      }
    }
  });
</script>
```

### 3. Cache Tool Results

```typescript
let originalContentCache = $state<Map<string, string>>(new Map());

$effect(() => {
  for (const message of chat.messages) {
    for (const part of message.parts) {
      if (
        part.type === 'tool-readFile' &&
        'output' in part &&
        (part as any).output?.path
      ) {
        originalContentCache.set(
          (part as any).output.path,
          (part as any).output.content
        );
      }
    }
  }
});
```

### 4. Dynamic System Prompts

```typescript
function buildSystemPrompt(files: string[], mode: 'plan' | 'act'): string {
  const fileList = `\n\nPROJECT FILES:\n${files.join('\n')}`;
  const basePrompt = mode === 'plan' ? PLANNING_PROMPT : CODING_PROMPT;
  return basePrompt + fileList;
}

const result = streamText({
  system: buildSystemPrompt(projectFiles, planMode ? 'plan' : 'act'),
  // ...
});
```

---

## Gotchas & Best Practices

### ❌ Common Mistakes

```typescript
// 1. Destructuring class properties (breaks reactivity)
const { messages } = chat; // ❌ WRONG
const messages = chat.messages; // ✅ CORRECT

// 2. Forgetting stopWhen for multi-step tools
const result = streamText({
  tools: { weather }
  // ❌ Missing stopWhen - model can't use tool results
});

// 3. Not converting UIMessage → ModelMessage
const result = streamText({
  messages: uiMessages // ❌ Type error
});
const result = streamText({
  messages: convertToModelMessages(uiMessages) // ✅
});

// 4. Using raw Zod schema
inputSchema: z.object({ ... }) // ❌ WRONG
inputSchema: zodSchema(z.object({ ... })) // ✅ CORRECT
```

### ✅ Best Practices

1. **Always use `convertToModelMessages`** when passing to `streamText`
2. **Access `chat.messages` inside `$effect`** before `untrack()` to establish reactivity
3. **Set `stopWhen: stepCountIs(N)`** when using tools that need follow-up responses
4. **Track processed approvals** to prevent duplicate UI triggers
5. **Use getters for reactive params** when creating Chat instances
6. **Pin versions during beta** - breaking changes may occur in patches
7. **Cache tool results** when needed for subsequent operations (e.g., edit needs previous read)
8. **⚠️ CRITICAL: Manually trigger send after client-side `addToolResult()`** - `sendAutomaticallyWhen` only evaluates during server streaming, NOT after client-side tool result injection

### Client-Side Tool Results & Auto-Send

**CRITICAL GOTCHA**: `sendAutomaticallyWhen` is **only evaluated during server streaming**, NOT after client-side `addToolResult()` calls.

**The Problem:**
```typescript
// This will NOT trigger sendAutomaticallyWhen! ⚠️
chat.addToolApprovalResponse({ id: approvalId, approved: true });
chat.addToolResult({ tool: 'editFile', toolCallId, output: result });
// Conversation stops here - no auto-send triggered
```

**The Solution - Unified Helper Pattern:**

Create a **single, centralized helper** that all client-side tools use:

```typescript
/**
 * Unified continuation helper for ALL client-side tools
 *
 * Call this after addToolResult() to check if AI should continue.
 * Centralizes continuation logic in one place for consistency.
 */
function triggerContinuationIfNeeded() {
  if (!chat) return;

  setTimeout(() => {
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    let allToolsComplete = true;
    let hasAnyTools = false;

    for (const part of lastMessage.parts) {
      if (part.type.startsWith('tool-')) {
        hasAnyTools = true;
        const state = (part as any).state;
        // Block continuation if ANY tool is still pending
        if (state === 'input-streaming' || state === 'approval-requested') {
          allToolsComplete = false;
          break;
        }
      }
    }

    // Continue if: tools exist AND all are complete
    if (hasAnyTools && allToolsComplete) {
      chat.sendMessage({ text: '', metadata: { projectId, planMode } });
    }
  }, 100); // Small delay to ensure state is fully updated
}
```

**Usage in client-side tools:**
```typescript
// Edit file tool
chat.addToolApprovalResponse({ id: approvalId, approved: true });
chat.addToolResult({ tool: 'editFile', toolCallId, output: result });
triggerContinuationIfNeeded(); // ✅ That's it!

// Screenshot tool
chat.addToolResult({ tool: 'captureScreenshot', toolCallId, output: screenshot });
triggerContinuationIfNeeded(); // ✅ Works for all tools

// Error case
chat.addToolResult({ state: 'output-error', tool: 'editFile', toolCallId, errorText: 'Failed' });
triggerContinuationIfNeeded(); // ✅ Also check after errors
```

**Why this pattern is better:**
- ✅ **Single source of truth** - One function handles all continuation logic
- ✅ **Simpler logic** - No `hasTextResponse` check (let AI think out loud)
- ✅ **Future-proof** - New tools just call the helper
- ✅ **Easier to debug** - One place to look when continuation fails
- ✅ **More robust** - Fewer edge cases and conditions

**Key difference from old pattern:**
```typescript
// ❌ OLD: Check hasTextResponse (too restrictive)
return hasCompletedTools && allToolsCompleted && !hasTextResponse;

// ✅ NEW: Only check if tools are complete (let AI talk while working)
return hasAnyTools && allToolsComplete;
```

This allows the AI to output "thinking" text like "I'm checking the screenshot..." while tools are running, without blocking continuation.

### Environment Variables (SvelteKit)

SvelteKit doesn't load `.env` into `process.env`. Import from `$env/static/private`:

```typescript
import { OPENAI_API_KEY } from '$env/static/private';

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY
});
```

---

## Real-World Example: Edit File Flow

**Server** (`+server.ts`):
```typescript
const tools = {
  editFile: tool({
    description: 'Edit a file with search/replace',
    inputSchema: zodSchema(
      z.object({
        path: z.string(),
        edits: z.array(z.object({ old_text: z.string(), new_text: z.string() }))
      })
    ),
    needsApproval: true
    // No execute - client handles it
  })
};
```

**Client** (Svelte):
```svelte
<script lang="ts">
  import { Chat } from '@ai-sdk/svelte';
  import { applyEdits } from '$lib/utils/diff';

  const chat = new Chat({});
  let processedApprovals = $state<Set<string>>(new Set());

  $effect(() => {
    const messages = chat.messages; // Establish reactivity

    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type === 'tool-editFile' &&
          (part as any).state === 'approval-requested'
        ) {
          const approvalId = (part as any).approval.id;

          if (!processedApprovals.has(approvalId)) {
            processedApprovals.add(approvalId);
            handleEditApproval(part, approvalId);
          }
        }
      }
    }
  });

  function handleEditApproval(part: any, approvalId: string) {
    const { path, edits } = part.input;
    const originalContent = getOriginalContent(path);
    const newContent = applyEdits(originalContent, edits);

    // Show diff UI, wait for user action
    showDiffModal(originalContent, newContent, {
      onApprove: () => {
        chat.addToolApprovalResponse({ id: approvalId, approved: true });
        chat.addToolResult({
          tool: 'editFile',
          toolCallId: part.toolCallId,
          output: { success: true, path }
        });
        applyEditToEditor(path, newContent);
      },
      onDeny: () => {
        chat.addToolApprovalResponse({ id: approvalId, approved: false });
        chat.addToolResult({
          state: 'output-error',
          tool: 'editFile',
          toolCallId: part.toolCallId,
          errorText: 'Edit denied by user'
        });
      }
    });
  }
</script>
```

---

## Further Resources

- **Official Docs**: https://sdk.vercel.ai/docs
- **Beta Announcement**: https://sdk.vercel.ai/blog/ai-sdk-6-beta
- **GitHub Issues**: https://github.com/vercel/ai/issues
- **Provider Docs**: Check your specific provider's documentation (OpenAI, DeepSeek, etc.)

---

**Last Updated**: January 2025 | AI SDK v6 Beta
