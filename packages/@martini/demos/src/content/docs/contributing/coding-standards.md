---
title: Coding Standards
description: Code style and quality guidelines for Martini SDK
---

# Coding Standards

This guide defines the coding standards for Martini SDK to ensure consistency and maintainability across the codebase.

## TypeScript Standards

### Strict Mode

All packages use TypeScript strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**What this means:**
- No implicit `any` types
- Null and undefined checking enabled
- Strict property initialization
- No implicit `this`

### Type-First Design

Design with types before implementation:

**Good:**
```typescript
// Define the interface first
interface GameState {
  players: Record<string, Player>;
  projectiles: Projectile[];
  score: number;
}

// Then implement
function updateScore(state: GameState, points: number): void {
  state.score += points;
}
```

**Bad:**
```typescript
// Implementation without clear types
function updateScore(state, points) {
  state.score += points;
}
```

### Generic Constraints

Use generic constraints for type safety:

**Good:**
```typescript
function createSpriteManager<TData extends { id: string }>(
  config: SpriteManagerConfig<TData>
): SpriteManager<TData> {
  // TData must have an 'id' property
}
```

**Bad:**
```typescript
function createSpriteManager<TData>(
  config: SpriteManagerConfig<TData>
): SpriteManager<TData> {
  // No constraints, less type safety
}
```

### Avoid `any`

Prefer `unknown` or specific types over `any`:

**Good:**
```typescript
function parseJSON(json: string): unknown {
  return JSON.parse(json);
}

// Use with type guard
const data = parseJSON(jsonString);
if (isGameState(data)) {
  // TypeScript knows data is GameState here
}
```

**Bad:**
```typescript
function parseJSON(json: string): any {
  return JSON.parse(json);
}
```

**When `any` is acceptable:**
- External library types you can't control
- Truly dynamic data (with clear documentation)
- Temporary during refactoring (add `// TODO: type this` comment)

### Use `readonly` for Immutability

Mark properties that shouldn't change:

**Good:**
```typescript
interface GameRuntimeConfig {
  readonly isHost: boolean;
  readonly playerIds: readonly string[];
  readonly seed?: number;
}
```

**Bad:**
```typescript
interface GameRuntimeConfig {
  isHost: boolean;
  playerIds: string[];
  seed?: number;
}
```

### Explicit Return Types

Always specify return types for public functions:

**Good:**
```typescript
export function createPlayer(id: string): Player {
  return { id, x: 0, y: 0, health: 100 };
}
```

**Bad:**
```typescript
export function createPlayer(id: string) {
  return { id, x: 0, y: 0, health: 100 };
}
```

## Code Style

### Formatting

We use **Prettier** for automatic formatting:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**Setup:**
```bash
# Install Prettier
pnpm add -D prettier

# Format code
pnpm exec prettier --write .
```

**Use editor integration:**
- VS Code: Install Prettier extension
- Enable "Format on Save"

### Indentation

- **Use tabs** for indentation
- **Tab width: 2 spaces**
- Be consistent within a file

### Quotes

- **Single quotes** for strings: `'hello'`
- **Double quotes** for JSX/HTML attributes: `<div class="foo">`
- **Template literals** for string interpolation: `` `Hello ${name}` ``

### Semicolons

- **Always use semicolons** - Required by our Prettier config
- Prevents ASI (Automatic Semicolon Insertion) bugs

### Line Length

- **Max 100 characters** per line
- Break long lines for readability:

```typescript
// Good
const runtime = new GameRuntime(
  game,
  transport,
  {
    isHost: true,
    playerIds: ['p1', 'p2'],
  }
);

// Bad - too long
const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1', 'p2'] });
```

## Naming Conventions

### Classes

Use **PascalCase**:

```typescript
class GameRuntime {}
class PhaserAdapter {}
class LocalTransport {}
```

### Functions and Variables

Use **camelCase**:

```typescript
function submitAction() {}
const playerCount = 5;
let isConnected = false;
```

### Constants

Use **UPPER_SNAKE_CASE** for true constants:

```typescript
const DEFAULT_SYNC_RATE_MS = 50;
const MAX_PLAYERS = 8;
```

**Not for config objects:**
```typescript
// This is configuration, use camelCase
const defaultConfig = {
  syncRateMs: 50,
  maxPlayers: 8,
};
```

### Interfaces and Types

Use **PascalCase**:

```typescript
interface GameState {}
type ActionHandler = () => void;
```

**Interface prefix:**
- Generally avoid `I` prefix
- Use it only when the interface and implementation have the same name:

```typescript
// Good - clear distinction
interface Transport {}
class LocalTransport implements Transport {}

// Only use I prefix when needed
interface ITransport {}
class Transport implements ITransport {}
```

### Files

**Two conventions:**

1. **PascalCase for classes**: `GameRuntime.ts`, `PhaserAdapter.ts`
2. **kebab-case for modules**: `seeded-random.ts`, `input-manager.ts`

**Test files:**
```
GameRuntime.test.ts
input-manager.test.ts
```

## File Organization

### Standard Structure

```
package/
├── src/
│   ├── index.ts              # Public exports only
│   ├── GameRuntime.ts        # Main classes (one per file)
│   ├── types.ts              # Shared type definitions
│   ├── constants.ts          # Constants
│   ├── helpers/              # Helper functions
│   │   ├── index.ts
│   │   ├── createPlayer.ts
│   │   └── createTick.ts
│   └── __tests__/            # Test files
│       ├── GameRuntime.test.ts
│       └── helpers.test.ts
├── dist/                     # Build output (gitignored)
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

### Exports

**index.ts should only re-export:**

```typescript
// Good - clean public API
export { GameRuntime } from './GameRuntime';
export { defineGame } from './defineGame';
export type { GameDefinition, GameState } from './types';
export * from './helpers';
```

**Don't implement in index.ts:**

```typescript
// Bad - implementation in index
export function defineGame() {
  // ...implementation
}
```

### Import Order

Organize imports in this order:

```typescript
// 1. External dependencies
import Phaser from 'phaser';
import { describe, it, expect } from 'vitest';

// 2. Internal dependencies from other packages
import { GameRuntime } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';

// 3. Relative imports
import { Player } from './types';
import { createPlayer } from './helpers';

// 4. Type-only imports (separate)
import type { GameState } from './types';
```

## Documentation Standards

### TSDoc Comments

Use TSDoc for all public APIs:

```typescript
/**
 * Creates a new game runtime instance.
 *
 * @param game - The game definition created with defineGame()
 * @param transport - The transport layer for network communication
 * @param config - Runtime configuration options
 * @returns A new GameRuntime instance
 *
 * @example
 * ```typescript
 * const runtime = new GameRuntime(game, transport, {
 *   isHost: true,
 *   playerIds: ['p1']
 * });
 * ```
 *
 * @see {@link GameDefinition}
 * @see {@link Transport}
 */
export class GameRuntime<TState> {
  constructor(
    game: GameDefinition<TState>,
    transport: Transport,
    config: GameRuntimeConfig
  ) {
    // ...
  }
}
```

**TSDoc tags to use:**
- `@param` - Parameter description
- `@returns` - Return value description
- `@throws` - Exceptions that can be thrown
- `@example` - Usage examples
- `@see` - Links to related docs
- `@deprecated` - Mark deprecated APIs

### Inline Comments

Use inline comments for complex logic:

```typescript
// Calculate velocity with acceleration curve
// Using quadratic easing for smoother feel
const velocity = Math.pow(timeElapsed / duration, 2) * maxVelocity;
```

**When to comment:**
- Complex algorithms
- Non-obvious optimizations
- Workarounds for bugs
- Business logic reasoning

**When NOT to comment:**
- Obvious code (let the code speak)
- Redundant information
- Instead of clear names

```typescript
// Bad - comment states the obvious
// Increment count
count++;

// Good - clear variable name, no comment needed
playerCount++;
```

### README Files

Every package should have a README:

```markdown
# @martini/package-name

Brief description of what this package does.

## Installation

\`\`\`bash
pnpm add @martini/package-name
\`\`\`

## Usage

\`\`\`typescript
import { Something } from '@martini/package-name';
\`\`\`

## API

Link to full API docs.

## License

MIT
```

## Testing Standards

### Test File Naming

- **Pattern:** `FileName.test.ts`
- **Location:** `src/__tests__/FileName.test.ts`

### Test Structure

Use **Arrange-Act-Assert** pattern:

```typescript
import { describe, it, expect } from 'vitest';
import { GameRuntime } from '../GameRuntime';

describe('GameRuntime', () => {
  describe('submitAction', () => {
    it('should update state when action is submitted', () => {
      // Arrange
      const game = defineGame({
        setup: () => ({ count: 0 }),
        actions: {
          increment: {
            apply: (state) => { state.count++; }
          }
        }
      });
      const runtime = new GameRuntime(game, transport, config);

      // Act
      runtime.submitAction('increment');

      // Assert
      expect(runtime.getState().count).toBe(1);
    });
  });
});
```

### Test Descriptions

- Use **descriptive test names** that explain what is being tested
- Format: "should [expected behavior] when [condition]"

**Good:**
```typescript
it('should throw error when transport is disconnected', () => {});
it('should sync state to all clients when host updates', () => {});
```

**Bad:**
```typescript
it('works', () => {});
it('test1', () => {});
```

### Test Coverage

- **Aim for >80% coverage**
- Focus on critical paths
- Test edge cases
- Don't test trivial code

### Resource Cleanup

Always clean up resources:

```typescript
it('should cleanup on destroy', () => {
  const runtime = new GameRuntime(game, transport, config);

  runtime.destroy();

  // Verify cleanup
  expect(runtime.isDestroyed).toBe(true);
});
```

## Error Handling

### Descriptive Errors

Provide helpful error messages:

**Good:**
```typescript
throw new Error(
  `Invalid targetId "${targetId}". Player not found in state. ` +
  `Available players: ${Object.keys(state.players).join(', ')}`
);
```

**Bad:**
```typescript
throw new Error('Invalid player');
```

### Error Types

Create custom error classes for specific errors:

```typescript
export class TransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransportError';
  }
}

export class StateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateValidationError';
  }
}
```

### Error Recovery

Handle errors gracefully:

```typescript
try {
  transport.send(message);
} catch (error) {
  logger.error('Failed to send message:', error);
  // Attempt recovery
  reconnect();
}
```

## Performance Best Practices

### Avoid Premature Optimization

- Write clear code first
- Profile before optimizing
- Document optimization reasoning

### Common Optimizations

**Object pooling:**
```typescript
class ProjectilePool {
  private pool: Projectile[] = [];

  acquire(): Projectile {
    return this.pool.pop() ?? new Projectile();
  }

  release(projectile: Projectile): void {
    projectile.reset();
    this.pool.push(projectile);
  }
}
```

**Memoization:**
```typescript
const memoizedDistance = memoize((x1, y1, x2, y2) => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
});
```

## Git Standards

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add host migration support
fix(phaser): resolve sprite interpolation bug
docs(api): update GameRuntime documentation
test(core): add player lifecycle tests
refactor(transport): simplify message routing
perf(sync): optimize diff generation algorithm
chore(deps): update dependencies
```

### Branch Names

Use descriptive branch names:

```
feature/host-migration
fix/sprite-interpolation
docs/add-unity-guide
refactor/simplify-transport
```

## Checklist for Contributors

Before submitting a PR, ensure:

- [ ] Code follows TypeScript standards
- [ ] All functions have TSDoc comments
- [ ] Tests are written and passing
- [ ] Code is formatted with Prettier
- [ ] No TypeScript errors
- [ ] Documentation is updated
- [ ] Examples are tested
- [ ] Commit messages follow convention
- [ ] PR description is clear and complete

---

Questions about coding standards? Ask in [GitHub Discussions](https://github.com/yourusername/martini/discussions)!
