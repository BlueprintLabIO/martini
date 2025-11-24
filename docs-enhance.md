# Docs Enhancement Plan

Purpose: reduce friction and confusion in `/docs` by clarifying scope, simplifying navigation, and tightening content flow from onboarding to reference.

## Goals
- Make the left-nav predictable: clear section boundaries, obvious “what’s engine-agnostic vs Phaser.”
- Provide a guided path for new users; keep advanced/ops content discoverable but out of the way.
- Eliminate duplicate/overlapping topics (e.g., physics), and enforce consistent ordering.
- Improve skimmability (intros, summaries, related links) without bloating page length.

## Current Pain Points (quick scan)
- Two physics tracks with no scope split (generic vs Phaser) appear as duplicate nav items.
- Guides lacks a landing page, so users drop into an unordered mix of topics.
- Mixed scopes inside Guides (engine-agnostic + Phaser) with inconsistent ordering metadata.
- Recipes vs Guides overlap; “Examples & Recipes” shows twice due to directory mapping.
- Help mixes FAQ/Troubleshooting/Changelog, creating noisy “Help” navigation.

## Target IA (recommended)
- Home / Overview
- Getting Started (install, quick start, first game)
- Core Concepts (architecture, determinism, actions, state patterns, transport model)
- Guides (engine-agnostic): movement, physics & collisions, networking/transport choices, UI/HUD, performance, testing, deployment/security
- Engine Tracks: Phaser (setup, sprites, attachments, physics/input, collisions), placeholders for future engines
- Examples & Recipes: game modes, movement variants, collectibles, health/damage, shooting, power-ups
- Operate: troubleshooting, debugging, FAQ, changelog
- Reference: API (core, phaser, transports, devtools), contributing

## 10x Action Plan
1) **Add Guides landing page** with learning path and scope labels (agnostic vs Phaser) to frame the section.
2) **Consolidate physics**: make one “Physics & Collisions (agnostic)” and one “Phaser Physics & Input”; cross-link and remove duplicate sidebar entries.
3) **Normalize ordering**: ensure all guide pages use `order` metadata (or numbered filenames) to enforce a newbie→advanced flow.
4) **Separate Recipes vs Guides**: move how-to/gameplay recipes out of Guides; keep Guides for conceptual/how-to patterns, Recipes for practical implementations.
5) **Disentangle “Examples & Recipes” label**: split into “Examples” (end-to-end) and “Recipes” (task-focused), adjusting sidebar generation mapping.
6) **Scope tagging**: add frontmatter tags (e.g., `scope: agnostic|phaser`) to surface applicability; show in-page badges and sidebar grouping.
7) **Add section intros**: short summaries + “you will learn” + prerequisites for each section (Guides, Concepts, Operate, Engine Tracks).
8) **Cross-link related topics**: templates for “Before you continue” and “Related guides” to connect Concepts ↔ Guides ↔ Recipes.
9) **Help/Operate cleanup**: group FAQ + Troubleshooting + Debugging under Operate; keep Changelog separate to reduce noise.
10) **Quality + consistency pass**: check code samples for completeness, ensure consistent tone, and verify search index metadata (titles/descriptions) for findability.

## Definition of Done
- Nav shows one physics entry per scope, clear Guides landing, and consistent ordering.
- Recipes and Guides no longer overlap; labels align with actual directory mapping.
- Each section has a brief intro and related-links block.
- Scope badges (agnostic vs engine-specific) are visible on relevant pages.
- Operate section contains support content; Changelog is isolated.

## Open Questions
- Do we want a second engine track soon (Unity/Godot)? If yes, add placeholders now.
- Should “Performance Guide” live under Guides or Operate? (Leaning Guides with Ops links.)
- Is versioned docs coming soon? If so, bake tags into frontmatter for future filtering.
