<section class="cta-section">
  <div class="section-container">
    <div class="cta-shell">
      <div class="cta-copy">
        <p class="cta-kicker">Build in minutes</p>
        <h2 class="cta-title">Ready to build multiplayer?</h2>
        <p class="cta-subtitle">
          Ship real-time games with clean, readable code. Declarative logic, flexible transport, and zero infra upkeep.
        </p>
      </div>
      <div class="cta-buttons">
        <a href="#quickstart" class="cta-btn-primary">
          <span>Get Started</span>
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <a href="https://github.com/martini-game-framework/martini" target="_blank" rel="noopener noreferrer" class="cta-btn-secondary">
          <svg class="github-icon" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span>GitHub</span>
        </a>
      </div>
    </div>
  </div>
</section>

<style>
  .cta-section {
    position: relative;
    padding: 7rem 0;
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
