<script lang="ts">
  import { onMount } from 'svelte';

  let mouseX = 0;
  let mouseY = 0;
  let mounted = false;

  onMount(() => {
    mounted = true;
    const handleMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  });
</script>

{#if mounted}
  <div class="mouse-spotlight" style={`left:${mouseX}px;top:${mouseY}px;`}></div>
  <div class="mouse-glow" style={`left:${mouseX}px;top:${mouseY}px;`}></div>
{/if}

<style>
  .mouse-spotlight,
  .mouse-glow {
    position: fixed;
    pointer-events: none;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
  }

  .mouse-spotlight {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(0, 255, 255, 0.08) 0%, transparent 70%);
    transition: all 0.8s ease-out;
  }

  .mouse-glow {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(0, 255, 255, 0.15) 0%, transparent 70%);
    mix-blend-mode: screen;
    z-index: 9;
    transition: opacity 0.3s ease;
  }
</style>
