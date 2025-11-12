# Testing Strategy

**Status:** Implementation Guide
**Last Updated:** 2025-01-12

## Challenge

Testing a multiplayer SDK is complex because you need to validate:
- Deterministic state synchronization across multiple clients
- Network message ordering and timing
- Client prediction and rollback correctness
- Desync detection and recovery
- Host migration and failover

**You can't just run unit tests.** You need infrastructure to simulate real multiplayer scenarios.

---

## Recommended Testing Tools

### 1. **Deterministic Simulator** (MUST HAVE)

**What it is:** Headless runtime that replays actions without networking.

**Library:** Build it yourself (it's in the spec)

```typescript
// From 08-developer-tools.md
import { createSimulator } from '@martini/multiplayer/testing';

const sim = createSimulator(gameLogic, {
  playerIds: ['p1', 'p2'],
  seed: 'unit-test',
  tickRate: 30
});

sim.dispatch('move', { dx: 1 }, 'p1');
sim.tick();
expect(sim.getState().players.p1.x).toBe(101);
```

**Why build vs use library:**
- ✅ Tightly integrated with your runtime
- ✅ Full control over tick execution
- ✅ Snapshot/restore for time-travel debugging
- ✅ Only ~500 LOC (see spec implementation guide)

---

### 2. **Network Simulation** (HIGHLY RECOMMENDED)

**What it needs:** Simulate latency, packet loss, jitter, reordering.

**Recommended Library:** **Toxiproxy** (by Shopify)

```bash
# Install Toxiproxy
docker run -d -p 8474:8474 -p 26379:26379 shopify/toxiproxy

# Add latency
curl -X POST http://localhost:8474/proxies/game-server/toxics \
  -d '{"type": "latency", "attributes": {"latency": 100, "jitter": 50}}'

# Add packet loss
curl -X POST http://localhost:8474/proxies/game-server/toxics \
  -d '{"type": "bandwidth", "attributes": {"rate": 100}}'
```

**Why Toxiproxy:**
- ✅ Mature, battle-tested (used by GitHub, Heroku)
- ✅ HTTP API for test automation
- ✅ Supports WebSocket proxying
- ✅ Docker-based (easy CI/CD integration)

**Alternative:** **tc (Linux Traffic Control)** - OS-level but requires root

```bash
# Add 100ms latency, 10% packet loss
sudo tc qdisc add dev eth0 root netem delay 100ms loss 10%
```

---

### 3. **Chaos Engineering** (RECOMMENDED)

**What it is:** Randomly kill processes, inject failures.

**Recommended Library:** **Chaos Mesh** (if using Kubernetes)

```yaml
# chaos-experiment.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-game-server
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - game-server
  scheduler:
    cron: "@every 5m"
```

**For local dev:** **Simpler alternative with Node.js**

```javascript
// chaos-injector.js
import { createRuntime } from '@martini/multiplayer';

const originalSend = transport.send;
transport.send = (msg, target) => {
  // 10% packet loss
  if (Math.random() < 0.1) {
    console.log('[CHAOS] Dropped message:', msg.type);
    return;
  }

  // Random delay 0-200ms
  const delay = Math.random() * 200;
  setTimeout(() => originalSend.call(transport, msg, target), delay);
};
```

---

### 4. **Property-Based Testing** (RECOMMENDED)

**What it is:** Generate random inputs, verify invariants hold.

**Recommended Library:** **fast-check** (JavaScript)

```bash
npm install --save-dev fast-check
```

```javascript
import fc from 'fast-check';

describe('State Synchronization Invariants', () => {
  it('state is identical after same action sequence', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          action: fc.constantFrom('move', 'jump', 'shoot'),
          dx: fc.integer(-10, 10),
          dy: fc.integer(-10, 10),
          playerId: fc.constantFrom('p1', 'p2')
        }), { minLength: 1, maxLength: 1000 }),
        (actions) => {
          const sim1 = createSimulator(game, { seed: 42 });
          const sim2 = createSimulator(game, { seed: 42 });

          for (const { action, dx, dy, playerId } of actions) {
            sim1.dispatch(action, { dx, dy }, playerId);
            sim2.dispatch(action, { dx, dy }, playerId);
            sim1.tick();
            sim2.tick();
          }

          // Invariant: Same inputs = same output
          expect(sim1.getState()).toEqual(sim2.getState());
        }
      )
    );
  });
});
```

**Why fast-check:**
- ✅ Finds edge cases you wouldn't think of
- ✅ Shrinks failing inputs (shows minimal reproduction)
- ✅ Native TypeScript support

---

### 5. **Snapshot Testing** (RECOMMENDED)

**What it is:** Capture state at specific ticks, compare across runs.

**Recommended Library:** Jest (built-in)

```javascript
import { createSimulator } from '@martini/multiplayer/testing';

test('1000-tick determinism', () => {
  const sim = createSimulator(game, { seed: 'determinism-test' });

  for (let i = 0; i < 1000; i++) {
    sim.dispatch('move', { dx: 1 }, 'p1');
    sim.tick();
  }

  // Snapshot entire state
  expect(sim.getState()).toMatchSnapshot();
});
```

**Benefits:**
- Catch unintended state changes
- Verify determinism across versions
- Easy regression testing

---

### 6. **Multi-Client Integration Tests** (MUST HAVE)

**What it is:** Spawn multiple real clients, verify synchronization.

**Recommended Library:** **Playwright** (browser automation)

```bash
npm install --save-dev @playwright/test
```

```javascript
import { test, expect } from '@playwright/test';

test('2 clients stay synchronized', async ({ browser }) => {
  // Spawn 2 browser contexts (isolated clients)
  const client1 = await browser.newContext();
  const client2 = await browser.newContext();

  const page1 = await client1.newPage();
  const page2 = await client2.newPage();

  // Both join same room
  await page1.goto('http://localhost:3000/?room=test-room');
  await page2.goto('http://localhost:3000/?room=test-room');

  // Client 1 moves
  await page1.keyboard.press('ArrowRight');

  // Wait for sync
  await page1.waitForTimeout(100);

  // Client 2 should see movement
  const player1PosOnClient2 = await page2.evaluate(() => {
    return window.game.getState().players.p1.x;
  });

  expect(player1PosOnClient2).toBeGreaterThan(100);
});
```

**Why Playwright:**
- ✅ Headless browser testing
- ✅ Multi-tab/multi-context support
- ✅ Network interception (can inject faults)
- ✅ CI/CD friendly

---

## Testing Pyramid for Martini SDK

```
        E2E (5% of tests)
       /    Multi-client integration
      /      via Playwright + Toxiproxy
     /
    /      Integration (20% of tests)
   /       Simulator with network faults
  /        Property-based testing
 /
/         Unit (75% of tests)
         Diff/patch, RNG, schema validation
        Pure algorithmic testing
```

---

## Recommended Test Suite Structure

```
tests/
├── unit/
│   ├── diff.test.ts              # Deep diff algorithm
│   ├── patch.test.ts             # Patch application
│   ├── seeded-random.test.ts     # Determinism
│   └── schema-proxy.test.ts      # Validation
│
├── integration/
│   ├── determinism.test.ts       # Simulator: 1000 ticks, same output
│   ├── predict-rollback.test.ts  # Client prediction correctness
│   ├── desync-recovery.test.ts   # Checksum + resync
│   └── host-migration.test.ts    # Failover
│
├── e2e/
│   ├── two-clients.spec.ts       # Playwright: basic sync
│   ├── latency-stress.spec.ts    # Toxiproxy: 500ms latency
│   ├── packet-loss.spec.ts       # Toxiproxy: 20% loss
│   └── host-crash.spec.ts        # Kill server mid-game
│
└── property/
    ├── invariants.test.ts         # fast-check: state sync
    └── convergence.test.ts        # fast-check: eventual consistency
```

---

## CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:unit

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    services:
      toxiproxy:
        image: shopify/toxiproxy
        ports:
          - 8474:8474
    steps:
      - uses: actions/checkout@v2
      - uses: microsoft/playwright-github-action@v1
      - run: npm install
      - run: npm run test:e2e

  property:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # Property tests can be slow
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:property
```

---

## Recommended Libraries Summary

| Need | Library | Why |
|------|---------|-----|
| **Simulator** | Build it yourself | Tightly coupled to runtime |
| **Network chaos** | Toxiproxy | Industry standard |
| **Property testing** | fast-check | Best for JS/TS |
| **Multi-client** | Playwright | Browser automation leader |
| **Snapshot testing** | Jest | Built-in, widely used |
| **Mocking** | Vitest/Jest | Standard test runners |

---

## Open Source Alternatives to Study

### 1. **Colyseus** (Multiplayer Framework)
- Testing: https://github.com/colyseus/colyseus/tree/master/test
- Uses: Mocha + custom network simulator
- Learn from: How they test room lifecycle

### 2. **Netcode for GameObjects** (Unity)
- Testing: https://github.com/Unity-Technologies/com.unity.netcode.gameobjects
- Uses: Unity Test Framework + virtual clients
- Learn from: Determinism validation approach

### 3. **Photon Engine** (Commercial, but docs are public)
- Testing: https://doc.photonengine.com/en-us/pun/current/gameplay/testing
- Uses: Bots + chaos monkeys
- Learn from: Stress testing methodology

---

## Final Recommendation

**Minimal Viable Test Suite (MVP):**
1. ✅ Build deterministic simulator (~2 days)
2. ✅ Add unit tests for core algorithms (~3 days)
3. ✅ Add Playwright multi-client tests (~2 days)
4. ⏭️ Add Toxiproxy network chaos (v1.1)
5. ⏭️ Add fast-check property tests (v1.2)

**Total: ~1 week of dev time for solid test foundation**

---

## Questions?

- **"Is this overkill?"** No. Multiplayer desyncs are incredibly hard to debug in production.
- **"Can I skip E2E tests?"** Not recommended. Unit tests won't catch protocol bugs.
- **"What about performance testing?"** Use `clinic.js` for Node.js profiling.
