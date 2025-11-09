# Martini - Browser Game Creation Platform

## Specifications Overview

This directory contains comprehensive technical specifications for building a browser-based multiplayer game creation platform.

---

## Product Vision

A platform where kids create 2D multiplayer games by prompting an AI. Games run instantly in-browser with real-time peer-to-peer multiplayer and can be shared/remixed via short links.

**Core Loop:** Prompt → Code → Play → Share → Remix

---

## Specifications Index

### Core Technical Specs

1. **[00-architecture-overview.md](./00-architecture-overview.md)**
   - System architecture
   - Technology stack
   - Data models
   - Development phases
   - Cost estimates
   - **START HERE**

2. **[01-ai-code-generation.md](./01-ai-code-generation.md)**
   - OpenAI GPT-4 integration
   - Prompt engineering
   - AST validation & security
   - Loop guard transforms
   - Error handling & retries
   - Caching strategy

3. **[02-game-runtime-sandbox.md](./02-game-runtime-sandbox.md)**
   - Multi-layer sandboxing
   - iframe security
   - postMessage API
   - gameAPI implementation
   - Resource limits
   - Runtime watchdog

4. **[03-multiplayer-p2p.md](./03-multiplayer-p2p.md)**
   - WebRTC P2P via Trystero
   - Nostr relays (serverless)
   - Lobby approval system
   - Share code generation

5. **[04-auth-storage.md](./04-auth-storage.md)**
   - Supabase authentication
   - COPPA compliance flows
   - Project storage
   - Asset uploads
   - Rate limiting

6. **[05-api-contracts.md](./05-api-contracts.md)**
   - REST endpoints
   - WebSocket events
   - postMessage protocol
   - Type definitions

7. **[06-game-templates.md](./06-game-templates.md)**
   - Top-down shooter
   - Platformer
   - Building game
   - Template structure

### Compliance & Legal

8. **[../docs/coppa-compliance.md](../docs/coppa-compliance.md)**
   - COPPA requirements
   - Age verification
   - Parent consent flow
   - Feature restrictions
   - Data retention
   - Privacy policy outline

9. **[../docs/ip-and-licensing.md](../docs/ip-and-licensing.md)**
   - User content ownership
   - Export rights
   - Attribution requirements
   - Remix policy
   - DMCA procedures

---

## Quick Start for Implementors

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key
- Coolify or Docker setup

### Tech Stack

**Frontend:**
- SvelteKit + TypeScript
- CodeMirror 6 (code editor)
- Trystero (P2P WebRTC via Nostr)
- Phaser 3
- Tailwind CSS

**Backend:**
- SvelteKit API routes
- Supabase (DB, Auth, Storage)
- OpenAI GPT-4 / DeepSeek

**Deployment:**
- Cloudflare Pages (frontend)
- Coolify (backend services)

### MVP Timeline

- **Weeks 1-2:** Foundation (auth, DB, editor)
- **Weeks 3-4:** AI generation & validation
- **Weeks 5-6:** Sandboxed game runtime
- **Weeks 7-8:** P2P multiplayer
- **Weeks 9-10:** Polish, templates, assets

**Total: 8-10 weeks to MVP**

---

## Key Architecture Decisions

### 1. **CodeMirror 6 (not Monaco Editor)**
- 25x smaller bundle (~200KB vs 5MB)
- Official Yjs support for collaborative editing
- Perfect for kids (simpler, faster)
- Extensible for future features

### 2. **Phaser 3 (not Babylon.js)**
- Simpler 2D focus for MVP
- Faster to market
- Can add 3D later

### 3. **Input Sync (not State Sync)**
- Lower latency (~50ms vs 82ms)
- Lower bandwidth (36KB/s vs 1.8MB/s for 6 players)
- **Clean upgrade path to dedicated servers**
- MVP skips client prediction (add in Phase 2)

### 4. **Peer-to-Peer (with Server Upgrade)**
- Free for 1-6 players
- $10/mo for 7+ players on dedicated server
- Same game code works on both

### 5. **Multi-Layer Sandboxing**
- iframe sandbox (no allow-same-origin)
- CSP restrictions
- AST validation
- Loop guards
- Resource limits
- Runtime watchdog

---

## Security Philosophy

**Treat all user code as hostile.**

Defense in depth:
1. AST ban dangerous APIs
2. Babel transform adds loop guards
3. iframe isolates from main app
4. CSP blocks network access
5. gameAPI enforces resource limits
6. Watchdog kills frozen iframes

---

## Development Principles

1. **Fast to market:** MVP in 8-10 weeks
2. **Extensible:** Clean upgrade paths
3. **Secure:** Paranoid sandboxing
4. **Scalable:** P2P → dedicated servers
5. **Compliant:** COPPA from day 1

---

## Success Metrics

**Engagement:**
- Time to first playable game: < 60s
- Code edit → reload: < 5s
- P2P connection: < 3s
- Games created per user: > 3
- Remix rate: > 20%

**Technical:**
- Connection success: > 95%
- Latency: < 100ms
- Sandbox escapes: 0
- Code gen success: > 80%

---

## Deployment Checklist

### Before Launch

- [ ] Security audit (sandbox escapes)
- [ ] Load testing (100 concurrent rooms)
- [ ] COPPA compliance review
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] DMCA contact email setup
- [ ] Parent verification flow tested
- [ ] Rate limiting configured
- [ ] Monitoring & analytics
- [ ] Backup strategy

### Day 1

- [ ] Limited beta (100 users)
- [ ] Monitor error rates
- [ ] Track AI generation costs
- [ ] Watch for abuse patterns
- [ ] Collect user feedback

---

## Support & Contact

For questions about these specs:
- Create GitHub issue
- Email: dev@yourdomain.com

---

## License

These specifications are provided for implementation of the Martini platform.

User-generated game code: owned by users
Platform infrastructure: proprietary

See [docs/ip-and-licensing.md](../docs/ip-and-licensing.md) for details.

---

## Acknowledgments

Built with:
- Phaser 3 (game engine)
- Supabase (backend)
- OpenAI GPT-4 (AI generation)
- Kenney.nl (starter assets)

Inspired by:
- Roblox (game creation)
- Replit (instant dev environment)
- Among Us (social multiplayer)

---

**Let's build something amazing! 🚀**
