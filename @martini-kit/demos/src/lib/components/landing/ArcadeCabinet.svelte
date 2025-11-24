<script lang="ts">
  export interface ArcadeDemo {
    id: string;
    title: string;
    name?: string;
    description: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    color: string;
    emoji: string;
  }

  export let demo: ArcadeDemo;
</script>

<a class="arcade-cabinet" style={`--game-color:${demo.color};`} href={`/preview/${demo.id}`}>
  <div class="cabinet-marquee">
    <div class="marquee-lights">
      <span class="marquee-light"></span>
      <span class="marquee-light"></span>
      <span class="marquee-light"></span>
    </div>
  </div>

  <div class="screen-bezel">
    <div class="screen-inner">
      <div class="crt-effect"></div>
      <div class="screen-content">
        <div class="game-emoji" aria-hidden="true">{demo.emoji}</div>
        <h3 class="game-title">{demo.title}</h3>
        {#if demo.difficulty}
          <span class={`badge badge-${demo.difficulty}`}>{demo.difficulty}</span>
        {/if}
        <p class="game-description">{demo.description}</p>
      </div>
    </div>
  </div>

  <div class="control-panel">
    <div class="insert-coin">
      <span class="coin-icon">🪙</span>
      <span class="coin-text">INSERT COIN</span>
    </div>
    <div class="start-button">
      Play Demo →
    </div>
  </div>

  <div class="cabinet-bottom"></div>
</a>

<style>
  .arcade-cabinet {
    position: relative;
    width: 280px;
    flex: 0 0 auto;
    background: linear-gradient(180deg, #0f1423, #0a0d18);
    border-radius: 1rem;
    border: 1px solid var(--border);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.02);
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .arcade-cabinet:hover {
    transform: translateY(-4px);
    border-color: var(--border-strong);
    box-shadow: 0 22px 44px rgba(0, 0, 0, 0.45);
  }

  .cabinet-marquee {
    background: linear-gradient(180deg, var(--game-color), #0b0f1b);
    padding: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .marquee-lights {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }

  .marquee-light {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.45);
    animation: marquee-blink 2.4s ease-in-out infinite;
  }

  .marquee-light:nth-child(2) { animation-delay: 0.5s; }
  .marquee-light:nth-child(3) { animation-delay: 1s; }

  @keyframes marquee-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .screen-bezel {
    padding: 1.25rem;
    background: linear-gradient(135deg, #161b2a, #0f1321);
  }

  .screen-inner {
    aspect-ratio: 3 / 4;
    background: radial-gradient(circle at center, rgba(4, 8, 16, 0.9), #05070f);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .screen-content {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    transform: scale(0.95);
  }

  .game-emoji {
    font-size: 2.5rem;
    filter: drop-shadow(0 0 10px var(--game-color));
    animation: emoji-float 3s ease-in-out infinite;
  }

  @keyframes emoji-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  .game-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  .game-description {
    margin: 0;
    font-size: 0.9rem;
    color: var(--muted);
    text-align: center;
  }

  .control-panel {
    padding: 1.2rem;
    background: linear-gradient(180deg, #0d111d, #0b0f1a);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
  }

  .insert-coin {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 0.78rem;
    letter-spacing: 1px;
    color: var(--muted-2);
    animation: coin-blink 3s ease-in-out infinite;
  }

  @keyframes coin-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .coin-icon {
    font-size: 1.25rem;
  }

  .start-button {
    width: 100%;
    text-align: center;
    background: linear-gradient(135deg, var(--game-color), #d6eaff);
    color: #0b0f1a;
    font-weight: 700;
    padding: 0.75rem 1rem;
    border-radius: 0.65rem;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
  }

  .cabinet-bottom {
    height: 12px;
    background: #07090f;
  }

  .badge {
    padding: 0.2rem 0.75rem;
    border-radius: 999px;
    text-transform: capitalize;
    font-size: 0.65rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .badge-beginner { color: #49ff9c; }
  .badge-intermediate { color: #ffc857; }
  .badge-advanced { color: #ff7aa2; }
</style>
