<section class="cta-section">
  <div class="cta-container">
    <div class="cta-content">
      <h2 class="cta-title">Ready to build multiplayer?</h2>
      <p class="cta-subtitle">
        Start building your multiplayer game in minutes. No servers, no complexity.
      </p>
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
    padding: 8rem 2rem;
    z-index: 10;
  }

  .cta-section::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(0, 255, 255, 0.1), transparent 70%);
    pointer-events: none;
  }

  .cta-container {
    max-width: 800px;
    margin: 0 auto;
    position: relative;
  }

  .cta-content {
    text-align: center;
    padding: 4rem 3rem;
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(255, 0, 255, 0.03));
    border: 2px solid rgba(0, 255, 255, 0.3);
    border-radius: 1rem;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.5),
      0 0 40px rgba(0, 255, 255, 0.1),
      inset 0 0 60px rgba(0, 255, 255, 0.02);
  }

  .cta-content::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: conic-gradient(from 0deg, transparent, rgba(0, 255, 255, 0.1), transparent 30%);
    animation: cta-spin 8s linear infinite;
  }

  @keyframes cta-spin {
    100% { transform: rotate(360deg); }
  }

  .cta-title {
    font-family: 'Orbitron',sans-serif;
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 900;
    margin: 0 0 1rem;
    background: linear-gradient(135deg, #00ffff 0%, #ff00ff 50%, #ffff00 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
    z-index: 1;
  }

  .cta-subtitle {
    font-size: clamp(1rem, 2vw, 1.25rem);
    color: rgba(224, 224, 255, 0.8);
    margin: 0 0 2.5rem;
    line-height: 1.6;
    position: relative;
    z-index: 1;
  }

  .cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    position: relative;
    z-index: 1;
  }

  .cta-btn-primary,
  .cta-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 2.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 700;
    font-size: 1.125rem;
    white-space: nowrap;
  }

  .cta-btn-primary {
    background: linear-gradient(135deg, #00ffff, #0080ff);
    color: #000;
    box-shadow:
      0 0 30px rgba(0, 255, 255, 0.5),
      0 10px 30px rgba(0, 0, 0, 0.3);
    position: relative;
    overflow: hidden;
  }

  .cta-btn-primary::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .cta-btn-primary:hover::before {
    width: 300px;
    height: 300px;
  }

  .cta-btn-primary:hover {
    transform: translateY(-3px);
    box-shadow:
      0 0 50px rgba(0, 255, 255, 0.8),
      0 15px 40px rgba(0, 0, 0, 0.4);
  }

  .cta-btn-secondary {
    background: rgba(0, 255, 255, 0.05);
    color: #00ffff;
    border: 2px solid rgba(0, 255, 255, 0.4);
  }

  .cta-btn-secondary:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: #00ffff;
    transform: translateY(-3px);
    box-shadow: 0 10px 30px rgba(0, 255, 255, 0.2);
  }

  .github-icon,
  .btn-icon {
    width: 1.1rem;
    height: 1.1rem;
  }
</style>
