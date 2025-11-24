<script lang="ts">
  const cards = [
    {
      badge: 'defineGame()',
      title: 'Describe your game',
      text: 'Plain objects for state. No custom classes, no sockets.',
      code: "setup: () => ({ paddles: [], ball: { x, y, dx, dy } })"
    },
    {
      badge: 'submitAction()',
      title: 'Players interact',
      text: 'Call actions from input. Martini handles validation and sync.',
      code: 'actions: { move: (state, id, y) => ... }'
    },
    {
      badge: 'onChange()',
      title: 'Render updates',
      text: 'React to state changes. Render with any engine or stack you like.',
      code: 'onChange(state => sprite.x = state.ball.x)'
    }
  ];
</script>

<section id="how-it-works" class="how-works-section">
  <div class="section-container">
    <h2 class="section-title" data-text="How It Works">How It Works</h2>
    <p class="section-intro">
      Three simple APIs give you declarative multiplayer. Here's how you'd build a paddle game:
    </p>

    <div class="how-works-scroll-container">
      <div class="how-works-cards">
        {#each cards as card}
          <article class="how-card">
            <div class="how-card-split">
              <div class="how-card-left">
                <div class="how-card-badge"><code>{card.badge}</code></div>
                <h3 class="how-card-title">{card.title}</h3>
                <p class="how-card-text">{card.text}</p>
              </div>
              <div class="how-card-right">
                <div class="how-code-snippet">
                  <code class="inline-code">{card.code}</code>
                </div>
              </div>
            </div>
          </article>
        {/each}
      </div>

      <div class="scroll-indicators">
        <span class="scroll-dot active"></span>
        <span class="scroll-dot"></span>
        <span class="scroll-dot"></span>
      </div>
    </div>

  <div class="how-result">
    <div class="result-icon">🎮</div>
    <h3 class="result-title">You've got multiplayer</h3>
    <p class="result-text">
      Open two tabs and they stay in sync. One moves a paddle, the other sees it instantly. No servers to provision, no custom protocols, no DevOps to maintain.
    </p>
  </div>
  </div>
</section>

<style>
  .how-works-section {
    padding: 5rem 0;
  }

  .how-works-scroll-container {
    position: relative;
    overflow: hidden;
  }

  .how-works-cards {
    display: flex;
    gap: 1.75rem;
    overflow-x: auto;
    padding-bottom: 1.5rem;
    scroll-snap-type: x mandatory;
    padding-inline: 0.25rem;
  }

  .how-works-cards::-webkit-scrollbar {
    height: 6px;
  }

  .how-works-cards::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.35);
    border-radius: 999px;
  }

  .how-card {
    flex: 0 0 auto;
    min-width: clamp(320px, 60vw, 820px);
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.32);
    scroll-snap-align: center;
  }

  .how-card-split {
    display: flex;
    gap: 2rem;
  }

  .how-card-left {
    flex: 1;
  }

  .how-card-badge {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--border-strong);
    background: rgba(255, 255, 255, 0.03);
    border-radius: 999px;
    padding: 0.35rem 0.9rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.82rem;
    margin-bottom: 1rem;
  }

  .how-card-title {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .how-card-text {
    margin: 0;
    color: var(--muted);
  }

  .how-card-right {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .how-code-snippet {
    background: var(--panel-strong);
    border: 1px solid var(--border-strong);
    border-radius: 0.85rem;
    padding: 1.5rem;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
    width: 100%;
    text-align: center;
  }

  .inline-code {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.95rem;
    color: var(--code);
  }

  .scroll-indicators {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 2rem;
  }

  .scroll-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
  }

  .scroll-dot.active {
    background: var(--accent);
    box-shadow: 0 0 15px rgba(124, 231, 207, 0.35);
  }

  .how-result {
    background: linear-gradient(135deg, rgba(124, 231, 207, 0.08), rgba(110, 168, 255, 0.1));
    border: 1px solid var(--border-strong);
    border-radius: 0.9rem;
    padding: 2.5rem;
    text-align: center;
    margin-top: 2rem;
    box-shadow: 0 22px 45px rgba(0, 0, 0, 0.35);
  }

  .result-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .result-title {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 1.8rem;
    margin: 0 0 1rem;
    color: var(--text);
  }

  .result-text {
    font-size: 1.125rem;
    color: var(--muted);
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .how-card-split {
      flex-direction: column;
    }
  }
</style>
