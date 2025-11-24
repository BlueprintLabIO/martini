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
    background: var(--panel);
    backdrop-filter: blur(4px);
    border: 1px solid var(--border);
    border-radius: 0.9rem;
    padding: 2rem;
    transition: border-color 0.2s ease, transform 0.2s ease;
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.1);
  }

  .qs-highlight {
    grid-column: 1 / -1;
  }

  .qs-main-step:hover {
    border-color: var(--border-strong);
    transform: translateY(-2px);
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
    background: linear-gradient(135deg, rgba(124, 231, 207, 0.14), rgba(140, 184, 255, 0.15));
    color: var(--text);
    font-weight: 800;
    font-size: 1.15rem;
    border-radius: 40%;
    flex-shrink: 0;
    box-shadow: inset 0 0 0 1px var(--border-strong), 0 10px 18px rgba(15, 23, 42, 0.14);
  }

  .qs-main-title {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0;
  }

  .qs-main-content {
    padding-left: 0;
    font-size: 1rem;
    color: var(--muted);
    line-height: 1.6;
  }
</style>
