---
title: Logger
description: Unity-inspired structured logging system
---

# Logger

Martini's `Logger` provides structured, channel-based logging inspired by Unity's Debug class. It supports log levels, contexts, performance timing, and DevTools integration.

## Quick Start

```typescript
import { Logger } from '@martini/core';

// Create a logger for your module
const gameLogger = new Logger('Game');
const physicsLogger = new Logger('Physics');

gameLogger.log('Player joined', playerId);
gameLogger.warn('Low health', { health: 20 });
gameLogger.error('Invalid state', state);

physicsLogger.log('Collision detected', body1, body2);
```

## API Reference

```typescript
class Logger {
  constructor(channel?: string, parentContext?: Record<string, any>);

  // Logging methods
  log(message: string, ...data: any[]): void;
  warn(message: string, ...data: any[]): void;
  error(message: string, ...data: any[]): void;

  // Grouping
  group(label: string): void;
  groupEnd(): void;

  // Assertions
  assert(condition: boolean, message?: string): void;

  // Performance timing
  time(label: string): void;
  timeEnd(label: string): void;

  // Child loggers
  channel(name: string): Logger;

  // Configuration
  setEnabled(enabled: boolean): void;
  setMinLevel(level: LogLevel): void;
  setContext(context: Record<string, any> | undefined): void;
  setIncludeStack(include: boolean): void;

  // Listeners (for DevTools)
  onLog(listener: LogListener): () => void;
}

// Types
type LogLevel = 'log' | 'warn' | 'error';
type LogListener = (entry: LogEntry) => void;

interface LogEntry {
  level: LogLevel;
  channel: string;
  message: string;
  data: any[];
  timestamp: number;
  context?: Record<string, any>;
  stack?: string;
}
```

## Basic Usage

### Creating Loggers

```typescript
import { Logger } from '@martini/core';

// Simple logger
const logger = new Logger('MyGame');

// Channel-based organization
const networkLogger = new Logger('Network');
const audioLogger = new Logger('Audio');
const uiLogger = new Logger('UI');
```

### Logging Messages

```typescript
// Info
logger.log('Game started');
logger.log('Player joined', { playerId: 'p1', name: 'Alice' });

// Warning
logger.warn('Low FPS detected', { fps: 15 });

// Error
logger.error('Failed to load asset', { path: 'sprites/player.png' });
```

**Console output:**
```
[MyGame] Game started
[MyGame] Player joined { playerId: 'p1', name: 'Alice' }
⚠️ [MyGame] Low FPS detected { fps: 15 }
❌ [MyGame] Failed to load asset { path: 'sprites/player.png' }
```

## Child Loggers

Create nested loggers for better organization:

```typescript
const gameLogger = new Logger('Game');
const playerLogger = gameLogger.channel('Player');
const enemyLogger = gameLogger.channel('Enemy');

playerLogger.log('Health changed', 75);  // [Game:Player] Health changed 75
enemyLogger.log('Spawned', { type: 'orc' });  // [Game:Enemy] Spawned {type: 'orc'}
```

**Deep nesting:**
```typescript
const game = new Logger('Game');
const physics = game.channel('Physics');
const collision = physics.channel('Collision');

collision.log('Box hit wall');  // [Game:Physics:Collision] Box hit wall
```

## Log Levels

Filter logs by minimum level:

```typescript
const logger = new Logger('Game');

// Show all logs (default)
logger.setMinLevel('log');

// Only warnings and errors
logger.setMinLevel('warn');

// Only errors
logger.setMinLevel('error');

logger.log('Debug info');      // Hidden if minLevel is 'warn' or 'error'
logger.warn('Warning');         // Hidden if minLevel is 'error'
logger.error('Critical error'); // Always shown
```

**Priority order:** `log` (lowest) &lt; `warn` &lt; `error` (highest)

## Context

Attach metadata to all log entries:

```typescript
const logger = new Logger('Game');

// Add context
logger.setContext({ sessionId: 'abc123', playerId: 'p1' });

logger.log('Action performed');
// Log entry includes: { sessionId: 'abc123', playerId: 'p1' }

// Update context
logger.setContext({ sessionId: 'abc123', playerId: 'p1', level: 5 });

// Clear context
logger.setContext(undefined);
```

**Inherited context:**
```typescript
const parent = new Logger('Game');
parent.setContext({ sessionId: 'abc123' });

const child = parent.channel('Physics');
child.setContext({ engine: 'Arcade' });

child.log('Collision');
// Context: { sessionId: 'abc123', engine: 'Arcade' }
```

## Grouping

Create collapsible log groups:

```typescript
logger.group('Game Loop');
logger.log('Update physics');
logger.log('Check collisions');
logger.log('Render frame');
logger.groupEnd();

logger.group('Player Actions');
logger.log('Move');
logger.log('Jump');
logger.groupEnd();
```

**Console output:**
```
▼ [Game] Game Loop
    [Game] Update physics
    [Game] Check collisions
    [Game] Render frame
▼ [Game] Player Actions
    [Game] Move
    [Game] Jump
```

## Assertions

Log errors when conditions fail:

```typescript
logger.assert(health > 0, 'Health must be positive');
logger.assert(players.length > 0, 'No players in game');

// Custom assertions
function assertPlayer(player: Player | undefined): asserts player is Player {
  logger.assert(player !== undefined, 'Player is undefined');
  if (!player) throw new Error('Player not found');
}
```

## Performance Timing

Measure execution time:

```typescript
logger.time('loadAssets');
await loadAllAssets();
logger.timeEnd('loadAssets');
// Output: [Game] loadAssets: 1234.56ms

logger.time('physics');
updatePhysics();
logger.timeEnd('physics');
// Output: [Game] physics: 3.21ms
```

**Nested timers:**
```typescript
logger.time('gameLoop');

logger.time('physics');
updatePhysics();
logger.timeEnd('physics');

logger.time('rendering');
renderFrame();
logger.timeEnd('rendering');

logger.timeEnd('gameLoop');
```

## Integration with DevTools

Listen for log entries (used by Martini DevTools):

```typescript
const logger = new Logger('Game');

const unsubscribe = logger.onLog((entry) => {
  console.log('Log entry:', entry);
  // {
  //   level: 'log',
  //   channel: 'Game',
  //   message: 'Player joined',
  //   data: ['p1'],
  //   timestamp: 1234567890,
  //   context: { sessionId: 'abc123' }
  // }

  // Send to DevTools panel
  sendToDevTools(entry);
});

// Later: stop listening
unsubscribe();
```

**Filtering:**
```typescript
logger.onLog((entry) => {
  // Only errors
  if (entry.level === 'error') {
    reportToErrorTracking(entry);
  }

  // Only specific channel
  if (entry.channel.startsWith('Network')) {
    logToNetworkMonitor(entry);
  }
});
```

## Configuration

### Enable/Disable Console Output

```typescript
const logger = new Logger('Game');

// Disable console output (listeners still notified)
logger.setEnabled(false);

logger.log('Hidden in console');  // Not shown, but listeners still get it

// Re-enable
logger.setEnabled(true);
```

**Use case:** Disable console spam in production while keeping DevTools integration.

### Include Stack Traces

```typescript
logger.setIncludeStack(true);

logger.log('Something happened');
// Log entry includes 'stack' property with call stack
```

**Automatic for errors:**
```typescript
logger.error('Critical error');
// Stack trace automatically included (even if setIncludeStack is false)
```

## Common Patterns

### Module-Scoped Loggers

```typescript
// player.ts
const logger = new Logger('Player');

export function updatePlayer(player: Player) {
  logger.log('Updating player', player.id);
  // ...
}

// enemy.ts
const logger = new Logger('Enemy');

export function spawnEnemy(type: string) {
  logger.log('Spawning enemy', type);
  // ...
}
```

### Conditional Logging

```typescript
const DEV = process.env.NODE_ENV !== 'production';
const logger = new Logger('Game');

if (DEV) {
  logger.log('Debug info', debugData);
}

// Or use minLevel in production
if (!DEV) {
  logger.setMinLevel('error');  // Only errors in production
}
```

### Logging in Actions

```typescript
import { defineGame } from '@martini/core';

const logger = new Logger('GameActions');

export const game = defineGame({
  actions: {
    move: {
      apply(state, context, input) {
        logger.log('Move action', { playerId: context.targetId, input });

        const player = state.players[context.targetId];
        if (!player) {
          logger.warn('Player not found', context.targetId);
          return;
        }

        player.x = input.x;
        player.y = input.y;
      }
    }
  }
});
```

### Performance Monitoring

```typescript
const perfLogger = new Logger('Performance');

// Track action execution time
actions: {
  tick: {
    apply(state, context) {
      perfLogger.time('tick');

      perfLogger.time('physics');
      updatePhysics(state);
      perfLogger.timeEnd('physics');

      perfLogger.time('ai');
      updateAI(state);
      perfLogger.timeEnd('ai');

      perfLogger.timeEnd('tick');
    }
  }
}
```

## Default Logger

Martini exports a default logger instance:

```typescript
import { logger } from '@martini/core';

logger.log('Using default Martini logger');  // [Martini] Using default Martini logger
```

**Create your own:**
```typescript
// Prefer creating your own for better channel organization
const myLogger = new Logger('MyGame');
```

## Complete Example

```typescript
import { Logger, defineGame } from '@martini/core';

// Create channel-based loggers
const gameLogger = new Logger('Game');
const physicsLogger = gameLogger.channel('Physics');
const networkLogger = gameLogger.channel('Network');

// Configure
if (process.env.NODE_ENV === 'production') {
  gameLogger.setMinLevel('error');
}

gameLogger.setContext({ version: '1.0.0' });

// Use in game definition
export const game = defineGame({
  setup: ({ playerIds }) => {
    gameLogger.log('Game setup', { playerCount: playerIds.length });

    return {
      players: Object.fromEntries(
        playerIds.map(id => {
          gameLogger.log('Initializing player', id);
          return [id, { x: 100, y: 100, health: 100 }];
        })
      )
    };
  },

  actions: {
    move: {
      apply(state, context, input) {
        physicsLogger.log('Move', { player: context.targetId, input });

        const player = state.players[context.targetId];
        if (!player) {
          gameLogger.error('Player not found', context.targetId);
          return;
        }

        player.x = input.x;
        player.y = input.y;
      }
    }
  },

  onPlayerJoin(state, playerId) {
    networkLogger.log('Player joined', playerId);
    gameLogger.assert(state.players[playerId] === undefined, 'Player already exists');
  },

  onPlayerLeave(state, playerId) {
    networkLogger.warn('Player left', playerId);
  }
});

// DevTools integration
gameLogger.onLog((entry) => {
  if (entry.level === 'error') {
    // Report to error tracking service
    reportError(entry);
  }
});
```

## Best Practices

### ✅ Do

- **Create channel-based loggers** - Organize by module/feature
- **Use appropriate log levels** - `log` for info, `warn` for issues, `error` for critical
- **Add context** - Include session/player IDs for debugging
- **Use timers** - Measure performance-critical sections
- **Filter in production** - Set `minLevel('error')` in production

### ❌ Don't

- **Don't overuse logging** - Too many logs = noise
- **Don't log sensitive data** - Passwords, tokens, etc.
- **Don't log in hot loops** - Performance impact
- **Don't rely on console in production** - Use proper monitoring tools
- **Don't forget to clean up listeners** - Call the unsubscribe function

## See Also

- [GameRuntime](./game-runtime) - Using logger in runtime
- [DevTools](/docs/api/devtools/state-inspector) - DevTools integration
