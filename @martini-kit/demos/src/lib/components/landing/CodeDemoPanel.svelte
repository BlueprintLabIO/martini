<script lang="ts">
  type TooltipKey = "setup" | "state" | "actions" | "action" | "tick";

  const tooltipCopy: Record<TooltipKey, string> = {
    setup: "setup() — Initialize your game state with plain objects",
    state: "State — Just vanilla JS objects, no magic classes",
    actions: "actions — Define how players can modify the game",
    action: "Mutate directly — No RPC wrappers, just plain functions",
    tick: "tick() — Game loop runs on host, synced automatically",
  };

  interface TooltipInfo {
    text: string;
    left: number;
    top: number;
  }

  let codeDemoEl: HTMLDivElement | null = null;
  let tooltip: TooltipInfo | null = null;

  function showTooltip(event: MouseEvent, key: TooltipKey) {
    const target = event.currentTarget as HTMLElement;
    if (!codeDemoEl) {
      tooltip = null;
      return;
    }

    const lineRect = target.getBoundingClientRect();
    const containerRect = codeDemoEl.getBoundingClientRect();

    tooltip = {
      text: tooltipCopy[key],
      left: lineRect.left - containerRect.left + lineRect.width / 2,
      top: lineRect.top - containerRect.top - 12,
    };
  }

  function hideTooltip() {
    tooltip = null;
  }

  const escapeHtml = (code: string) =>
    code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const highlightCode = (code: string) => {
    const escaped = escapeHtml(code);

    return escaped
      .replace(/('[^']*'|`[^`]*`)/g, '<span class="token string">$1</span>')
      .replace(
        /\b(import|from|const|return|=>)\b/g,
        '<span class="token keyword">$1</span>',
      )
      .replace(
        /\b(setup|actions|tick)\b/g,
        '<span class="token function">$1</span>',
      )
      .replace(/(\b\d+(\.\d+)?\b)/g, '<span class="token number">$1</span>');
  };

  const codeSample = `
import { defineGame } from '@martini/core';

const game = defineGame({
  setup: () => ({
    players: [],
    ball: { x: 400, y: 300, dx: 2, dy: 2 }
  }),

  actions: {
    move: (state, playerId, y) => {
      const player = state.players.find(p => p.id === playerId);
      if (player) player.y = y;
    }
  },

  tick: (state, dt) => {
    state.ball.x += state.ball.dx;
    state.ball.y += state.ball.dy;
  }
});
`.trim();

  const highlightedCode = highlightCode(codeSample);
</script>

<div class="code-demo" bind:this={codeDemoEl}>
  <div class="code-demo-header">
    <div class="code-dots">
      <span></span><span></span><span></span>
    </div>
    <span class="code-filename">game.ts</span>
  </div>
  <div class="code-demo-content">
    <pre class="code-block"><code
        class="code-highlight"
        aria-label="Martini game definition">{@html highlightedCode}</code
      ></pre>
  </div>

  {#if tooltip}
    <div
      class="code-tooltip"
      style={`left:${tooltip.left}px;top:${tooltip.top}px;`}
    >
      {tooltip.text}
    </div>
  {/if}
</div>

<style>
  .code-demo {
    position: relative;
    background: linear-gradient(180deg, #f7faff, #ffffff);
    border: 1px solid var(--border);
    border-radius: 0.9rem;
    overflow: visible;
    margin-bottom: 1.5rem;
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
  }

  .code-demo-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    background: rgba(15, 23, 42, 0.03);
    border-bottom: 1px solid var(--border-strong);
  }

  .code-dots {
    display: flex;
    gap: 0.375rem;
  }

  .code-dots span {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.12);
  }

  .code-filename {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.875rem;
    color: var(--muted);
  }

  .code-demo-content {
    padding: 1.5rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.95rem;
    color: var(--code);
    margin: 0;
    overflow-x: auto;
    background: #f9fbff;
  }

  .code-block {
    margin: 0;
    white-space: pre;
    line-height: 1.6;
    color: var(--code);
  }

  .code-tooltip {
    position: absolute;
    transform: translate(-50%, -100%);
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    font-size: 0.85rem;
    color: var(--text);
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  }

  .code-highlight {
    display: block;
  }
</style>
