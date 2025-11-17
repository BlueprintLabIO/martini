# Deployment

This guide covers deploying Martini multiplayer games to production, including hosting options, transport configuration, performance optimization, and monitoring.

## Deployment Architecture

### Peer-to-Peer (P2P) Architecture

```
┌─────────┐         ┌─────────┐
│ Player1 │ ←─WebRTC─→ Player2 │
│ (Host)  │         │ (Client)│
└─────────┘         └─────────┘
      ↓                  ↑
      └─────────WebRTC───┘
           Player3 (Client)
```

**Pros:**
- No server costs
- Low latency (direct connection)
- Scales naturally

**Cons:**
- Host migration complexity
- NAT traversal issues
- Host has all the power (cheating concerns)

### Client-Server Architecture

```
┌─────────┐         ┌─────────┐
│ Player1 │ ←─WSS──→ │ Server  │
│         │         │ (Host)  │
└─────────┘         └─────────┘
                         ↑
┌─────────┐              │
│ Player2 │ ─────WSS─────┘
└─────────┘
```

**Pros:**
- Server-authoritative (anti-cheat)
- Reliable connections
- Host never disconnects

**Cons:**
- Server hosting costs
- Latency depends on server location
- Requires backend infrastructure

## Production Transports

### Option 1: P2P with Trystero (WebRTC)

**Best for:** Casual games, prototypes, games with 2-8 players

```bash
pnpm add @martini/transport-trystero trystero
```

```typescript
import { TrysteroTransport } from '@martini/transport-trystero';

// Create P2P transport
const transport = new TrysteroTransport({
  appId: 'my-game-v1', // Unique app identifier
  roomId: getRoomId(), // Room code from URL or matchmaking
  isHost: determineIfHost(), // First player is host
  config: {
    // Optional STUN/TURN servers
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:your-turn-server.com:3478',
        username: 'username',
        credential: 'password'
      }
    ]
  }
});

const runtime = new GameRuntime(game, transport, {
  isHost: transport.isHost(),
  playerIds: [transport.getPlayerId()]
});
```

**Room Management:**

```typescript
// Generate room code
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Join room from URL
const params = new URLSearchParams(window.location.search);
const roomId = params.get('room') || generateRoomCode();

// Update URL
if (!params.has('room')) {
  const newUrl = `${window.location.pathname}?room=${roomId}`;
  window.history.replaceState({}, '', newUrl);
}

// Share room link
const shareableLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
console.log('Share this link:', shareableLink);
```

### Option 2: WebSocket Server

**Best for:** Production games, competitive games, 10+ players

#### Server (Node.js)

```bash
pnpm add ws @types/ws
```

```typescript
// server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { GameRuntime } from '@martini/core';
import { game } from './game';

const wss = new WebSocketServer({ port: 8080 });

interface Room {
  id: string;
  runtime: GameRuntime;
  clients: Map<string, WebSocket>;
}

const rooms = new Map<string, Room>();

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: string | null = null;
  let playerId: string | null = null;

  ws.on('message', (data: string) => {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'join':
        const { roomId, playerId: pid } = message;
        playerId = pid;
        currentRoom = roomId;

        // Create room if doesn't exist
        if (!rooms.has(roomId)) {
          const transport = createServerTransport(roomId);
          const runtime = new GameRuntime(game, transport, {
            isHost: true,
            playerIds: []
          });

          rooms.set(roomId, {
            id: roomId,
            runtime,
            clients: new Map()
          });
        }

        const room = rooms.get(roomId)!;
        room.clients.set(playerId, ws);

        // Add player to game
        runtime.submitAction('__playerJoin', { playerId });

        // Send initial state
        ws.send(JSON.stringify({
          type: 'state_sync',
          state: room.runtime.getState()
        }));

        break;

      case 'action':
        if (currentRoom && playerId) {
          const room = rooms.get(currentRoom);
          if (room) {
            room.runtime.submitAction(
              message.actionName,
              message.input,
              message.targetId
            );
          }
        }
        break;
    }
  });

  ws.on('close', () => {
    if (currentRoom && playerId) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.clients.delete(playerId);
        room.runtime.submitAction('__playerLeave', { playerId });

        // Clean up empty rooms
        if (room.clients.size === 0) {
          room.runtime.destroy();
          rooms.delete(currentRoom);
        }
      }
    }
  });
});

console.log('WebSocket server running on ws://localhost:8080');
```

#### Client

```typescript
// client.ts
import { GameRuntime, Transport } from '@martini/core';

class WebSocketTransport implements Transport {
  private ws: WebSocket;
  private playerId: string;
  private messageHandlers: Array<(msg: any, senderId: string) => void> = [];
  private peerJoinHandlers: Array<(peerId: string) => void> = [];
  private peerLeaveHandlers: Array<(peerId: string) => void> = [];

  constructor(url: string, roomId: string) {
    this.playerId = `player-${Date.now()}`;
    this.ws = new WebSocket(url);

    this.ws.addEventListener('open', () => {
      // Join room
      this.ws.send(JSON.stringify({
        type: 'join',
        roomId,
        playerId: this.playerId
      }));
    });

    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'state_sync':
        case 'action':
          this.messageHandlers.forEach(handler => {
            handler(message, message.senderId || 'server');
          });
          break;

        case 'peer_join':
          this.peerJoinHandlers.forEach(handler => {
            handler(message.peerId);
          });
          break;

        case 'peer_leave':
          this.peerLeaveHandlers.forEach(handler => {
            handler(message.peerId);
          });
          break;
      }
    });
  }

  send(message: any, targetId?: string): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        targetId
      }));
    }
  }

  onMessage(handler: (msg: any, senderId: string) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) this.messageHandlers.splice(index, 1);
    };
  }

  onPeerJoin(handler: (peerId: string) => void): () => void {
    this.peerJoinHandlers.push(handler);
    return () => {
      const index = this.peerJoinHandlers.indexOf(handler);
      if (index > -1) this.peerJoinHandlers.splice(index, 1);
    };
  }

  onPeerLeave(handler: (peerId: string) => void): () => void {
    this.peerLeaveHandlers.push(handler);
    return () => {
      const index = this.peerLeaveHandlers.indexOf(handler);
      if (index > -1) this.peerLeaveHandlers.splice(index, 1);
    };
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getPeerIds(): string[] {
    // Implement peer tracking if needed
    return [];
  }

  isHost(): boolean {
    return false; // Server is always host
  }
}

// Usage
const transport = new WebSocketTransport('wss://your-server.com', 'room-123');
const runtime = new GameRuntime(game, transport, {
  isHost: false,
  playerIds: [transport.getPlayerId()]
});
```

## Hosting Platforms

### Vercel / Netlify (Static Sites)

For P2P games (no server needed):

```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**Deploy to Vercel:**
```bash
npx vercel --prod
```

**Deploy to Netlify:**
```bash
npx netlify deploy --prod --dir=dist
```

### Railway (WebSocket Server)

Perfect for WebSocket backends:

1. Create `railway.toml`:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node dist/server.js"
```

2. Deploy:
```bash
railway login
railway up
```

3. Get your URL:
```bash
railway domain
```

### Fly.io (Global Edge)

For low-latency worldwide:

1. Create `fly.toml`:
```toml
app = "my-game-server"

[build]
  dockerfile = "Dockerfile"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

2. Deploy:
```bash
flyctl launch
flyctl deploy
```

### AWS / GCP / Azure

For enterprise deployments, use managed Kubernetes or ECS/App Engine/App Service.

## Environment Configuration

### Environment Variables

```typescript
// config.ts
export const config = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,

  // WebSocket server URL
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',

  // TURN server credentials
  turnUrl: import.meta.env.VITE_TURN_URL,
  turnUsername: import.meta.env.VITE_TURN_USERNAME,
  turnCredential: import.meta.env.VITE_TURN_CREDENTIAL,

  // Analytics
  analyticsKey: import.meta.env.VITE_ANALYTICS_KEY,

  // Feature flags
  enableDevTools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true'
};
```

**.env.production:**
```
VITE_WS_URL=wss://your-server.com
VITE_TURN_URL=turn:your-turn.com:3478
VITE_TURN_USERNAME=production_user
VITE_TURN_CREDENTIAL=production_pass
VITE_ANALYTICS_KEY=your_analytics_key
VITE_ENABLE_DEVTOOLS=false
```

## Build Optimization

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'phaser': ['phaser'],
          'martini': ['@martini/core', '@martini/phaser']
        }
      }
    }
  }
});
```

### Code Splitting

```typescript
// Lazy load game scenes
const loadGameScene = async () => {
  const { GameScene } = await import('./scenes/GameScene');
  return GameScene;
};

// Use when creating Phaser game
const GameSceneClass = await loadGameScene();
const game = new Phaser.Game({
  scene: [GameSceneClass]
});
```

## Monitoring & Analytics

### Error Tracking with Sentry

```bash
pnpm add @sentry/browser
```

```typescript
import * as Sentry from '@sentry/browser';

if (config.isProduction) {
  Sentry.init({
    dsn: 'your-sentry-dsn',
    environment: 'production',
    tracesSampleRate: 0.1
  });
}

// Track game errors
runtime.onEvent('error', (senderId, payload) => {
  Sentry.captureException(new Error(payload.message), {
    tags: {
      playerId: senderId,
      action: payload.action
    }
  });
});
```

### Performance Monitoring

```typescript
// Track key metrics
const metrics = {
  fps: 0,
  latency: 0,
  playerCount: 0,
  stateSize: 0
};

setInterval(() => {
  const state = runtime.getState();

  metrics.fps = game.loop.actualFps;
  metrics.latency = transport.metrics?.getLatencyMs?.() || 0;
  metrics.playerCount = Object.keys(state.players).length;
  metrics.stateSize = JSON.stringify(state).length;

  // Send to analytics
  if (window.analytics) {
    window.analytics.track('game_metrics', metrics);
  }
}, 10000); // Every 10 seconds
```

### Custom Analytics Events

```typescript
// Track game events
actions: {
  playerDied: {
    apply(state, context, input) {
      // Game logic
      const player = state.players[context.playerId];
      player.deaths++;

      // Analytics
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('player_died', {
          playerId: context.playerId,
          cause: input.cause,
          survivalTime: Date.now() - player.spawnTime,
          score: player.score
        });
      }
    }
  }
}
```

## Security Best Practices

### 1. Validate All Input

```typescript
actions: {
  move: {
    apply(state, context, input: { x: number; y: number }) {
      // Validate bounds
      if (input.x < 0 || input.x > 800 || input.y < 0 || input.y > 600) {
        console.warn('Invalid move input from', context.playerId);
        return;
      }

      // Validate speed (anti-cheat)
      const player = state.players[context.playerId];
      const distance = Math.hypot(input.x - player.x, input.y - player.y);
      const maxSpeed = 10;

      if (distance > maxSpeed) {
        console.warn('Speed hack detected from', context.playerId);
        input.x = player.x + (input.x - player.x) * (maxSpeed / distance);
        input.y = player.y + (input.y - player.y) * (maxSpeed / distance);
      }

      player.x = input.x;
      player.y = input.y;
    }
  }
}
```

### 2. Rate Limiting

```typescript
// Server-side rate limiting
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(playerId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(playerId);

  if (!limit || now > limit.resetTime) {
    rateLimits.set(playerId, {
      count: 1,
      resetTime: now + 1000 // 1 second window
    });
    return true;
  }

  if (limit.count >= 100) { // 100 actions per second max
    return false;
  }

  limit.count++;
  return true;
}

// In message handler
if (!checkRateLimit(playerId)) {
  console.warn('Rate limit exceeded for', playerId);
  ws.close(1008, 'Rate limit exceeded');
  return;
}
```

### 3. Sanitize User Input

```typescript
// Prevent XSS in player names
function sanitizeName(name: string): string {
  return name
    .replace(/[<>]/g, '') // Remove HTML brackets
    .substring(0, 20) // Limit length
    .trim();
}

actions: {
  setName: {
    apply(state, context, input: { name: string }) {
      const player = state.players[context.playerId];
      player.name = sanitizeName(input.name);
    }
  }
}
```

### 4. Use HTTPS/WSS in Production

```typescript
// Always use secure connections in production
const wsUrl = config.isProduction
  ? 'wss://your-server.com'
  : 'ws://localhost:8080';
```

## Performance Checklist

Before deploying:

- [ ] **Minification enabled** - Check build config
- [ ] **Console logs removed** - Use terser drop_console
- [ ] **Source maps** - Only in development
- [ ] **Code splitting** - Lazy load large dependencies
- [ ] **Asset optimization** - Compress images, use texture atlases
- [ ] **GZIP/Brotli** - Enable on server
- [ ] **CDN** - Serve static assets from CDN
- [ ] **Caching headers** - Set appropriate cache-control
- [ ] **Error tracking** - Sentry or similar
- [ ] **Analytics** - Track key metrics
- [ ] **Rate limiting** - Prevent abuse
- [ ] **Input validation** - Server-side checks
- [ ] **HTTPS/WSS only** - No insecure connections

## Deployment Scripts

### package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy:vercel": "vercel --prod",
    "deploy:netlify": "netlify deploy --prod --dir=dist",
    "deploy:railway": "railway up",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

### CI/CD with GitHub Actions

```text
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm build
        env:
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
          VITE_ANALYTICS_KEY: ${{ secrets.VITE_ANALYTICS_KEY }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Troubleshooting

### High Latency

**Problem:** Players experience lag

**Solutions:**
- Deploy servers closer to users (use CDN or multi-region)
- Reduce state sync frequency
- Optimize state size
- Enable compression (GZIP)

### Connection Issues

**Problem:** Players can't connect

**Solutions:**
- Check CORS settings
- Verify WebSocket endpoint
- Test with different STUN/TURN servers
- Check firewall rules

### Memory Leaks

**Problem:** Server memory grows over time

**Solutions:**
- Clean up disconnected players
- Implement room garbage collection
- Destroy unused runtimes
- Profile with Node.js inspector

## See Also

- [Optimization](./optimization.md) - Performance optimization guide
- [Best Practices](./best-practices.md) - Development patterns
- [Testing](./testing.md) - Testing strategies
