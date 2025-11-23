<script lang="ts">
  type TooltipKey = 'setup' | 'state' | 'actions' | 'action' | 'tick';

  const tooltipCopy: Record<TooltipKey, string> = {
    setup: 'setup() — Initialize your game state with plain objects',
    state: 'State — Just vanilla JS objects, no magic classes',
    actions: 'actions — Define how players can modify the game',
    action: 'Mutate directly — No RPC wrappers, just plain functions',
    tick: 'tick() — Game loop runs on host, synced automatically'
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
      top: lineRect.top - containerRect.top - 12
    };
  }

  function hideTooltip() {
    tooltip = null;
  }
</script>

<div class="code-demo" bind:this={codeDemoEl}>
  <div class="code-demo-header">
    <div class="code-dots">
      <span></span><span></span><span></span>
    </div>
    <span class="code-filename">game.ts</span>
  </div>
  <pre class="code-demo-content"><code>
<span class="code-line"><span class="code-keyword">import</span> <span class="code-bracket">{'{'}</span> <span class="code-function">defineGame</span> <span class="code-bracket">{'}'}</span> <span class="code-keyword">from</span> <span class="code-string">'@martini/core'</span>;</span>
<span class="code-line"><span class="code-keyword">const</span> <span class="code-variable">game</span> <span class="code-operator">=</span> <span class="code-function">defineGame</span>(<span class="code-bracket">{'{'}</span></span>
<span class="code-line code-hover-line" on:mouseenter={(event) => showTooltip(event, 'setup')} on:mouseleave={hideTooltip}>  <span class="code-property">setup</span><span class="code-operator">:</span> () <span class="code-operator">=></span> (<span class="code-bracket">{'{'}</span></span>
<span class="code-line code-hover-line" on:mouseenter={(event) => showTooltip(event, 'state')} on:mouseleave={hideTooltip}>    <span class="code-property">players</span><span class="code-operator">:</span> [],</span>
<span class="code-line">    <span class="code-property">ball</span><span class="code-operator">:</span> <span class="code-bracket">{'{'}</span> <span class="code-property">x</span><span class="code-operator">:</span> <span class="code-number">400</span>, <span class="code-property">y</span><span class="code-operator">:</span> <span class="code-number">300</span>, <span class="code-property">dx</span><span class="code-operator">:</span> <span class="code-number">2</span>, <span class="code-property">dy</span><span class="code-operator">:</span> <span class="code-number">2</span> <span class="code-bracket">{'}'}</span></span>
<span class="code-line">  <span class="code-bracket">{'}'}</span>),</span>
<span class="code-line code-hover-line" on:mouseenter={(event) => showTooltip(event, 'actions')} on:mouseleave={hideTooltip}>  <span class="code-property">actions</span><span class="code-operator">:</span> <span class="code-bracket">{'{'}</span></span>
<span class="code-line code-hover-line" on:mouseenter={(event) => showTooltip(event, 'action')} on:mouseleave={hideTooltip}>    <span class="code-function">move</span><span class="code-operator">:</span> (<span class="code-variable">state</span>, <span class="code-variable">playerId</span>, <span class="code-variable">y</span>) <span class="code-operator">=></span> <span class="code-bracket">{'{'}</span></span>
<span class="code-line">      <span class="code-keyword">const</span> <span class="code-variable">player</span> <span class="code-operator">=</span> <span class="code-variable">state</span>.<span class="code-property">players</span>.<span class="code-function">find</span>(<span class="code-variable">p</span> <span class="code-operator">=></span> <span class="code-variable">p</span>.<span class="code-property">id</span> <span class="code-operator">===</span> <span class="code-variable">playerId</span>);</span>
<span class="code-line">      <span class="code-keyword">if</span> (<span class="code-variable">player</span>) <span class="code-variable">player</span>.<span class="code-property">y</span> <span class="code-operator">=</span> <span class="code-variable">y</span>;</span>
<span class="code-line">    <span class="code-bracket">{'}'}</span></span>
<span class="code-line">  <span class="code-bracket">{'}'}</span>,</span>
<span class="code-line code-hover-line" on:mouseenter={(event) => showTooltip(event, 'tick')} on:mouseleave={hideTooltip}>  <span class="code-property">tick</span><span class="code-operator">:</span> (<span class="code-variable">state</span>, <span class="code-variable">dt</span>) <span class="code-operator">=></span> <span class="code-bracket">{'{'}</span></span>
<span class="code-line">    <span class="code-variable">state</span>.<span class="code-property">ball</span>.<span class="code-property">x</span> <span class="code-operator">+=</span> <span class="code-variable">state</span>.<span class="code-property">ball</span>.<span class="code-property">dx</span>;</span>
<span class="code-line">    <span class="code-variable">state</span>.<span class="code-property">ball</span>.<span class="code-property">y</span> <span class="code-operator">+=</span> <span class="code-variable">state</span>.<span class="code-property">ball</span>.<span class="code-property">dy</span>;</span>
<span class="code-line">  <span class="code-bracket">{'}'}</span></span>
<span class="code-line"><span class="code-bracket">{'}'}</span>);</span>
</code></pre>

  {#if tooltip}
    <div class="code-tooltip" style={`left:${tooltip.left}px;top:${tooltip.top}px;`}>
      {tooltip.text}
    </div>
  {/if}

  <div class="example-features">
    <div class="feature-tag">
      <svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>Automatic sync</span>
    </div>
    <div class="feature-tag">
      <svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>P2P by default</span>
    </div>
    <div class="feature-tag">
      <svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>Join/leave handled</span>
    </div>
  </div>
</div>

<style>
  .code-demo {
    position: relative;
    background: linear-gradient(135deg, rgba(10, 10, 20, 0.75), rgba(5, 5, 15, 0.7));
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 255, 255, 0.4);
    border-radius: 0.75rem;
    overflow: visible;
    margin-bottom: 1.5rem;
    box-shadow:
      0 0 40px rgba(0, 255, 255, 0.15),
      0 10px 40px rgba(0, 0, 0, 0.5),
      inset 0 0 60px rgba(0, 255, 255, 0.03);
  }

  .code-demo-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(to right, rgba(0, 0, 0, 0.8), rgba(10, 10, 20, 0.8));
    border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  }

  .code-dots {
    display: flex;
    gap: 0.375rem;
  }

  .code-dots span {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
  }

  .code-filename {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    color: #00ffff;
  }

  .code-demo-content {
    padding: 1.5rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    color: #e0e0ff;
    margin: 0;
    overflow-x: auto;
  }

  .code-line {
    display: block;
    line-height: 1.6;
  }

  .code-keyword { color: #ff79c6; }
  .code-function { color: #50fa7b; }
  .code-operator { color: #f8f8f2; }
  .code-string { color: #f1fa8c; }
  .code-variable { color: #8be9fd; }
  .code-property { color: #bd93f9; }
  .code-number { color: #ffb86c; }

  .code-hover-line {
    position: relative;
    cursor: help;
    z-index: 0;
  }

  .code-hover-line::after {
    content: '';
    position: absolute;
    inset: -2px 0;
    border-radius: 6px;
    background: rgba(0, 255, 255, 0.08);
    box-shadow:
      0 0 10px rgba(0, 255, 255, 0.4),
      0 0 20px rgba(0, 255, 255, 0.25);
    border: 1px solid rgba(0, 255, 255, 0.45);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
    z-index: -1;
  }

  .code-hover-line:hover::after {
    opacity: 1;
  }

  .code-tooltip {
    position: absolute;
    transform: translate(-50%, -100%);
    padding: 0.5rem 0.75rem;
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid rgba(0, 255, 255, 0.5);
    border-radius: 0.5rem;
    font-size: 0.85rem;
    color: #e0e0ff;
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;
  }

  .example-features {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0 1.5rem 1.5rem;
  }

  .feature-tag {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: rgba(0, 255, 255, 0.05);
    border: 1px solid rgba(0, 255, 255, 0.2);
    border-radius: 2rem;
    color: #00ffff;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .check-icon {
    width: 16px;
    height: 16px;
    stroke-width: 3;
  }
</style>
