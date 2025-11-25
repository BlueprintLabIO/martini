<script lang="ts">
  const pillars = [
    {
      title: "Declarative like React",
      description:
        "Define setup, actions, and ticks like components/hooks for networked state. Martini handles validation and sync.",
      highlight: "Fewer race conditions, no manual diffing.",
    },
    {
      title: "Engine-agnostic core",
      description:
        "Portable core first. Phaser helper ships today; Godot adapter is in development, with more engines planned.",
      highlight: "Keep game logic, swap engines without rewrites.",
    },
    {
      title: "Transport abstraction",
      description:
        "Swap WebSockets or WebRTC/P2P without refactoring game logic. Ordering, batching, and reconnection are handled.",
      highlight: "No protocol rewrites.",
    },
  ];

  let activeIndex = $state(0);
</script>

<section class="pillars-section">
  <div class="section-container">
    <div class="pillars-header">
      <h2 class="section-title" data-text="Why Martini">Why Martini</h2>
      <p class="pillars-badge">
        Phaser helper available now • Godot adapter in development • More
        engines on deck
      </p>
    </div>
    <div class="list-detail">
      <div class="list-col" role="tablist">
        {#each pillars as pillar, index}
          <button
            class="list-item"
            class:active={activeIndex === index}
            role="tab"
            aria-selected={activeIndex === index}
            onclick={() => (activeIndex = index)}
          >
            <span class="list-dot"></span>
            <span>{pillar.title}</span>
          </button>
        {/each}
      </div>
      <div class="detail-card" role="tabpanel" tabindex="0">
        <p class="pill-label">{pillars[activeIndex].title}</p>
        <p>{pillars[activeIndex].description}</p>
        <div class="pillar-highlight">{pillars[activeIndex].highlight}</div>
      </div>
    </div>
  </div>
</section>

<style>
  .pillars-section {
    padding: 5rem 0;
  }

  .pillars-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .pillars-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1rem;
    background: rgba(37, 99, 235, 0.06);
    color: var(--muted);
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.95rem;
    margin: 0;
  }

  .list-detail {
    display: grid;
    grid-template-columns: 1fr 1.8fr;
    gap: 1rem;
    align-items: start;
  }

  .list-col {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border-right: 1px solid var(--border);
    padding-right: 0.75rem;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.65rem 0.75rem;
    border: none;
    background: transparent;
    border-radius: 0.75rem;
    cursor: pointer;
    color: var(--muted);
    font-weight: 700;
    transition: all 0.2s ease;
    text-align: left;
  }

  .list-item:hover {
    background: #f5f7fb;
    color: var(--text);
  }

  .list-item.active {
    background: #ffffff;
    color: var(--text);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
    border: 1px solid var(--border);
  }

  .list-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent, #2563eb);
    flex-shrink: 0;
  }

  .detail-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
    min-height: 200px;
  }

  .pill-label {
    margin: 0 0 0.35rem;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text);
  }

  p {
    margin: 0 0 0.9rem;
    color: var(--muted);
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .list-detail {
      grid-template-columns: 1fr;
    }

    .list-col {
      border-right: none;
      padding-right: 0;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
    }
  }

  .pillar-highlight {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.85rem;
    background: #f5f7fb;
    border: 1px solid var(--border-strong);
    border-radius: 0.7rem;
    font-weight: 700;
    color: var(--text);
    font-size: 0.95rem;
  }
</style>
