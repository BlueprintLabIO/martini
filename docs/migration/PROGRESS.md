# Migration Progress

**Last Updated**: 2025-01-13
**Current Phase**: Phase 1 Complete

---

## ✅ Phase 1: SDK Foundation (COMPLETE)

### Tasks Completed

#### Task 1.1: Copy Martini Browser Bundle ✅
- Added postbuild script to [@martini/phaser/package.json](../../packages/@martini/phaser/package.json:18)
- Browser bundle copied to [apps/web/static/martini-multiplayer.browser.js](../../apps/web/static/martini-multiplayer.browser.js)
- Bundle size: 562KB (acceptable for SDK)

#### Task 1.2: TypeScript Template Created ✅
- Created [martini-typescript-starter.ts](../../apps/web/src/lib/server/templates/martini-typescript-starter.ts)
- Template includes:
  - `/src/game.ts` - Pure game logic with `defineGame()`
  - `/src/scene.ts` - Phaser rendering with `PhaserAdapter`
  - `/src/main.ts` - Auto-wired Martini SDK integration
  - `/tsconfig.json` - TypeScript configuration

#### Task 1.3: Bundle API Updated ✅
- Updated [bundle/+server.ts](../../apps/web/src/routes/api/projects/[id]/bundle/+server.ts)
- Now supports both `.ts` and `.js` files
- Added virtual module resolver for:
  - `@martini/phaser` → `window.MartiniMultiplayer`
  - `@martini/core` → `window.MartiniMultiplayer`
  - `phaser` → `window.Phaser`
- esbuild handles TypeScript transpilation automatically
- Source maps enabled for better error messages

#### Task 1.4: Sandbox Runtime Rewritten ✅
- Completely rewrote [sandbox-runtime.html](../../apps/web/static/sandbox-runtime.html)
- Removed old `window.scenes` API
- Added Martini SDK integration:
  - Loads `martini-multiplayer.browser.js` globally
  - Exposes `window.__HMR__` for state preservation
  - Injects `window.__ROOM_ID__` and `window.__IS_HOST__`
- HMR foundation ready (capture/restore state)
- Security: Blocks localStorage, fetch (except multiplayer)

---

## Next Steps

### Phase 2: Editor Experience (Not Started)
- Add Biome WASM for formatting/linting
- Add TypeScript worker for diagnostics
- Integrate into CodeMirror

### Phase 3: Hot Module Replacement (Not Started)
- Implement full HMR cycle
- Auto-reload on save
- State preservation

### Phase 4: Polish & Documentation (Not Started)
- Source maps integration
- Better error messages
- User documentation

---

## Known Issues

None at this time.

---

## Testing Needed

- [ ] Create new TypeScript project
- [ ] Verify bundle API compiles TypeScript
- [ ] Test Martini SDK imports work
- [ ] Verify sandbox loads and runs game
- [ ] Check HMR globals are accessible

---

## Files Modified

### Created
- `apps/web/src/lib/server/templates/martini-typescript-starter.ts`
- `docs/migration/` (all migration docs)

### Modified
- `packages/@martini/phaser/package.json` (postbuild script)
- `apps/web/src/routes/api/projects/[id]/bundle/+server.ts` (TypeScript support)
- `apps/web/static/sandbox-runtime.html` (complete rewrite for Martini SDK)

### Copied
- `packages/@martini/phaser/dist/martini-multiplayer.browser.js` → `apps/web/static/`

---

## Phase 1 Validation Checklist

Before moving to Phase 2, validate:

- [x] Browser bundle exists at `/static/martini-multiplayer.browser.js`
- [ ] Bundle API compiles TypeScript to JavaScript
- [ ] Virtual module resolution works for `@martini/phaser`
- [ ] Sandbox runtime loads without errors
- [ ] `window.MartiniMultiplayer` is accessible in iframe console

---

**Next Action**: Test Phase 1 by creating a TypeScript project and running it
