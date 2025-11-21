# Changelog

All notable changes to martini-kit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-21

### Added

**martini-kit: Multiplayer without networking.**

Initial public release of the martini-kit multiplayer SDK.

#### Core Features
- **@martini-kit/core** - Host-authoritative state synchronization engine
  - Declarative game logic API with `defineGame()`
  - Automatic diff/patch state sync (20 FPS default)
  - Transport-agnostic architecture
  - 96%+ test coverage
  - TypeScript-first with full type safety

#### Adapters
- **@martini-kit/phaser** - Phaser 3 integration
  - Automatic sprite position synchronization
  - Works with Phaser's physics engine
  - Host/client mode detection
  - No manual networking code required

#### Transports
- **@martini-kit/transport-trystero** - P2P WebRTC transport
  - Zero server costs for development
  - Built on Trystero library
  - Automatic peer discovery

- **@martini-kit/transport-local** - Local in-memory transport
  - Perfect for testing and demos
  - Single-page multiplayer simulation

- **@martini-kit/transport-ws** - WebSocket transport
  - Production-ready client-server networking
  - Reliable connections

- **@martini-kit/transport-iframe-bridge** - Iframe transport
  - Sandboxed multiplayer testing
  - IDE integration support

#### Development Tools
- **@martini-kit/devtools** - State inspector and debugging
  - Real-time state viewer
  - Action history tracking
  - Network monitoring

- **@martini-kit/ide** - Browser-based visual IDE
  - Dual-view local testing
  - Live code editing
  - Integrated game preview

#### Documentation
- Comprehensive README with "Multiplayer without networking" tagline
- Complete API reference
- Getting started guides
- Example games and demos

#### License
- Apache License 2.0
- Open source and self-hostable

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- N/A (initial release)

---

## [Unreleased]

### Planned
- Unity C# bindings
- Godot GDScript bindings
- Three.js adapter
- Client prediction (optional advanced mode)
- Additional transport implementations
- More example games

---

[0.1.0]: https://github.com/BlueprintLabIO/martini/releases/tag/v0.1.0
[Unreleased]: https://github.com/BlueprintLabIO/martini/compare/v0.1.0...HEAD
