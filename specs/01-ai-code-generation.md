# AI Code Generation System

## Overview

Transform natural language prompts into playable Phaser 3 game code within seconds. The system validates, sanitizes, and structures code to run safely in sandboxed environments.

---

## Architecture

```
User Prompt
    ↓
┌─────────────────────────────────────┐
│  SvelteKit Frontend                 │
│  - Prompt input UI                  │
│  - Loading states                   │
└─────────────────┬───────────────────┘
                  │ POST /api/generate
                  ↓
┌─────────────────────────────────────┐
│  Node.js API (Coolify)              │
│  ┌───────────────────────────────┐  │
│  │ 1. Prompt Engineering         │  │
│  │    - Add context & constraints│  │
│  │    - Include template code    │  │
│  └───────────┬───────────────────┘  │
│              │                      │
│  ┌───────────▼───────────────────┐  │
│  │ 2. OpenAI GPT-4 API           │  │
│  │    - Generate code            │  │
│  └───────────┬───────────────────┘  │
│              │                      │
│  ┌───────────▼───────────────────┐  │
│  │ 3. AST Validation             │  │
│  │    - Parse with Acorn         │  │
│  │    - Ban dangerous patterns   │  │
│  └───────────┬───────────────────┘  │
│              │                      │
│  ┌───────────▼───────────────────┐  │
│  │ 4. Loop Guard Transform       │  │
│  │    - Babel plugin             │  │
│  │    - Add iteration counters   │  │
│  └───────────┬───────────────────┘  │
│              │                      │
│  ┌───────────▼───────────────────┐  │
│  │ 5. Code Formatting            │  │
│  │    - Prettier                 │  │
│  └───────────┬───────────────────┘  │
└──────────────┼─────────────────────┘
               │ Return formatted code
               ↓
┌─────────────────────────────────────┐
│  Frontend                           │
│  - Save to Supabase                 │
│  - Load in CodeMirror 6 editor      │
│  - Execute in sandbox iframe        │
└─────────────────────────────────────┘
```

---

## API Endpoint

### `POST /api/generate`

**Request:**
```typescript
{
  prompt: string;           // "make a space shooter with aliens"
  projectId?: string;       // for editing existing projects
  templateType?: 'shooter' | 'platformer' | 'building' | 'blank';
  existingCode?: string;    // for AI modifications
}
```

**Response (Success):**
```typescript
{
  success: true;
  code: string;             // Generated JS code
  explanation: string;      // What the AI created
  warnings?: string[];      // Any non-blocking issues
}
```

**Response (Error):**
```typescript
{
  success: false;
  error: string;
  suggestion?: string;      // How to fix
  retryable: boolean;       // Can auto-retry?
}
```

---

## Prompt Engineering

### System Prompt Template

```
You are an expert game developer creating 2D multiplayer games using Phaser 3.

CONSTRAINTS:
- Write pure JavaScript (no TypeScript, no imports)
- Use only the provided gameAPI object (no raw Phaser access)
- Games MUST be multiplayer-ready (2-6 players)
- Use input sync model: read inputs, update state, broadcast state
- Be deterministic: use gameAPI.random() instead of Math.random()
- Never use Date.now(), use gameAPI.getFrame() for timing
- Avoid infinite loops
- Keep code under 500 lines for MVP

AVAILABLE APIs:
- gameAPI.createSprite(type, x, y, config)
- gameAPI.playSound(name)
- gameAPI.sendInput(keys)
- gameAPI.getInputs() // returns all player inputs
- gameAPI.setState(stateObj)
- gameAPI.getState()
- gameAPI.random() // seeded random
- gameAPI.getFrame() // frame counter
- gameAPI.log(message)

MULTIPLAYER PATTERN:
```js
function update() {
  const inputs = gameAPI.getInputs();

  // Process each player's input
  inputs.forEach(input => {
    const player = players[input.playerId];
    if (input.keys.left) player.x -= 5;
    if (input.keys.right) player.x += 5;
    if (input.keys.space) shootBullet(player);
  });

  // Update game state
  bullets.forEach(b => b.x += b.vx);

  // Host broadcasts state
  if (gameAPI.isHost()) {
    gameAPI.setState({ players, bullets });
  }
}
```

OUTPUT FORMAT:
Return only valid JavaScript code, no markdown fences, no explanations.
```

### User Prompt Augmentation

**Input:** "make a space shooter"

**Augmented Prompt:**
```
Create a 2-player space shooter game with these features:
- Players control spaceships that can move left/right and shoot
- Aliens spawn from the top and move down
- Players score points for destroying aliens
- Game ends when an alien reaches the bottom

Use the shooter template as a base. Follow the multiplayer input sync pattern.
Include proper collision detection between bullets and aliens.

Template code:
[INSERT SHOOTER_TEMPLATE.js here]

User's original request: "make a space shooter"
```

---

## Code Validation (AST)

### Banned Patterns

Use Acorn to parse and scan for:

```typescript
const BANNED_GLOBALS = [
  'eval', 'Function', 'setTimeout', 'setInterval',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource',
  'window', 'document', 'localStorage', 'sessionStorage',
  'indexedDB', 'cookie', 'navigator',
  'import', 'require', 'process', 'Buffer'
];

const BANNED_PATTERNS = [
  /while\s*\(\s*true\s*\)/,           // while(true)
  /for\s*\(\s*;;\s*\)/,               // for(;;)
  /Math\.random/,                      // use gameAPI.random()
  /Date\.now/,                         // use gameAPI.getFrame()
  /new\s+Worker/,                      // no workers in sandbox
  /new\s+SharedArrayBuffer/,          // no shared memory
];

function validateAST(code: string): ValidationResult {
  try {
    const ast = acorn.parse(code, { ecmaVersion: 2020 });
    const errors: string[] = [];

    // Walk AST
    walk.simple(ast, {
      Identifier(node) {
        if (BANNED_GLOBALS.includes(node.name)) {
          errors.push(`Forbidden API: ${node.name}`);
        }
      },

      CallExpression(node) {
        // Check for banned patterns
        if (node.callee.type === 'Identifier' &&
            BANNED_GLOBALS.includes(node.callee.name)) {
          errors.push(`Forbidden function: ${node.callee.name}()`);
        }
      },

      WhileStatement(node) {
        // Check for obvious infinite loops
        if (node.test.type === 'Literal' && node.test.value === true) {
          errors.push('Infinite loop detected: while(true)');
        }
      }
    });

    // Check for banned regex patterns
    BANNED_PATTERNS.forEach(pattern => {
      if (pattern.test(code)) {
        errors.push(`Banned pattern found: ${pattern}`);
      }
    });

    return { valid: errors.length === 0, errors };
  } catch (parseError) {
    return { valid: false, errors: [`Syntax error: ${parseError.message}`] };
  }
}
```

### Loop Guard Transform (Babel)

```javascript
// Babel plugin to add loop guards
const babelLoopGuard = {
  visitor: {
    'WhileStatement|ForStatement|DoWhileStatement': (path) => {
      const guard = `
        if (++_loopCounter > 100000) {
          throw new Error('Loop iteration limit exceeded');
        }
      `;

      path.get('body').unshiftContainer('body',
        babel.template.ast(guard)
      );
    },

    Program(path) {
      // Add counter at top of file
      path.unshiftContainer('body',
        babel.template.ast('let _loopCounter = 0;')
      );
    }
  }
};

function transformCode(code: string): string {
  const result = babel.transform(code, {
    plugins: [babelLoopGuard]
  });
  return result.code;
}
```

---

## Error Handling & Retries

### Auto-Retry Logic

```typescript
async function generateCode(prompt: string, retries = 0): Promise<GenerateResult> {
  const MAX_RETRIES = 1; // Auto-retry once only

  try {
    // 1. Call OpenAI
    const rawCode = await callOpenAI(prompt);

    // 2. Validate AST
    const validation = validateAST(rawCode);
    if (!validation.valid) {
      if (retries < MAX_RETRIES) {
        // Auto-retry with error feedback
        const fixPrompt = `
          Previous code had errors: ${validation.errors.join(', ')}

          Please fix these issues and regenerate the code.
          Original prompt: ${prompt}
        `;
        return generateCode(fixPrompt, retries + 1);
      } else {
        // Give up, show manual fix button
        return {
          success: false,
          error: validation.errors.join('\n'),
          suggestion: 'Click "Ask AI to Fix" or edit code manually',
          retryable: true
        };
      }
    }

    // 3. Transform (loop guards)
    const transformed = transformCode(rawCode);

    // 4. Format
    const formatted = prettier.format(transformed, {
      parser: 'babel',
      semi: true,
      singleQuote: true
    });

    return {
      success: true,
      code: formatted,
      explanation: 'Game generated successfully'
    };

  } catch (error) {
    if (error.message.includes('rate limit')) {
      return {
        success: false,
        error: 'Rate limit exceeded. Try again in a few minutes.',
        retryable: false
      };
    }

    return {
      success: false,
      error: `Generation failed: ${error.message}`,
      retryable: true
    };
  }
}
```

### Frontend Retry UI

```svelte
<script>
let loading = false;
let error = null;
let code = '';

async function generate() {
  loading = true;
  error = null;

  const res = await fetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, projectId })
  });

  const data = await res.json();
  loading = false;

  if (data.success) {
    code = data.code;
    // Save to Supabase, load in editor
  } else {
    error = data.error;
    // Show error + "Ask AI to Fix" button if retryable
  }
}
</script>

{#if error}
  <div class="error">
    <p>{error}</p>
    {#if retryable}
      <button on:click={() => generateWithFix()}>
        Ask AI to Fix
      </button>
    {/if}
    <button on:click={() => error = null}>
      Edit Manually
    </button>
  </div>
{/if}
```

---

## OpenAI Integration

### Configuration

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CONFIG = {
  model: 'gpt-4-turbo-preview',    // or 'gpt-4o' when available
  temperature: 0.7,                 // balance creativity and consistency
  max_tokens: 2000,                 // ~500 lines of code
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
};
```

### API Call

```typescript
async function callOpenAI(augmentedPrompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: CONFIG.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: augmentedPrompt }
    ],
    temperature: CONFIG.temperature,
    max_tokens: CONFIG.max_tokens
  });

  const code = response.choices[0].message.content;

  // Remove markdown code fences if present
  const cleaned = code
    .replace(/```javascript\n/g, '')
    .replace(/```js\n/g, '')
    .replace(/```\n/g, '')
    .trim();

  return cleaned;
}
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,                    // 20 requests per hour per user
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many code generation requests. Try again in an hour.',
      retryable: false
    });
  }
});

app.post('/api/generate', generateLimiter, async (req, res) => {
  // ... generation logic
});
```

---

## Code Caching

### Strategy

Cache common prompt patterns to reduce API costs:

```typescript
import crypto from 'crypto';

function promptHash(prompt: string, templateType: string): string {
  return crypto
    .createHash('sha256')
    .update(`${prompt}:${templateType}`)
    .digest('hex');
}

async function generateWithCache(prompt: string, templateType: string) {
  const hash = promptHash(prompt, templateType);

  // Check Supabase cache table
  const cached = await supabase
    .from('code_cache')
    .select('code')
    .eq('prompt_hash', hash)
    .single();

  if (cached.data) {
    return { success: true, code: cached.data.code, fromCache: true };
  }

  // Not cached, generate fresh
  const result = await generateCode(prompt);

  if (result.success) {
    // Cache for future
    await supabase.from('code_cache').insert({
      prompt_hash: hash,
      prompt_text: prompt,
      template_type: templateType,
      code: result.code
    });
  }

  return result;
}
```

**Cache Table Schema:**
```sql
CREATE TABLE code_cache (
  prompt_hash TEXT PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  template_type TEXT,
  code TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cache_hits ON code_cache(hit_count DESC);
```

---

## Template System

### Template Structure

Each template provides:
1. **Base code:** Fully functional game
2. **Modification points:** Comments where AI should edit
3. **Example prompts:** Suggestions for users

**Example: Shooter Template**

```javascript
// SHOOTER_TEMPLATE.js
// A 2-player top-down space shooter

// === MODIFY: Player settings ===
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
const FIRE_RATE = 10; // frames between shots

// === MODIFY: Enemy settings ===
const ENEMY_SPEED = 2;
const SPAWN_RATE = 60; // frames between spawns

// Game state
let players = {};
let bullets = [];
let enemies = [];
let scores = {};

function init() {
  // Create players
  const inputs = gameAPI.getInputs();
  inputs.forEach(input => {
    players[input.playerId] = {
      id: input.playerId,
      x: 400,
      y: 500,
      sprite: gameAPI.createSprite('player', 400, 500)
    };
    scores[input.playerId] = 0;
  });
}

function update() {
  const inputs = gameAPI.getInputs();

  // === MODIFY: Player controls ===
  inputs.forEach(input => {
    const player = players[input.playerId];
    if (input.keys.left) player.x -= PLAYER_SPEED;
    if (input.keys.right) player.x += PLAYER_SPEED;
    if (input.keys.space && gameAPI.getFrame() % FIRE_RATE === 0) {
      bullets.push({
        x: player.x,
        y: player.y - 20,
        vx: 0,
        vy: -BULLET_SPEED,
        owner: player.id
      });
    }
  });

  // === MODIFY: Bullet movement ===
  bullets.forEach(b => {
    b.y += b.vy;
  });

  // Remove off-screen bullets
  bullets = bullets.filter(b => b.y > 0 && b.y < 600);

  // === MODIFY: Enemy spawning ===
  if (gameAPI.getFrame() % SPAWN_RATE === 0) {
    enemies.push({
      x: gameAPI.random() * 800,
      y: 0,
      vy: ENEMY_SPEED
    });
  }

  // === MODIFY: Enemy movement ===
  enemies.forEach(e => {
    e.y += e.vy;
  });

  // === MODIFY: Collision detection ===
  bullets.forEach(bullet => {
    enemies.forEach((enemy, i) => {
      if (Math.abs(bullet.x - enemy.x) < 20 &&
          Math.abs(bullet.y - enemy.y) < 20) {
        enemies.splice(i, 1);
        scores[bullet.owner]++;
        gameAPI.playSound('explosion');
      }
    });
  });

  // Game over if enemy reaches bottom
  enemies = enemies.filter(e => e.y < 600);

  // Broadcast state if host
  if (gameAPI.isHost()) {
    gameAPI.setState({ players, bullets, enemies, scores });
  }
}

// Start game
init();
gameAPI.onUpdate(update);
```

**Modification Prompt Examples:**
- "Make enemies move in a zig-zag pattern"
- "Add power-ups that increase fire rate"
- "Change player controls to use WASD and mouse to aim"

---

## Testing & Validation

### Unit Tests

```typescript
describe('AI Code Generation', () => {
  it('should reject code with eval', async () => {
    const maliciousCode = 'eval("alert(1)")';
    const result = validateAST(maliciousCode);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Forbidden API: eval');
  });

  it('should add loop guards', () => {
    const code = 'while (x < 100) { x++; }';
    const transformed = transformCode(code);
    expect(transformed).toContain('_loopCounter');
    expect(transformed).toContain('Loop iteration limit exceeded');
  });

  it('should format code with prettier', async () => {
    const ugly = 'function foo(){return 1}';
    const result = await generateCode('make a test');
    expect(result.code).toContain('function foo() {\n  return 1;\n}');
  });
});
```

### Integration Tests

```typescript
describe('OpenAI Integration', () => {
  it('should generate valid shooter code', async () => {
    const result = await generateCode('space shooter with aliens');
    expect(result.success).toBe(true);
    expect(result.code).toContain('gameAPI');
    expect(result.code).toContain('getInputs');
  });

  it('should auto-retry on validation failure', async () => {
    const spy = jest.spyOn(openai, 'chat.completions.create');
    await generateCode('broken prompt');
    expect(spy).toHaveBeenCalledTimes(2); // initial + 1 retry
  });
});
```

---

## Monitoring & Analytics

Track in `analytics` table:

```typescript
await supabase.from('analytics').insert({
  event_type: 'code_generated',
  user_id: userId,
  metadata: {
    prompt_length: prompt.length,
    template_type: templateType,
    success: result.success,
    retries: retryCount,
    tokens_used: response.usage.total_tokens,
    generation_time_ms: Date.now() - startTime
  }
});
```

**Key Metrics:**
- Success rate (target: >80%)
- Average retries (target: <0.5)
- Generation time (target: <10s)
- Token usage per request (optimize prompt size)

---

## Future Enhancements (Post-MVP)

- **Multi-turn conversations:** Let users iterate with "make enemies faster" without full regeneration
- **Code diffing:** Generate patches instead of full rewrites
- **Autocomplete:** Fine-tune GPT on Phaser API for real-time suggestions
- **Voice input:** Whisper API for voice prompts
- **Vision input:** Upload sketch → generate game matching layout
