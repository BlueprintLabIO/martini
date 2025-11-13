/**
 * Martini SDK - Minimal AI Reference
 * Focuses ONLY on Martini-specific patterns (not generic Phaser/TS)
 */

export const MARTINI_SDK_DOCS = `
# Martini SDK - What Makes It Different

## Core Architecture
**Host-authoritative**: Host runs Phaser physics, clients ONLY render.
**Auto-sync**: PhaserAdapter syncs state automatically via trackSprite().
**Direct mutation**: state.x = 10 (NOT {...state, x: 10}).

## Critical Implementation Patterns

### 1. Host Creates Physics Objects, Client Creates Visual Objects

**WITH TEXTURES (when assets available):**
\`\`\`typescript
// Host
if (isHost) {
  const sprite = this.physics.add.sprite(100, 100, 'player');
  sprite.body.setCollideWorldBounds(true);
  this.physics.add.collider(sprite, platforms);
  adapter.trackSprite(sprite, 'player-' + playerId);
}

// Client (CRITICAL - check state._sprites)
if (!isHost) {
  adapter.onChange((state) => {
    if (!state._sprites) return; // REQUIRED CHECK!
    for (const [key, data] of Object.entries(state._sprites)) {
      if (!this.sprites[key]) {
        const sprite = this.add.sprite(data.x, data.y, 'player');
        this.sprites[key] = sprite;
        adapter.registerRemoteSprite(key, sprite); // NOT trackSprite!
      }
    }
  });
}
\`\`\`

**WITHOUT TEXTURES (shape-based games - COMMON PATTERN):**
\`\`\`typescript
// Host - Rectangle with physics
if (isHost) {
  const rect = this.add.rectangle(100, 100, 32, 32, 0xff0000);
  this.physics.add.existing(rect); // Add physics AFTER creating shape
  rect.body.setCollideWorldBounds(true);
  this.physics.add.collider(rect, platforms);
  adapter.trackSprite(rect, 'player-' + playerId);
}

// Client - Same rectangle, NO physics
if (!isHost) {
  adapter.onChange((state) => {
    if (!state._sprites) return;
    for (const [key, data] of Object.entries(state._sprites)) {
      if (!this.sprites[key]) {
        const rect = this.add.rectangle(data.x, data.y, 32, 32, 0xff0000);
        this.sprites[key] = rect;
        adapter.registerRemoteSprite(key, rect);
      }
    }
  });
}
\`\`\`

**PLATFORMS / STATIC OBJECTS:**
\`\`\`typescript
// CORRECT - Visible platform
const plat = this.add.rectangle(400, 500, 200, 20, 0x34495e);
this.physics.add.existing(plat, true); // true = static
platforms.add(plat);

// WRONG - Invisible (undefined texture)
platforms.create(400, 500, undefined); // DON'T DO THIS!
\`\`\`

### 2. Input Storage Pattern

**game.ts:**
\`\`\`typescript
setup: () => ({
  players: {},
  inputs: {} // Store inputs here
}),

actions: {
  move: {
    apply: (state, ctx, input) => {
      if (!state.inputs) state.inputs = {}; // Safety check
      state.inputs[ctx.targetId] = input;
    }
  }
}
\`\`\`

**scene.ts:**
\`\`\`typescript
update() {
  // Everyone submits input
  runtime.submitAction('move', { left: true, right: false });

  if (isHost) {
    // Host reads inputs and applies physics
    const state = runtime.getState();
    for (const [pid, input] of Object.entries(state.inputs || {})) {
      if (input.left) sprite.body.setVelocityX(-200);
    }
  }
}
\`\`\`

### 3. Client Interpolation (REQUIRED)

\`\`\`typescript
update() {
  if (!isHost) {
    this.adapter.updateInterpolation(); // MUST call every frame!
  }
}
\`\`\`

### 4. Player Join/Leave Hooks

\`\`\`typescript
defineGame({
  onPlayerJoin: (state, playerId) => {
    state.players[playerId] = { x: 100, y: 100 };
  },
  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
  }
});
\`\`\`

**In scene (check existing peers for LocalTransport):**
\`\`\`typescript
if (isHost) {
  // CRITICAL: Check existing peers (LocalTransport connects instantly!)
  transport.getPeerIds().forEach(peerId => createPeerSprite(peerId));

  // Also listen for future joins
  transport.onPeerJoin(peerId => createPeerSprite(peerId));
}
\`\`\`

### 5. Target Specific Players

\`\`\`typescript
// Third argument = targetId
runtime.submitAction('score', undefined, winnerId);
// context.targetId will be winnerId

actions: {
  score: {
    apply: (state, context) => {
      state.players[context.targetId].score += 1;
    }
  }
}
\`\`\`

## Essential Checklist

Host pattern:
- [ ] Create physics object: \`this.physics.add.sprite()\` OR \`this.add.rectangle() + this.physics.add.existing()\`
- [ ] \`adapter.trackSprite(object, key)\` once in create()
- [ ] Host reads \`state.inputs\` to apply physics

Client pattern:
- [ ] Check \`if (!state._sprites) return\`
- [ ] Create visual object (NO physics): \`this.add.sprite()\` OR \`this.add.rectangle()\`
- [ ] \`adapter.registerRemoteSprite(key, object)\`
- [ ] Call \`adapter.updateInterpolation()\` in update()

Both:
- [ ] Store inputs: \`state.inputs = {}\`
- [ ] Safety checks: \`if (!state.inputs) state.inputs = {}\`
- [ ] Use \`onPlayerJoin\`/\`onPlayerLeave\` hooks

Shape-based games (no textures):
- [ ] Use \`this.add.rectangle()\` or \`this.add.circle()\` NOT \`sprite()\`
- [ ] Add physics AFTER: \`this.physics.add.existing(shape)\`
- [ ] Platforms: create rectangle, then add to static group
`;
