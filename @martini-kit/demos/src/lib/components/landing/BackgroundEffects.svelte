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

  const PARTICLE_COUNT = 40;
  const particleColors = [
    'rgba(0, 255, 255, 0.4)',
    'rgba(255, 0, 255, 0.4)',
    'rgba(255, 105, 180, 0.4)',
    'rgba(138, 43, 226, 0.4)',
    'rgba(255, 215, 0, 0.4)',
    'rgba(0, 255, 127, 0.4)'
  ];

  const particleShapes = ['◆', '▲', '●', '■', '✦', '✧', '◈', '▼', '◀', '▶'];

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
  <div class="grid-surge"></div>
  <div class="diagonal-stripes"></div>
  <div class="arcade-bars"></div>
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
  <div class="arcade-lights">
    <div class="arcade-light" style="left: 10%; top: 15%;"></div>
    <div class="arcade-light" style="left: 25%; top: 35%;"></div>
    <div class="arcade-light" style="left: 70%; top: 25%;"></div>
    <div class="arcade-light" style="left: 85%; top: 55%;"></div>
    <div class="arcade-light" style="left: 15%; top: 75%;"></div>
    <div class="arcade-light" style="left: 60%; top: 80%;"></div>
    <div class="arcade-light" style="left: 40%; top: 10%;"></div>
    <div class="arcade-light" style="left: 90%; top: 90%;"></div>
  </div>
  <div class="glow-orb orb-1"></div>
  <div class="glow-orb orb-2"></div>
  <div class="glow-orb orb-3"></div>
  <div class="glow-orb orb-4"></div>

  <div class="planets-container">
    <div class="planet planet-1">
      <div class="planet-ring"></div>
    </div>
    <div class="planet planet-2"></div>
    <div class="planet planet-3">
      <div class="planet-moon"></div>
    </div>
    <div class="planet planet-4"></div>
  </div>
</div>
<div class="scanlines"></div>
<div class="film-grain"></div>
<div class="vignette"></div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #000;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
      linear-gradient(to right, rgba(0, 255, 255, 0.08) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0, 255, 255, 0.08) 1px, transparent 1px);
    background-size: 60px 60px;
  }

  .grid-surge {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, transparent 0%, rgba(0, 255, 255, 0.6) 50%, transparent 100%),
      linear-gradient(to bottom, transparent 0%, rgba(0, 255, 255, 0.6) 50%, transparent 100%);
    background-size: 300px 300px;
    opacity: 0;
    animation: surge-pulse 8s ease-in-out infinite;
  }

  @keyframes surge-pulse {
    0%, 90% {
      opacity: 0;
    }
    92%, 94% {
      opacity: 0.4;
    }
    93% {
      opacity: 0.8;
    }
    95%, 100% {
      opacity: 0;
    }
  }

  .diagonal-stripes,
  .arcade-bars {
    position: absolute;
    inset: 0;
    opacity: 0.08;
    background: repeating-linear-gradient(
      135deg,
      rgba(0, 255, 255, 0.08) 0,
      rgba(0, 255, 255, 0.08) 10px,
      transparent 10px,
      transparent 20px
    );
  }

  .particle-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .particle {
    position: absolute;
    font-size: clamp(14px, 1.8vw, 28px);
    animation: float-particle 20s linear infinite;
    pointer-events: none;
    text-shadow:
      0 0 10px currentColor,
      0 0 20px currentColor;
    filter: drop-shadow(0 0 5px currentColor);
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

  .arcade-lights {
    position: absolute;
    inset: 0;
  }

  .arcade-light {
    position: absolute;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 255, 255, 0.6), transparent 70%);
    filter: blur(20px);
    animation: light-pulse 6s ease-in-out infinite;
  }

  @keyframes light-pulse {
    0%, 100% {
      opacity: 0.4;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  .glow-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    animation: pulse-orb 10s ease-in-out infinite;
    opacity: 0.1;
  }

  .orb-1 { top: 10%; left: 10%; width: 500px; height: 500px; background: #00ffff; }
  .orb-2 { top: 50%; right: 10%; width: 600px; height: 600px; background: #ff00ff; animation-delay: 2s; }
  .orb-3 { bottom: 10%; left: 30%; width: 550px; height: 550px; background: #ff69b4; animation-delay: 4s; }
  .orb-4 { top: 70%; right: 40%; width: 450px; height: 450px; background: #8a2be2; animation-delay: 6s; }

  @keyframes pulse-orb {
    0%, 100% { opacity: 0.12; transform: scale(1); }
    50% { opacity: 0.2; transform: scale(1.15); }
  }

  .planets-container {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .planet {
    position: absolute;
    border-radius: 50%;
    opacity: 0.4;
    animation: planet-float 20s ease-in-out infinite;
  }

  @keyframes planet-float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-30px) rotate(180deg); }
  }

  .planet-1 {
    width: 120px;
    height: 120px;
    top: 15%;
    right: 12%;
    background: radial-gradient(circle at 30% 30%, #00ffff, #0080ff, #000080);
    box-shadow:
      0 0 40px rgba(0, 255, 255, 0.4),
      inset -10px -10px 30px rgba(0, 0, 0, 0.5),
      inset 5px 5px 20px rgba(255, 255, 255, 0.1);
    animation-duration: 25s;
  }

  .planet-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 180px;
    height: 60px;
    border: 3px solid rgba(0, 255, 255, 0.3);
    border-radius: 50%;
    transform: translate(-50%, -50%) rotateX(75deg);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }

  .planet-2 {
    width: 80px;
    height: 80px;
    top: 60%;
    left: 8%;
    background: radial-gradient(circle at 35% 35%, #ff00ff, #8b008b, #4b0082);
    box-shadow:
      0 0 30px rgba(255, 0, 255, 0.4),
      inset -8px -8px 25px rgba(0, 0, 0, 0.5),
      inset 5px 5px 15px rgba(255, 255, 255, 0.1);
    animation-duration: 30s;
    animation-delay: -5s;
  }

  .planet-3 {
    width: 100px;
    height: 100px;
    bottom: 20%;
    right: 20%;
    background: radial-gradient(circle at 30% 30%, #ff69b4, #ff1493, #8b0045);
    box-shadow:
      0 0 35px rgba(255, 105, 180, 0.4),
      inset -10px -10px 28px rgba(0, 0, 0, 0.5),
      inset 5px 5px 18px rgba(255, 255, 255, 0.1);
    animation-duration: 28s;
    animation-delay: -10s;
  }

  .planet-moon {
    position: absolute;
    width: 30px;
    height: 30px;
    top: -10px;
    right: -20px;
    background: radial-gradient(circle at 30% 30%, #fff, #bbb);
    border-radius: 50%;
    box-shadow:
      0 0 10px rgba(255, 255, 255, 0.4),
      inset -4px -4px 10px rgba(0, 0, 0, 0.4);
  }

  .planet-4 {
    width: 60px;
    height: 60px;
    top: 25%;
    left: 30%;
    background: radial-gradient(circle at 35% 35%, #8a2be2, #4b0082, #2b004b);
    box-shadow:
      0 0 25px rgba(138, 43, 226, 0.4),
      inset -6px -6px 18px rgba(0, 0, 0, 0.5),
      inset 4px 4px 12px rgba(255, 255, 255, 0.1);
    animation-duration: 35s;
    animation-delay: -8s;
  }

  .film-grain {
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 101;
    animation: grain-flicker 0.3s steps(2) infinite;
    opacity: 0.4;
  }

  @keyframes grain-flicker {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 0.45; }
  }

  .scanlines {
    position: fixed;
    inset: 0;
    background-image: linear-gradient(transparent 50%, rgba(0, 255, 255, 0.025) 50%);
    background-size: 100% 4px;
    pointer-events: none;
    z-index: 100;
    opacity: 0.4;
    animation: scanline-flicker 0.15s infinite;
  }

  @keyframes scanline-flicker {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 0.45; }
  }

  .vignette {
    position: fixed;
    inset: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.6) 100%);
    pointer-events: none;
    z-index: 1;
  }
</style>
