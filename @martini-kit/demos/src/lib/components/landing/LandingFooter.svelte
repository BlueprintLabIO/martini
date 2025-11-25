<footer class="footer">
  <div class="footer-container">
    <div class="footer-brand">
      <p class="footer-title">martini-kit</p>
      <p class="footer-copy">Multiplayer without networking.</p>
    </div>
    <div class="footer-links">
      <a href="https://github.com/martini-game-framework/martini" target="_blank" rel="noopener noreferrer">GitHub</a>
      <a href="https://discord.gg/aT2mYAVVzk" target="_blank" rel="noopener noreferrer">Discord</a>
      <a href="#quickstart">Quick Start</a>
      <a href="#demos">Demos</a>
      <span class="footer-license">Apache 2.0 License</span>
    </div>
  </div>
</footer>

<style>
  .footer {
    padding: 2.5rem 2rem 3rem;
    border-top: 1px solid var(--border);
    background: linear-gradient(180deg, #f7f9ff, #ffffff);
    z-index: 10;
  }

  .footer-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1.25rem;
    align-items: center;
  }

  .footer-brand {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .footer-title {
    margin: 0;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--text);
  }

  .footer-copy {
    margin: 0;
    color: var(--muted);
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .footer-links a {
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
    border-bottom: 1px solid transparent;
    padding-bottom: 2px;
    transition: color 0.2s, border-color 0.2s;
  }

  .footer-links a:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  .footer-license {
    color: var(--muted-2);
    font-weight: 600;
  }
</style>
