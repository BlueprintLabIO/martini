# AI + Y.js Collaborative Editing Architecture

**Date:** 2025-11-08
**Status:** Architectural Decision Record

## Core Insight

**AI is not a peer in Y.js - it's a tool that helps users formulate edits that the user applies.**

From Y.js's perspective:
```
User types in CodeMirror → Y.Text operation → Sync to peers
AI suggests edit → User approves → CodeMirror dispatch → Y.Text operation → Sync to peers
                                        ↓
                              IDENTICAL FLOW
```

## Why This Design is Correct

### ✅ Advantages

1. **Simpler Architecture**
   - No AI peer identity/cursor in Y.js
   - No AI WebRTC/WebSocket connection
   - AI doesn't hold Y.Doc state
   - Zero special CRDT handling

2. **Better UX**
   - User maintains full control (approval workflow)
   - Clear attribution (all edits are "user")
   - No confusing AI ghost cursors
   - Educational: kids learn by reviewing diffs

3. **Future-Proof**
   - When multiplayer launches: **zero changes to AI logic**
   - AI edits flow through CodeMirror binding automatically
   - Works identically in single-player and multiplayer

4. **Industry Pattern**
   - Matches Draftflow (Y.js + AI assistant, Feb 2025)
   - Matches GitHub Copilot (suggests, user accepts)
   - Matches Cursor (AI recommends, user applies)

### ❌ Why "AI as Peer" Would Be Wrong

- Complex: Need to manage AI's Y.Doc awareness state
- Confusing UX: "Who made this edit - me or AI?"
- Authority conflicts: Can AI overwrite user's typing?
- Overkill: AI doesn't need real-time sync (it's request/response)

---

## Architecture Phases

### Phase 1: AI Chat (Current - No Y.js)

```
┌─────────────────────────────────────┐
│ User asks AI to edit                │
│         ↓                           │
│ AI reads from filesMap (snapshot)  │
│         ↓                           │
│ AI generates diff (search/replace)  │
│         ↓                           │
│ Show approval dialog                │
│         ↓                           │
│ User clicks "Apply"                 │
│         ↓                           │
│ Update filesMap + CodeMirror        │
│         ↓                           │
│ Save to DB (existing PUT API)       │
└─────────────────────────────────────┘
```

**Implementation:**
- Client-side tools read from `filesMap` (parent component state)
- AI generates `{old_text, new_text}` edits
- Apply via callback: `onApplyEdit(path, edits)`
- Parent updates CodeMirror or filesMap directly
- Save to Postgres via existing `PUT /api/projects/[id]/files`

### Phase 2: Multiplayer with Y.js (Future)

```
┌─────────────────────────────────────┐
│ User asks AI to edit                │
│         ↓                           │
│ AI reads from Y.Doc (via CodeMirror)│
│         ↓                           │
│ AI generates diff                   │
│         ↓                           │
│ Show approval dialog                │
│         ↓                           │
│ User clicks "Apply"                 │
│         ↓                           │
│ CodeMirror.dispatch(changes)        │ ← SAME AS PHASE 1
│         ↓                           │
│ y-codemirror binding intercepts     │ ← NEW
│         ↓                           │
│ Converts to Y.Text operations       │ ← NEW
│         ↓                           │
│ WebRTC provider syncs to peers      │ ← NEW
│         ↓                           │
│ Other users see change (as "User")  │
└─────────────────────────────────────┘
```

**Migration Steps:**
1. Install Y.js packages: `y-codemirror`, `y-webrtc`, `yjs`
2. Initialize Y.Doc for each file:
   ```typescript
   const ydoc = new Y.Doc();
   const ytext = ydoc.getText('content');
   ```
3. Bind to CodeMirror:
   ```typescript
   import { CodemirrorBinding } from 'y-codemirror';
   new CodemirrorBinding(ytext, editorView);
   ```
4. Connect to peers:
   ```typescript
   import { WebrtcProvider } from 'y-webrtc';
   const provider = new WebrtcProvider(`file-${projectId}-${path}`, ydoc, {
     signaling: ['ws://your-signaling-server']
   });
   ```
5. **AI chat code: UNCHANGED!** Still just calls `onApplyEdit()`, which dispatches to CodeMirror.

### Phase 3: Y.js Persistence (Optional)

Store Y.Doc updates in Postgres for offline/reload:

```sql
-- Add Y.js columns to files table
ALTER TABLE files ADD COLUMN y_doc BYTEA;
ALTER TABLE files ADD COLUMN y_updates BYTEA[];
ALTER TABLE files ADD COLUMN last_compacted TIMESTAMP;
```

**Flow:**
1. On file open: Load `y_updates[]` from Postgres
2. Apply all updates: `Y.applyUpdate(doc, Y.mergeUpdates(updates))`
3. On edit: Append new update to `y_updates[]`
4. Periodically: Compact updates → single `y_doc` snapshot

**AI changes:** Still none! AI reads from CodeMirror, user applies via dispatch.

---

## Key Design Decisions

### 1. No Version Tokens with Y.js

**Phase 1 (Current):**
- Use `fastHash()` version tokens for optimistic concurrency
- Check version before applying edits
- Catch conflicts when user edits in another tab

**Phase 2 (Y.js):**
- Y.js handles conflict resolution automatically (CRDT)
- No need for version tokens
- AI reads latest state from Y.Doc
- User applies → Y.js merges with concurrent edits

### 2. Search/Replace Input, Unified Diff Output

**Why search/replace for AI?**
- ✅ Simpler for LLM (no line numbers, no @@ syntax)
- ✅ More resilient (finds text anywhere)
- ✅ Clearer intent for approval UI

**Why unified diff for display?**
- ✅ Industry standard (git, GitHub, VSCode)
- ✅ Human-readable (+ for additions, - for deletions)
- ✅ Familiar to developers
- ✅ Can syntax-highlight in UI

### 3. Client-Side Tools

**Why client-side?**
- ✅ Easier approval workflow (no server roundtrip)
- ✅ Direct access to filesMap/CodeMirror state
- ✅ Faster (no network for reads)
- ✅ Future Y.js binding works client-side anyway

**Trade-offs:**
- ⚠️ filesMap might be stale (multiple tabs)
- ✅ Mitigated by version tokens in Phase 1
- ✅ Irrelevant in Phase 2 (Y.js handles this)

---

## Migration Checklist

### V1 → V2 (Adding Multiplayer)

**What Changes:**
- [x] Install Y.js packages
- [x] Add Y.Doc initialization per file
- [x] Add y-codemirror binding
- [x] Add WebRTC/WebSocket provider
- [x] Store Y.updates in Postgres (optional)

**What Stays the Same:**
- [x] AI chat tools (fs_read_file, fs_edit_file)
- [x] Approval dialog component
- [x] System prompt
- [x] Tool schemas
- [x] Diff generation logic

**Why it's seamless:**
- AI applies edits via `CodeMirror.dispatch()`
- Y.js bindings intercept ALL CodeMirror changes
- Whether user typed it or AI suggested it → same path
- Attribution is always to the user (correct!)

---

## References

- **Draftflow** (Feb 2025): CRDT-aware collaborative AI editor
  - https://vishnugopal.com/2025/02/04/draftflow-a-collaborative-crdt-aware-editor-ai/
  - Uses Y.js + Quill, AI as suggestion tool (not peer)

- **Aider Leaderboard** (2025): Best LLM code editing formats
  - Claude 3.5 Sonnet: 84.2% accuracy (top performer)
  - Unified diff: 3x better than search/replace for GPT-4

- **Y.js Documentation**:
  - https://github.com/yjs/yjs
  - https://docs.yjs.dev/

- **y-codemirror Binding**:
  - https://github.com/yjs/y-codemirror

---

## TL;DR

**Current (Phase 1):**
```typescript
AI → generates diff → user approves → update filesMap → save to DB
```

**Future (Phase 2):**
```typescript
AI → generates diff → user approves → CodeMirror.dispatch() → y-codemirror → Y.js sync
```

**AI code changes: ZERO.**

The key insight: AI is not a collaborative peer, it's a suggestion engine. Users are the authors.
