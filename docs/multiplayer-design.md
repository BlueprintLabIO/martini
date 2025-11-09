# Multiplayer API Design: AI-First Architecture

**Status:** Design Proposal
**Target:** AI code generation (primary), human developers (secondary)
**Goal:** 80% power with 20% complexity

---

## Executive Summary

Current multiplayer system is **90% complete** but has critical gaps for AI code generation:
- ❌ API mismatch between docs and implementation
- ❌ No physics sync pattern (essential for platformers)
- ❌ No machine-readable schema for AI

**Solution:** 3-tier API inspired by Photon, Mirror, and Colyseus:
- 🟢 **Tier 1:** Auto-sync (`trackPlayer()`) - AI uses 90% of the time
- 🟡 **Tier 2:** Events (`broadcast()`, `on()`) - AI uses 10% of the time
- 🔴 **Tier 3:** Raw control (`sendRaw()`) - Humans use for edge cases

---

## Design Principles

### 1. AI-First Philosophy

**Traditional API (imperative):**
```javascript
// AI struggles with this - too many decisions
update() {
  const state = {
    x: this.player.x,
    y: this.player.y,
    vx: this.player.body.velocity.x,
    vy: this.player.body.velocity.y,
    anim: this.player.anims.currentAnim.key
  };

  if (gameAPI.getFrame() % 2 === 0) {
    gameAPI.multiplayer.send(state);
  }
}

window.onMultiplayerData = (peerId, data) => {
  if (!this.remotePlayers[peerId]) {
    this.remotePlayers[peerId] = scene.add.sprite(data.x, data.y);
  }
  this.remotePlayers[peerId].x += (data.x - this.remotePlayers[peerId].x) * 0.3;
  // ... 20 more lines
};
```

**New API (declarative):**
```javascript
// AI generates this confidently
create(scene) {
  this.myPlayer = scene.physics.add.sprite(100, 100, 'player');

  // ONE LINE - AI knows exactly what to do
  gameAPI.multiplayer.trackPlayer(this.myPlayer);
}

update(scene) {
  // Standard Phaser code - AI already knows this
  const cursors = scene.input.keyboard.createCursorKeys();
  if (cursors.left.isDown) this.myPlayer.setVelocityX(-160);
  // No manual sync needed!
}
```

**Why this works for AI:**
- ✅ Single clear action ("track this sprite")
- ✅ Sensible defaults (sync position + velocity)
- ✅ No boilerplate (no manual update loop, no remote player management)
- ✅ Follows existing Phaser patterns

---

## Architecture Overview

### Network Model: Hybrid Client-Side Prediction

```
┌─────────────────────────────────────────────────────────────┐
│                        HOST (Player 1)                      │
│  ┌────────────┐          ┌──────────────┐                  │
│  │ My Player  │          │ Remote Players│                  │
│  │ (instant)  │          │ (interpolated)│                  │
│  └────────────┘          └──────────────┘                  │
│         │                        ▲                          │
│         │ Position + Velocity    │                          │
│         ├───────────────────────►│                          │
│         │ 30 times/sec           │                          │
└─────────┼────────────────────────┼──────────────────────────┘
          │                        │
          ▼                        │
┌─────────┼────────────────────────┼──────────────────────────┐
│         │                        │      CLIENT (Player 2)   │
│  ┌──────▼──────┐          ┌─────┴────────┐                 │
│  │Remote Player│          │   My Player  │                 │
│  │(interpolated)│         │   (instant)  │                 │
│  └─────────────┘          └──────────────┘                 │
│                                   │                         │
│                   Position + Velocity                       │
│                                   ├────────────────────────►│
│                                   │ 30 times/sec            │
└───────────────────────────────────┴─────────────────────────┘
```

**Key Insight:** Local player = instant, remote players = interpolated

This gives:
- ✅ Responsive controls (no input lag)
- ✅ Smooth remote movement (no jitter)
- ✅ Simple to implement (no rollback/reconciliation)

---

## API Design: 3 Tiers

### Tier 1: Auto-Sync (High-Level) 🟢

**Target:** 90% of AI-generated code

#### `trackPlayer(sprite, options)`

Auto-sync a player sprite across all clients.

```typescript
gameAPI.multiplayer.trackPlayer(
  sprite: Phaser.GameObjects.Sprite,
  options?: {
    sync?: string[];          // Default: ['x', 'y', 'velocityX', 'velocityY', 'frame']
    updateRate?: number;      // Default: 30 (updates/sec)
    interpolate?: boolean;    // Default: true (smooth remote players)
    color?: number;           // Tint for remote players (default: auto-assign)
    role?: string;            // Metadata (e.g., 'fireboy', 'watergirl')
  }
): TrackedPlayer;
```

**What it does:**
1. **Local player:** Reads sprite properties → Broadcasts to all peers
2. **Remote players:** Auto-creates sprites → Interpolates positions
3. **Cleanup:** Auto-destroys remote sprites when player disconnects

**AI Code Template:**
```javascript
create(scene) {
  this.myPlayer = scene.physics.add.sprite(100, 100, 'player');
  gameAPI.multiplayer.trackPlayer(this.myPlayer, {
    role: gameAPI.multiplayer.isHost() ? 'fireboy' : 'watergirl'
  });
}
```

#### `trackObject(object, id, options)`

Auto-sync shared game objects (enemies, collectibles).

```typescript
gameAPI.multiplayer.trackObject(
  object: any,
  id: string,
  options?: {
    authoritative?: boolean;  // Default: true (only host controls)
    sync?: string[];          // Default: ['x', 'y', 'active', 'visible']
    onCreate?: (object, peerId) => void;
    onDestroy?: (object, peerId) => void;
  }
): TrackedObject;
```

**AI Code Template:**
```javascript
create(scene) {
  if (gameAPI.multiplayer.isHost()) {
    this.enemy = scene.add.sprite(400, 300, 'enemy');
    gameAPI.multiplayer.trackObject(this.enemy, 'enemy-1', {
      authoritative: true  // Only host updates enemy AI
    });
  }
}
```

---

### Tier 2: Events (Medium-Level) 🟡

**Target:** 10% of AI-generated code (game logic, state changes)

#### `broadcast(eventName, data)`

Send game event to all players.

```typescript
gameAPI.multiplayer.broadcast(
  eventName: string,
  data?: any  // Keep small (<500 bytes)
): void;
```

**AI Code Template:**
```javascript
collectCoin(coinId) {
  this.score += 10;
  gameAPI.multiplayer.broadcast('coin-collected', {
    coinId,
    playerId: gameAPI.multiplayer.getMyId(),
    newScore: this.score
  });
}
```

#### `on(eventName, callback)`

Listen for game events from other players.

```typescript
gameAPI.multiplayer.on(
  eventName: string,
  callback: (peerId: string, data: any) => void
): void;
```

**AI Code Template:**
```javascript
create(scene) {
  gameAPI.multiplayer.on('coin-collected', (peerId, data) => {
    const coin = this.coins.find(c => c.id === data.coinId);
    if (coin) coin.destroy();

    this.updateScoreboard(data.playerId, data.newScore);
  });
}
```

---

### Tier 3: Raw Control (Low-Level) 🔴

**Target:** <1% (advanced users only)

```typescript
gameAPI.multiplayer.sendTo(peerId: string, data: any): void;
gameAPI.multiplayer.sendRaw(peerId: string, buffer: ArrayBuffer): void;
gameAPI.multiplayer.onRaw(callback: (peerId, buffer) => void): void;
```

---

## Game Pattern Templates

### Pattern 1: Fire Boy & Water Girl (Co-op Platformer)

**Genre:** 2-4 player co-op, physics-based, puzzle platformer

**Key Requirements:**
- Physics sync (position + velocity)
- Role-based mechanics (fire/water interactions)
- Host-authoritative level spawning
- 30Hz update rate

**AI-Generated Code:**

```javascript
window.scenes = {
  Game: {
    create(scene) {
      // Create local player
      this.myPlayer = scene.physics.add.sprite(100, 100, 'player');
      this.myPlayer.setCollideWorldBounds(true);
      this.myPlayer.setBounce(0.2);

      // 🎯 Enable multiplayer with role
      const trackedPlayer = gameAPI.multiplayer.trackPlayer(this.myPlayer, {
        role: gameAPI.multiplayer.isHost() ? 'fireboy' : 'watergirl',
        color: gameAPI.multiplayer.isHost() ? 0xff4400 : 0x0044ff
      });

      // Access remote players for collision detection
      this.remotePlayers = trackedPlayer.getRemotePlayers();

      // 🎯 Host spawns level (deterministic)
      if (gameAPI.multiplayer.isHost()) {
        this.createLevel(scene);
      }

      // Listen for door interactions
      gameAPI.multiplayer.on('door-activated', (peerId, data) => {
        this.doors[data.doorId].open();
      });
    },

    update(scene, time, delta) {
      // Standard Phaser physics - no changes needed!
      const cursors = scene.input.keyboard.createCursorKeys();

      if (cursors.left.isDown) {
        this.myPlayer.setVelocityX(-160);
      } else if (cursors.right.isDown) {
        this.myPlayer.setVelocityX(160);
      } else {
        this.myPlayer.setVelocityX(0);
      }

      if (cursors.up.isDown && this.myPlayer.body.touching.down) {
        this.myPlayer.setVelocityY(-330);
      }

      // Check door activation
      this.checkDoorOverlap();
    },

    createLevel(scene) {
      // Deterministic level generation
      gameAPI.random.setSeed(12345);

      const platforms = scene.physics.add.staticGroup();
      platforms.create(400, 568, 'ground').setScale(2).refreshBody();

      // Water pools (only watergirl can enter)
      this.waterPools = scene.physics.add.staticGroup();
      this.waterPools.create(200, 500, 'water');

      // Fire pools (only fireboy can enter)
      this.firePools = scene.physics.add.staticGroup();
      this.firePools.create(600, 500, 'fire');

      // Doors (need both players)
      this.doors = [
        scene.add.sprite(400, 100, 'door-closed')
      ];
    },

    checkDoorOverlap() {
      // Example: Both players must be near door
      const door = this.doors[0];
      const myDist = Phaser.Math.Distance.Between(
        this.myPlayer.x, this.myPlayer.y,
        door.x, door.y
      );

      if (myDist < 50 && this.remotePlayers.length > 0) {
        const remoteDist = Phaser.Math.Distance.Between(
          this.remotePlayers[0].x, this.remotePlayers[0].y,
          door.x, door.y
        );

        if (remoteDist < 50) {
          gameAPI.multiplayer.broadcast('door-activated', { doorId: 0 });
        }
      }
    }
  }
};

window.startScene = 'Game';
```

---

### Pattern 2: Pokemon Battle (Turn-Based RPG)

**Genre:** 4-8 player turn-based, strategy, arena battle

**Key Requirements:**
- Low update rate (10Hz for slow movement)
- Turn-based event system
- Action validation on host
- State machine integration

**AI-Generated Code:**

```javascript
window.scenes = {
  BattleArena: {
    create(scene) {
      // Create trainer sprite
      this.myTrainer = scene.add.sprite(100, 100, 'trainer');

      // 🎯 Track with low update rate (turn-based = slow)
      gameAPI.multiplayer.trackPlayer(this.myTrainer, {
        sync: ['x', 'y', 'frame'],  // No velocity needed
        updateRate: 10,              // Only 10 updates/sec
        role: 'trainer'
      });

      // Battle state
      this.myTurn = false;
      this.selectedMove = null;
      this.hp = 100;

      // 🎯 Host manages turn order
      if (gameAPI.multiplayer.isHost()) {
        this.turnOrder = gameAPI.multiplayer.getPlayers().map(p => p.id);
        this.currentTurnIndex = 0;
        this.startNextTurn();
      }

      // Listen for turn events
      gameAPI.multiplayer.on('turn-start', (peerId, data) => {
        this.myTurn = (data.playerId === gameAPI.multiplayer.getMyId());
        if (this.myTurn) {
          this.showMoveSelection();
        }
      });

      gameAPI.multiplayer.on('attack', (peerId, data) => {
        this.playAttackAnimation(data);
        if (data.targetId === gameAPI.multiplayer.getMyId()) {
          this.takeDamage(data.damage);
        }
      });
    },

    update(scene) {
      if (this.myTurn) {
        // Wait for player to select move
        const keys = scene.input.keyboard.createCursorKeys();

        if (Phaser.Input.Keyboard.JustDown(keys.space)) {
          this.executeMove();
        }
      }
    },

    startNextTurn() {
      // Host only
      const currentPlayerId = this.turnOrder[this.currentTurnIndex];

      gameAPI.multiplayer.broadcast('turn-start', {
        playerId: currentPlayerId,
        turnNumber: this.currentTurnIndex
      });

      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
    },

    executeMove() {
      gameAPI.multiplayer.broadcast('attack', {
        attackerId: gameAPI.multiplayer.getMyId(),
        targetId: this.selectedTargetId,
        moveType: 'fireball',
        damage: 20
      });

      this.myTurn = false;

      // Host advances turn
      if (gameAPI.multiplayer.isHost()) {
        setTimeout(() => this.startNextTurn(), 2000);
      }
    }
  }
};
```

---

## JSON Schema for AI Code Generation

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Martini Multiplayer API - AI Code Generation Schema",
  "version": "2.0.0",

  "gamePatterns": {
    "platformer-coop": {
      "name": "Co-op Platformer",
      "examples": ["Fire Boy & Water Girl", "Portal 2 Co-op", "Cuphead"],
      "players": "2-4",
      "requiredAPICalls": [
        {
          "function": "gameAPI.multiplayer.trackPlayer",
          "where": "scene.create()",
          "parameters": {
            "sprite": "this.myPlayer",
            "options": {
              "role": "Use for role-based mechanics (fireboy/watergirl)",
              "color": "Tint remote players for visual distinction"
            }
          }
        },
        {
          "function": "gameAPI.multiplayer.isHost",
          "where": "scene.create() - conditional level spawning",
          "why": "Prevent duplicate enemies/collectibles"
        },
        {
          "function": "gameAPI.random.setSeed",
          "where": "Before spawning random elements",
          "why": "Ensures all clients generate same level layout"
        }
      ],
      "codeTemplate": "templates/platformer-coop.js",
      "commonMistakes": [
        "Spawning enemies on all clients (use isHost check)",
        "Not syncing velocity (causes jitter)",
        "Using Math.random() instead of gameAPI.random (desyncs)"
      ]
    },

    "rpg-turnbased": {
      "name": "Turn-Based RPG",
      "examples": ["Pokemon Battle", "Final Fantasy", "Slay the Spire Co-op"],
      "players": "2-8",
      "requiredAPICalls": [
        {
          "function": "gameAPI.multiplayer.trackPlayer",
          "where": "scene.create()",
          "parameters": {
            "sprite": "this.myTrainer",
            "options": {
              "sync": "['x', 'y', 'frame'] - No velocity for slow movement",
              "updateRate": "10 - Low rate for turn-based"
            }
          }
        },
        {
          "function": "gameAPI.multiplayer.broadcast",
          "where": "On player action (attack, move, item use)",
          "events": ["turn-start", "attack", "move-used", "item-equipped"]
        },
        {
          "function": "gameAPI.multiplayer.on",
          "where": "scene.create() - Set up event listeners",
          "events": ["turn-start", "attack", "player-defeated"]
        }
      ],
      "codeTemplate": "templates/rpg-turnbased.js",
      "commonMistakes": [
        "High update rate (wastes bandwidth for slow movement)",
        "Not validating moves on host (cheating possible)",
        "Forgetting to end turn after action"
      ]
    }
  },

  "apiReference": {
    "trackPlayer": {
      "signature": "gameAPI.multiplayer.trackPlayer(sprite, options?)",
      "purpose": "Automatically synchronize player sprite across all clients",
      "aiGuidance": {
        "when": "Always call in scene.create() after creating player sprite",
        "platformers": "Use default options (syncs position + velocity)",
        "turnBased": "Set updateRate: 10 and sync: ['x', 'y', 'frame']",
        "roleBasedGames": "Set role option for gameplay mechanics"
      },
      "parameters": {
        "sprite": {
          "type": "Phaser.GameObjects.Sprite",
          "required": true
        },
        "options": {
          "sync": {
            "type": "string[]",
            "default": "['x', 'y', 'velocityX', 'velocityY', 'frame']",
            "aiHint": "For platformers: use default. For top-down: remove velocity."
          },
          "updateRate": {
            "type": "number",
            "default": 30,
            "aiHint": "30 for action games, 10 for turn-based, 60 for fighting games"
          },
          "role": {
            "type": "string",
            "aiHint": "Use for role-specific collision logic (fire/water, tank/healer)"
          }
        }
      },
      "returns": {
        "type": "TrackedPlayer",
        "methods": {
          "getRemotePlayers": "Get array of remote player sprites for collision",
          "destroy": "Stop tracking (auto-called on scene shutdown)"
        }
      },
      "examples": {
        "basic": "gameAPI.multiplayer.trackPlayer(this.myPlayer);",
        "withRole": "gameAPI.multiplayer.trackPlayer(this.myPlayer, { role: 'fireboy' });",
        "turnBased": "gameAPI.multiplayer.trackPlayer(this.myTrainer, { sync: ['x', 'y', 'frame'], updateRate: 10 });"
      }
    },

    "isHost": {
      "signature": "gameAPI.multiplayer.isHost()",
      "returns": "boolean",
      "purpose": "Check if current player is authoritative (host)",
      "aiGuidance": {
        "mustUse": "For spawning enemies, collectibles, and world objects",
        "pattern": "if (gameAPI.multiplayer.isHost()) { this.spawnEnemies(); }",
        "why": "Prevents duplicate spawning across all clients"
      },
      "examples": {
        "levelSpawning": "if (gameAPI.multiplayer.isHost()) { this.createLevel(scene); }",
        "enemyAI": "if (gameAPI.multiplayer.isHost()) { this.updateEnemyAI(); }",
        "turnOrder": "if (gameAPI.multiplayer.isHost()) { this.startNextTurn(); }"
      }
    },

    "broadcast": {
      "signature": "gameAPI.multiplayer.broadcast(eventName, data?)",
      "purpose": "Send game event to all connected players",
      "aiGuidance": {
        "when": "Game state changes that affect all players",
        "dataSize": "Keep data small (<500 bytes) - only send essential info",
        "naming": "Use kebab-case for event names: 'coin-collected', 'door-opened'"
      },
      "parameters": {
        "eventName": {
          "type": "string",
          "examples": ["coin-collected", "enemy-killed", "door-opened", "attack", "turn-end"]
        },
        "data": {
          "type": "any",
          "aiHint": "Only include minimal data: IDs, positions, values. Don't send entire objects."
        }
      },
      "examples": {
        "collectible": "gameAPI.multiplayer.broadcast('coin-collected', { coinId: 5, score: 100 });",
        "combat": "gameAPI.multiplayer.broadcast('attack', { targetId: 'player-2', damage: 20 });",
        "puzzle": "gameAPI.multiplayer.broadcast('lever-pulled', { leverId: 3, state: 'on' });"
      }
    }
  }
}
```

---

## Implementation Roadmap

### Phase 1: Core API (Week 1)
- [ ] Implement `trackPlayer()` with auto-sync
- [ ] Implement `trackObject()` for shared objects
- [ ] Add deterministic `gameAPI.random.setSeed()`
- [ ] Update sandbox runtime with new API

### Phase 2: AI Integration (Week 2)
- [ ] Create JSON schema (complete spec above)
- [ ] Write code templates for both patterns
- [ ] Add inline JSDoc with AI hints
- [ ] Update AI system prompt with examples

### Phase 3: Documentation (Week 3)
- [ ] Rewrite multiplayer docs (match implementation)
- [ ] Add interactive examples widget in editor
- [ ] Create video tutorials (Fire Boy, Pokemon)
- [ ] Add troubleshooting guide

### Phase 4: Polish (Week 4)
- [ ] Add debug overlay (latency, player list)
- [ ] Add network stats API
- [ ] Performance optimization
- [ ] User testing with AI generation

---

## Success Metrics

**AI Code Generation Quality:**
- ✅ 90% of generated multiplayer games compile on first try
- ✅ AI uses `trackPlayer()` in 95% of cases (not manual sync)
- ✅ AI correctly uses `isHost()` for spawning in 100% of cases

**User Experience:**
- ✅ 4-player Fire Boy & Water Girl works smoothly (<100ms lag)
- ✅ New users can make multiplayer game in <30 minutes
- ✅ Zero "how do I sync X?" questions in Discord

**Performance:**
- ✅ <50KB/s bandwidth per player (4 players = 200KB/s total)
- ✅ 30Hz update rate maintained on WiFi
- ✅ <100ms latency on same continent P2P

---

## Open Questions

1. **Collision Detection:** Should `trackPlayer()` auto-sync collision bodies, or require manual setup?
2. **Animations:** Auto-sync `anims.currentAnim.key`, or let users broadcast events?
3. **Persistence:** Should disconnected players leave ghosts, or disappear instantly?
4. **Mobile:** Touch controls - how to handle in multiplayer?

---

## Appendix: Industry Comparisons

| Feature | Photon (Unity) | Mirror (Unity) | Colyseus (JS) | **Martini (Our API)** |
|---------|----------------|----------------|---------------|------------------------|
| Sync Method | Transform sync | NetworkTransform | State tree | `trackPlayer()` |
| Events | RPC calls | Commands/ClientRpc | Schema listeners | `broadcast()` / `on()` |
| Authority | Host or Server | Server | Server | Host (P2P) |
| AI-Friendly | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Complexity | High | Medium | Medium | **Low** |
| Learning Curve | Weeks | Days | Days | **Hours** |

**Our advantage:** Declarative API + AI-first design = fastest time to multiplayer game.

---

**Next Steps:** Review this design, get approval, then start Phase 1 implementation.
