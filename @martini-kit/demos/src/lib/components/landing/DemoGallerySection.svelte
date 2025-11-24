<script lang="ts">
  import { gameMetadata } from '$lib/games/ide-configs-map';

  const arcadeDetails = [
    { id: 'fire-and-ice', emoji: '🔥', color: '#ff006e' },
    { id: 'paddle-battle', emoji: '🏓', color: '#00f0ff' },
    { id: 'blob-battle', emoji: '🟢', color: '#7cff61' },
    { id: 'arena-blaster', emoji: '🎯', color: '#ffb703' },
    { id: 'circuit-racer', emoji: '🏎️', color: '#ffd23f' },
    { id: 'tile-matcher', emoji: '🔴', color: '#c77dff' }
  ];

  const shortDescriptions: Record<string, string> = {
    'fire-and-ice': 'Co-op platform dash',
    'paddle-battle': 'Modern Pong duel',
    'blob-battle': 'Grow and chase',
    'arena-blaster': 'Twin-stick chaos',
    'circuit-racer': 'Top-down sprint',
    'tile-matcher': 'Connect Four vibes'
  };

  const demos = arcadeDetails.reduce((acc, detail) => {
    const metadata = gameMetadata[detail.id];
    if (!metadata) return acc;
    acc.push({
      id: detail.id,
      title: metadata.title,
      name: metadata.title,
      description: shortDescriptions[detail.id] ?? metadata.description,
      difficulty: metadata.difficulty,
      color: detail.color,
      emoji: detail.emoji
    });
    return acc;
  }, []);
</script>

<section id="demos" class="demos-section">
  <div class="section-container">
    <h2 class="section-title" data-text="Interactive Code Previews">Interactive Code Previews</h2>
    <p class="section-intro">
      Launch the martini-kit IDE with two synced instances. Edit code, test multiplayer locally, and hand off a shareable preview link—no servers or setup.
    </p>

    <div class="demos-grid">
      {#each demos as demo (demo.id)}
        <a
          class="demo-card"
          style={`--accent:${demo.color};`}
          href={`/preview/${demo.id}`}
          data-sveltekit-preload-data="off"
        >
          <div class="card-top">
            <span class="demo-emoji">{demo.emoji}</span>
            {#if demo.difficulty}
              <span class={`badge badge-${demo.difficulty}`}>{demo.difficulty}</span>
            {/if}
          </div>
          <h3>{demo.title}</h3>
          <p>{demo.description}</p>
          <div class="card-footer">
            <span class="tag">Live preview</span>
            <span class="cta">Open →</span>
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>

<style>
  .demos-section {
    padding: 6rem 0;
  }

  .demos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.25rem;
  }

  .demo-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding: 1.35rem;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0.95rem;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .demo-card:hover {
    transform: translateY(-3px);
    border-color: var(--border-strong);
    box-shadow: 0 16px 34px rgba(15, 23, 42, 0.16);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .demo-emoji {
    font-size: 1.5rem;
    filter: drop-shadow(0 0 8px var(--accent, #7ce7cf));
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text);
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.97rem;
    line-height: 1.5;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-top: auto;
  }

  .tag {
    font-size: 0.85rem;
    color: var(--muted-2);
  }

  .cta {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--accent);
  }

  .badge {
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
    color: #0b0f1a;
    background: var(--accent);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .badge-intermediate { background: color-mix(in srgb, var(--accent) 70%, #b5d5ff); }
  .badge-advanced { background: color-mix(in srgb, var(--accent) 70%, #d6a1ff); }
</style>
