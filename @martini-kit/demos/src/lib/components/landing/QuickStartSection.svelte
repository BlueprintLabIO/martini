<script lang="ts">
  import CodeDemoPanel from './CodeDemoPanel.svelte';
  import QuickStartStep from './QuickStartStep.svelte';
</script>

<section id="quickstart" class="quickstart-main-section">
  <div class="section-container">
    <h2 class="section-title" data-text="Quick Start">Quick Start</h2>
    <p class="section-intro">
      Unlike Colyseus (~100 lines of server + client) or Unity Netcode (manual RPC wiring), Martini gets you running in 15 lines—works everywhere.
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
          Phaser, PixiJS, Three.js, or vanilla JavaScript. Martini syncs data, not rendering.
        </p>
      </QuickStartStep>

      <QuickStartStep number={4} title="Test & Ship">
        <p class="qs-main-text">
          Open two browser tabs to test P2P. Deploy as static files—no backend required.
        </p>
      </QuickStartStep>
    </div>
  </div>
</section>

<style>
  .quickstart-main-section {
    padding: 6rem 0;
  }

  .quickstart-main-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  .qs-main-code {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
    color: #00ffff;
    background: rgba(0, 0, 0, 0.6);
    padding: 0.875rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(0, 255, 255, 0.3);
    overflow-x: auto;
  }

  .qs-main-text {
    font-size: 1rem;
    color: rgba(224, 224, 255, 0.7);
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
