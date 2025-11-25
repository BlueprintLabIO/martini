<section class="cta-section">
  <div class="section-container">
    <div class="cta-shell">
      <div class="cta-copy">
        <p class="cta-kicker">Build in minutes</p>
        <h2 class="cta-title">Ready to build multiplayer?</h2>
        <p class="cta-subtitle">
          Ship real-time games with clean, readable code. Declarative logic, flexible transport, and a Phaser helper today (more adapters coming).
        </p>
      </div>
      <div class="cta-buttons">
        <a href="/docs" class="cta-btn-primary">
          <span>Read the API overview</span>
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <a href="#before-after" class="cta-btn-secondary">
          <svg class="github-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h8m-8 5h8m-8 5h8" />
          </svg>
          <span>See a minimal example</span>
        </a>
      </div>
    </div>
  </div>
</section>

<style>
  .cta-section {
    position: relative;
    padding: 5rem 0;
    z-index: 10;
  }

  .cta-shell {
    position: relative;
    overflow: hidden;
    border-radius: 1.5rem;
    padding: 3.5rem clamp(2rem, 4vw, 4rem);
    background: linear-gradient(120deg, #eef4ff 0%, #f8fffa 65%, #ffffff 100%);
    box-shadow: 0 24px 52px rgba(15, 23, 42, 0.14);
  }

  .cta-shell::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 20% 30%, rgba(37, 99, 235, 0.12), transparent 35%),
      radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.12), transparent 40%);
    pointer-events: none;
  }

  .cta-copy {
    position: relative;
    max-width: 760px;
    z-index: 1;
  }

  .cta-kicker {
    margin: 0 0 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--muted-2);
  }

  .cta-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(2.4rem, 5vw, 3.4rem);
    font-weight: 800;
    margin: 0 0 0.75rem;
    color: var(--text);
  }

  .cta-subtitle {
    font-size: clamp(1.05rem, 2vw, 1.25rem);
    color: var(--muted);
    margin: 0 0 2rem;
    line-height: 1.6;
  }

  .cta-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .cta-btn-primary,
  .cta-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.75rem;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 700;
    font-size: 1.05rem;
    white-space: nowrap;
  }

  .cta-btn-primary {
    background: linear-gradient(135deg, #6bdad7, #6ea8ff);
    color: #04101d;
    box-shadow: 0 16px 36px rgba(37, 99, 235, 0.2);
  }

  .cta-btn-secondary {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border-strong);
  }

  .cta-btn-secondary:hover {
    background: rgba(15, 23, 42, 0.04);
  }

  .github-icon,
  .btn-icon {
    width: 1.1rem;
    height: 1.1rem;
  }
</style>
