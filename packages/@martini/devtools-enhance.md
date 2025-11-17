# Martini DevTools Enhancement Plan

**Status:** ✅ PHASES 1-4 COMPLETE + UI Polish COMPLETE
**Last Updated:** 2025-11-17
**Vision:** Build the industry's best multiplayer game debugger - "Chrome DevTools for Multiplayer Games"

---

## 🎯 Current State

### ✅ Fully Implemented Features
- **State Timeline** - Scrub through 500 snapshots with slider
- **Action History** - Filter and inspect 2000 actions with metadata
- **Divergence Detection** - Real-time host/client state comparison with severity warnings
- **Network Stats** - Packet counts, bytes transferred, throughput rates
- **Packet Inspection** - Click to expand and view JSON payloads
- **Console Logging** - Dual host/client console output
- **UI Polish** - Optimized font sizes and panel layouts for maximum information density

### 📦 Components
- [StateInspector.ts](packages/@martini/devtools/src/StateInspector.ts) - Core data capture
- [StateViewer.svelte](packages/@martini/ide/src/lib/components/StateViewer.svelte) - Timeline scrubber
- [ActionTimeline.svelte](packages/@martini/ide/src/lib/components/ActionTimeline.svelte) - Action filtering
- [StateDiffViewer.svelte](packages/@martini/ide/src/lib/components/StateDiffViewer.svelte) - Divergence detector
- [NetworkMonitor.svelte](packages/@martini/ide/src/lib/components/NetworkMonitor.svelte) - Packet inspector
- [MartiniIDE.svelte](packages/@martini/ide/src/lib/MartiniIDE.svelte) - Main IDE with devtools integration

---

## 🚀 Phase 5: Advanced Features (Deferred)

These features are **deferred** until Phases 1-4 are validated with users.

### 5.1 Action Replay (Time-Travel Debugging)

**Goal:** Restore runtime to any snapshot and replay actions

**Implementation:**
```typescript
// Add to GamePreview.svelte
function replayFromSnapshot(snapshotIndex: number) {
  // 1. Get snapshot state
  const snapshot = stateSnapshots[snapshotIndex];

  // 2. Reset runtime to snapshot state
  runtime.setState(snapshot.state);

  // 3. Optionally replay actions after this snapshot
  const actionsToReplay = actionHistory.slice(snapshotIndex);
  for (const action of actionsToReplay) {
    runtime.submitAction(action.actionName, action.input, action.targetId);
  }
}
```

**UI:**
- Add "Restore" button to StateViewer timeline
- Add "Replay from here" button to ActionTimeline

---

### 5.2 Performance Profiler

**Goal:** Show frame timings, action costs, GC pressure

**Implementation:**
```typescript
// Extend StateInspector to track performance
export interface PerformanceMetrics {
  frameTimes: number[];  // Last N frame render times
  actionCosts: Record<string, number[]>;  // Time spent per action type
  gcEvents: Array<{ timestamp: number; duration: number }>;
  memoryUsage: number[];  // Heap size over time
}

// Hook into Phaser game loop
scene.events.on('postupdate', (time: number, delta: number) => {
  inspector.recordFrameTime(delta);
});

// Hook into action submission
runtime.submitAction = (...args) => {
  const start = performance.now();
  const result = originalSubmitAction(...args);
  const cost = performance.now() - start;
  inspector.recordActionCost(args[0], cost);
  return result;
};
```

**UI:**
- Sparkline charts for frame times
- Histogram of action costs
- Memory usage graph

---

### 5.3 Network Simulator

**Goal:** Inject latency, jitter, packet loss

**Implementation:**
```typescript
// Wrap transport with simulator
export class NetworkSimulator {
  constructor(
    private transport: Transport,
    private config: {
      latency: number;  // ms
      jitter: number;   // ms
      packetLoss: number;  // 0-1 probability
    }
  ) {}

  send(message: any): void {
    // Simulate packet loss
    if (Math.random() < this.config.packetLoss) {
      console.log('[NetworkSimulator] Dropped packet:', message);
      return;
    }

    // Simulate latency + jitter
    const delay = this.config.latency + (Math.random() - 0.5) * this.config.jitter;
    setTimeout(() => {
      this.transport.send(message);
    }, delay);
  }
}
```

**UI:**
- Sliders for latency, jitter, packet loss
- Presets: "3G Mobile", "Flaky WiFi", "Dial-up"

---

### 5.4 Transport Instrumentation (Required for Live Network Monitor)

**Goal:** Capture real network packets from transports

**Files to modify:**
- [packages/@martini/transport-local/src/LocalTransport.ts](packages/@martini/transport-local/src/LocalTransport.ts)
- [packages/@martini/transport-iframe-bridge/src/IframeBridgeTransport.ts](packages/@martini/transport-iframe-bridge/src/IframeBridgeTransport.ts)

**Changes:**
```typescript
// Add to LocalTransport
export class LocalTransport implements Transport {
  private onNetworkPacket?: (packet: NetworkPacket) => void;

  send(message: any): void {
    const packet = {
      timestamp: Date.now(),
      direction: 'send' as const,
      type: message.type || 'unknown',
      size: JSON.stringify(message).length,
      payload: message
    };

    // Notify DevTools
    this.onNetworkPacket?.(packet);

    // ... existing send logic
  }

  private handleMessage(message: any): void {
    const packet = {
      timestamp: Date.now(),
      direction: 'receive' as const,
      type: message.type || 'unknown',
      size: JSON.stringify(message).length,
      payload: message
    };

    // Notify DevTools
    this.onNetworkPacket?.(packet);

    // ... existing receive logic
  }

  // Expose hook for DevTools
  setNetworkMonitor(callback: (packet: NetworkPacket) => void): void {
    this.onNetworkPacket = callback;
  }
}
```

---

### 5.5 Additional Ideas

- **AI-Powered Suggestions** - Analyze divergences and suggest fixes
- **Remote Debugging** - WebSocket bridge for debugging production games
- **Shareable Traces** - Export/import state snapshots + actions for bug reports
- **Breakpoints** - Pause game when specific state conditions are met
- **State Diffs Over Time** - Chart showing divergence severity over time

---

## 🎓 Technical Details

### Architecture
- **StateInspector** captures snapshots and actions via event listeners
- **Sandpack Integration** injects devtools bundle via postMessage bridge
- **Data Flow:** Runtime (iframe) → postMessage → GamePreview → MartiniIDE → UI Components
- **Ring Buffers** enforce memory limits (500 snapshots, 2000 actions)

### Resources
- [StateInspector.ts](packages/@martini/devtools/src/StateInspector.ts) - Core implementation
- [React DevTools](https://github.com/facebook/react/tree/main/packages/react-devtools) - Inspiration
- [Redux DevTools](https://github.com/reduxjs/redux-devtools) - Time-travel reference

---

## 🚢 Launch Strategy

### Narrative
**Headline:** *"Debug Multiplayer Games Like Single-Player: Effortlessly"*

**Hook:** Unity and Unreal developers debug multiplayer with console.log hell. Martini DevTools gives you:
- 🎬 **State timeline** (scrub through history)
- 🔍 **Visual divergence detection** (see exact desync points)
- 📊 **Network inspection** (packet payloads, latency)
- ⚡ **Zero config** (works out of the box)

### Competitive Advantage

| Feature | Unity Netcode | Photon | Colyseus | **Martini** |
|---------|---------------|--------|----------|-------------|
| State timeline | ❌ | ❌ | ❌ | ✅ |
| Visual state diff | ❌ | ❌ | ❌ | ✅ |
| Network inspector | ❌ | ❌ | ❌ | ✅ |
| Dual preview | ❌ | ❌ | ❌ | ✅ |
| Zero config | ❌ | ❌ | ❌ | ✅ |

**Tagline:** *"The DevTools Unity should have built"*

---

## 📞 Next Steps

1. **User Testing** - Validate Phase 1-4 features with real developers
2. **Gather Feedback** - Which Phase 5 features are most needed?
3. **Prioritize** - Build Phase 5 features based on demand
4. **Document** - Create video tutorials and guides
5. **Launch** - Product Hunt, Hacker News, Reddit, Discord

---

**Document Owner:** Yao
**Last Review:** 2025-11-17
