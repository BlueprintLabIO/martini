# martini-kit Pre-Launch TODO

Last Updated: 2025-11-21

**NPM Organization:** https://www.npmjs.com/settings/martini-kit/packages ✅ REGISTERED
**GitHub Repository:** https://github.com/BlueprintLabIO/martini.git ✅ EXISTS

---

## ⚠️ URGENT: Critical Structure Issues Found

### 0. Fix pnpm Workspace Configuration
**Status:** ❌ BLOCKING - BUILD/TEST COMPLETELY BROKEN
**Priority:** P0 - MUST FIX IMMEDIATELY
**Estimated Time:** 5 minutes

**Issue:** Workspace is misconfigured - looking for packages in wrong location!
- Actual packages are in: `@martini-kit/*`
- Workspace expects: `packages/*` and `@martini-kit/*`
- Result: **`pnpm build` and `pnpm test` find 0 packages!**

**Fix:**
```yaml
# pnpm-workspace.yaml - UPDATE THIS:
packages:
  - '@martini-kit/*'      # ADD THIS (actual location)
  # - 'apps/*'        # REMOVE (no apps directory exists)
  # - 'packages/*'    # REMOVE (doesn't exist)
```

**Verify:**
- [ ] Update `pnpm-workspace.yaml`
- [ ] Run `pnpm build` - should build all packages
- [ ] Run `pnpm test` - should run tests

**Why Critical:** Without this, nothing builds or tests. Publishing is impossible.

---

## 🚨 CRITICAL - Must Fix Before Launch (Cannot publish without these)

### 1. Add LICENSE Files
**Status:** ❌ Not Started
**Priority:** P0 - BLOCKING
**Estimated Time:** 30 minutes

- [ ] Create LICENSE file in root directory (MIT recommended)
- [ ] Add LICENSE file to each publishable package:
  - [ ] `@martini-kit/core/LICENSE`
  - [ ] `@martini-kit/phaser/LICENSE`
  - [ ] `@martini-kit/transport-local/LICENSE`
  - [ ] `@martini-kit/transport-trystero/LICENSE`
  - [ ] `@martini-kit/transport-iframe-bridge/LICENSE`
  - [ ] `@martini-kit/devtools/LICENSE`
  - [ ] `@martini-kit/ide/LICENSE`

**Why Critical:** Without a license, nobody can legally use, modify, or distribute the code.

---

### 2. Remove `private: true` from Publishable Packages
**Status:** ❌ Not Started
**Priority:** P0 - BLOCKING
**Estimated Time:** 15 minutes

**Current Status - ALL packages have `"private": true`:**
- [ ] `@martini-kit/core/package.json` ← BLOCKS NPM PUBLISH
- [ ] `@martini-kit/phaser/package.json` ← BLOCKS NPM PUBLISH
- [ ] `@martini-kit/transport-local/package.json` ← BLOCKS NPM PUBLISH
- [ ] `@martini-kit/transport-trystero/package.json` ← BLOCKS NPM PUBLISH
- [ ] `@martini-kit/transport-iframe-bridge/package.json` ← BLOCKS NPM PUBLISH
- [ ] `@martini-kit/transport-ws/package.json` ← BLOCKS NPM PUBLISH
- [ ] `@martini-kit/devtools/package.json` ← Has MIT license but missing private field
- [ ] `@martini-kit/ide/package.json` ← BLOCKS NPM PUBLISH
- [ ] `@martini-kit/demos/package.json` ← Keep private (demo site, not published)

**Action Required:** Remove `"private": true` OR set to `"private": false` in all packages except demos.

**Why Critical:** npm will reject publication attempts if `private: true` is set.

---

### 3. Add Package Metadata (license, author, repository, homepage)
**Status:** ⚠️ Partially Done
**Priority:** P0 - BLOCKING
**Estimated Time:** 30 minutes

**Current Status:**
- ✅ `@martini-kit/devtools` - Has `"license": "MIT"` and keywords
- ❌ All others - Missing license, repository, author, homepage

Add to each publishable `package.json`:
```json
{
  "license": "MIT",
  "author": "Blueprint Lab <contact@blueprintlab.io>",  // UPDATE WITH YOUR INFO
  "repository": {
    "type": "git",
    "url": "https://github.com/BlueprintLabIO/martini.git",
    "directory": "@martini-kit/core"  // UPDATE PER PACKAGE
  },
  "homepage": "https://martini-kit.dev",  // OR YOUR DEPLOYED DOCS URL
  "bugs": {
    "url": "https://github.com/BlueprintLabIO/martini/issues"
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
- [ ] `@martini-kit/core` - Add all fields
- [ ] `@martini-kit/phaser` - Add all fields
- [ ] `@martini-kit/transport-local` - Add all fields
- [ ] `@martini-kit/transport-trystero` - Add all fields
- [ ] `@martini-kit/transport-iframe-bridge` - Add all fields
- [ ] `@martini-kit/transport-ws` - Add all fields
- [ ] `@martini-kit/devtools` - Add repository, author, homepage (has license)
- [ ] `@martini-kit/ide` - Add all fields

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

**Issue:** 4 tests failing in `@martini-kit/phaser`
- [ ] Run tests: `cd @martini-kit/phaser && pnpm test`
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
**Status:** ⚠️ Partially Done
**Priority:** P0 - CRITICAL
**Estimated Time:** 30 minutes

**Current placeholders found:**
```
✅ GitHub repo exists: https://github.com/BlueprintLabIO/martini.git
❌ @martini-kit/core/README.md: "https://github.com/your-org/martini-kit/issues"
❌ @martini-kit/README.md: "https://github.com/your-org/martini-kit/issues"
❌ Various docs may have "https://github.com/yourusername/martini-kit"
```

**Action Required:**
- [x] GitHub repository created ✅
- [ ] Update all GitHub URLs in READMEs (replace `your-org/martini-kit` with `BlueprintLabIO/martini`)
- [ ] Update GitHub URLs in docs
- [ ] Search and replace: `your-org` → `BlueprintLabIO`
- [ ] Search and replace: `yourusername` → `BlueprintLabIO`
- [ ] Decide on Discord or remove all Discord references
- [ ] Update homepage URLs to point to deployed demo site

**Files to check:**
- [ ] `@martini-kit/core/README.md` (has placeholder)
- [ ] `@martini-kit/README.md` (has placeholder at line 350)
- [ ] `@martini-kit/demos/src/routes/+page.svelte`
- [ ] `@martini-kit/demos/src/content/docs/**/*.md`
- [ ] Search entire codebase: `grep -r "your-org\|yourusername\|your-server" @martini-kit/`

**Why Critical:** Broken links look unprofessional and confuse users.

---

### 7. Standardize Package Versions to 0.1.0
**Status:** ❌ Not Started → **DECISION MADE: Use 0.1.0**
**Priority:** P0 - CRITICAL
**Estimated Time:** 15 minutes

**Current inconsistent versions → Target:**
- `@martini-kit/core`: `2.0.0-alpha.1` → **0.1.0**
- `@martini-kit/phaser`: `2.0.0-alpha.1` → **0.1.0**
- `@martini-kit/devtools`: `2.0.0-alpha.1` → **0.1.0**
- `@martini-kit/transport-local`: `1.0.0` → **0.1.0**
- `@martini-kit/transport-trystero`: `0.0.1` → **0.1.0**
- `@martini-kit/transport-ws`: unknown → **0.1.0**
- `@martini-kit/transport-iframe-bridge`: unknown → **0.1.0**
- `@martini-kit/transport-colyseus`: unknown → **0.1.0**
- `@martini-kit/ide`: unknown → **0.1.0**
- Root `package.json`: `0.0.1` → **0.1.0**

**Target Version:** `0.1.0` (clean, signals initial release ready for early adopters)

**Action Required:**
- [ ] Update `version` field in ALL package.json files to `"0.1.0"`
- [ ] Keep `workspace:*` for internal dependencies (pnpm converts to `^0.1.0` on publish)
- [ ] Create CHANGELOG.md in root:
  ```markdown
  # Changelog

  ## [0.1.0] - 2025-11-21

  ### Added
  - Initial public release of martini-kit
  - Core multiplayer SDK with host-authoritative state sync
  - Phaser adapter with auto sprite tracking
  - P2P transport (Trystero WebRTC)
  - Local transport for testing and demos
  - WebSocket transport
  - iframe bridge transport
  - Development tools and state inspector
  - Browser-based IDE
  ```
- [ ] Update version references in documentation

**Quick command to update all at once:**
```bash
# Update all package.json versions
find @martini -name "package.json" -maxdepth 2 -not -path "*/node_modules/*" -exec sed -i '' 's/"version": "[^"]*"/"version": "0.1.0"/' {} \;
# Update root package.json
sed -i '' 's/"version": "[^"]*"/"version": "0.1.0"/' package.json
```

**Why Critical:** Inconsistent versions confuse dependency management and release process.

---

### 8. Add Missing Package README Files
**Status:** ❌ Not Started
**Priority:** P0 - CRITICAL
**Estimated Time:** 2 hours

**Current Status:**
- ✅ `@martini-kit/README.md` - Comprehensive (but needs URL fixes)
- ✅ `@martini-kit/core/README.md` - Exists (needs URL fixes)
- ❌ `@martini-kit/phaser/README.md` - MISSING
- ❌ `@martini-kit/transport-local/README.md` - MISSING
- ❌ `@martini-kit/transport-trystero/README.md` - MISSING
- ❌ `@martini-kit/transport-ws/README.md` - MISSING
- ❌ `@martini-kit/transport-iframe-bridge/README.md` - MISSING
- ❌ `@martini-kit/devtools/README.md` - MISSING
- ❌ `@martini-kit/ide/README.md` - MISSING

**Why Critical:** npm package page shows README. Empty/missing README = looks abandoned.

**Action Required:**
- [ ] Create README for each package with:
  - Package description
  - Installation instructions
  - Basic usage example
  - Link to main docs
  - Link to GitHub repo

---

### 9. Verify npm Package Names Available
**Status:** ❌ Not Started
**Priority:** P0 - BLOCKING
**Estimated Time:** 10 minutes

**Your npm org:** https://www.npmjs.com/settings/martini-kit/packages

**Packages to verify/reserve:**
- [ ] Check if `@martini-kit/core` is available on npm
- [ ] Check if `@martini-kit/phaser` is available
- [ ] Check if `@martini-kit/transport-local` is available
- [ ] Check if `@martini-kit/transport-trystero` is available
- [ ] Check if `@martini-kit/transport-ws` is available
- [ ] Check if `@martini-kit/transport-iframe-bridge` is available
- [ ] Check if `@martini-kit/devtools` is available
- [ ] Check if `@martini-kit/ide` is available

**How to check:**
```bash
npm view @martini-kit/core  # If shows error "404", name is available
```

**Why Critical:** If names are taken, you need to pick different names before publishing.

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
- [ ] Configure custom domain (e.g., martini-kit.dev or docs.martini-kit.dev)
- [ ] Update all documentation links to point to live site
- [ ] Test all interactive demos work on deployed site
- [ ] Add deployment status badge to README

**Why Important:** Users need to see it working before installing. Live demos = instant credibility.

---

### 10. Set Up npm Organization
**Status:** ❌ Not Started
**Priority:** P1 - HIGH
**Estimated Time:** 30 minutes

Currently using `@martini-kit/*` scope.

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
npm create martini-kit@latest my-game
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
