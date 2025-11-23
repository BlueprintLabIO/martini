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
  <title>martini-kit — Multiplayer for JavaScript games</title>
  <meta name="description" content="A fast JavaScript multiplayer framework. Build real-time games with P2P or dedicated servers." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400;700&display=swap"
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
  .page-container {
    position: relative;
    min-height: 100vh;
    background: #000;
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
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 700;
    text-align: center;
    margin: 0 0 3rem 0;
    background: linear-gradient(135deg, #ffffff, #00ffff, #ffffff);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 40px rgba(0, 255, 255, 0.3);
    position: relative;
  }

  :global(.section-title::after) {
    content: attr(data-text);
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    z-index: -1;
    background: inherit;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: blur(20px);
    opacity: 0.5;
  }

  :global(.section-intro) {
    text-align: center;
    font-size: clamp(1rem, 2vw, 1.125rem);
    color: rgba(224, 224, 255, 0.7);
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
