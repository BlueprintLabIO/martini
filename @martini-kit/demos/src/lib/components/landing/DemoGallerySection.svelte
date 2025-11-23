<script lang="ts">
  import ArcadeCabinet, { type ArcadeDemo } from './ArcadeCabinet.svelte';
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
    'fire-and-ice': 'Co-op platform dash & puzzle',
    'paddle-battle': 'Modern Pong duel',
    'blob-battle': 'Grow, chase, and absorb',
    'arena-blaster': 'Twin-stick shooter chaos',
    'circuit-racer': 'Top-down racing sprint',
    'tile-matcher': 'Connect Four tactics'
  };

  const demos = arcadeDetails.reduce<ArcadeDemo[]>((acc, detail) => {
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
      Launch the martini-kit IDE with two synced instances. Edit code, test multiplayer locally, and share
      your preview link with a single click.
    </p>

    <div class="arcade-scroll" role="list">
      {#each demos as demo (demo.id)}
        <ArcadeCabinet {demo} />
      {/each}
    </div>
  </div>
</section>

<style>
  .demos-section {
    padding: 6rem 0;
  }

  .arcade-scroll {
    display: flex;
    gap: 1.25rem;
    overflow-x: auto;
    padding-bottom: 1rem;
    scroll-snap-type: x proximity;
  }

  .arcade-scroll :global(.arcade-cabinet) {
    scroll-snap-align: start;
  }

  .arcade-scroll::-webkit-scrollbar {
    height: 6px;
  }

  .arcade-scroll::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.4);
    border-radius: 999px;
  }
</style>
