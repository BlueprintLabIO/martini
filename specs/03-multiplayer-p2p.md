# Peer-to-Peer Multiplayer System

## Overview

WebRTC-based peer-to-peer multiplayer supporting 2-6 players with input synchronization. One player acts as authoritative host, others connect as clients.

**Key Features:**
- Zero server compute cost (P2P)
- Sub-100ms latency (local network)
- Input sync model (efficient bandwidth)
- 6-character share codes
- Upgrade path to dedicated servers

---

## Architecture

```
Creator's Browser (HOST)                 Friend's Browser (CLIENT)
┌────────────────────────┐              ┌────────────────────────┐
│ Game Sandbox (iframe)  │              │ Game Sandbox (iframe)  │
│ - Runs game logic      │              │ - Renders state        │
│ - Collects inputs      │              │ - Sends own input      │
│ - Broadcasts state     │              │                        │
└──────────┬─────────────┘              └──────────┬─────────────┘
           │                                       │
┌──────────▼─────────────┐              ┌─────────▼──────────────┐
│ WebRTC Data Channel    │◄────────────►│ WebRTC Data Channel    │
│ (simple-peer)          │    P2P       │ (simple-peer)          │
└──────────┬─────────────┘              └─────────┬──────────────┘
           │                                       │
           └───────────────┬───────────────────────┘
                           │
                  ┌────────▼─────────┐
                  │  Socket.io       │
                  │  Signaling       │
                  │  Server          │
                  │  (Coolify)       │
                  └──────────────────┘
```

---

## Connection Flow

### 1. **Host Creates Game**

```typescript
// Host clicks "Play" button
async function createGame(projectId: string) {
  // 1. Generate share code
  const shareCode = generateShareCode(); // e.g., "ABC123"

  // 2. Save to database
  await supabase.from('projects').update({
    share_code: shareCode,
    state: 'published'
  }).eq('id', projectId);

  // 3. Connect to signaling server
  const socket = io('wss://signal.yourdomain.com');

  // 4. Create host room
  socket.emit('create-room', { shareCode, hostId: userId });

  // 5. Initialize peer connection
  const peer = new SimplePeer({
    initiator: false, // Host waits for clients
    trickle: true
  });

  // 6. Handle signaling
  socket.on('signal', (data) => {
    peer.signal(data.signal);
  });

  peer.on('signal', (signal) => {
    socket.emit('signal', { shareCode, signal });
  });

  // 7. Handle connections
  peer.on('connect', () => {
    console.log('Client connected!');
    onClientConnected(peer);
  });

  // 8. Start game as host
  startGameAsHost(shareCode);

  return shareCode;
}
```

### 2. **Client Joins Game**

```typescript
// Client visits /play/ABC123
async function joinGame(shareCode: string) {
  // 1. Fetch project code
  const { data: project } = await supabase
    .from('projects')
    .select('*, files(*)')
    .eq('share_code', shareCode)
    .single();

  if (!project) {
    throw new Error('Game not found');
  }

  // 2. Connect to signaling server
  const socket = io('wss://signal.yourdomain.com');

  // 3. Join room
  socket.emit('join-room', { shareCode, clientId: userId });

  // 4. Initialize peer connection
  const peer = new SimplePeer({
    initiator: true, // Client initiates
    trickle: true
  });

  // 5. Handle signaling
  socket.on('signal', (data) => {
    peer.signal(data.signal);
  });

  peer.on('signal', (signal) => {
    socket.emit('signal', { shareCode, signal });
  });

  // 6. Handle connection
  peer.on('connect', () => {
    console.log('Connected to host!');
    onConnectedToHost(peer);
  });

  // 7. Load game as client
  startGameAsClient(project.files[0].content);
}
```

---

## Signaling Server (Socket.io)

### Server Implementation

```typescript
// signaling-server.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://yourdomain.com'],
    methods: ['GET', 'POST']
  }
});

// Room state
const rooms = new Map<string, {
  host: string;
  clients: Set<string>;
  createdAt: number;
}>();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Host creates room
  socket.on('create-room', ({ shareCode, hostId }) => {
    rooms.set(shareCode, {
      host: socket.id,
      clients: new Set(),
      createdAt: Date.now()
    });

    socket.join(shareCode);
    socket.emit('room-created', { shareCode });

    console.log(`Room ${shareCode} created by ${hostId}`);
  });

  // Client joins room
  socket.on('join-room', ({ shareCode, clientId }) => {
    const room = rooms.get(shareCode);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.clients.size >= 5) {
      // Max 6 players (1 host + 5 clients)
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    room.clients.add(socket.id);
    socket.join(shareCode);

    // Notify host
    io.to(room.host).emit('client-joined', {
      clientId: socket.id,
      playerCount: room.clients.size + 1
    });

    socket.emit('room-joined', { shareCode });

    console.log(`Client ${clientId} joined room ${shareCode}`);
  });

  // Forward WebRTC signals
  socket.on('signal', ({ shareCode, signal, targetId }) => {
    const room = rooms.get(shareCode);
    if (!room) return;

    if (targetId) {
      // Direct signal to specific peer
      io.to(targetId).emit('signal', { signal, from: socket.id });
    } else {
      // Broadcast to room (except sender)
      socket.to(shareCode).emit('signal', { signal, from: socket.id });
    }
  });

  // Client disconnects
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Find and clean up rooms
    rooms.forEach((room, shareCode) => {
      if (room.host === socket.id) {
        // Host left, notify all clients
        io.to(shareCode).emit('host-disconnected');
        rooms.delete(shareCode);
        console.log(`Room ${shareCode} closed (host left)`);
      } else if (room.clients.has(socket.id)) {
        // Client left
        room.clients.delete(socket.id);
        io.to(room.host).emit('client-left', {
          clientId: socket.id,
          playerCount: room.clients.size + 1
        });
      }
    });
  });
});

// Cleanup old rooms (> 1 hour)
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, shareCode) => {
    if (now - room.createdAt > 60 * 60 * 1000) {
      rooms.delete(shareCode);
      console.log(`Cleaned up stale room: ${shareCode}`);
    }
  });
}, 5 * 60 * 1000); // Every 5 minutes

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
```

---

## Input Synchronization

### Data Flow

**60 times per second:**

1. Each client sends input to host:
   ```typescript
   { playerId: 'abc', keys: ['left', 'space'], frame: 1234 }
   ```

2. Host collects all inputs, simulates game:
   ```typescript
   const allInputs = [hostInput, ...clientInputs];
   gameLogic.update(allInputs);
   ```

3. Host broadcasts state snapshot to all clients:
   ```typescript
   {
     frame: 1234,
     players: [
       { id: 'abc', x: 100, y: 200, health: 80 },
       { id: 'def', x: 150, y: 250, health: 100 }
     ],
     entities: [
       { type: 'bullet', x: 120, y: 210, owner: 'abc' }
     ]
   }
   ```

4. Clients render received state

---

### Host Implementation

```typescript
class MultiplayerHost {
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private inputs: Map<string, PlayerInput> = new Map();
  private gameState: GameState;

  constructor() {
    // Collect own input
    this.inputs.set('host', this.getLocalInput());

    // Request inputs from clients every frame
    setInterval(() => this.requestInputs(), 16); // 60fps

    // Broadcast state every frame
    setInterval(() => this.broadcastState(), 16);
  }

  addPeer(peerId: string, peer: SimplePeer.Instance) {
    this.peers.set(peerId, peer);

    peer.on('data', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'INPUT') {
        this.inputs.set(message.playerId, message.input);
      }
    });

    peer.on('close', () => {
      this.peers.delete(peerId);
      this.inputs.delete(peerId);
    });
  }

  requestInputs() {
    // Clients automatically send inputs, no request needed
  }

  update() {
    // Get all inputs
    const allInputs = Array.from(this.inputs.values());

    // Send to game sandbox
    gameFrame.contentWindow.postMessage({
      type: 'UPDATE',
      payload: { inputs: allInputs }
    }, '*');
  }

  broadcastState() {
    // Get state from game sandbox
    window.addEventListener('message', (event) => {
      if (event.data.type === 'STATE') {
        const state = event.data.payload;

        // Broadcast to all peers
        const stateData = JSON.stringify({
          type: 'STATE',
          frame: state.frame,
          state: state
        });

        this.peers.forEach(peer => {
          peer.send(stateData);
        });
      }
    });
  }
}
```

### Client Implementation

```typescript
class MultiplayerClient {
  private peer: SimplePeer.Instance;
  private localInput: PlayerInput = { keys: [] };

  constructor(peer: SimplePeer.Instance) {
    this.peer = peer;

    // Listen for state updates
    peer.on('data', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'STATE') {
        this.applyState(message.state);
      }
    });

    // Send input every frame
    setInterval(() => this.sendInput(), 16); // 60fps
  }

  sendInput() {
    const inputData = JSON.stringify({
      type: 'INPUT',
      playerId: localPlayerId,
      input: {
        keys: this.localInput.keys,
        frame: currentFrame
      }
    });

    this.peer.send(inputData);
  }

  applyState(state: GameState) {
    // Send state to game sandbox
    gameFrame.contentWindow.postMessage({
      type: 'STATE_UPDATE',
      payload: state
    }, '*');
  }

  updateLocalInput(keys: string[]) {
    this.localInput.keys = keys;
  }
}
```

---

## Share Code Generation

```typescript
function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude I, O, 0, 1
  let code = '';

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

// Check for collisions
async function getUniqueShareCode(): Promise<string> {
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  while (attempts < MAX_ATTEMPTS) {
    const code = generateShareCode();

    const { data } = await supabase
      .from('projects')
      .select('id')
      .eq('share_code', code)
      .single();

    if (!data) {
      return code; // Unique!
    }

    attempts++;
  }

  throw new Error('Failed to generate unique share code');
}
```

---

## Enhanced Share Links

### Open Graph Metadata

```svelte
<!-- +page.svelte for /play/[code] -->
<script>
  export let data; // { project, playerCount }
</script>

<svelte:head>
  <title>{data.project.title} - Play Now!</title>
  <meta property="og:title" content="{data.project.title}" />
  <meta property="og:description" content="{data.project.description}" />
  <meta property="og:image" content="{data.project.thumbnail_url}" />
  <meta property="og:url" content="https://yourdomain.com/play/{data.project.share_code}" />
  <meta property="og:type" content="website" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{data.project.title}" />
  <meta name="twitter:description" content="{data.project.description}" />
  <meta name="twitter:image" content="{data.project.thumbnail_url}" />
</svelte:head>

<div class="play-page">
  <div class="game-info">
    <h1>{data.project.title}</h1>
    <p>{data.project.description}</p>
    <div class="stats">
      <span>👥 {data.playerCount}/6 players online</span>
      <span>by @{data.project.owner.username}</span>
    </div>
  </div>

  <button on:click={() => joinGame()}>
    Join Game
  </button>
</div>
```

### Server-Side Rendering (SSR)

```typescript
// +page.server.ts
export async function load({ params }) {
  const { code } = params;

  // Fetch project
  const { data: project } = await supabase
    .from('projects')
    .select('*, users(username)')
    .eq('share_code', code)
    .single();

  if (!project) {
    throw error(404, 'Game not found');
  }

  // Count active players (from signaling server)
  const playerCount = await getActivePlayerCount(code);

  return {
    project,
    playerCount
  };
}
```

---

## Host Disconnect Handling

### Pause & Timeout

```typescript
class GameSession {
  private hostDisconnectTimer: NodeJS.Timeout | null = null;
  private isPaused = false;

  onHostDisconnect() {
    console.warn('Host disconnected, pausing game...');

    // Pause game
    this.isPaused = true;
    this.pauseGame();

    // Show warning to clients
    this.showNotification('Host disconnected. Waiting 30s to reconnect...');

    // Start 30s countdown
    this.hostDisconnectTimer = setTimeout(() => {
      this.endGame('Host did not reconnect');
    }, 30000);
  }

  onHostReconnect() {
    if (this.hostDisconnectTimer) {
      clearTimeout(this.hostDisconnectTimer);
      this.hostDisconnectTimer = null;
    }

    // Resume game
    this.isPaused = false;
    this.resumeGame();

    this.showNotification('Host reconnected!');
  }

  endGame(reason: string) {
    this.showNotification(`Game ended: ${reason}`);

    // Return to lobby or game list
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  }
}
```

### Browser Close Warning

```typescript
// Warn host before closing tab
window.addEventListener('beforeunload', (event) => {
  if (isHost && peers.size > 0) {
    event.preventDefault();
    event.returnValue = 'Other players are still in the game. Are you sure you want to leave?';
    return event.returnValue;
  }
});
```

---

## Bandwidth Optimization

### Delta Compression (Future)

Only send changed state:

```typescript
class DeltaCompressor {
  private lastState: GameState | null = null;

  compress(newState: GameState): any {
    if (!this.lastState) {
      // First frame, send full state
      this.lastState = newState;
      return { type: 'full', state: newState };
    }

    // Calculate diff
    const delta = {
      type: 'delta',
      frame: newState.frame,
      players: [],
      entities: []
    };

    // Only include changed players
    newState.players.forEach((player, i) => {
      const lastPlayer = this.lastState.players[i];
      if (!lastPlayer || player.x !== lastPlayer.x || player.y !== lastPlayer.y) {
        delta.players.push({ i, ...player });
      }
    });

    // Similar for entities...

    this.lastState = newState;
    return delta;
  }

  decompress(delta: any): GameState {
    // Apply delta to last state
    // ...
  }
}
```

---

## Upgrade Path: 7+ Players

### UI for Upgrade

```svelte
<script>
let playerCount = 6;
let showUpgradePrompt = false;

function addPlayer() {
  if (playerCount >= 6) {
    showUpgradePrompt = true;
  }
}
</script>

{#if showUpgradePrompt}
  <div class="upgrade-modal">
    <h3>🚀 Upgrade to Dedicated Server</h3>
    <p>Want to support 7-100 players?</p>
    <ul>
      <li>✅ No lag for large groups</li>
      <li>✅ 24/7 persistent world</li>
      <li>✅ Better anti-cheat</li>
    </ul>
    <p class="price">$10/month</p>
    <button on:click={() => upgradeToServer()}>
      Upgrade Now
    </button>
    <button on:click={() => showUpgradePrompt = false}>
      Maybe Later
    </button>
  </div>
{/if}
```

### Backend Provision (Future)

```typescript
async function upgradeToServer(projectId: string, userId: string) {
  // 1. Charge $10/mo via Stripe
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: 'price_dedicated_server' }]
  });

  // 2. Deploy to K8s
  const deployment = await k8s.createDeployment({
    name: `game-${projectId}`,
    image: 'your-game-server-image',
    env: {
      PROJECT_ID: projectId,
      GAME_CODE: gameCode
    },
    resources: {
      cpu: '500m',
      memory: '512Mi'
    }
  });

  // 3. Update project
  await supabase.from('projects').update({
    server_mode: 'dedicated',
    server_url: deployment.url
  }).eq('id', projectId);

  // 4. Redirect to new URL
  return `/server/${shareCode}`;
}
```

---

## Testing

### Local Testing

```typescript
describe('P2P Multiplayer', () => {
  it('should connect two peers', async () => {
    const host = new MultiplayerHost();
    const client = new MultiplayerClient();

    await host.createRoom();
    await client.joinRoom(host.shareCode);

    expect(host.peers.size).toBe(1);
    expect(client.connected).toBe(true);
  });

  it('should sync inputs', async () => {
    // ...
  });

  it('should handle host disconnect', async () => {
    // ...
  });
});
```

### Load Testing

```bash
# Simulate 100 concurrent rooms with 6 players each
artillery quick --count 600 --num 10 wss://signal.yourdomain.com
```

---

## Monitoring

Track in analytics:

```typescript
await supabase.from('analytics').insert({
  event_type: 'multiplayer_session',
  project_id: projectId,
  metadata: {
    player_count: peers.size + 1,
    duration_seconds: sessionDuration,
    host_disconnects: disconnectCount,
    average_latency_ms: avgLatency
  }
});
```

**Key Metrics:**
- Connection success rate (target: >95%)
- Average latency (target: <100ms)
- Host disconnect rate (monitor for patterns)
- Rooms created vs. rooms joined (virality)

---

## Future Enhancements

- **TURN server:** Fallback for restrictive NATs
- **Voice chat:** WebRTC audio channels
- **Spectator mode:** Watch without playing
- **Host migration:** Promote client to host if host leaves
- **Reconnect:** Save state, allow rejoining after disconnect
