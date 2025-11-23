<script lang="ts">
  export let number: string | number;
  export let title: string;
  export let highlight = false;
</script>

<div class={`qs-main-step ${highlight ? 'qs-highlight' : ''}`.trim()}>
  <div class="qs-main-header">
    <div class="qs-main-number">{number}</div>
    <h3 class="qs-main-title">{title}</h3>
  </div>
  <div class="qs-main-content">
    <slot />
  </div>
</div>

<style>
  .qs-main-step {
    background: rgba(0, 255, 255, 0.02);
    backdrop-filter: blur(5px);
    border: 1px solid rgba(0, 255, 255, 0.2);
    border-radius: 0.75rem;
    padding: 2rem;
    transition: all 0.3s ease;
  }

  .qs-highlight {
    grid-column: 1 / -1;
  }

  .qs-main-step:hover {
    border-color: rgba(0, 255, 255, 0.6);
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.08), rgba(255, 0, 255, 0.04));
    box-shadow:
      0 15px 50px rgba(0, 255, 255, 0.2),
      0 0 40px rgba(0, 255, 255, 0.15),
      inset 0 0 30px rgba(0, 255, 255, 0.03);
  }

  .qs-main-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .qs-main-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #00ffff, #0080ff, #00ffff);
    background-size: 200% 200%;
    color: #000;
    font-weight: 900;
    font-size: 1.5rem;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow:
      0 0 30px rgba(0, 255, 255, 0.6),
      0 0 60px rgba(0, 255, 255, 0.3),
      inset 0 0 20px rgba(255, 255, 255, 0.3);
    animation: number-pulse 3s ease-in-out infinite;
    position: relative;
  }

  .qs-main-number::before {
    content: '';
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 255, 255, 0.4) 0%, transparent 70%);
    animation: ring-pulse 3s ease-in-out infinite;
    z-index: -1;
  }

  @keyframes number-pulse {
    0%, 100% {
      box-shadow:
        0 0 30px rgba(0, 255, 255, 0.6),
        0 0 60px rgba(0, 255, 255, 0.3),
        inset 0 0 20px rgba(255, 255, 255, 0.3);
      background-position: 0% 0%;
    }
    50% {
      box-shadow:
        0 0 40px rgba(0, 255, 255, 0.8),
        0 0 80px rgba(0, 255, 255, 0.4),
        inset 0 0 25px rgba(255, 255, 255, 0.4);
      background-position: 100% 100%;
    }
  }

  @keyframes ring-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.3);
      opacity: 0.8;
    }
  }

  .qs-main-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.375rem;
    font-weight: 700;
    margin: 0;
  }

  .qs-main-content {
    padding-left: 0;
    font-size: 1rem;
    color: rgba(224, 224, 255, 0.75);
    line-height: 1.6;
  }
</style>
