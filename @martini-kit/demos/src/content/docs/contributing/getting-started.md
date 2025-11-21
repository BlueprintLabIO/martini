---
title: Getting Started with Contributing
description: Learn how to set up the martini-kit SDK development environment and start contributing
---

# Getting Started with Contributing

Thank you for your interest in contributing to martini-kit SDK! This guide will help you get up and running with the development environment.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **pnpm 10.22+** - Install with `npm install -g pnpm`
- **Git** - [Download here](https://git-scm.com/)
- Basic knowledge of TypeScript and multiplayer game concepts

## Quick Start

### 1. Clone the Repository

```bash
# Clone the repo
git clone https://github.com/BlueprintLabIO/martini.git
cd martini-kit
```

### 2. Install Dependencies

The project uses **pnpm** for package management:

```bash
# Install all dependencies across the monorepo
pnpm install
```

### 3. Build All Packages

```bash
# Build all packages in dependency order
pnpm build
```

This uses Turborepo to build packages in the correct order based on their dependencies.

### 4. Run the Dev Server

```bash
# Start the demos and documentation site
pnpm --filter @martini-kit/demos dev
```

The development server will start at [http://localhost:5173](http://localhost:5173)

### 5. Run Tests

```bash
# Run all tests across packages
pnpm test

# Run tests for a specific package
pnpm --filter @martini-kit/core test

# Run tests in watch mode
pnpm --filter @martini-kit/core test --watch
```

## Project Structure

The martini-kit SDK is a monorepo managed with **pnpm workspaces** and **Turborepo**:

```
martini-kit/
├── packages/
│   ├── @martini-kit/core/              # Core multiplayer engine
│   ├── @martini-kit/phaser/            # Phaser 3 integration
│   ├── @martini-kit/transport-local/   # Local transport (for testing)
│   ├── @martini-kit/transport-iframe-bridge/  # Iframe transport (for IDE)
│   ├── @martini-kit/transport-trystero/       # P2P WebRTC transport
│   ├── @martini-kit/transport-ws/             # WebSocket transport
│   ├── @martini-kit/transport-colyseus/       # Colyseus transport
│   ├── @martini-kit/devtools/          # Development tools
│   ├── @martini-kit/ide/               # In-browser IDE
│   └── @martini-kit/demos/             # Documentation + example games
├── pnpm-workspace.yaml             # Workspace configuration
├── turbo.json                      # Turborepo build pipeline
└── package.json                    # Root package
```

### Key Directories

- **`/@martini-kit/core/src`** - Core engine source code
- **`/@martini-kit/phaser/src`** - Phaser adapter source code
- **`/@martini-kit/demos/src/lib/games`** - Example games
- **`/@martini-kit/demos/src/content/docs`** - Documentation markdown files

## Development Workflow

### Working on a Specific Package

```bash
# Build a specific package
pnpm --filter @martini-kit/core build

# Run dev mode for a specific package
pnpm --filter @martini-kit/core dev

# Test a specific package
pnpm --filter @martini-kit/core test
```

### Hot Reload

The project uses Turborepo's watch mode for hot reloading:

```bash
# Watch mode for demos (automatically rebuilds dependencies)
pnpm --filter @martini-kit/demos dev
```

When you edit files in `@martini-kit/core` or `@martini-kit/phaser`, they will automatically rebuild and the demos will reload.

### Building for Production

```bash
# Build all packages
pnpm build

# Clean all build outputs and node_modules
pnpm clean
```

## Package Dependencies

Understanding the dependency graph helps you know which packages to build first:

```
@martini-kit/core (no dependencies)
  ├─→ @martini-kit/phaser (depends on core)
  ├─→ @martini-kit/transport-local (depends on core)
  ├─→ @martini-kit/transport-iframe-bridge (depends on core)
  ├─→ @martini-kit/transport-trystero (depends on core)
  ├─→ @martini-kit/transport-ws (depends on core)
  ├─→ @martini-kit/transport-colyseus (depends on core)
  ├─→ @martini-kit/devtools (depends on core)
  └─→ @martini-kit/ide (depends on core)

@martini-kit/demos (depends on all packages)
```

Turborepo automatically handles this dependency order during builds.

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm clean` | Clean build outputs and node_modules |
| `pnpm --filter <package> <command>` | Run command in specific package |
| `pnpm --filter @martini-kit/demos dev` | Start documentation site |

## Verifying Your Setup

After installation, verify everything works:

1. **Build completes successfully**
   ```bash
   pnpm build
   ```

2. **Tests pass**
   ```bash
   pnpm test
   ```

3. **Dev server runs**
   ```bash
   pnpm --filter @martini-kit/demos dev
   ```
   Visit [http://localhost:5173](http://localhost:5173) to see the documentation site

4. **Example games work**
   - Navigate to [http://localhost:5173/demo/fire-and-ice](http://localhost:5173/demo/fire-and-ice)
   - The game should load and run without errors

## Next Steps

Now that you have the development environment set up:

1. **Read the [Architecture Guide](/docs/latest/contributing/architecture)** to understand how the codebase is organized
2. **Check [Where to Contribute](/docs/latest/contributing/where-to-contribute)** for ideas on what to work on
3. **Review [Development Workflow](/docs/latest/contributing/development-workflow)** for making changes and submitting PRs
4. **Familiarize yourself with [Coding Standards](/docs/latest/contributing/coding-standards)** before writing code

## Getting Help

If you run into issues:

- **Check the [Troubleshooting Guide](/docs/latest/troubleshooting/common-issues)**
- **Ask questions in GitHub Discussions**
- **Open an issue if you find a bug**

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

---

Ready to contribute? Head over to [Where to Contribute](/docs/latest/contributing/where-to-contribute) to find your first task!
