<script lang="ts">
  let copied = false;

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText('npm install @martini/core @martini/phaser');
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch (error) {
      console.error('Failed to copy install command', error);
    }
  }
</script>

<section class="hero-section" id="top">
  <div class="hero-content">
    <h1 class="hero-headline gradient-text">Multiplayer without networking.</h1>
    <p class="hero-subheadline glow-text">Ship real-time games in an afternoon—Martini handles sync, transport, and hosting.</p>

    <div class="hero-buttons">
      <a href="#demos" class="btn-primary">
        <span>Play Demos</span>
        <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
        </svg>
      </a>
      <button class="btn-code" type="button" on:click={copyInstall}>
        <span class="code-text">npm install @martini/core</span>
        <svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {#if copied}
          <span class="copy-feedback">Copied!</span>
        {/if}
      </button>
    </div>

    <div class="microproof">
      <span class="proof-item">96% coverage</span>
      <span class="proof-divider">•</span>
      <span class="proof-item">&lt;1KB patches</span>
      <span class="proof-divider">•</span>
      <span class="proof-item">Host-authoritative</span>
    </div>
  </div>
</section>

<style>
  .hero-section {
    position: relative;
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    z-index: 10;
  }

  .hero-content {
    max-width: 900px;
    text-align: center;
    color: var(--text);
  }

  .hero-headline {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: clamp(3rem, 6.8vw, 4.8rem);
    margin: 0 0 1.1rem;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }

  .hero-subheadline {
    font-size: clamp(1.05rem, 2.2vw, 1.35rem);
    margin: 0 auto 2.25rem;
    color: var(--muted);
    max-width: 520px;
    font-weight: 500;
  }

  .hero-buttons {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
    margin-bottom: 2rem;
  }

  .btn-primary,
  .btn-code {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    border-radius: 999px;
    padding: 0 1.75rem;
    min-height: 48px;
    font-weight: 600;
    line-height: 1;
    font-family: 'Space Grotesk', system-ui, sans-serif;
  }

  .btn-primary {
    background: linear-gradient(135deg, #6bdad7, #6ea8ff);
    color: #04101d;
    text-decoration: none;
    border: none;
    box-shadow: 0 16px 36px rgba(37, 99, 235, 0.2);
    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.4);
    opacity: 0.95;
  }

  .btn-icon {
    width: 1rem;
    height: 1rem;
  }

  .btn-code {
    border: 1px solid var(--border);
    background: #f5f7fb;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    cursor: pointer;
    position: relative;
    font-size: 0.9rem;
    line-height: 1;
    white-space: nowrap;
    transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
  }

  .copy-icon,
  .btn-icon {
    width: 1rem;
    height: 1rem;
  }

  .copy-icon {
    stroke-width: 2;
  }

  .btn-code:hover {
    border-color: var(--border-strong);
    background: #eef2fb;
    transform: translateY(-2px);
  }

  .copy-icon,
  .code-text {
    pointer-events: none;
  }

  .copy-feedback {
    font-size: 0.85rem;
    color: var(--accent);
  }

  .microproof {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    color: var(--muted-2);
    letter-spacing: 0.04em;
    text-transform: none;
    font-weight: 500;
  }

  .gradient-text {
    background: linear-gradient(120deg, #0b1220, #1a2c4a 45%, #2b6f88 90%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .glow-text {
    color: var(--muted);
  }
</style>
