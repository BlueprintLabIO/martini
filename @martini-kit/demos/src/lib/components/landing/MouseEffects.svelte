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
    width: 380px;
    height: 380px;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 65%);
    transition: all 0.8s ease-out;
  }

  .mouse-glow {
    width: 320px;
    height: 320px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%);
    mix-blend-mode: soft-light;
    z-index: 9;
    transition: opacity 0.3s ease;
  }
</style>
