<script lang="ts">
  const cards = [
    {
      badge: 'defineGame()',
      title: 'Describe your game',
      text: 'Plain objects for state. No classes or networking code.',
      code: "setup: () => ({ paddles: [], ball: { x, y, dx, dy } })"
    },
    {
      badge: 'submitAction()',
      title: 'Players interact',
      text: 'Call actions from player input. Martini syncs instantly.',
      code: 'actions: { move: (state, id, y) => ... }'
    },
    {
      badge: 'onChange()',
      title: 'Render updates',
      text: 'React to state changes. Draw with any engine you want.',
      code: 'onChange(state => sprite.x = state.ball.x)'
    }
  ];
</script>

<section id="how-it-works" class="how-works-section">
  <div class="section-container">
    <h2 class="section-title" data-text="How It Works">How It Works</h2>
    <p class="section-intro">
      Three simple APIs. That's it. Here's how you'd build a multiplayer paddle game:
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
        Open two browser tabs. Both see the same game. One moves a paddle, the other sees it instantly. No backend, no deployment, no DevOps nightmares.
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
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(0, 255, 255, 0.3);
    border-radius: 0.75rem;
    padding: 2rem;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
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
    border: 1px solid rgba(0, 255, 255, 0.4);
    border-radius: 999px;
    padding: 0.35rem 1rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .how-card-title {
    margin: 0 0 0.5rem;
    font-size: 1.35rem;
  }

  .how-card-text {
    margin: 0;
    color: rgba(224, 224, 255, 0.7);
  }

  .how-card-right {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .how-code-snippet {
    background: rgba(5, 10, 20, 0.75);
    border: 1px solid rgba(0, 255, 255, 0.4);
    border-radius: 0.75rem;
    padding: 1.75rem;
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.15);
    width: 100%;
    text-align: center;
  }

  .inline-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    color: #e0e0ff;
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
    background: rgba(0, 255, 255, 0.2);
    border: 1px solid rgba(0, 255, 255, 0.4);
  }

  .scroll-dot.active {
    background: #00ffff;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
  }

  .how-result {
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.05));
    border: 2px solid rgba(0, 255, 255, 0.3);
    border-radius: 0.75rem;
    padding: 2.5rem;
    text-align: center;
    margin-top: 2rem;
  }

  .result-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .result-title {
    font-family: 'Orbitron', sans-serif;
    font-size: 2rem;
    margin: 0 0 1rem;
    color: #00ffff;
  }

  .result-text {
    font-size: 1.125rem;
    color: rgba(224, 224, 255, 0.8);
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
