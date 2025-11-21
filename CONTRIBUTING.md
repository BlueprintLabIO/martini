# Contributing to martini-kit

First off, thank you for considering contributing to martini-kit! It's people like you that make martini-kit such a great tool for building multiplayer games.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Package Structure](#package-structure)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Community](#community)

---

## Code of Conduct

This project and everyone participating in it is governed by our commitment to fostering an open and welcoming environment. We pledge to make participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Examples of behavior that contributes to creating a positive environment include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior include:**
- The use of sexualized language or imagery and unwelcome sexual attention or advances
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 (we recommend using [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** 10.22.0+ (install via `npm install -g pnpm`)
- **Git** for version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/martini.git
   cd martini
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/BlueprintLabIO/martini.git
   ```

---

## Development Setup

### Initial Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Development Workflow

```bash
# Run demos & documentation site (with hot reload)
pnpm dev

# Build specific package
pnpm --filter @martini-kit/core build

# Run tests for specific package
pnpm --filter @martini-kit/phaser test

# Run tests in watch mode
pnpm --filter @martini-kit/core test:watch

# Type check all packages
pnpm --filter '@martini-kit/*' --filter='!demos' exec tsc --noEmit

# Clean build artifacts
pnpm clean
```

### Running the Demos

The demos site provides interactive examples of martini-kit features:

```bash
pnpm dev
# Visit http://localhost:5173
```

The demos site includes:
- Live code editor with dual-pane view
- Interactive game examples
- Documentation with live examples

---

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/BlueprintLabIO/martini/issues) to avoid duplicates.

When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected behavior**
- **Actual behavior**
- **Environment details** (OS, Node version, package versions)
- **Code snippet or repository** that reproduces the issue
- **Screenshots** if applicable

**Example:**
```markdown
## Bug: LocalTransport not syncing state in React

**Environment:**
- OS: macOS 14.0
- Node: 18.17.0
- @martini-kit/core: 0.1.0

**Steps to reproduce:**
1. Create LocalTransport with two runtimes
2. Dispatch action on host runtime
3. Check client runtime state

**Expected:** Client state updates immediately
**Actual:** Client state remains unchanged

**Code:** https://github.com/user/reproduce-issue
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** explaining why this would be useful
- **Proposed API** or interface (if applicable)
- **Examples** of how it would be used
- **Alternatives considered**

### Code Contributions

We welcome code contributions! Here are some areas where we'd love help:

#### Good First Issues
- Documentation improvements
- Adding tests for existing code
- Fixing typos or improving error messages
- Adding examples or tutorials

#### Core Features
- New transport adapters (Socket.io, WebSocket servers)
- Engine adapters (Unity, Godot, Three.js)
- Performance optimizations
- Developer tools enhancements

#### Advanced Features
- Client-side prediction
- Rollback netcode
- Replay system
- Visual scripting

---

## Pull Request Process

### Before Submitting

1. **Check existing PRs** to avoid duplicate work
2. **Create an issue** first for significant changes
3. **Branch from `main`**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Keep PRs focused** - one feature or fix per PR
5. **Write tests** for new functionality
6. **Update documentation** if needed

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (README, JSDoc, etc.)
- [ ] Tests added/updated and passing
- [ ] No new warnings in build or tests
- [ ] Commit messages follow guidelines
- [ ] Changes work in all supported environments

### Submitting the PR

```bash
# Ensure your branch is up to date
git fetch upstream
git rebase upstream/main

# Push to your fork
git push origin feature/your-feature-name
```

**PR Title Format:**
- `feat: add WebSocket transport reconnection logic`
- `fix: resolve state desync in LocalTransport`
- `docs: improve Phaser adapter examples`
- `test: add integration tests for GameRuntime`
- `chore: update dependencies`

**PR Description Template:**
```markdown
## Description
Brief description of what this PR does.

## Motivation
Why is this change needed? What problem does it solve?

## Changes
- Bullet list of changes
- Another change
- And another

## Testing
How was this tested?

## Related Issues
Closes #123
```

### Review Process

1. **Automated checks** must pass (tests, linting, build)
2. **Code review** by at least one maintainer
3. **Address feedback** by pushing new commits
4. **Squash and merge** once approved

---

## Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Explicit types, clear naming
export interface TransportConfig {
  roomId: string;
  playerId?: string;
  isHost: boolean;
}

export class Transport {
  private readonly config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
  }

  public async connect(): Promise<void> {
    // Implementation
  }
}

// ❌ Bad: Any types, unclear naming
export class Transport {
  private cfg: any;

  constructor(c: any) {
    this.cfg = c;
  }

  public conn(): any {
    // Implementation
  }
}
```

### Code Style

- **Use TypeScript** for all source code
- **Prefer explicit types** over `any`
- **Use async/await** over promise chains
- **Avoid mutation** where possible (prefer immutable operations)
- **Keep functions small** and focused (single responsibility)
- **Use descriptive variable names** (no single-letter vars except loop indices)
- **Add JSDoc comments** for public APIs

### File Naming

- **PascalCase** for classes: `GameRuntime.ts`, `LocalTransport.ts`
- **camelCase** for utilities: `stateSync.ts`, `diffUtils.ts`
- **kebab-case** for test files: `GameRuntime.test.ts`, `state-sync.test.ts`

### Import Order

```typescript
// 1. Node built-ins
import { EventEmitter } from 'events';

// 2. External packages
import Phaser from 'phaser';

// 3. Internal packages
import { GameRuntime } from '@martini-kit/core';

// 4. Relative imports
import { LocalTransport } from './LocalTransport';
import type { TransportConfig } from './types';
```

---

## Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { GameRuntime } from '../GameRuntime';

describe('GameRuntime', () => {
  describe('state synchronization', () => {
    let runtime: GameRuntime;

    beforeEach(() => {
      runtime = new GameRuntime(/* ... */);
    });

    it('should sync state between host and client', async () => {
      // Arrange
      const hostRuntime = createHostRuntime();
      const clientRuntime = createClientRuntime();

      // Act
      await hostRuntime.dispatchAction('move', { x: 10, y: 20 });
      await waitForSync();

      // Assert
      expect(clientRuntime.state.position).toEqual({ x: 10, y: 20 });
    });
  });
});
```

### Testing Best Practices

- **Arrange-Act-Assert** pattern
- **Test behavior, not implementation**
- **One assertion per test** (when possible)
- **Use descriptive test names** that explain the scenario
- **Mock external dependencies**
- **Test edge cases** and error conditions

### Test Coverage

We aim for:
- **80%+ coverage** for core packages
- **100% coverage** for critical paths (state sync, transport)
- **Integration tests** for common use cases

Run coverage reports:
```bash
pnpm --filter @martini-kit/core test:coverage
```

---

## Package Structure

### Monorepo Layout

```
martini/
├── @martini-kit/
│   ├── core/              # Core runtime and state sync
│   ├── phaser/            # Phaser 3 adapter
│   ├── devtools/          # Development tools
│   ├── ide/               # Browser-based IDE
│   ├── transport-local/   # Local in-memory transport
│   ├── transport-trystero/# P2P WebRTC transport
│   ├── transport-ws/      # WebSocket transport
│   ├── transport-iframe-bridge/ # Iframe bridge transport
│   ├── transport-colyseus/# Colyseus adapter
│   └── demos/             # Demo site (not published)
├── .github/
│   └── workflows/         # CI/CD workflows
├── scripts/               # Build and utility scripts
└── README.md
```

### Package Structure

Each package follows this structure:

```
@martini-kit/package-name/
├── src/
│   ├── index.ts           # Main entry point
│   ├── *.ts               # Source files
│   └── __tests__/         # Tests
├── dist/                  # Build output (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

### Adding a New Package

1. Create package directory: `@martini-kit/new-package/`
2. Copy `package.json` and `tsconfig.json` from similar package
3. Update package name and dependencies
4. Add build script in root `package.json` (if needed)
5. Add to workspace in `pnpm-workspace.yaml`
6. Document in main README

---

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (dependencies, build config)
- **ci**: CI/CD changes

### Scopes

- `core` - @martini-kit/core
- `phaser` - @martini-kit/phaser
- `devtools` - @martini-kit/devtools
- `transport-*` - Transport packages
- `ide` - Browser IDE
- `demos` - Demo site
- `docs` - Documentation

### Examples

```bash
feat(core): add support for async action handlers

Allows actions to return promises, enabling async operations
within game logic. The runtime will wait for promises to resolve
before broadcasting state updates.

Closes #42

---

fix(phaser): prevent sprite position desync on rapid updates

Rate limit sprite updates to match Phaser's update cycle,
preventing visual jitter when state updates faster than
the game loop.

Fixes #103

---

docs(transport-local): add advanced usage examples

Include examples of:
- Setting up multiple rooms
- Testing with different latencies
- Debugging state sync issues
```

---

## Community

### Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/BlueprintLabIO/martini/issues)
- **GitHub Discussions**: [Ask questions or share ideas](https://github.com/BlueprintLabIO/martini/discussions)
- **Documentation**: [Read the docs](https://martini.blueprintlab.io/docs)

### Staying Updated

- **Watch the repository** for updates
- **Follow releases** to stay informed about new versions
- **Check the roadmap** in [TODO.md](TODO.md)

---

## Release Process

(For maintainers)

### Version Bumping

```bash
# Patch release (0.1.0 → 0.1.1)
pnpm run version:patch

# Minor release (0.1.0 → 0.2.0)
pnpm run version:minor

# Major release (0.1.0 → 1.0.0)
pnpm run version:major
```

### Publishing

1. Ensure all tests pass: `pnpm test`
2. Build all packages: `pnpm build`
3. Dry run publish: `pnpm run publish:dry-run`
4. Use GitHub Actions workflow: "Version Bump and Publish"
5. Or manually: `pnpm run publish:all`

### Creating Releases

After publishing, create a GitHub release:

1. Go to [Releases](https://github.com/BlueprintLabIO/martini/releases)
2. Draft a new release
3. Use tag format: `v0.1.0`
4. Include changelog highlights
5. List breaking changes (if any)

---

## License

By contributing to martini-kit, you agree that your contributions will be licensed under the Apache License 2.0.

---

## Questions?

If you have questions not covered here, feel free to:
- Open a [Discussion](https://github.com/BlueprintLabIO/martini/discussions)
- Reach out to the maintainers
- Check the [documentation](https://martini.blueprintlab.io/docs)

Thank you for contributing to martini-kit! 🎮✨
