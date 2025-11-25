<script lang="ts">
  import CodeDemoPanel from './CodeDemoPanel.svelte';
  import QuickStartStep from './QuickStartStep.svelte';

  const flow = [
    {
      badge: 'Step 1',
      title: 'Describe state and actions',
      text: 'Declare setup, actions, and tick with plain objects. No RPC or serialization boilerplate.',
      code: 'setup + actions + tick // declarative game spec'
    },
    {
      badge: 'Step 2',
      title: 'Martini syncs it',
      text: 'Validation, diffing, ordering, and reconnects handled across WebSockets or WebRTC/P2P.',
      code: 'transport: websocket | webrtc'
    },
    {
      badge: 'Step 3',
      title: 'Clients stay in lockstep',
      text: 'Render with Phaser helper today. Godot adapter is in development, with more engines planned.',
      code: 'onChange(state => render(state))'
    }
  ];
</script>

<section id="quickstart" class="quickstart-main-section">
  <div class="section-container">
    <h2 class="section-title" data-text="Quick Start">Quick Start</h2>

    <div class="quickstart-main-grid">
      <QuickStartStep number={1} title="Install" highlight>
        <code class="qs-main-code">npm install @martini/core @martini/phaser</code>
      </QuickStartStep>

      <QuickStartStep number={2} title="Declare Your Game (~15 lines)" highlight>
        <p class="qs-main-text qs-intro-text">
          Plain objects for state, actions mutate directly. No classes, no RPC wrappers, no serialization chores.
        </p>
        <div class="flow-list">
          {#each flow as step}
            <div class="flow-item">
              <div class="flow-badge">{step.badge}</div>
              <div>
                <p class="flow-title">{step.title}</p>
                <p class="flow-text">{step.text}</p>
                <code class="flow-code">{step.code}</code>
              </div>
            </div>
          {/each}
        </div>
        <CodeDemoPanel />
      </QuickStartStep>

      <QuickStartStep number={3} title="Pick Engine & Transport">
        <p class="qs-main-text">
          Use the Phaser helper today. Godot and other engine adapters are on the way. Swap WebSockets or P2P without refactoring.
        </p>
      </QuickStartStep>

      <QuickStartStep number={4} title="Develop faster">
        <p class="qs-main-text">
          First-class DX: web IDE, live previews, and built-in dev tools today, with more helpers coming soon.
        </p>
      </QuickStartStep>
    </div>

  </div>
</section>

<style>
  .quickstart-main-section {
    padding: 5rem 0;
  }

  .flow-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.75rem;
    margin: 1rem 0 1.5rem;
  }

  .flow-item {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
    padding: 0.75rem;
    background: #f5f7fb;
    border: 1px solid var(--border);
    border-radius: 0.85rem;
  }

  .flow-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.7rem;
    border-radius: 0.6rem;
    background: #e8f0ff;
    border: 1px solid var(--border-strong);
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
  }

  .flow-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
  }

  .flow-text {
    margin: 0.2rem 0 0.5rem;
    color: var(--muted);
    line-height: 1.5;
    font-size: 0.95rem;
  }

  .flow-code {
    display: inline-block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.88rem;
    background: #fff;
    border: 1px solid var(--border-strong);
    border-radius: 0.6rem;
    padding: 0.35rem 0.55rem;
    color: var(--code);
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
