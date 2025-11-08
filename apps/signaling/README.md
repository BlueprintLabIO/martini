# Signaling Server

WebRTC signaling server for peer-to-peer multiplayer game connections.

## Purpose

This server facilitates the initial WebRTC handshake between game clients:
1. Hosts create rooms with 6-digit share codes
2. Clients join rooms using share codes
3. Server relays SDP offers/answers and ICE candidates
4. Once P2P connection is established, server is no longer needed

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Run in development mode (auto-reload)
pnpm dev
```

Server will start on http://localhost:3001

### Production (Coolify)

This app uses Nixpacks for deployment. Coolify will automatically:
1. Detect `nixpacks.toml`
2. Install Node.js 20 and pnpm
3. Run `pnpm install --frozen-lockfile`
4. Build with `pnpm build`
5. Start with `pnpm start`

**Environment Variables to Set in Coolify:**
```
PORT=3001
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "roomCount": 5,
  "timestamp": "2025-11-08T12:34:56.789Z"
}
```

### Stats (Debugging)
```bash
curl http://localhost:3001/stats
```

Response:
```json
{
  "totalRooms": 3,
  "rooms": [
    {
      "shareCode": "ABC123",
      "playerCount": 4,
      "ageMinutes": 12
    }
  ]
}
```

## Socket.IO Events

### Client → Server

#### `create-room`
Create a new multiplayer room.

**Payload:**
```typescript
{
  shareCode: string;  // 6-digit code (e.g., "ABC123")
  hostId?: string;    // Optional user ID for analytics
}
```

**Response:**
```typescript
// Success: 'room-created'
{
  shareCode: string;
  hostId: string;  // Socket ID
}

// Error: 'error'
{
  message: string;
  code: string;
}
```

#### `join-room`
Join an existing room.

**Payload:**
```typescript
{
  shareCode: string;  // 6-digit code
  clientId?: string;  // Optional user ID
}
```

**Response:**
```typescript
// Success: 'room-joined'
{
  shareCode: string;
  playerCount: number;
}

// Warning: 'warning' (4+ players)
{
  message: string;
}

// Error: 'error'
{
  message: string;
  code: string;
}
```

#### `signal`
Forward WebRTC signal to peer(s).

**Payload:**
```typescript
{
  shareCode: string;
  signal: any;        // SDP offer/answer or ICE candidate
  targetId?: string;  // Optional: specific peer socket ID
}
```

**Response:**
```typescript
// Forwarded to peer(s) as 'signal'
{
  signal: any;
  from: string;  // Sender socket ID
}
```

### Server → Client

#### `room-created`
Confirmation that room was created.

#### `room-joined`
Confirmation that you joined a room.

#### `client-joined`
(Sent to host) A new client joined.

**Payload:**
```typescript
{
  clientId: string;
  playerCount: number;
}
```

#### `client-left`
(Sent to host) A client left.

**Payload:**
```typescript
{
  clientId: string;
  playerCount: number;
}
```

#### `host-disconnected`
(Sent to all clients) Host left, room is closing.

#### `signal`
WebRTC signal from another peer.

**Payload:**
```typescript
{
  signal: any;
  from: string;  // Sender socket ID
}
```

#### `error`
Error occurred.

**Payload:**
```typescript
{
  message: string;
  code?: string;
}
```

#### `warning`
Non-fatal warning (e.g., performance degradation).

**Payload:**
```typescript
{
  message: string;
}
```

## Architecture

### Room Lifecycle

1. **Creation:** Host creates room with unique share code
2. **Joining:** Clients join by providing share code
3. **Signaling:** Server relays WebRTC signals between peers
4. **Cleanup:** Room deleted when host leaves OR after 1 hour

### Memory Management

- Rooms stored in-memory (Map)
- No persistence to database
- Automatic cleanup every 5 minutes
- Rooms older than 1 hour are deleted

### Performance

- **Player Limit:** Unlimited (warns at 4+ players)
- **Room Limit:** No hard limit (scales with server memory)
- **Cleanup Interval:** 5 minutes
- **Room TTL:** 1 hour
- **Ping Timeout:** 30 seconds

## Monitoring

### Metrics to Track

- **Connection Rate:** Connections/minute
- **Room Count:** Active rooms
- **Average Room Size:** Players per room
- **Disconnect Rate:** % of connections that disconnect vs. timeout

### Logs

All events are logged to stdout with ISO timestamps:

```
[2025-11-08T12:34:56.789Z] Client connected: abc123xyz
[2025-11-08T12:35:01.234Z] Room ABC123 created by user-123
[2025-11-08T12:35:05.678Z] Client joined room ABC123 (3 players)
```

## Troubleshooting

### Clients can't connect

**Check:**
1. Server is running (`pnpm dev` or `pnpm start`)
2. Port 3001 is open
3. CORS origins include your web app domain
4. No firewall blocking WebSocket connections

**Test:**
```bash
curl http://localhost:3001/health
```

### Room not found

**Causes:**
- Share code doesn't exist
- Room was cleaned up (>1 hour old)
- Typo in share code

**Solution:**
- Check `/stats` endpoint to see active rooms
- Generate new share code

### Host disconnected immediately

**Causes:**
- Network issue
- Browser tab closed
- JavaScript error in game code

**Solution:**
- Check browser console for errors
- Monitor signaling server logs

## Development

### Project Structure

```
apps/signaling/
├── src/
│   ├── server.ts     # Main server logic
│   └── types.ts      # TypeScript interfaces
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript config
├── nixpacks.toml     # Coolify deployment
├── .env.example      # Environment template
└── README.md         # This file
```

### Dependencies

- **express:** HTTP server for health checks
- **socket.io:** WebSocket library for real-time communication
- **tsx:** TypeScript execution for development
- **typescript:** Type checking and compilation

### Scripts

- `pnpm dev` - Development with auto-reload
- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm start` - Run production build
- `pnpm clean` - Remove build artifacts

## Security

### Current (MVP)

- ✅ CORS origin validation
- ✅ Share code format validation
- ✅ Room cleanup (prevent memory leaks)
- ⚠️ No authentication (anonymous access)
- ⚠️ No rate limiting

### Future Enhancements

- JWT token validation
- Rate limiting per IP
- DDoS protection
- Abuse detection (spam room creation)
- Player banning

## Scaling

### Current Capacity

- **Single Instance:** ~10,000 concurrent connections
- **Memory:** ~100 MB for 1,000 rooms
- **CPU:** Minimal (mostly I/O bound)

### Horizontal Scaling (Future)

To support 100,000+ concurrent players:

1. **Redis Adapter:** Share room state across multiple servers
2. **Load Balancer:** Sticky sessions by share code
3. **Kubernetes:** Auto-scale based on CPU/memory

Example with Redis:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## License

Private - Part of Martini game platform
