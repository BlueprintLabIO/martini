# Networking Protocol

Player lifecycle, tick synchronization, and error recovery.

**Fixes Issue:** #8 (Pause/Resume atomicity)

---

## Table of Contents

1. [Player Join Flow](#player-join-flow)
2. [Player Leave Flow](#player-leave-flow)
3. [State Synchronization](#state-synchronization)
4. [Error Recovery](#error-recovery)
5. [Desync Detection](#desync-detection)

---

## Player Join Flow

**✅ FIX ISSUE #8:** Atomic state updates using finally block.

**Note:** Players can join at any time - mid-game join is fully supported. The joining player receives the current game state at the moment they join.

### Server-Side Join Handling

```typescript
class PlayerManager {
  // Server/Host: new player joins
  async handlePlayerJoin(playerId: string): Promise<void> {
    const currentTick = this.runtime.getTick();
    const currentRevision = this.revision;

    // ✅ FIX: Use finally for atomic pause/resume
    this.runtime.pause();

    try {
      // 1. Add player to state with default values
      const defaultPlayerState = {
        x: 100, y: 100, score: 0
      };

      this.state.players[playerId] = defaultPlayerState;

      // 2. Call user hook to customize (if defined)
      if (this.gameLogic.onPlayerJoin) {
        this.gameLogic.onPlayerJoin({ game: this.state, playerId });
      }

      const joinedPlayerState = this.state.players[playerId];

      this.revision++;

      // 3. Send full snapshot to joining player
      this.transport.send({
        type: 'join',
        playerId,
        tick: currentTick,
        snapshot: {
          kind: 'snapshot',
          tick: currentTick,
          revision: this.revision,
          state: deepClone(this.state)
        }
      }, playerId);

      // 4. Broadcast join to existing players (just diff)
      this.transport.send({
        kind: 'diff',
        tick: currentTick,
        revision: this.revision,
        baseRevision: currentRevision,
        patches: [
          { op: 'set', path: ['players', playerId], value: joinedPlayerState }
        ]
      });

    } finally {
      // ✅ ALWAYS resumes, even if error
      this.runtime.resume();
    }
  }
}
```

### Client-Side Join Flow

```typescript
class ClientRuntime {
  // Client: process initial snapshot from server
  async handleJoinSnapshot(joinMessage: JoinMessage): Promise<void> {
    const { snapshot, playerId, tick } = joinMessage;

    // 1. Initialize local state from server snapshot
    this.state = deepClone(snapshot.state);
    this.currentTick = snapshot.tick;
    this.revision = snapshot.revision;
    this.myPlayerId = playerId;

    // 2. Save initial snapshot for rollback
    this.snapshots.push({
      tick: snapshot.tick,
      revision: snapshot.revision,
      state: deepClone(snapshot.state)
    });

    // 3. Start client tick loop
    this.startClientTick(this.tickRate);

    // 4. Notify application that runtime is ready
    this.onReady?.();

    console.log(`Joined game at tick ${tick}, my ID: ${playerId}`);
  }

  // Client receives state updates after joining
  onStateUpdate(message: WireDiff | WireSnapshot): void {
    if (message.kind === 'snapshot') {
      // Full snapshot (resync)
      this.handleSnapshot(message);
    } else {
      // Incremental diff (normal update)
      this.handleDiff(message);
    }
  }
}
```

**Flow diagram:**
```
Client connects to transport
       ↓
Transport onMessage receives JoinMessage
       ↓
handleJoinSnapshot() initializes state
       ↓
Client tick loop starts
       ↓
Client ready, starts sending actions
```

---

## Player Leave Flow

```typescript
handlePlayerLeave(playerId: string, reason: string): void {
  const currentTick = this.runtime.getTick();

  this.runtime.pause();

  try {
    // Call user cleanup hook (if defined)
    if (this.gameLogic.onPlayerLeave) {
      const random = createActionRandom(currentTick, 0);
      const time = currentTick * this.tickDuration;
      this.gameLogic.onPlayerLeave({ game: this.state, playerId, reason, random, time });
    } else {
      // Default: remove player
      delete this.state.players[playerId];
    }

    this.revision++;

    // Broadcast leave
    this.transport.send({
      type: 'leave',
      playerId,
      tick: currentTick,
      reason
    });

  } finally {
    this.runtime.resume();
  }
}
```

---

## State Synchronization

### Revision Mismatch Recovery

```typescript
class StateSynchronizer {
  private revision: number = 0;
  private pendingDiffs: WireDiff[] = [];
  private diffHistory: WireDiff[] = [];
  private readonly maxDiffHistory: number;

  constructor(
    private readonly transport: Transport,
    private hostSessionId: string,
    maxDiffGap: number = 32
  ) {
    this.maxDiffHistory = maxDiffGap * 2;
  }

  updateHostSessionId(sessionId: string): void {
    this.hostSessionId = sessionId;
  }

  onDiff(diff: WireDiff): void {
    // Check revision continuity
    if (diff.baseRevision !== this.revision) {
      console.warn(
        `Revision mismatch: expected ${this.revision}, got ${diff.baseRevision}`
      );

      // Request full snapshot
      this.requestResync('revision_mismatch');

      // Buffer this diff for later
      this.pendingDiffs.push(diff);
      return;
    }

    // Apply patches
    try {
      applyPatches(this.state, diff.patches);
      this.revision = diff.revision;
      this.recordDiff(diff);
    } catch (error) {
      console.error('Failed to apply patches:', error);
      this.requestResync('patch_application_error');
    }
  }

  onSnapshot(snapshot: WireSnapshot): void {
    // Replace state entirely
    this.state = deepClone(snapshot.state);
    this.revision = snapshot.revision;

    // Try to apply buffered diffs in order
    const sorted = [...this.pendingDiffs].sort(
      (a, b) => a.baseRevision - b.baseRevision || a.revision - b.revision
    );

    for (const diff of sorted) {
      if (diff.baseRevision !== this.revision) {
        continue;  // Skip mismatched diffs
      }

      try {
        applyPatches(this.state, diff.patches);
        this.revision = diff.revision;
      } catch (error) {
        console.error('Failed to apply buffered diff:', error);
        break;
      }
    }

    this.pendingDiffs = [];
  }

  private requestResync(reason: string): void {
    this.transport.send({
      type: 'resync_request',
      requesterId: this.transport.getPlayerId(),
      lastKnownTick: this.currentTick,
      reason
    }, this.hostSessionId);
  }

  handleResyncRequest(message: ResyncRequestMessage): void {
    const snapshot: WireSnapshot = {
      kind: 'snapshot',
      tick: this.currentTick,
      revision: this.revision,
      state: deepClone(this.state)
    };

    this.transport.send({
      type: 'resync_response',
      snapshot,
      diffsSince: this.getDiffsSince(snapshot.revision)
    }, message.requesterId);
  }

  private getDiffsSince(revision: number): WireDiff[] {
    return this.diffHistory.filter(diff => diff.baseRevision >= revision);
  }

  recordDiff(diff: WireDiff): void {
    this.diffHistory.push(diff);
    if (this.diffHistory.length > this.maxDiffHistory) {
      this.diffHistory.shift();
    }
  }
}
```

**Host usage:** Call `stateSynchronizer.recordDiff(diff)` immediately after broadcasting a `WireDiff`. This keeps the history available for future `resync_response` messages while clients continue populating it via `onDiff`.

---

## Error Recovery

### 1. Action Rejection

```typescript
class ActionExecutor {
  executeAction(action: QueuedAction): ActionResult {
    const result = this.validateAndExecute(action);

    if (!result.success) {
      if (this.isHost) {
        // Server: send rejection
        this.transport.send({
          type: 'action_rejected',
          playerId: action.playerId,
          actionName: action.name,
          reason: result.reason,
          tick: this.currentTick
        }, action.playerId);
      } else {
        // Client: prediction failed, rollback
        if (action.predicted) {
          this.rollbackEngine.undoAction(action);
          if (this.devMode) {
            console.warn(`Prediction failed: ${result.reason}`);
          }
        }
      }
    }

    return result;
  }
}
```

### 2. Network Timeout / Host Migration

```typescript
class ConnectionManager {
  private heartbeatInterval: number = 500;
  private timeoutThreshold: number = 1500;  // 3 missed heartbeats
  private lastHeartbeat: number = Date.now();

  startHeartbeat(): void {
    setInterval(() => {
      if (this.isHost) {
        this.warmStandby.broadcastHeartbeat();
      }
    }, this.heartbeatInterval);
  }

  onHeartbeat(message: HeartbeatMessage, senderId: string): void {
    if (this.isHost) return;

    this.lastHeartbeat = Date.now();
    this.warmStandby.onHeartbeat(message);
  }

  checkConnection(): void {
    setInterval(() => {
      if (this.isHost) return;

      const timeSinceLast = Date.now() - this.lastHeartbeat;

      if (timeSinceLast > this.timeoutThreshold) {
        this.handleHostDisconnect();
      }
    }, 100);
  }

  handleHostDisconnect(): void {
    console.warn('Host disconnected, initiating election...');

    // Deterministic election (lexical sessionId)
    // All peers independently reach same conclusion
    const peers = this.transport.getPeerIds();
    const candidates = [...peers, this.mySessionId];

    // Sort by sessionId (deterministic, no RTT measurement needed)
    candidates.sort((a, b) => a.localeCompare(b));

    const newHost = candidates[0];

    if (newHost === this.mySessionId) {
      if (this.warmStandby.isReady()) {
        this.promoteToHost();
      } else {
        console.warn('Warm standby not ready, requesting fresh snapshot before promoting');
        this.requestSnapshotFromPeers();
      }
    }
  }

  promoteToHost(): void {
    console.log('I am the new host!');
    this.isHost = true;

    // Load warm standby state
    const { snapshot, actionQueue } = this.warmStandby.loadWarmStandby();

    // Replay buffered actions
    this.state = deepClone(snapshot.state);
    this.revision = snapshot.revision;

    for (const action of actionQueue) {
      this.executeAction(action);
    }

    // Broadcast authority
    this.transport.send({
      type: 'host_migration',
      newHost: this.mySessionId,
      snapshot: {
        kind: 'snapshot',
        tick: this.currentTick,
        revision: this.revision,
        state: this.state
      },
      actionQueue: this.actionQueue
    });

    // Start server tick
    this.startServerTick();
  }

  private requestSnapshotFromPeers(): void {
    this.transport.send({
      type: 'resync_request',
      requesterId: this.mySessionId,
      lastKnownTick: this.currentTick,
      reason: 'warm_standby_not_ready'
    });
  }
}
```

---

## Desync Detection

Periodic checksum verification.

```typescript
class DesyncDetector {
  private checksumInterval: number = 60;  // Every 60 ticks

  // Server: broadcast checksum periodically
  broadcastChecksum(): void {
    if (this.currentTick % this.checksumInterval === 0) {
      const checksum = this.computeChecksum(this.state);

      this.transport.send({
        type: 'checksum',
        tick: this.currentTick,
        checksum
      });
    }
  }

  // Client: verify checksum
  verifyChecksum(message: ChecksumMessage): void {
    const myChecksum = this.computeChecksum(this.state);

    if (myChecksum !== message.checksum) {
      console.error(`DESYNC at tick ${message.tick}!`);
      console.error(`Server: ${message.checksum}, Client: ${myChecksum}`);

      // Request resync
      this.transport.send({
        type: 'resync_request',
        requesterId: this.transport.getPlayerId(),
        lastKnownTick: this.currentTick,
        reason: 'desync'
      }, this.hostSessionId);

      // Notify analytics
      this.onDesync?.({
        tick: message.tick,
        serverChecksum: message.checksum,
        clientChecksum: myChecksum
      });
    }
  }

  // Compute deterministic checksum
  computeChecksum(state: any): string {
    const stableJSON = deterministicStringify(state);
    return fnv1a(stableJSON);
  }
}

// FNV-1a hash (fast, deterministic)
function fnv1a(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
```

---

## Message Flow Diagrams

### Normal Operation

```
Client → Server: { type: 'action', actionName: 'move', payload: { dx: 5 }, tick: 123, actionIndex: 0 }
Server → All:    { kind: 'diff', patches: [{ op: 'set', path: ['players','p1','x'], value: 105 }] }
```

### Join Flow

```
Client → Server: Connect
Server → Client: { type: 'join', snapshot: { state: {...} } }
Server → Others: { kind: 'diff', patches: [{ op: 'set', path: ['players','p2'], value: {...} }] }
```

### Resync Flow

```
Client → Server: { type: 'resync_request', reason: 'revision_mismatch' }
Server → Client: { type: 'resync_response', snapshot: {...}, diffsSince: [...] }
```

### Host Migration Flow (P2P)

```
Old Host: [crashes]
Standby:  Election → I am new host
New Host → All: { type: 'host_migration', snapshot: {...}, actionQueue: [...] }
```

---

## Next Steps

- **Need dev tools?** → See [08-developer-tools.md](./08-developer-tools.md)
- **Want examples?** → See [09-examples.md](./09-examples.md)
