<script lang="ts">
  let copied = false;

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(
        "npm install @martini/core @martini/phaser",
      );
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch (error) {
      console.error("Failed to copy install command", error);
    }
  }
</script>

<section class="hero-section" id="top">
  <div class="hero-content">
    <h1 class="hero-headline gradient-text">
      Multiplayer. <br />Without networking.
    </h1>
    <p class="hero-subheadline glow-text">
      Write multiplayer like React state. <br />Martini keeps clients in sync,
      across engines and transports.
    </p>

    <div class="hero-buttons">
      <button class="btn-code" type="button" on:click={copyInstall}>
        <span class="code-text">npm install @martini/core</span>
        <svg
          class="copy-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {#if copied}
          <span class="copy-feedback">Copied!</span>
        {/if}
      </button>
    </div>

    <div class="microproof">
      <span class="proof-item">Declarative like React</span>
      <span class="proof-divider">•</span>
      <span class="proof-item">Phaser helper today</span>
      <span class="proof-divider">•</span>
      <span class="proof-item">Transport agnostic</span>
      <span class="proof-divider">•</span>
      <span class="proof-item">Swap without refactors</span>
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
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-size: clamp(3rem, 6.8vw, 4.8rem);
    margin: 0 0 1.1rem;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }

  .hero-subheadline {
    font-size: clamp(1rem, 2vw, 1.25rem);
    margin: 0 auto 2.25rem;
    color: var(--muted);
    max-width: 600px;
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

  .btn-code {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    border-radius: 999px;
    padding: 0 1.75rem;
    min-height: 48px;
    font-weight: 600;
    line-height: 1;
    font-family: "Space Grotesk", system-ui, sans-serif;
  }

  .copy-icon {
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
