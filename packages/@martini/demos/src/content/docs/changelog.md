---
title: Changelog
description: Version history and release notes for Martini SDK
---

# Changelog

All notable changes to Martini SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.0] - 2025-11-18

### Initial Release 🎉

First public release of Martini SDK - an engine-agnostic, host-authoritative multiplayer framework.

#### Core Features

**@martini/core**
- Host-authoritative game runtime
- Declarative game definitions with `defineGame()`
- Action system with context-aware handlers
- Automatic state synchronization via diff/patch algorithm
- Player lifecycle management (`onPlayerJoin`, `onPlayerLeave`)
- Seeded random number generation for determinism
- Transport abstraction layer
- Logger system with channels
- Helper utilities (`createPlayerManager`, `createInputAction`, `createTickAction`)

**@martini/phaser**
- Full Phaser 3 integration via `PhaserAdapter`
- Automatic sprite tracking and synchronization
- SpriteManager for lifecycle management
- InputManager for keyboard, mouse, and touch controls
- Reactive APIs (`getMyPlayer`, `watchMyPlayer`, `onMyPlayerChange`)
- Physics behavior profiles (platformer, top-down, racing, space)
- Collision management system
- UI helpers (health bars, HUD components)
- State-driven spawner for dynamic objects

**@martini/transport-local**
- In-memory transport for local testing
- Zero-latency synchronization
- Room-based peer management
- Built-in metrics

**@martini/transport-iframe-bridge**
- Parent-iframe communication layer
- Relay system for sandboxed environments
- Powers the Martini IDE

**@martini/transport-trystero**
- P2P WebRTC transport using Trystero
- Serverless multiplayer
- Automatic peer discovery
- NAT traversal support

**@martini/transport-ws**
- WebSocket transport for server-based games
- Low latency communication
- Reliable message delivery

**@martini/transport-colyseus**
- Colyseus server integration
- Room-based matchmaking
- Server-authoritative architecture

**@martini/devtools**
- StateInspector for debugging
- State snapshot capture
- Action history tracking
- Performance metrics
- Memory usage monitoring

**@martini/ide**
- In-browser IDE for live game development
- CodeMirror-based editor with TypeScript support
- Live preview with hot reload
- State visualization
- Example game templates

**@martini/demos**
- Comprehensive documentation site
- Interactive example games:
  - Fire & Ice (cooperative platformer)
  - Paddle Battle (1v1 physics)
  - Arena Blaster (combat shooter)
  - Blob Battle (physics-based)
  - Circuit Racer (racing)
  - Tile Matcher (puzzle)
- Recipe code snippets
- API reference

#### Documentation

Complete documentation covering:
- Getting Started (installation, quick start, first game)
- Core Concepts (architecture, state management, actions, transport, determinism)
- API Reference (all packages fully documented)
- Advanced Guides (Phaser integration, physics, UI, testing, deployment, optimization)
- Examples & Recipes (player movement, shooting, health, power-ups, game modes)
- Contributing Guide (getting started, architecture, workflow, coding standards)
- Troubleshooting (common issues, debugging techniques)
- FAQ (frequently asked questions)

#### Developer Experience

- Monorepo architecture with pnpm workspaces
- Turborepo for optimized builds
- TypeScript strict mode throughout
- Vitest for testing
- Full type safety with generics
- Hot reload in development
- Example games for learning

#### Known Limitations

- No host migration support (planned for future)
- No built-in replay/recording system (planned for future)
- Phaser adapter only (Unity and Three.js planned)
- No compression (planned for future)

#### Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Version History

### [v0.1.0] - 2025-11-18
- Initial public release

---

## Release Process

Martini SDK follows semantic versioning:

- **MAJOR** (x.0.0) - Breaking changes
- **MINOR** (0.x.0) - New features (backwards compatible)
- **PATCH** (0.0.x) - Bug fixes

## Stay Updated

- **GitHub Releases**: [github.com/yourusername/martini/releases](https://github.com/yourusername/martini/releases)
- **Discussions**: [github.com/yourusername/martini/discussions](https://github.com/yourusername/martini/discussions)
- **Twitter**: [@martini_sdk](https://twitter.com/martini_sdk) _(if available)_

## Contributing

Found a bug or want to contribute? See the [Contributing Guide](/docs/latest/contributing/getting-started)!
