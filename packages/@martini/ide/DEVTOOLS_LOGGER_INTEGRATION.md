# DevTools Logger Integration

**Status:** ✅ COMPLETED
**Date:** 2025-11-13

## Overview

The DevTools overlay now fully integrates with the Martini Logger API, capturing both native `console.log()` calls and Logger API calls with channel information.

## Implementation Details

### 1. Console Interception in Sandbox Runtime

**File:** `static/ide-sandbox.html`

The sandbox runtime intercepts all console methods (`log`, `warn`, `error`) before any game code loads:

```javascript
// Intercepts console.log/warn/error
console.log = function(...args) {
    sendConsoleMessage('log', args);
};

// Extracts channel from Logger messages
const channelMatch = message.match(/^\[([^\]]+)\]\s+(.*)$/);
if (channelMatch) {
    channel = channelMatch[1];  // e.g., "Physics:Collision"
    cleanMessage = channelMatch[2];  // Message without channel prefix
}
```

**Features:**
- ✅ Captures native `console.log()`, `console.warn()`, `console.error()`
- ✅ Captures uncaught errors and promise rejections
- ✅ Maintains original console behavior
- ✅ Extracts channel information from Logger messages (format: `[Channel] message`)
- ✅ Sends to parent window via `postMessage`

### 2. DevTools Panel UI

**File:** `src/lib/components/DevToolsPanel.svelte`

The DevTools overlay displays console logs with channel badges:

```svelte
{#if log.channel}
    <span class="log-channel">[{log.channel}]</span>
{/if}
```

**Features:**
- ✅ Channel badges with VS Code-style blue theme
- ✅ Level icons (ℹ️ for log, ⚠️ for warn, ❌ for error)
- ✅ Timestamps with millisecond precision
- ✅ Color-coded messages by level
- ✅ Hover effects for better UX

**Styling:**
```css
.log-channel {
    padding: 0.0625rem 0.375rem;
    border-radius: 3px;
    font-size: 0.625rem;
    font-weight: 500;
    background: rgba(86, 156, 214, 0.15);
    color: #569cd6;
    border: 1px solid rgba(86, 156, 214, 0.25);
}
```

### 3. Type Definitions

**Updated interfaces:**

```typescript
// Sandbox.ts
onConsoleLog?: (log: {
    message: string;
    level: 'log' | 'warn' | 'error';
    timestamp: number;
    channel?: string
}) => void;

// DevToolsPanel.svelte
logs?: Array<{
    message: string;
    timestamp: number;
    level: 'log' | 'warn' | 'error';
    channel?: string
}>;
```

## Usage Examples

### Using Native Console

```typescript
// In game code
console.log('Player joined');
// DevTools shows: ℹ️ 14:30:25.123 Player joined
```

### Using Logger API

```typescript
import { logger } from '@martini/core';

const physics = logger.channel('Physics');
const collision = physics.channel('Collision');

collision.log('AABB check passed');
// DevTools shows: ℹ️ 14:30:25.456 [Physics:Collision] AABB check passed
```

### With Nested Channels

```typescript
const game = logger.channel('Game');
const network = game.channel('Network');
const p2p = network.channel('P2P');

p2p.warn('High latency detected');
// DevTools shows: ⚠️ 14:30:26.789 [Game:Network:P2P] High latency detected
```

## Message Flow

```
Game Code
    ↓
Logger API → console.log('[Channel] message')
    ↓
Console Interception (ide-sandbox.html)
    ↓
postMessage to parent window
    ↓
Sandbox.ts message handler
    ↓
onConsoleLog callback
    ↓
GamePreview component state
    ↓
DevToolsPanel display
```

## Testing

### Manual Testing Checklist

- [ ] Open IDE with dual-view demo
- [ ] Toggle DevTools on both host and client
- [ ] Verify console.log() calls appear in DevTools
- [ ] Verify Logger API calls appear with channel badges
- [ ] Verify timestamps are correct
- [ ] Verify level icons (ℹ️, ⚠️, ❌) display correctly
- [ ] Verify message colors match log levels
- [ ] Verify uncaught errors appear in DevTools
- [ ] Verify panel is draggable
- [ ] Verify minimize/maximize works

### Build Verification

```bash
pnpm --filter=@martini/ide build
# ✅ All builds succeed
```

## Files Modified

1. **`/packages/@martini/ide/static/ide-sandbox.html`**
   - Added console interception IIFE
   - Added channel extraction logic
   - Added error/rejection handlers

2. **`/packages/@martini/ide/src/lib/components/DevToolsPanel.svelte`**
   - Added channel property to log type
   - Added channel badge display
   - Added channel styling

3. **`/packages/@martini/ide/src/lib/core/Sandbox.ts`**
   - Updated onConsoleLog callback type
   - Added channel property to log interface

4. **`/packages/@martini/ide/src/lib/components/GamePreview.svelte`**
   - Updated consoleLogs state type
   - Added channel property support

5. **`/packages/@martini/next-steps.md`**
   - Updated DevTools completion status
   - Marked console integration as complete

## Next Steps

The Logger → DevTools integration is complete! The next priorities are:

1. **StateInspector Integration**
   - Wire up StateInspector to capture state snapshots
   - Display state in DevTools State tab
   - Show state diffs

2. **Action History Display**
   - Capture action submissions
   - Display in DevTools Actions tab
   - Show timestamps and input data

3. **Network Traffic Monitoring** (future)
   - Requires transport instrumentation
   - Show message counts, bandwidth
   - Latency measurements

## Related Documentation

- [Logger API Documentation](/packages/@martini/core/docs/logger.md)
- [StateInspector README](/packages/@martini/devtools/README.md)
- [Martini SDK v2 Docs](/packages/@martini/docs/martini-sdk-v2/)
