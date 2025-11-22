---
title: Where to Contribute
description: Find the right area to contribute to martini-kit SDK based on your skills and interests
---

# Where to Contribute

There are many ways to contribute to martini-kit SDK! This guide helps you find the right area based on your skills and interests.

## 🔥 High Priority Areas

These areas need immediate attention and would have significant impact:

### More Transport Implementations

Expand the ecosystem with new transport layers:

- **Socket.io Transport**
  - Real-time WebSocket transport
  - Room-based architecture
  - Auto-reconnection
  - Good for: Traditional client-server games

- **Supabase Realtime Transport**
  - Uses Supabase's realtime channels
  - Built-in authentication
  - Good for: Projects already using Supabase

- **Ably Transport**
  - Enterprise-grade messaging
  - Global edge network
  - Good for: Production games at scale

- **PartyKit Transport**
  - Serverless WebSocket platform
  - Edge deployment
  - Good for: Modern serverless architectures

**Skills needed:** TypeScript, networking, async programming

### Performance Optimizations

Help make martini-kit faster and more efficient:

- **State Compression**
  - Implement compression algorithms (LZ4, Brotli)
  - Reduce bandwidth usage
  - Add compression benchmarks

- **Delta Encoding**
  - Optimize diff generation algorithm
  - Reduce patch size
  - Improve sync performance

- **Bandwidth Profiling Tools**
  - Measure bandwidth usage per action
  - Identify optimization opportunities
  - Visualize network traffic

**Skills needed:** Algorithms, performance optimization, profiling

### Documentation Improvements

Help others learn and use martini-kit:

- **Complete API Documentation**
  - Fill in missing API docs
  - Add more code examples
  - Improve clarity and completeness

- **Video Tutorials**
  - Create screencasts for common tasks
  - Build a YouTube series
  - Record game-building livestreams

- **Interactive Tutorials**
  - Use the martini-kit IDE for in-browser tutorials
  - Step-by-step guided examples
  - Gamified learning experience

**Skills needed:** Technical writing, video production, teaching

### Example Games

Showcase martini-kit's capabilities with more games:

- **More Genres**
  - RTS (real-time strategy)
  - Card game (deck building, turn-based)
  - Racing game (physics-heavy)
  - Platformer (vertical scrolling)
  - Tower defense

- **Mobile-Optimized Examples**
  - Touch controls
  - Responsive layouts
  - Performance optimization for mobile

- **3D Examples**
  - Three.js integration
  - 3D multiplayer mechanics
  - Camera synchronization

**Skills needed:** Game design, Phaser, creative thinking

## 🎯 Good First Issues

Perfect for first-time contributors:

### Add Physics Behavior Profiles

Extend the `PhysicsManager` with more profiles:

- **Swimming Physics**
  ```typescript
  PhysicsManager.SWIMMING = {
    gravity: { x: 0, y: 50 },
    drag: { x: 1000, y: 1000 },
    maxVelocity: { x: 80, y: 80 }
  }
  ```

- **Flying Physics**
  ```typescript
  PhysicsManager.FLYING = {
    gravity: { x: 0, y: 0 },
    drag: { x: 200, y: 200 },
    maxVelocity: { x: 300, y: 300 }
  }
  ```

- **Vehicle Physics Variants**
  - Car physics (drift, acceleration curves)
  - Spaceship physics (inertia, rotation)

**File:** [`@martini-kit/phaser/src/helpers/PhysicsManager.ts`](https://github.com/BlueprintLabIO/martini/blob/main/@martini-kit/phaser/src/helpers/PhysicsManager.ts)

### Create UI Component Library

Build reusable UI components:

- **Chat Bubble System**
  - Text bubbles above players
  - Auto-hide after duration
  - Emoji support

- **Damage Numbers**
  - Float up from hit point
  - Color-coded (red for damage, green for heal)
  - Fade out animation

- **Mini-map Component**
  - Show player positions
  - Update in real-time
  - Configurable zoom

**Skills needed:** Phaser, UI/UX, game design

### Write Tests for Edge Cases

Improve test coverage:

- **Sync Logic Edge Cases**
  - Rapid state changes
  - Large state diffs
  - Nested state updates

- **Transport Error Handling**
  - Connection drops
  - Message loss
  - Peer timeouts

- **Player Join/Leave Races**
  - Simultaneous joins
  - Join during state transition
  - Leave with pending actions

**File location:** `@martini-kit/*/src/__tests__/`

**Skills needed:** Testing, TypeScript, debugging

### Improve Error Messages

Make errors more helpful:

- **Add Descriptive Errors**
  - Explain what went wrong
  - Suggest how to fix it
  - Link to relevant docs

- **Common Mistakes Detection**
  - Using `playerId` instead of `targetId`
  - Missing `trackSprite()` call
  - Invalid state structure

**Skills needed:** TypeScript, DX (developer experience)

## 🚀 Advanced Contributions

For experienced contributors looking for challenges:

### Host Migration Support

Enable games to continue when the host disconnects:

- **Automatic Host Failover**
  - Elect new host when current disconnects
  - Transfer state to new host
  - Resume game seamlessly

- **State Transfer Protocol**
  - Serialize full state
  - Send to new host
  - Verify integrity

**Skills needed:** Distributed systems, state management, TypeScript

### Replay/Recording System

Record and playback game sessions:

- **Action Recording**
  - Capture all actions with timestamps
  - Store in compact format
  - Support export/import

- **Playback Functionality**
  - Replay from action log
  - Variable speed playback
  - Pause/resume support

- **Time Travel Debugging**
  - Step backward through history
  - Inspect state at any point
  - Identify when bugs occurred

**Skills needed:** State management, algorithms, TypeScript

### Unity Adapter

Bring martini-kit to Unity games:

- **Unity WebGL Integration**
  - JavaScript↔C# bridge
  - State serialization
  - Unity lifecycle integration

- **C# API Surface**
  - Idiomatic C# API
  - Unity-style patterns
  - Coroutine support

**Skills needed:** Unity, C#, JavaScript, WebGL

### Three.js Adapter

Enable 3D multiplayer games:

- **3D Sprite Tracking**
  - Position, rotation, scale sync
  - Quaternion interpolation
  - LOD (level of detail) management

- **Camera Synchronization**
  - Shared camera state
  - Viewport sync
  - Camera interpolation

- **3D Physics Integration**
  - Cannon.js or Ammo.js
  - Collision detection
  - Rigid body sync

**Skills needed:** Three.js, 3D math, physics

## 📚 Documentation Contributions

### Missing Documentation

- **Troubleshooting guides** for common issues
- **Migration guides** for version upgrades
- **FAQ** based on common questions
- **Cookbook recipes** for specific patterns

### Code Examples

- Extract patterns from existing games
- Create minimal reproductions
- Add comments explaining key concepts

### Diagrams

- Architecture diagrams (Mermaid)
- Flow charts for complex processes
- Sequence diagrams for message flows

## 🐛 Bug Fixes

Check the [GitHub Issues](https://github.com/BlueprintLabIO/martini/issues) for:

- Bugs labeled `good first issue`
- Performance issues
- Edge case bugs
- Browser compatibility issues

## 💡 Feature Requests

Review [Feature Requests](https://github.com/BlueprintLabIO/martini/discussions/categories/feature-requests) and:

- Discuss implementation approaches
- Prototype new features
- Write design documents

## 🎨 Design Contributions

Not a coder? You can still contribute:

- **Logo and Branding**
  - Design a logo for martini-kit SDK
  - Create brand guidelines
  - Design marketing materials

- **Documentation Design**
  - Improve docs website UI
  - Create better diagrams
  - Design code example layouts

- **Game Assets**
  - Sprites for example games
  - Sound effects and music
  - UI elements

## 🌟 Community Contributions

Help grow the martini-kit community:

- **Write Blog Posts**
  - Share your martini-kit game projects
  - Write tutorials
  - Compare with other frameworks

- **Create Videos**
  - Build-along tutorials
  - Game showcases
  - Live coding sessions

- **Answer Questions**
  - Help users in GitHub Discussions
  - Answer Stack Overflow questions
  - Provide code reviews

## How to Pick Your First Contribution

Ask yourself:

1. **What are your skills?**
   - TypeScript → Core/transport contributions
   - Game dev → Example games, adapters
   - Design → UI components, documentation
   - Writing → Docs, tutorials, guides

2. **How much time do you have?**
   - 1-2 hours → Good first issues, bug fixes
   - Half day → Add a physics profile, write a recipe
   - Weekend → Build an example game, new transport
   - Week+ → Advanced features, new adapter

3. **What interests you?**
   - Networking → Transports
   - Performance → Optimization
   - Teaching → Documentation
   - Creativity → Example games

## Getting Started

1. **Read [Development Workflow](/docs/latest/contributing/development-workflow)** to learn the PR process
2. **Check [Coding Standards](/docs/latest/contributing/coding-standards)** before writing code
3. **Ask questions** in GitHub Discussions if unsure
4. **Start small** - even fixing a typo helps!

## Recognition

Contributors are recognized in:
- **CONTRIBUTORS.md** file
- **Release notes** for their contributions
- **Documentation credits**
- **Special thanks** in the README

---

Ready to contribute? Pick an area above and get started! 🚀
