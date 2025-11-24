# Interactive Tutorials Plan (using demos app)

Goal: deliver svelte.dev-style interactive tutorials inside the demos app using existing IDE/preview infrastructure. Two tracks (Core, Phaser), route-based, no persistence, optional “Check”.

## Experience Overview
- Routes: `/tutorial/core/...` and `/tutorial/phaser/...`, plus `/tutorial` landing and per-track index.
- Layout: left column instructions (prerendered for SEO), right column IDE/preview (host+client) reused from `/ide` and `/preview`.
- Navigation: sidebar with categories and numbered lessons, Prev/Next buttons, “Step X of Y” context, track badge. No locking; “Check” is optional.
- Validation: per-lesson validator runs in sandbox via postMessage; gives pass/fail + hint. No gating.
- Code scaffold: lesson-specific file set with readonly regions and TODO markers; hint/solution toggles.

## Content Model
- Source: `/src/content/tutorials/<track>/<slug>.md` (or MDX), frontmatter:
  - `title`, `description`, `track` (core|phaser), `category`, `order`, `seo` fields.
  - `files`: array of file descriptors `{ path, initialContent, readonlyRanges?, todoMarkers? }`.
  - `validator`: module path to run in sandbox.
  - `hints`: short bullet hints; `solution`: code snippet(s) to reveal.
- Loader: prerender instructions and metadata; hydrate IDE client-side with files/validators.
- Validation contract: validator exports `async function validate(ctx)` where ctx exposes inspected state (from preview) and helper asserts.

## Routing & SEO
- Pages: `/tutorial/+page.svelte` (landing), `/tutorial/[track]/+page.svelte` (index), `/tutorial/[track]/[slug]/+page.svelte` (lesson).
- Prerender instructions and metadata (title/description/canonical). Add HowTo JSON-LD. Keep interactive bits client-only.
- Deep links: each lesson URL stable; optional `?step=` for direct lesson jump inside category.

## Reuse of Existing Infra
- IDE: reuse `MartiniIDE.svelte` (CodeMirror, dual previews, DevTools, HMR, sharing). Extend to accept:
  - lesson files (instead of game presets),
  - readonly ranges and TODO markers (gray, non-editable),
  - hint/solution overlays,
  - lesson-specific validator hook and “Check” button.
- Preview: reuse `/preview` runner; add protocol for validator to query state (postMessage).
- Content: can seed initial files from `ide-configs-map.ts` snippets trimmed per lesson.

## Validator Design
- Lives in `/src/lib/tutorials/validators/<track>/<slug>.ts`.
- Runs in sandboxed iframe; communicates via postMessage to host page.
- Capabilities: inspect game state, actions invoked, sprite counts/positions/velocities, UI text; assert host-only physics creation; check transports used.
- Deterministic: avoid timing flakes; set timeouts; allow multiple attempts.
- Result: pass/fail with message; hints surfaced on fail.

## Tracks & Lesson Outline (v1)
- Core track:
  1) Intro/run loop (render something, confirm host/client preview works).
  2) State + actions (defineGame, simple action).
  3) Input flow (createInputAction, state-driven movement).
  4) Deterministic random (seeded random, no Math.random()).
  5) Transports intro (LocalTransport; swap to Trystero stub).
  6) Simple game mode (score, win condition).
  7) Testing basics (deterministic step assertions).
- Phaser track:
  1) Adapter + scene setup (host vs client).
  2) Sprites + SpriteManager (state-driven sprites).
  3) Input + PhysicsManager (top-down movement).
  4) Collisions (CollisionManager; host-only bodies).
  5) HUD basics (health/name tags).
  6) Polish/advanced (attachments, camera tweaks).

## Code Scaffolding Expectations per Lesson
- Files: typically `game.ts`, `scene.ts`, `main.ts` (Phaser), and minimal config.
- Provide starting code with locked boilerplate (imports, adapter wiring), TODO sections where learner edits.
- Keep diffs tiny per step; carry forward from previous lesson scaffold.
- Solutions stored alongside lessons; reveal on demand.

## UI/UX Requirements
- Sidebar: categories + numbered lessons; highlight current; show track badge.
- Buttons: Run/Reset (already in IDE), Check (optional), Hint, Show solution, Prev/Next.
- Badges: track badge (Core/Phaser); scope already exists.
- Panels: instructions, hints, solution; auto-scroll to current step on load.
- Accessibility: keyboard-friendly, clear focus states.

## SEO Considerations
- Prerender text content; lazy-load IDE.
- Titles/descriptions per lesson; canonical URLs.
- HowTo schema per lesson (name, description, step list).
- Index pages summarizing lessons with text (crawlable).

## Implementation Steps (high level)
1) Content schema: define frontmatter fields and file descriptor shape; create example lesson MD.
2) Routing: add tutorial landing/track/lesson routes; prerender instructions + metadata.
3) IDE extensions: accept lesson files; enforce readonly/TODO; add Check/Hint/Solution UI; wire validator messaging.
4) Validator harness: postMessage protocol between host and preview; implement helper asserts; add sample validator.
5) Lesson nav data: generate sidebar ordering from content frontmatter (similar to docs sidebar).
6) Author first two lessons (Core 01, Phaser 01) to prove flow and validation.
7) QA: verify SEO output, validation stability, and UX parity with svelte.dev expectations.

## Open Questions
- Frontmatter vs JSON for lesson config? (default: markdown frontmatter for SEO + editability)
- Use MDX for inline code/hints? (optional; markdown is sufficient)
- How strict should validators be? (recommend lenient: accept equivalent implementations)
- Any analytics needed on Check usage/completion? (out of scope for v1)
