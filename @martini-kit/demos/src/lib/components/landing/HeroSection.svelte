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
    <h1 class="hero-headline gradient-text">Build multiplayer like single-player.</h1>
    <p class="hero-subheadline glow-text">Declarative state. Instant sync. No servers.</p>

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
  }

  .hero-headline {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    margin: 0 0 1rem;
    line-height: 1.1;
  }

  .hero-subheadline {
    font-size: clamp(1.25rem, 3vw, 1.8rem);
    margin: 0 auto 2.5rem;
    color: rgba(224, 224, 255, 0.8);
    max-width: 520px;
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
  }

  .btn-primary {
    background: linear-gradient(135deg, #00ffff, #0080ff);
    color: #000;
    text-decoration: none;
    box-shadow:
      0 0 30px rgba(0, 255, 255, 0.45),
      0 10px 30px rgba(0, 0, 0, 0.4);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .btn-primary:hover {
    transform: translateY(-3px);
    box-shadow:
      0 0 40px rgba(0, 255, 255, 0.65),
      0 15px 30px rgba(0, 0, 0, 0.5);
  }

  .btn-icon {
    width: 1rem;
    height: 1rem;
  }

  .btn-code {
    border: 1px solid rgba(0, 255, 255, 0.4);
    background: rgba(0, 0, 0, 0.6);
    color: #00ffff;
    font-family: 'JetBrains Mono', monospace;
    cursor: pointer;
    position: relative;
    font-size: 0.9rem;
    line-height: 1;
    white-space: nowrap;
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
    border-color: rgba(0, 255, 255, 0.7);
    background: rgba(0, 0, 0, 0.8);
  }

  .copy-icon,
  .code-text {
    pointer-events: none;
  }

  .copy-feedback {
    font-size: 0.85rem;
    color: #fff;
  }

  .microproof {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    color: rgba(224, 224, 255, 0.7);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .gradient-text {
    background: linear-gradient(
      90deg,
      #00ffff 0%,
      #00d4ff 20%,
      #00a8ff 40%,
      #ff00ff 60%,
      #00ffff 80%,
      #00ffff 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-shift 8s ease-in-out infinite;
  }

  @keyframes gradient-shift {
    0%, 100% {
      background-position: 0% center;
    }
    50% {
      background-position: 200% center;
    }
  }

  .glow-text {
    text-shadow:
      0 0 20px rgba(0, 255, 255, 0.5),
      0 0 40px rgba(0, 255, 255, 0.3),
      0 0 60px rgba(0, 255, 255, 0.2);
    animation: text-glow-pulse 3s ease-in-out infinite;
  }

  @keyframes text-glow-pulse {
    0%, 100% {
      text-shadow:
        0 0 20px rgba(0, 255, 255, 0.5),
        0 0 40px rgba(0, 255, 255, 0.3),
        0 0 60px rgba(0, 255, 255, 0.2);
    }
    50% {
      text-shadow:
        0 0 30px rgba(0, 255, 255, 0.8),
        0 0 60px rgba(0, 255, 255, 0.5),
        0 0 90px rgba(0, 255, 255, 0.3);
    }
  }
</style>
