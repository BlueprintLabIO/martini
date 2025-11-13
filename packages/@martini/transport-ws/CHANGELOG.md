# Changelog

## [1.0.0] - 2025-01-13

### Added
- ✅ **WebSocketTransport** - Production-ready WebSocket transport for Martini
  - Client-server architecture with relay pattern
  - Automatic reconnection with configurable attempts and delay
  - Server-managed host election (first player becomes host)
  - Peer tracking and join/leave notifications
  - Error handling with callback support
  - Full TypeScript type safety

- ✅ **Example Server** (`examples/server.ts`)
  - Room management
  - Host election and re-election on disconnect
  - Message relay (broadcast and unicast)
  - Player join/leave notifications
  - Simple, production-ready implementation

- ✅ **Comprehensive Tests**
  - 17 unit tests (with MockWebSocket)
  - 8 integration tests (with real WebSocket server)
  - All 25 tests passing ✅
  - Test coverage for:
    - Connection lifecycle
    - Message sending/receiving
    - Peer management
    - Host election
    - Reconnection
    - Error handling

- ✅ **Documentation**
  - Comprehensive README with:
    - Quick start guide
    - API reference
    - Server implementation guide
    - Production deployment considerations
    - Comparison with P2P transport
    - Integration examples (Colyseus)
    - Troubleshooting section

### Features

**Client Features:**
- `WebSocketTransport(url, config)` - Create transport instance
- `waitForReady()` - Wait for connection to establish
- `send(message, targetId?)` - Send broadcast or unicast messages
- `onMessage(handler)` - Listen for messages
- `onPeerJoin(handler)` - Listen for peer joins
- `onPeerLeave(handler)` - Listen for peer leaves
- `onError(handler)` - Listen for connection errors
- `disconnect()` - Clean disconnect
- `getPlayerId()` - Get local player ID
- `getPeerIds()` - Get connected peer IDs
- `isHost()` - Check if local player is host

**Server Features:**
- Room management (create/join/leave)
- Host election (first player in room)
- Host re-election on disconnect
- Message relay (broadcast and unicast)
- Player tracking and notifications

### Implementation Details

**Test-Driven Development:**
- Wrote 17 unit tests FIRST
- Implemented transport to pass tests
- Fixed 4 test failures iteratively
- Added 8 integration tests with real server
- Result: 100% test pass rate

**Bug Fixes During Development:**
1. TypeScript config - missing base config
2. Message count - handshake message not cleared
3. Disconnect cleanup - WebSocket reference becomes null
4. Error pass-through - wrapped instead of forwarding
5. Server messages - not propagated to message handlers

### Design Decisions

1. **Relay Pattern**: Server forwards messages without running game logic
   - Simpler server implementation
   - Game logic runs on host client
   - Easy to scale horizontally

2. **Server-Managed Host Election**: Server controls who is host
   - Deterministic (first player)
   - Automatic re-election on disconnect
   - No race conditions

3. **Transport Interface Compliance**: Implements `@martini/core` Transport interface
   - Works with any Martini game
   - Swappable with other transports (P2P, UDP)
   - Type-safe integration

### Next Steps

See [next-steps.md](../../../next-steps.md) for roadmap:
- ⏳ Create "killer demo" (Agar.io clone in 250 lines)
- ⏳ State inspector DevTools
- ⏳ Colyseus adapter package
- ⏳ Video tutorial
