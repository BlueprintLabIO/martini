# Martini Pre-Launch TODO

Last Updated: 2025-11-18

---

## 🚨 CRITICAL - Must Fix Before Launch (Cannot publish without these)

### 1. Add LICENSE Files
**Status:** ❌ Not Started
**Priority:** P0 - BLOCKING
**Estimated Time:** 30 minutes

- [ ] Create LICENSE file in root directory (MIT recommended)
- [ ] Add LICENSE file to each publishable package:
  - [ ] `packages/@martini/core/LICENSE`
  - [ ] `packages/@martini/phaser/LICENSE`
  - [ ] `packages/@martini/transport-local/LICENSE`
  - [ ] `packages/@martini/transport-trystero/LICENSE`
  - [ ] `packages/@martini/transport-iframe-bridge/LICENSE`
  - [ ] `packages/@martini/devtools/LICENSE`
  - [ ] `packages/@martini/ide/LICENSE`

**Why Critical:** Without a license, nobody can legally use, modify, or distribute the code.

---

### 2. Remove `private: true` from Publishable Packages
**Status:** ❌ Not Started
**Priority:** P0 - BLOCKING
**Estimated Time:** 15 minutes

Update `package.json` in each package (remove or set to `false`):
- [ ] `packages/@martini/core/package.json`
- [ ] `packages/@martini/phaser/package.json`
- [ ] `packages/@martini/transport-local/package.json`
- [ ] `packages/@martini/transport-trystero/package.json`
- [ ] `packages/@martini/transport-iframe-bridge/package.json`
- [ ] `packages/@martini/devtools/package.json`
- [ ] `packages/@martini/ide/package.json`

**Why Critical:** npm will reject publication attempts if `private: true` is set.

---

### 3. Add Package Metadata (license, author, repository, homepage)
**Status:** ❌ Not Started
**Priority:** P0 - BLOCKING
**Estimated Time:** 30 minutes

Add to each publishable `package.json`:
```json
{
  "license": "MIT",
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/martini.git",
    "directory": "packages/@martini/core"
  },
  "homepage": "https://martini.dev",
  "bugs": {
    "url": "https://github.com/yourusername/martini/issues"
  },
  "keywords": [
    "multiplayer",
    "game",
    "phaser",
    "p2p",
    "websocket",
    "state-sync",
    "host-authoritative",
    "real-time"
  ]
}
```

Packages to update:
- [ ] `@martini/core`
- [ ] `@martini/phaser`
- [ ] `@martini/transport-local`
- [ ] `@martini/transport-trystero`
- [ ] `@martini/transport-iframe-bridge`
- [ ] `@martini/devtools`
- [ ] `@martini/ide`

**Why Critical:** npm requires license field; repository/homepage help users find docs and report issues.

---

### 4. Fix Build Errors
**Status:** ❌ Not Started
**Priority:** P0 - BLOCKING
**Estimated Time:** 1-2 hours

#### 4a. Fix Demos Build Error
```
Error: 500 /docs/latest/concepts/player-lifecycle
```

**Issue:** Svelte component import failing in `player-lifecycle.md`
- [ ] Debug the Callout component import
- [ ] Ensure mdsvex is configured correctly
- [ ] Test prerendering works

#### 4b. Fix Phaser Test Failures
```
Test Files  1 failed (1)
Tests  4 failed | 25 passed (29)
```

**Issue:** 4 tests failing in `@martini/phaser`
- [ ] Run tests: `cd packages/@martini/phaser && pnpm test`
- [ ] Fix failing tests (likely related to `_sprites` property)
- [ ] Ensure all tests pass

#### 4c. Verify Full Build
- [ ] Run `pnpm build` from root - should complete without errors
- [ ] Run `pnpm test` from root - all tests should pass

**Why Critical:** Broken builds = broken user experience. Users will immediately try to build and test.

---

### 5. Create Root README.md
**Status:** ❌ Not Started
**Priority:** P0 - CRITICAL
**Estimated Time:** 1 hour

Current root README is essentially empty (1 line).

Create comprehensive README with:
- [ ] Project tagline/description
- [ ] Quick example (15-20 lines of code)
- [ ] Features list
- [ ] Installation instructions
- [ ] Link to documentation site
- [ ] Link to live demos
- [ ] Quick start guide
- [ ] Architecture diagram
- [ ] Links to individual packages
- [ ] Contributing section
- [ ] License section

**Why Critical:** GitHub/npm users land on root README first. It's your primary marketing material.

---

### 6. Replace Placeholder URLs
**Status:** ❌ Not Started
**Priority:** P0 - CRITICAL
**Estimated Time:** 30 minutes

**Current placeholders found:**
```
- https://github.com/your-org/martini/issues
- https://github.com/yourusername/martini
- https://discord.gg/your-server
```

**Action Required:**
- [ ] Create actual GitHub repository
- [ ] Update all GitHub URLs in READMEs
- [ ] Update GitHub URLs in docs
- [ ] Update GitHub URLs in homepage
- [ ] Update Discord URL or remove Discord references
- [ ] Search codebase for "your-org", "yourusername", "your-server" and replace

**Files to check:**
- [ ] `packages/@martini/core/README.md`
- [ ] `packages/@martini/demos/src/routes/+page.svelte`
- [ ] `packages/@martini/demos/src/content/docs/index.md`
- [ ] All other documentation files

**Why Critical:** Broken links look unprofessional and confuse users.

---

### 7. Standardize Package Versions
**Status:** ❌ Not Started
**Priority:** P0 - CRITICAL
**Estimated Time:** 15 minutes

**Current inconsistent versions:**
- `@martini/core`: `2.0.0-alpha.1`
- `@martini/phaser`: `2.0.0-alpha.1`
- `@martini/transport-local`: `1.0.0`
- `@martini/transport-trystero`: `0.0.1`

**Recommendation:** Use `0.1.0` for initial public release (or `1.0.0` if stable)

- [ ] Update all packages to same version (suggest `0.1.0`)
- [ ] Update workspace dependencies to use `^0.1.0` instead of `workspace:*`
- [ ] Add version to changelog

**Why Critical:** Inconsistent versions confuse dependency management and release process.

---

## 🔴 HIGH Priority - Should Fix Before Launch

### 8. Set Up GitHub Actions CI/CD
**Status:** ❌ Not Started
**Priority:** P1 - HIGH
**Estimated Time:** 2 hours

No `.github/workflows` directory currently exists.

Create workflows for:
- [ ] `.github/workflows/test.yml` - Run tests on PR
- [ ] `.github/workflows/build.yml` - Build all packages
- [ ] `.github/workflows/typecheck.yml` - TypeScript validation
- [ ] `.github/workflows/publish.yml` - Publish to npm (manual trigger)

Add status badges to README:
- [ ] Test status badge
- [ ] Build status badge
- [ ] npm version badge
- [ ] License badge

**Why Important:** Shows project is maintained, prevents regressions, builds trust.

---

### 9. Deploy Demo Site Publicly
**Status:** ❌ Not Started
**Priority:** P1 - HIGH
**Estimated Time:** 1 hour

Currently demos only run on localhost.

- [ ] Deploy to Vercel/Netlify/Cloudflare Pages
- [ ] Configure custom domain (e.g., martini.dev or docs.martini.dev)
- [ ] Update all documentation links to point to live site
- [ ] Test all interactive demos work on deployed site
- [ ] Add deployment status badge to README

**Why Important:** Users need to see it working before installing. Live demos = instant credibility.

---

### 10. Set Up npm Organization
**Status:** ❌ Not Started
**Priority:** P1 - HIGH
**Estimated Time:** 30 minutes

Currently using `@martini/*` scope.

- [ ] Create npm organization: https://www.npmjs.com/org/create
- [ ] Invite team members
- [ ] Configure publishing permissions
- [ ] Set up 2FA for security
- [ ] Reserve package names

**Why Important:** Prevents namespace squatting, professional appearance.

---

### 11. Create CONTRIBUTING.md
**Status:** ✅ Exists but needs review
**Priority:** P1 - HIGH
**Estimated Time:** 30 minutes

- [ ] Review existing contributing docs
- [ ] Add code of conduct
- [ ] Add PR template
- [ ] Add issue templates (bug, feature request)
- [ ] Add development setup instructions
- [ ] Add testing guidelines

---

## 🟡 MEDIUM Priority - Nice to Have

### 12. Add Video Demo
**Status:** ❌ Not Started
**Priority:** P2 - MEDIUM
**Estimated Time:** 3-4 hours

Create 2-3 minute video showing:
- [ ] Installation process
- [ ] Building first game from scratch
- [ ] Running game locally
- [ ] How state sync works visually
- [ ] Multiple players connecting

Upload to:
- [ ] YouTube
- [ ] Add to README
- [ ] Add to documentation homepage

**Why Helpful:** Video > 1000 words. HN loves good demos.

---

### 13. Create Performance Benchmarks
**Status:** ❌ Not Started
**Priority:** P2 - MEDIUM
**Estimated Time:** 4-6 hours

Document performance characteristics:
- [ ] State sync throughput (states/sec)
- [ ] Bandwidth usage at different player counts
- [ ] Latency measurements (P2P vs WebSocket)
- [ ] Player count scaling tests (2, 4, 8, 16, 32 players)
- [ ] Memory usage
- [ ] Comparison with other frameworks (if applicable)

Add to docs:
- [ ] `docs/performance.md`
- [ ] Link from README

**Why Helpful:** Developers care about performance. Hard numbers build trust.

---

### 14. Add Migration Guides
**Status:** ❌ Not Started
**Priority:** P2 - MEDIUM
**Estimated Time:** 2-3 hours each

Create guides for users of other libraries:
- [ ] "Migrating from Colyseus"
- [ ] "Migrating from Socket.io"
- [ ] "Migrating from Photon"
- [ ] "Comparison with Unity Netcode"

**Why Helpful:** Reduces barrier to adoption. Shows you understand the landscape.

---

### 15. Create Example Games Repository
**Status:** ❌ Not Started
**Priority:** P2 - MEDIUM
**Estimated Time:** Variable

Create separate repo with complete game examples:
- [ ] Simple pong game
- [ ] Platformer
- [ ] Top-down shooter
- [ ] Racing game
- [ ] Party game (Jackbox-style)

Each should include:
- [ ] Complete source code
- [ ] README with setup instructions
- [ ] Live demo link
- [ ] Tutorial walkthrough

**Why Helpful:** Real examples = instant understanding. Great for HN demo.

---

### 16. Set Up Discord/Community
**Status:** ❌ Not Started
**Priority:** P2 - MEDIUM
**Estimated Time:** 1 hour

- [ ] Create Discord server
- [ ] Set up channels (#help, #showcase, #development)
- [ ] Add bot for GitHub notifications
- [ ] Add welcome message
- [ ] Update all Discord links in docs
- [ ] Pin in README

**Alternative:** Use GitHub Discussions instead
- [ ] Enable GitHub Discussions
- [ ] Create categories
- [ ] Update docs

**Why Helpful:** Community helps with support, builds ecosystem.

---

### 17. Add Browser Bundle Sizes
**Status:** ❌ Not Started
**Priority:** P2 - MEDIUM
**Estimated Time:** 1 hour

Document bundle sizes:
- [ ] Core bundle size (minified + gzipped)
- [ ] Phaser adapter bundle size
- [ ] Transport sizes
- [ ] Compare with alternatives

Add badge to README:
- [ ] Bundle size badge from bundlephobia.com

**Why Helpful:** Bundle size matters for web games. Transparency builds trust.

---

### 18. Create Getting Started Codesandbox Templates
**Status:** ❌ Not Started
**Priority:** P2 - MEDIUM
**Estimated Time:** 2 hours

Create templates for:
- [ ] Basic multiplayer game
- [ ] Phaser integration
- [ ] P2P setup
- [ ] WebSocket setup

Link from:
- [ ] README
- [ ] Documentation homepage
- [ ] Each getting started guide

**Why Helpful:** Zero-setup environment = lower barrier to trying it out.

---

## 🟢 LOW Priority - Future Improvements

### 19. Add TypeScript Strict Mode
**Status:** ❌ Not Started
**Priority:** P3 - LOW

Review and enable stricter TypeScript options:
- [ ] Enable `strict: true`
- [ ] Enable `noUncheckedIndexedAccess`
- [ ] Fix any new errors

---

### 20. Add Telemetry/Analytics (Optional)
**Status:** ❌ Not Started
**Priority:** P3 - LOW

Consider adding opt-in telemetry:
- [ ] Usage statistics
- [ ] Error reporting
- [ ] Performance metrics

**Note:** Make it fully optional and transparent.

---

### 21. Create Starter Templates
**Status:** ❌ Not Started
**Priority:** P3 - LOW

Create CLI templates:
```bash
npm create martini@latest my-game
```

Templates:
- [ ] Phaser + P2P
- [ ] Phaser + WebSocket
- [ ] Three.js + P2P
- [ ] Vanilla JS

---

## 📊 Launch Readiness Tracker

**Current Status: 20% Ready** ⚠️

### Critical Issues (Must Fix): 0/7 ✅
- [ ] LICENSE files
- [ ] Remove `private: true`
- [ ] Package metadata
- [ ] Fix build errors
- [ ] Root README
- [ ] Replace placeholder URLs
- [ ] Standardize versions

### High Priority (Should Fix): 0/4 ✅
- [ ] GitHub Actions CI
- [ ] Deploy demo site
- [ ] npm organization
- [ ] Review CONTRIBUTING.md

### Medium Priority (Nice to Have): 0/9
- [ ] Video demo
- [ ] Performance benchmarks
- [ ] Migration guides
- [ ] Example games repo
- [ ] Discord/community
- [ ] Bundle sizes
- [ ] Codesandbox templates

### Low Priority (Future): 0/3
- [ ] TypeScript strict mode
- [ ] Telemetry
- [ ] Starter templates

---

## 🎯 Recommended Launch Timeline

### Day 1 (4-6 hours) - Critical Path
1. Add LICENSE files (30 min)
2. Update package.json metadata (1 hour)
3. Fix build errors (2 hours)
4. Create root README (1 hour)
5. Replace placeholder URLs (30 min)
6. Standardize versions (15 min)

**Result:** Packages are legally publishable and installable ✅

### Day 2 (4-6 hours) - Quality & Trust
1. Set up GitHub Actions (2 hours)
2. Deploy demo site (1 hour)
3. Set up npm organization (30 min)
4. Review and polish documentation (2 hours)

**Result:** Project looks professional and maintained ✅

### Day 3+ (Optional) - Marketing & Community
1. Create video demo (4 hours)
2. Write HN launch post (1 hour)
3. Set up community (Discord/Discussions) (1 hour)
4. Add benchmarks and examples (variable)

**Result:** Compelling launch with strong first impression ✅

---

## 🚀 Ready to Launch When...

- [x] All "Critical Issues" resolved (7/7)
- [x] At least 3/4 "High Priority" items completed
- [x] Demo site is live and working
- [x] All links work (no 404s, no placeholders)
- [x] `pnpm build` and `pnpm test` pass cleanly
- [x] You've manually tested npm install in a fresh project
- [x] README clearly explains value proposition
- [x] You have a compelling HN submission title ready

---

## 📝 Notes

- Keep this TODO updated as you complete items
- Mark items with ✅ when done
- Add estimated completion dates
- Track blockers and dependencies
- Update "Current Status" percentage as you progress

**Goal:** Launch within 1-3 days with all critical issues resolved.
