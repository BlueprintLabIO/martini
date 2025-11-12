# Migration Guide: `gameAPI.multiplayer` → Martini v2

The old sandbox exposed a global `gameAPI.multiplayer` object with methods like `trackPlayer`, `broadcast`, and `onPlayerJoined`. Martini v2 replaces that ad-hoc API with a formal combination of `@martini/core` and the Phaser adapter. This guide shows how to move existing games over with minimal churn.

---

## 1. Replace Implicit Globals with `defineGame`

**Before**

```js
window.gameAPI.multiplayer.trackPlayer(playerSprite, { role: 'fireboy' });
```

**After**

```ts
// logic.ts
export const logic = defineGame({
  state: {
    players: { type: 'map', schema: { x: 'number', y: 'number', role: 'string' } }
  },
  actions: {
    syncPosition: {
      input: { x: 'number', y: 'number' },
      apply(state, playerId, input) {
        state.players[playerId] = { ...state.players[playerId], ...input };
      }
    }
  }
});
```

Actions now live alongside state definition; no more implicit globals.

---

## 2. Swap the Sandbox Runtime for `PhaserAdapter.start`

**Before**

```js
// sandbox iframe automatically called your preload/create/update
```

**After**

```ts
PhaserAdapter.start({
  game: logic,
  transport: new P2PTransport(roomId),
  scenes: [GameScene]
});
```

You control when Phaser boots, making local testing and packaging easier.

---

## 3. Update Scene Code

- Replace `gameAPI.multiplayer.trackPlayer` with `this.adapter.trackSprite`.
- Replace `gameAPI.multiplayer.broadcast` with `this.adapter.broadcast`.
- Replace `gameAPI.multiplayer.on('event', cb)` with `this.adapter.on`.
- Replace `gameAPI.multiplayer.isHost()` with `this.adapter.isHost()`.

Example:

```ts
create() {
  this.player = this.physics.add.sprite(100, 100, 'player');
  this.adapter.trackSprite(this.player, `player-${this.adapter.myId}`);

  if (this.adapter.isHost()) {
    this.spawnCoins();
  }

  this.adapter.on('coin-collected', (_peerId, data) => {
    this.updateUI(data);
  });
}
```

---

## 4. Remove Legacy Messages

Previously you may have listened for postMessage events like `MULTIPLAYER_STATE`. v2 packages don’t rely on that sandbox anymore, so delete any `window.addEventListener('message', …)` scaffolding you carried over from the iframe environment.

---

## 5. Update Tooling and Imports

| Old | New |
|-----|-----|
| `gameAPI.multiplayer` global | `this.adapter` inside Phaser scenes |
| Implicit transport (sandbox) | Explicit `new P2PTransport()` / `new WebSocketTransport()` |
| `game.actions.*` (runtime instance) | `logic.getAPI()` if you need direct access outside Phaser |
| Sandbox log messages | Use browser console or your own UI |

---

## FAQ

**Q: Do I still need sandbox-runtime.html?**  
A: No. v2 is designed to run directly in your app (Vite, Next.js, etc.). You can delete the old sandbox if you’re not using it for other purposes.

**Q: What about deterministic mode?**  
A: Out of scope for v2. The focus is a solid host-authoritative flow. Future versions may add optional deterministic helpers again.

**Q: My classroom relied on `gameAPI.multiplayer.players`. Where do I get that list now?**  
A: Use `logic.getAPI().playerIds` or, inside Phaser scenes, `this.adapter.clients`.

---

## Need Help?

- Check [quick-start.md](./quick-start.md) for a minimal project.
- Join the Discord with a repro repo if you get stuck.

Happy migrating!

---
