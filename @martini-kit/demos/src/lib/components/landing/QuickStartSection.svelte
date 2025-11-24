<script lang="ts">
  import CodeDemoPanel from './CodeDemoPanel.svelte';
  import QuickStartStep from './QuickStartStep.svelte';
</script>

<section id="quickstart" class="quickstart-main-section">
  <div class="section-container">
    <h2 class="section-title" data-text="Quick Start">Quick Start</h2>
    <p class="section-intro">
      Go from idea to synced multiplayer in minutes. No server boilerplate, no RPC wiring, just a tiny game definition that runs in browser or native.
    </p>

    <div class="quickstart-main-grid">
      <QuickStartStep number={1} title="Install" highlight>
        <code class="qs-main-code">npm install @martini/core @martini/phaser</code>
      </QuickStartStep>

      <QuickStartStep number={2} title="Define Your Game (~15 lines)" highlight>
        <p class="qs-main-text qs-intro-text">
          Plain objects for state. Actions mutate directly. No classes, no serialization, no RPC.
        </p>
        <CodeDemoPanel />
      </QuickStartStep>

      <QuickStartStep number={3} title="Connect Your Engine">
        <p class="qs-main-text">
          Plug in Phaser, PixiJS, Three.js, or vanilla JavaScript. Martini syncs data and lets your renderer stay yours.
        </p>
      </QuickStartStep>

      <QuickStartStep number={4} title="Test & Ship">
        <p class="qs-main-text">
          Open two tabs, watch them stay in lockstep. Ship as static files—no backend or ops to babysit.
        </p>
      </QuickStartStep>
    </div>
  </div>
</section>

<style>
  .quickstart-main-section {
    padding: 5rem 0;
  }

  .quickstart-main-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  .qs-main-code {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.9rem;
    color: var(--code);
    background: #f5f7fb;
    padding: 1rem 1.25rem;
    border-radius: 0.65rem;
    border: 1px solid var(--border-strong);
    overflow-x: auto;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  }

  .qs-main-text {
    font-size: 1rem;
    color: var(--muted);
    line-height: 1.6;
    margin: 0;
  }

  .qs-intro-text {
    margin-bottom: 1.5rem;
  }

  @media (max-width: 1024px) {
    .quickstart-main-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
