# Language Bindings Guide

**Status:** Experimental (v2.0 consideration)
**Last Updated:** 2025-01-12

## Overview

The Martini SDK core is designed to be **language-agnostic** at the protocol level, but currently targets JavaScript/TypeScript. This document outlines how to create bindings for other languages.

---

## Protocol-Level Interoperability

### Wire Protocol (Language-Agnostic)

All messages are JSON, making them parseable by any language:

```json
// Action message
{
  "type": "action",
  "playerId": "p1",
  "actionName": "move",
  "payload": { "dx": 5, "dy": 0 },
  "tick": 100,
  "actionIndex": 0,
  "timestamp": 1234567890
}

// State diff message
{
  "kind": "diff",
  "tick": 101,
  "revision": 50,
  "baseRevision": 49,
  "patches": [
    { "op": "set", "path": ["players", "p1", "x"], "value": 105 }
  ]
}
```

**Implication:** Any language can implement a **client-only runtime** that:
- Sends action messages
- Receives diff/snapshot messages
- Applies patches to local state
- Renders the game

---

## Language Binding Strategies

### Strategy 1: Thin Client (Recommended for v1)

**Concept:** Server runs JavaScript, clients just send actions and render.

```python
# Python client (example)
class MartiniClient:
    def __init__(self, transport):
        self.transport = transport
        self.state = {}

    def dispatch(self, action_name, payload):
        msg = {
            "type": "action",
            "playerId": self.my_id,
            "actionName": action_name,
            "payload": payload,
            "tick": self.get_tick(),
            "actionIndex": self.get_action_index(),
            "timestamp": time.time() * 1000
        }
        self.transport.send(msg)

    def on_diff(self, diff):
        apply_patches(self.state, diff["patches"])
```

**Pros:**
- ✅ Simple to implement
- ✅ Server stays authoritative (JavaScript)
- ✅ Just need to implement diff/patch algorithm

**Cons:**
- ❌ No client-side prediction (higher perceived latency)
- ❌ Can't run systems/physics on client

**Use cases:**
- Unity/Godot clients connecting to JS server
- Mobile apps (Swift/Kotlin)
- Python bots/AI agents

---

### Strategy 2: Full Runtime Port

**Concept:** Re-implement entire runtime in target language.

**What needs porting:**

| Component | Complexity | Notes |
|-----------|------------|-------|
| **Wire protocol parsing** | Easy | JSON libraries exist everywhere |
| **Diff/Patch algorithm** | Medium | 300 LOC, pure algorithm |
| **Seeded RNG** | Easy | Mulberry32 is 10 LOC |
| **Schema validation** | Hard | Requires reflection/metaprogramming |
| **Action execution** | Medium | Need closure/lambda support |
| **Predict-rollback** | Hard | Deep cloning, snapshot management |
| **Transport adapters** | Easy | WebSocket clients exist |

**Example: Python Runtime**

```python
# martini_py/core.py
class GameRuntime:
    def __init__(self, game_config, transport, is_host=False):
        self.state = None
        self.tick = 0
        self.action_queue = []
        self.snapshots = []

    def execute_action(self, action):
        context = {
            "game": self.state,
            "playerId": action["playerId"],
            "input": action["payload"],
            "random": create_action_random(action["tick"], action["actionIndex"]),
            "time": action["tick"] * self.tick_duration
        }

        # Call user-defined action handler
        action_config = self.game_config["actions"][action["actionName"]]
        action_config["apply"](context)


def create_action_random(tick: int, action_index: int) -> SeededRandom:
    """Matches the SDK's createActionRandom(tick, actionIndex)."""
    seed = tick * 999_983 + action_index
    return SeededRandom(seed)

# 🔁 Determinism rule:
# Always seed RNG with BOTH tick and actionIndex. Using tick alone causes
# host migrations/warm standbys to diverge as soon as action order changes.
```

`get_action_index()` simply returns the next integer for the current tick (reset to `0` whenever the local tick increments). The same value must be persisted in replays so warm-standby peers can reseed RNG deterministically.

**Challenges:**
- Different languages have different OOP models
- Proxy-based validation doesn't map cleanly to Go/Rust/C#
- Performance characteristics vary (GC vs manual memory)

---

### Strategy 3: FFI Bridge (Hybrid Approach)

**Concept:** Run JavaScript runtime via Node.js, expose C API.

```c
// martini_ffi.h
typedef struct MartiniRuntime MartiniRuntime;

MartiniRuntime* martini_create_runtime(const char* game_config_json);
void martini_dispatch_action(MartiniRuntime* rt, const char* action_json);
const char* martini_get_state(MartiniRuntime* rt);
void martini_destroy_runtime(MartiniRuntime* rt);
```

```swift
// Swift client using FFI
import MartiniFFI

let runtime = martini_create_runtime(gameConfigJSON)
martini_dispatch_action(runtime, actionJSON)
let state = String(cString: martini_get_state(runtime))
```

**Pros:**
- ✅ Reuse battle-tested JavaScript runtime
- ✅ Full feature parity
- ✅ Easier to maintain (single codebase)

**Cons:**
- ❌ Requires Node.js on client
- ❌ FFI overhead
- ❌ Larger binary size

---

## Recommended Approach for v1

**JavaScript/TypeScript Only**

**Why:**
- Most web game engines use JS (Phaser, PixiJS, Three.js)
- Browser games dominate kid-friendly platforms
- Reduces maintenance burden

**For other platforms:**
- Unity/Godot → Use **thin client** strategy (send actions, render state)
- Mobile → WebView with JS runtime OR thin client
- Python bots → Thin client for AI/testing

---

## Roadmap for Multi-Language Support (v2+)

### Phase 1: Protocol Standardization
- [ ] Formalize wire protocol as spec (OpenAPI/Protobuf)
- [ ] Publish reference implementations for diff/patch
- [ ] Create test vectors for determinism validation

### Phase 2: Client Libraries
- [ ] Python client (thin mode)
- [ ] C# client (Unity)
- [ ] Swift client (iOS)

### Phase 3: Full Runtimes
- [ ] Go runtime (high-performance servers)
- [ ] Rust runtime (WASM targets)

---

## Testing Multi-Language Interop

**Protocol Conformance Tests:**

```javascript
// test-vectors.json
{
  "diff_application": [
    {
      "input": { "state": { "x": 1 }, "patches": [{ "op": "set", "path": ["x"], "value": 2 }] },
      "expected": { "x": 2 }
    }
  ],
  "seeded_random": [
    {
      "seed": 42,
      "calls": 100,
      "expected": [0.2123, 0.8765, ...]  // First 100 values
    }
  ]
}
```

All language implementations must pass these test vectors.

---

## Decision for v1

**Recommendation:** Ship JavaScript-only for v1.

**Rationale:**
1. 90% of target users (browser-based kids' games) use JavaScript
2. Multi-language support is a 6-12 month effort
3. Can add later without breaking changes (wire protocol is stable)
4. Thin clients are easy to implement if needed

**When to revisit:**
- User requests for Unity/Godot support
- Need server performance (Go/Rust)
- Mobile native apps become priority
