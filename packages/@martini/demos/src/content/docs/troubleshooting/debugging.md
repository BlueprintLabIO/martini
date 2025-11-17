---
title: Debugging Guide
description: Tools and techniques for debugging Martini SDK applications
---

# Debugging Guide

This guide covers various tools and techniques for debugging Martini SDK applications.

## Using StateInspector

The `StateInspector` from `@martini/devtools` is the primary debugging tool for Martini SDK.

### Setup

```typescript
import { StateInspector } from '@martini/devtools';
import { GameRuntime } from '@martini/core';

const runtime = new GameRuntime(game, transport, config);

// Create inspector
const inspector = new StateInspector({
  maxSnapshots: 100,
  maxActions: 1000,
  snapshotThrottleMs: 500,
  actionFilter: {
    exclude: ['tick'],  // Exclude high-frequency actions
  }
});

// Attach to runtime
inspector.attach(runtime);
```

### Viewing Snapshots

```typescript
// Get all state snapshots
const snapshots = inspector.getSnapshots();
console.log('State history:', snapshots);

// Latest snapshot
const latest = snapshots[snapshots.length - 1];
console.log('Current state:', latest.state);
```

### Viewing Action History

```typescript
// Get all actions
const actions = inspector.getActionHistory();
console.log('Actions:', actions);

// Filter specific actions
const moveActions = actions.filter(a => a.actionName === 'move');
console.log('Move actions:', moveActions);
```

### Performance Metrics

```typescript
// Get stats
const stats = inspector.getStats();
console.log('Inspector stats:', {
  snapshots: stats.snapshotCount,
  actions: stats.actionCount,
  memory: `${(stats.memoryUsageBytes / 1024).toFixed(2)} KB`,
});
```

### Manual Snapshots

```typescript
// Capture snapshot at specific moment
inspector.captureManualSnapshot();
```

## Browser DevTools

### Console Logging

Add strategic logging throughout your code:

```typescript
// Log state changes
runtime.onChange((state) => {
  console.log('State updated:', state);
});

// Log actions
actions: {
  move: {
    apply(state, context, input) {
      console.log('Move action:', {
        playerId: context.playerId,
        targetId: context.targetId,
        input
      });
      // ... action logic
    }
  }
}

// Log transport messages
transport.onMessage((message, senderId) => {
  console.log('Received message:', { message, senderId });
});
```

### Performance Profiling

**Chrome DevTools Performance Tab:**

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Play your game for a few seconds
5. Stop recording
6. Analyze:
   - JavaScript execution time
   - Frame rate
   - Memory usage
   - Layout/rendering

**Identify bottlenecks:**
- Long-running functions (red bars)
- Frequent garbage collection
- Layout thrashing

### Memory Profiling

**Check for memory leaks:**

1. Open DevTools Memory tab
2. Take heap snapshot
3. Play game for a while
4. Take another snapshot
5. Compare snapshots
6. Look for growing objects

**Common leaks:**
- Event listeners not removed
- Sprites not destroyed
- Timers not cleared

```typescript
// Good - cleanup
this.events.once('shutdown', () => {
  this.adapter.destroy();
  this.runtime.destroy();
  clearInterval(this.tickInterval);
});
```

### Network Debugging

**Monitor WebSocket/WebRTC traffic:**

1. Open DevTools Network tab
2. Filter by WS (WebSocket) or Other
3. Click on connection
4. View messages tab
5. Inspect message payloads

**Look for:**
- Connection failures
- Large message sizes
- Frequent disconnects
- High latency

## Transport Debugging

### Check Connection State

```typescript
// Monitor connection
if (transport.metrics) {
  transport.metrics.onConnectionChange((state) => {
    console.log('Connection state:', state);
  });

  console.log('Peer count:', transport.metrics.getPeerCount());

  const stats = transport.metrics.getMessageStats();
  console.log('Messages:', stats);
}
```

### Test with LocalTransport

Simplify to rule out network issues:

```typescript
// Replace production transport
const transport = new LocalTransport({
  roomId: 'debug-room',
  isHost: true,
});
```

### Log All Messages

```typescript
// Intercept send
const originalSend = transport.send.bind(transport);
transport.send = (message, targetId) => {
  console.log('Sending:', { message, targetId });
  originalSend(message, targetId);
};

// Log received
transport.onMessage((message, senderId) => {
  console.log('Received:', { message, senderId });
});
```

## State Debugging

### State Diff Inspection

```typescript
import { generateDiff } from '@martini/core/sync';

// Compare two states
const diff = generateDiff(oldState, newState);
console.log('State changes:', diff);
```

### Validate State Structure

```typescript
function validateState(state: GameState): boolean {
  // Check for common issues
  if (!state.players) {
    console.error('Missing players object');
    return false;
  }

  for (const [id, player] of Object.entries(state.players)) {
    if (typeof player.x !== 'number') {
      console.error(`Invalid x for player ${id}:`, player.x);
      return false;
    }
  }

  return true;
}

// Use in onChange
runtime.onChange((state) => {
  if (!validateState(state)) {
    debugger;  // Pause in debugger
  }
});
```

## Action Debugging

### Action Tracer

```typescript
// Wrap all actions with logging
function wrapActions(actions: Record<string, ActionDefinition>) {
  const wrapped: Record<string, ActionDefinition> = {};

  for (const [name, action] of Object.entries(actions)) {
    wrapped[name] = {
      ...action,
      apply(state, context, input) {
        console.group(`Action: ${name}`);
        console.log('Before:', JSON.stringify(state));
        console.log('Input:', input);
        console.log('Context:', context);

        action.apply(state, context, input);

        console.log('After:', JSON.stringify(state));
        console.groupEnd();
      }
    };
  }

  return wrapped;
}

// Use it
const game = defineGame({
  actions: wrapActions({
    move: { apply: () => {} },
    jump: { apply: () => {} },
  })
});
```

## Phaser Debugging

### Sprite Inspector

```typescript
// Log all tracked sprites
console.log('Tracked sprites:', this.adapter.getTrackedSprites());

// Highlight sprites
for (const sprite of Object.values(sprites)) {
  const graphics = this.add.graphics();
  graphics.lineStyle(2, 0xff0000);
  graphics.strokeRect(
    sprite.x - sprite.width / 2,
    sprite.y - sprite.height / 2,
    sprite.width,
    sprite.height
  );
}
```

### Physics Bodies

```typescript
// Enable physics debug
const config: Phaser.Types.Core.GameConfig = {
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,  // Show collision boxes
      debugShowBody: true,
      debugShowVelocity: true,
    }
  }
};
```

### Scene State

```typescript
// Log scene info
console.log('Active scenes:', this.scene.manager.getScenes(true));
console.log('Scene key:', this.scene.key);
console.log('Scene systems:', this.scene.systems);
```

## Common Debugging Patterns

### Conditional Breakpoints

```typescript
// Only break when condition is true
if (player.health < 0) {
  debugger;  // Pause here
}
```

### Time-based Debugging

```typescript
// Log every second
let lastLog = 0;
update(time: number) {
  if (time - lastLog > 1000) {
    console.log('Update:', this.runtime.getState());
    lastLog = time;
  }
}
```

### Error Boundaries

```typescript
try {
  this.runtime.submitAction('move', input);
} catch (error) {
  console.error('Action failed:', error);
  console.log('State:', this.runtime.getState());
  console.log('Input:', input);
}
```

## VS Code Debugging

### Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Martini Game",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}",
      "sourceMapPathOverrides": {
        "webpack:///./src/*": "${webRoot}/src/*"
      }
    }
  ]
}
```

### Breakpoints

- Set breakpoints in your TypeScript source
- Use conditional breakpoints
- Use logpoints (no code changes needed)

## Testing Strategies

### Isolated Testing

Test components in isolation:

```typescript
// Test game logic without Phaser
const transport = new LocalTransport({ roomId: 'test', isHost: true });
const runtime = new GameRuntime(game, transport, {
  isHost: true,
  playerIds: ['p1']
});

runtime.submitAction('move', { x: 100, y: 200 });
const state = runtime.getState();
console.assert(state.players.p1.x === 100);
```

### Multi-Client Testing

Test with multiple tabs:

```typescript
// Tab 1 (Host)
const host = new LocalTransport({ roomId: 'test', isHost: true });
const hostRuntime = new GameRuntime(game, host, {
  isHost: true,
  playerIds: ['host', 'client']
});

// Tab 2 (Client)
const client = new LocalTransport({ roomId: 'test', isHost: false });
const clientRuntime = new GameRuntime(game, client, {
  isHost: false,
  playerIds: ['host', 'client']
});
```

## Debugging Checklist

When debugging an issue:

- [ ] Check browser console for errors
- [ ] Verify transport connection state
- [ ] Inspect state with StateInspector
- [ ] Review action history
- [ ] Test with LocalTransport
- [ ] Check network tab for failed requests
- [ ] Profile performance if slow
- [ ] Check memory usage
- [ ] Validate state structure
- [ ] Review recent code changes
- [ ] Test in different browsers
- [ ] Reproduce in minimal example

## Getting Help

If you're stuck:

1. Create a minimal reproduction
2. Include console errors
3. Share relevant code
4. Describe expected vs actual behavior
5. Post in [GitHub Discussions](https://github.com/yourusername/martini/discussions)

---

For common issues and solutions, see [Common Issues](/docs/latest/troubleshooting/common-issues).
