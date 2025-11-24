<script lang="ts">
  import { gameMetadata } from '$lib/games/ide-configs-map';

  const shortTaglines: Record<string, string> = {
    'fire-and-ice': 'Dash, solve, and sync co-op',
    'paddle-battle': 'A sharper, faster Pong',
    'blob-battle': 'Grow, chase, outmaneuver',
    'arena-blaster': 'Twin-stick chaos in sync',
    'circuit-racer': 'Tight top-down racing',
    'tile-matcher': 'Connect Four with friends'
  };

  const games = Object.entries(gameMetadata).map(([id, meta]) => ({
    id,
    ...meta,
    tagline: shortTaglines[id] ?? meta.tagline ?? meta.description
  }));
</script>

<svelte:head>
  <title>Interactive Games - martini-kit</title>
</svelte:head>

<div class="preview-page">
  <header class="preview-hero">
    <div class="container">
      <p class="eyebrow">Live demos</p>
      <h1>Preview every martini game instantly.</h1>
      <p class="subhead">Launch, tweak, and share dual-player demos—no servers, no setup.</p>
    </div>
  </header>

  <main class="container">
    <section class="section">
      <div class="section-header">
        <h2>Game gallery</h2>
        <p>Pick a demo and see it sync across two tabs.</p>
      </div>

      <div class="games-grid">
        {#each games as game (game.id)}
          <a
            class="game-card"
            href={`/preview/${game.id}`}
            style={`--accent:${game.theme?.primary ?? '#7ce7cf'}`}
            data-sveltekit-preload-data="off"
          >
            <div class="card-top">
              <h3>{game.title}</h3>
              {#if game.difficulty}
                <span class={`badge badge-${game.difficulty}`}>{game.difficulty}</span>
              {/if}
            </div>
            <p class="description">{game.tagline}</p>
            <div class="card-foot">
              <span class="tag">Live code</span>
              <span class="cta">Open →</span>
            </div>
          </a>
        {/each}
      </div>
    </section>

  </main>
</div>

<style>
  .preview-page {
    min-height: 100vh;
    background: var(--bg-page);
    color: var(--text);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .preview-hero {
    padding: 4.5rem 0 3rem;
    position: relative;
  }

  .preview-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 25% 25%, rgba(124, 231, 207, 0.12), transparent 45%), radial-gradient(circle at 75% 20%, rgba(140, 184, 255, 0.1), transparent 40%);
    pointer-events: none;
    filter: blur(1px);
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.8rem;
    color: var(--muted-2);
    margin: 0 0 0.5rem 0;
  }

  .preview-hero h1 {
    margin: 0 0 1rem 0;
    font-size: clamp(2.6rem, 4.4vw, 3.9rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .subhead {
    margin: 0;
    max-width: 700px;
    font-size: 1.05rem;
    color: var(--muted);
    line-height: 1.6;
  }

  .section {
    margin: 3rem 0 3.25rem;
  }

  .section-header {
    margin-bottom: 1.75rem;
  }

  .section-header h2 {
    margin: 0 0 0.35rem 0;
    font-size: 1.6rem;
    font-weight: 700;
  }

  .section-header p {
    margin: 0;
    color: var(--muted);
  }

  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  .game-card {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 1.5rem;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 1rem;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  }

  .game-card:hover {
    transform: translateY(-3px);
    border-color: var(--border-strong);
    background: #f9fbff;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  .game-card h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .description {
    margin: 0;
    color: var(--muted);
    line-height: 1.55;
  }

  .card-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: auto;
  }

  .tag {
    font-size: 0.85rem;
    color: var(--muted-2);
  }

  .cta {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--accent);
  }

  .badge {
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: capitalize;
    color: #0b0f1a;
    background: var(--accent);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .badge-beginner { background: color-mix(in srgb, var(--accent) 70%, #9fe7a4); }
  .badge-intermediate { background: color-mix(in srgb, var(--accent) 70%, #b5d5ff); }
  .badge-advanced { background: color-mix(in srgb, var(--accent) 70%, #d6a1ff); }

  .info-section {
    margin: 3.5rem 0 4.5rem;
    background: linear-gradient(180deg, #f7f9ff, #ffffff);
    border: 1px solid var(--border);
    border-radius: 1.1rem;
    padding: 2rem 1.75rem;
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
  }

  .info-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .info-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .info-header p {
    margin: 0;
    color: var(--muted);
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.25rem;
  }

  .feature {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 0.95rem;
    padding: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    color: var(--text);
  }

  .feature-icon {
    font-size: 1.5rem;
  }

  .feature h3 {
    margin: 0;
    font-size: 1.05rem;
  }

  .feature p {
    margin: 0;
    color: var(--muted);
    line-height: 1.5;
  }
</style>
