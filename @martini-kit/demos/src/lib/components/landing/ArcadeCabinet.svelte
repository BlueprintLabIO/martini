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
    background: linear-gradient(180deg, #1a1a1f, #0a0a0f);
    border-radius: 1rem;
    border: 2px solid rgba(0, 255, 255, 0.15);
    box-shadow:
      0 15px 35px rgba(0, 0, 0, 0.6),
      0 0 30px var(--game-color);
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition: transform 0.25s ease, border-color 0.25s ease;
  }

  .arcade-cabinet:hover {
    transform: translateY(-6px);
    border-color: rgba(0, 255, 255, 0.5);
  }

  .cabinet-marquee {
    background: linear-gradient(180deg, var(--game-color) 0%, rgba(0, 0, 0, 0.8) 100%);
    padding: 0.75rem;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
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
    background: #ffff00;
    box-shadow: 0 0 8px #ffff00;
    animation: marquee-blink 1.5s ease-in-out infinite;
  }

  .marquee-light:nth-child(2) { animation-delay: 0.3s; }
  .marquee-light:nth-child(3) { animation-delay: 0.6s; }

  @keyframes marquee-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .screen-bezel {
    padding: 1.25rem;
    background: linear-gradient(135deg, #2a2a2f, #19191d);
  }

  .screen-inner {
    aspect-ratio: 3 / 4;
    background: radial-gradient(circle at center, rgba(0, 0, 0, 0.9), #000);
    border-radius: 12px;
    border: 4px solid rgba(255, 255, 255, 0.05);
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
    filter:
      drop-shadow(0 0 12px var(--game-color))
      drop-shadow(0 0 24px var(--game-color));
    animation: emoji-float 3s ease-in-out infinite;
  }

  @keyframes emoji-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  .game-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .game-description {
    margin: 0;
    font-size: 0.9rem;
    color: rgba(224, 224, 255, 0.75);
  }

  .control-panel {
    padding: 1.2rem;
    background: linear-gradient(180deg, #181820, #0b0b10);
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
    font-family: 'Orbitron', sans-serif;
    font-size: 0.75rem;
    letter-spacing: 2px;
    color: #ffff00;
    animation: coin-blink 2s ease-in-out infinite;
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
    background: linear-gradient(135deg, var(--game-color), #ffffff);
    color: #000;
    font-weight: 700;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
  }

  .cabinet-bottom {
    height: 12px;
    background: #050505;
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
