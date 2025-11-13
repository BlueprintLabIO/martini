# AI Prompt Management

This directory contains system prompts and API references for AI code generation.

## Usage

### Import into System Prompts

```typescript
import { MULTIPLAYER_PROMPT_SHORT, MULTIPLAYER_PROMPT, MULTIPLAYER_TEMPLATES } from '$lib/ai/multiplayer-prompt';

// Short version (token-efficient)
const systemPrompt = `
Your main instructions here...

---

${MULTIPLAYER_PROMPT_SHORT}
`;

// Full version (comprehensive)
const systemPrompt = `
Your main instructions here...

---

${MULTIPLAYER_PROMPT}
`;

// Access specific templates
const platformerCode = MULTIPLAYER_TEMPLATES.platformer;
```

## Files

### `multiplayer-prompt.ts`

Exports multiplayer API prompts for AI agents:

- **`MULTIPLAYER_PROMPT`**: Full reference with examples (~1.5KB)
- **`MULTIPLAYER_PROMPT_SHORT`**: Minimal reference (~200 bytes) ← Use this for system prompts
- **`MULTIPLAYER_TEMPLATES`**: Genre-specific code snippets

## Current Implementation

The short prompt is currently injected into `/api/chat/+server.ts` system prompt.

## Adding New Prompts

1. Create new file: `[feature]-prompt.ts`
2. Export const strings (not markdown)
3. Keep concise (AI agents have token limits)
4. Include minimal working examples
5. Import and append to system prompts where needed

## Best Practices

- ✅ Use SHORT versions in production (save tokens)
- ✅ Include code examples, not prose
- ✅ Focus on common mistakes
- ✅ Provide decision rules (if/then)
- ❌ Don't duplicate info already in docs
- ❌ Don't write essays (AI reads code better than text)
