<script lang="ts">
  const beforeCode = `
// Manual sockets + reconnection + routing
const socket = new WebSocket(url);
const handlers = {
  move: ({ id, y }) => {
    const p = players[id];
    if (p) p.y = y;
  },
  join: ({ id }) => players[id] = { id, y: 0 },
  leave: ({ id }) => delete players[id],
};

socket.onopen = () => socket.send(JSON.stringify({ type: "join" }));
socket.onclose = () => setTimeout(() => reconnect(), 1000);

socket.onmessage = (msg) => {
  try {
    const { type, ...payload } = JSON.parse(msg.data);
    handlers[type]?.(payload);
  } catch (e) { console.error(e); }
};

function move(y) {
  socket.send(JSON.stringify({ type: "move", y, t: Date.now() }));
}
`.trim();

  const afterCode = `
import { defineGame } from "@martini/core";

const game = defineGame({
  setup: () => ({ players: [] }),
  actions: {
    move: (state, id, y) => {
      const player = state.players.find((p) => p.id === id);
      if (player) player.y = y;
    },
  },
  tick: (state) => { /* game loop */ },
});
`.trim();
</script>

<section class="before-after-section" id="before-after">
  <div class="section-container">
    <h2 class="section-title" data-text="Why Declarative?">Before vs After</h2>
    <p class="section-intro">
      Move from brittle socket plumbing to a declarative API. Martini handles validation, ordering, and sync so you keep focus on the game.
    </p>
    <div class="contrast-shell">
      <article class="contrast-panel before">
        <div class="ba-label">Before (manual)</div>
        <div class="ba-body">
          <pre><code>{beforeCode}</code></pre>
          <ul>
            <li>Manual parsing and routing</li>
            <li>Race conditions and missing reconnection logic</li>
            <li>No shared structure for engines or transports</li>
            <li>Protocol rewrites per transport</li>
          </ul>
        </div>
      </article>
      <article class="contrast-panel after">
        <div class="ba-label good">After (with Martini)</div>
        <div class="ba-body">
          <pre><code>{afterCode}</code></pre>
          <ul>
            <li>Declarative setup/actions/tick</li>
            <li>Swap WebSockets ↔ WebRTC/P2P without refactoring</li>
            <li>Phaser helper today; Godot adapter in development</li>
            <li>Ordering, validation, reconnection handled</li>
          </ul>
        </div>
      </article>
    </div>
  </div>
</section>

<style>
  .before-after-section {
    padding: 5rem 0;
  }

  .contrast-shell {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1rem;
    align-items: stretch;
  }

  .contrast-panel {
    border-radius: 1rem;
    padding: 1.25rem;
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .contrast-panel.before {
    background: linear-gradient(180deg, rgba(255, 99, 99, 0.08), #ffffff);
    border: 1px solid var(--border);
  }

  .contrast-panel.after {
    background: linear-gradient(180deg, rgba(107, 218, 215, 0.12), #ffffff);
    border: 1px solid var(--border);
  }

  .ba-label {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.7rem;
    border-radius: 0.6rem;
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid var(--border-strong);
    font-weight: 700;
    color: var(--text);
    width: fit-content;
  }

  .ba-label.good {
    background: rgba(255, 255, 255, 0.8);
  }

  .ba-body {
    display: grid;
    grid-template-rows: auto auto;
    gap: 0.75rem;
  }

  pre {
    margin: 0;
    padding: 0.85rem;
    background: #f5f7fb;
    border: 1px solid var(--border-strong);
    border-radius: 0.75rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.9rem;
    color: var(--code);
    overflow-x: auto;
  }

  ul {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--muted);
    line-height: 1.5;
    font-size: 0.95rem;
  }

  li {
    margin-bottom: 0.35rem;
  }
</style>
