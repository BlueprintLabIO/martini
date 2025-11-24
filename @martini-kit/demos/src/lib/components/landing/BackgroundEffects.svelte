<script lang="ts">
  import { onMount } from 'svelte';

  interface Particle {
    id: number;
    left: number;
    top: number;
    delay: number;
    duration: number;
    char: string;
    color: string;
  }

  const PARTICLE_COUNT = 18;
  const particleColors = [
    'rgba(124, 231, 207, 0.22)',
    'rgba(140, 184, 255, 0.18)',
    'rgba(255, 255, 255, 0.18)'
  ];

  const particleShapes = ['•', '•', '◦', '∙', '•', '•'];

  let particles: Particle[] = [];

  onMount(() => {
    particles = Array.from({ length: PARTICLE_COUNT }).map((_, idx) => ({
      id: idx,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 12 + Math.random() * 15,
      char: particleShapes[Math.floor(Math.random() * particleShapes.length)],
      color: particleColors[Math.floor(Math.random() * particleColors.length)]
    }));
  });
</script>

<div class="cyber-background">
  <div class="grid-pattern"></div>
  <div class="gradient-wash"></div>
  <div class="particle-container">
    {#each particles as particle (particle.id)}
      <div
        class="particle"
        style={`left:${particle.left}%;top:${particle.top}%;animation-delay:${particle.delay}s;animation-duration:${particle.duration}s;color:${particle.color};`}
      >
        {particle.char}
      </div>
    {/each}
  </div>
  <div class="glow-orb orb-1"></div>
  <div class="glow-orb orb-2"></div>
</div>
<div class="vignette"></div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: transparent;
    color: var(--text);
    font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
  }

  .cyber-background {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px);
    background-size: 70px 70px;
    mask-image: radial-gradient(circle at 50% 30%, rgba(15, 23, 42, 0.35), transparent 70%);
    opacity: 0.6;
  }

  .gradient-wash {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 18% 22%, rgba(37, 99, 235, 0.07), transparent 42%),
      radial-gradient(circle at 82% 24%, rgba(14, 165, 233, 0.06), transparent 40%);
    filter: blur(1px);
  }

  .particle-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .particle {
    position: absolute;
    font-size: clamp(12px, 1.6vw, 22px);
    animation: float-particle 16s linear infinite;
    pointer-events: none;
    text-shadow: 0 0 12px currentColor;
    letter-spacing: 0.06em;
  }

  @keyframes float-particle {
    0% {
      transform: translateY(100vh) rotate(0deg);
      opacity: 0;
    }
    10%, 90% {
      opacity: 0.3;
    }
    100% {
      transform: translateY(-100vh) rotate(360deg);
      opacity: 0;
    }
  }

  .glow-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    animation: pulse-orb 12s ease-in-out infinite;
    opacity: 0.1;
  }

  .orb-1 { top: 14%; left: 18%; width: 420px; height: 420px; background: #d8e8ff; }
  .orb-2 { bottom: 12%; right: 16%; width: 520px; height: 520px; background: #d4f4ff; animation-delay: 2s; }

  @keyframes pulse-orb {
    0%, 100% { opacity: 0.12; transform: scale(1); }
    50% { opacity: 0.2; transform: scale(1.15); }
  }

  .vignette {
    position: fixed;
    inset: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(15, 23, 42, 0.08) 100%);
    pointer-events: none;
    z-index: 1;
  }
</style>
