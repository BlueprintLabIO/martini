# Logger API

Unity-inspired logging system for Martini with channels, levels, assertions, and DevTools integration.

## Quick Start

```typescript
import { logger } from '@martini/core';

// Simple logging
logger.log('Game started');
logger.warn('Low FPS detected');
logger.error('Connection failed');

// With data
logger.log('Player position:', { x: 10, y: 20 });
logger.error('Invalid state:', state);
```

## Features

- **Log Levels**: log, warn, error with filtering
- **Channels**: Organize logs by subsystem (Physics, Network, UI, etc.)
- **Assertions**: Conditional error logging
- **Grouping**: Collapsible log groups
- **Performance Timing**: Measure operation duration
- **Context Data**: Attach metadata to all logs
- **Event Listeners**: Hook into logs for DevTools integration
- **Enable/Disable**: Control console output without removing log calls
- **Stack Traces**: Automatic stack traces for errors

## API Reference

### Basic Logging

#### `logger.log(message, ...data)`

Log an informational message.

```typescript
logger.log('Player joined', playerId);
logger.log('Position updated', { x, y, velocity });
```

#### `logger.warn(message, ...data)`

Log a warning message.

```typescript
logger.warn('High latency detected:', ping);
logger.warn('Player count exceeds recommended limit');
```

#### `logger.error(message, ...data)`

Log an error message with automatic stack trace.

```typescript
logger.error('Failed to load asset:', assetPath);
logger.error('Invalid game state', state);
```

### Channels

Organize logs by subsystem for better filtering and debugging.

#### `logger.channel(name): Logger`

Create a child logger with a nested channel name.

```typescript
// Create channel-specific loggers
const physics = logger.channel('Physics');
const network = logger.channel('Network');
const ui = logger.channel('UI');

// Use them independently
physics.log('Collision detected', { bodyA, bodyB });
network.warn('High packet loss:', packetLoss);
ui.error('Failed to render component');

// Output:
// [Martini:Physics] Collision detected { bodyA: ..., bodyB: ... }
// [Martini:Network] High packet loss: 25%
// [Martini:UI] Failed to render component
```

#### Nested Channels

Channels can be nested for hierarchical organization.

```typescript
const game = new Logger('Game');
const physics = game.channel('Physics');
const collision = physics.channel('Collision');

collision.log('AABB overlap detected');
// Output: [Game:Physics:Collision] AABB overlap detected
```

### Grouping

Create collapsible groups in the console for organized output.

#### `logger.group(label)`

Start a new group.

#### `logger.groupEnd()`

End the current group.

```typescript
logger.group('Frame Stats');
logger.log('FPS:', fps);
logger.log('Draw calls:', drawCalls);
logger.log('Entities:', entityCount);
logger.groupEnd();
```

### Assertions

#### `logger.assert(condition, message?)`

Log an error if the condition is false (like Unity's Debug.Assert).

```typescript
logger.assert(health > 0, 'Player health must be positive');
logger.assert(players.length <= maxPlayers, 'Too many players');

// Only logs if condition is false:
// Assertion failed: Player health must be positive
```

### Performance Timing

Measure how long operations take (like console.time/timeEnd).

#### `logger.time(label)`

Start a performance timer.

#### `logger.timeEnd(label)`

End the timer and log the duration.

```typescript
logger.time('physics-update');
// ... physics calculations
logger.timeEnd('physics-update');
// Output: physics-update: 2.34ms
```

### Configuration

#### `logger.setEnabled(enabled: boolean)`

Enable or disable console output. Listeners are still notified when disabled (for DevTools).

```typescript
// Disable console logs in production
if (import.meta.env.PROD) {
  logger.setEnabled(false);
}

// Re-enable for debugging
logger.setEnabled(true);
```

#### `logger.setMinLevel(level: 'log' | 'warn' | 'error')`

Filter logs below the minimum level.

```typescript
// Only show warnings and errors
logger.setMinLevel('warn');

logger.log('Info message');     // Not shown
logger.warn('Warning message'); // Shown
logger.error('Error message');  // Shown
```

#### `logger.setContext(context: Record<string, any> | undefined)`

Attach context data to all log entries from this logger.

```typescript
const gameLogger = new Logger('Game');
gameLogger.setContext({
  playerId: 'player1',
  scene: 'main',
  build: '1.2.3'
});

gameLogger.log('Event occurred');
// Context is automatically included in log entry for DevTools
```

#### `logger.setIncludeStack(include: boolean)`

Force stack traces on all log levels (not just errors).

```typescript
logger.setIncludeStack(true);
logger.log('Debug point'); // Now includes stack trace
```

### Event Listeners

Hook into log events for DevTools integration or custom handlers.

#### `logger.onLog(listener): () => void`

Register a listener function. Returns an unsubscribe function.

```typescript
const unsubscribe = logger.onLog((entry) => {
  console.log('Log entry:', entry);
  // entry: {
  //   level: 'log' | 'warn' | 'error',
  //   channel: string,
  //   message: string,
  //   data: any[],
  //   timestamp: number,
  //   context?: Record<string, any>,
  //   stack?: string
  // }
});

// Stop listening
unsubscribe();
```

**Use Cases:**
- Send logs to DevTools overlay
- Export logs to analytics
- Filter/search logs in custom UI
- Trigger alerts on errors

## Usage Patterns

### Subsystem Loggers

```typescript
// In physics.ts
import { logger } from '@martini/core';
const log = logger.channel('Physics');

export class PhysicsSystem {
  update(dt: number) {
    log.time('physics-tick');

    // Do physics...

    log.timeEnd('physics-tick');
    log.log('Updated', this.bodies.length, 'bodies');
  }
}
```

### Conditional Logging

```typescript
// Only log in development
if (import.meta.env.DEV) {
  logger.log('Debug info:', data);
}

// Or use setEnabled
const debugLogger = new Logger('Debug');
debugLogger.setEnabled(import.meta.env.DEV);
debugLogger.log('Always called, only shown in dev');
```

### Error Handling

```typescript
try {
  // Risky operation
  await loadAsset(path);
} catch (err) {
  logger.error('Failed to load asset:', path, err);
  // Stack trace is automatically captured
}
```

### Network Debugging

```typescript
const network = logger.channel('Network');

class NetworkManager {
  async connect(url: string) {
    network.log('Connecting to:', url);
    network.time('connection');

    try {
      await this.socket.connect(url);
      network.timeEnd('connection');
      network.log('Connected successfully');
    } catch (err) {
      network.error('Connection failed:', err);
    }
  }

  onMessage(msg: any) {
    network.log('Received:', msg.type, msg.data);
  }

  onLatency(ping: number) {
    if (ping > 200) {
      network.warn('High latency:', ping, 'ms');
    }
  }
}
```

### DevTools Integration

```typescript
// In your IDE/DevTools
import { logger, type LogEntry } from '@martini/core';

const logs: LogEntry[] = [];

logger.onLog((entry) => {
  logs.push(entry);

  // Update UI
  devToolsPanel.addLog(entry);

  // Filter by level
  if (entry.level === 'error') {
    devToolsPanel.showErrorNotification(entry);
  }

  // Filter by channel
  if (entry.channel.includes('Network')) {
    networkPanel.addLog(entry);
  }
});
```

## Comparison to Unity's Debug

| Unity | Martini |
|-------|---------|
| `Debug.Log(msg)` | `logger.log(msg)` |
| `Debug.LogWarning(msg)` | `logger.warn(msg)` |
| `Debug.LogError(msg)` | `logger.error(msg)` |
| `Debug.Assert(cond, msg)` | `logger.assert(cond, msg)` |
| ❌ No channels | `logger.channel(name)` |
| ❌ No timing | `logger.time(label)` / `logger.timeEnd(label)` |
| ❌ No grouping | `logger.group(label)` / `logger.groupEnd()` |
| ❌ No listeners | `logger.onLog(listener)` |

## Best Practices

1. **Use Channels** - Organize logs by subsystem for easier filtering
   ```typescript
   const physics = logger.channel('Physics');
   const network = logger.channel('Network');
   ```

2. **Don't Stringify Objects** - Pass objects directly, they'll be inspectable in DevTools
   ```typescript
   // ❌ Bad
   logger.log('State:', JSON.stringify(state));

   // ✅ Good
   logger.log('State:', state);
   ```

3. **Use Assertions** - Catch bugs early with runtime checks
   ```typescript
   logger.assert(players.length > 0, 'Need at least one player');
   ```

4. **Time Performance-Critical Code** - Find bottlenecks
   ```typescript
   logger.time('expensive-operation');
   doExpensiveWork();
   logger.timeEnd('expensive-operation');
   ```

5. **Context for Global Loggers** - Add metadata to all logs from a system
   ```typescript
   const gameLogger = new Logger('Game');
   gameLogger.setContext({ playerId, roomId });
   ```

6. **Disable in Production** - Keep log calls but turn off console output
   ```typescript
   if (import.meta.env.PROD) {
     logger.setEnabled(false);
   }
   ```

## TypeScript Types

```typescript
import type { Logger, LogLevel, LogEntry, LogListener } from '@martini/core';

type LogLevel = 'log' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  channel: string;
  message: string;
  data: any[];
  timestamp: number;
  context?: Record<string, any>;
  stack?: string;
}

type LogListener = (entry: LogEntry) => void;
```

## See Also

- [DevTools Integration](./devtools.md)
- [Best Practices](./best-practices.md)
- [API Reference](./api-reference.md)
