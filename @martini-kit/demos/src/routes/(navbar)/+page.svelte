<script lang="ts">
  import {
    BackgroundEffects,
    MouseEffects,
    HeroSection,
    QuickStartSection,
    HowItWorksSection,
    DemoGallerySection,
    ComparisonSection,
    CTASection,
    LandingFooter
  } from '$lib/components/landing';
</script>

<svelte:head>
  <title>martini-kit — Multiplayer without networking.</title>
  <meta
    name="description"
    content="Multiplayer without networking. Martini handles sync, transport, and infra so you ship real-time games with minimal code."
  />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400..700&family=IBM+Plex+Mono:wght@400;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="page-container">
  <BackgroundEffects />
  <MouseEffects />
  <HeroSection />
  <QuickStartSection />
  <HowItWorksSection />
  <DemoGallerySection />
  <ComparisonSection />
  <CTASection />
  <LandingFooter />
</div>

<style>
  :global(:root) {
    --bg-page: radial-gradient(circle at 18% 18%, #f3f6ff 0, transparent 30%),
      radial-gradient(circle at 82% 12%, #eef7ff 0, transparent 30%), #fbfcff;
    --panel: #ffffff;
    --panel-strong: #f6f8fc;
    --border: rgba(15, 23, 42, 0.06);
    --border-strong: rgba(15, 23, 42, 0.12);
    --text: #0b1220;
    --muted: #334155;
    --muted-2: #4b5565;
    --accent: #2563eb;
    --accent-2: #0ea5e9;
    --code: #0b1220;
  }

  .page-container {
    position: relative;
    min-height: 100vh;
    background: var(--bg-page);
    overflow-x: hidden;
  }

  section {
    position: relative;
    z-index: 5;
  }

  :global(.section-container) {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  :global(.section-title) {
    font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
    letter-spacing: -0.02em;
    font-size: clamp(2rem, 4vw, 2.5rem);
    font-weight: 700;
    text-align: center;
    margin: 0 0 2.25rem 0;
    color: #0b1220;
    background: linear-gradient(135deg, #0b1220, #1d2a45 60%, #224f6b);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  :global(.section-intro) {
    text-align: center;
    font-size: clamp(1rem, 2vw, 1.125rem);
    color: var(--muted);
    max-width: 800px;
    margin: 0 auto 3rem;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    :global(.section-container) {
      padding: 0 1rem;
    }
  }
</style>
