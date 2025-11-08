# API Contracts

## REST Endpoints

### AI Generation

**POST `/api/generate`**

Request:
```json
{
  "prompt": "make a space shooter",
  "projectId": "uuid",
  "templateType": "shooter"
}
```

Response:
```json
{
  "success": true,
  "code": "// Generated code...",
  "explanation": "Created a 2-player space shooter",
  "warnings": []
}
```

### Projects

**GET `/api/projects`**
- List user's projects

**POST `/api/projects`**
- Create new project

**PUT `/api/projects/:id`**
- Update project

**DELETE `/api/projects/:id`**
- Delete project

**POST `/api/projects/:id/publish`**
- Generate share code, set state to published

**POST `/api/projects/:id/fork`**
- Remix/fork project

### Assets

**POST `/api/assets/upload`**
- Upload image/sound

**GET `/api/assets/:id`**
- Get asset URL

## WebSocket Events (Signaling)

### Client → Server

```typescript
// Create room
socket.emit('create-room', {
  shareCode: string,
  hostId: string
});

// Join room
socket.emit('join-room', {
  shareCode: string,
  clientId: string
});

// Forward signal
socket.emit('signal', {
  shareCode: string,
  signal: any,
  targetId?: string
});
```

### Server → Client

```typescript
// Room created
socket.on('room-created', { shareCode: string });

// Room joined
socket.on('room-joined', { shareCode: string });

// Client joined (to host)
socket.on('client-joined', {
  clientId: string,
  playerCount: number
});

// Client left (to host)
socket.on('client-left', {
  clientId: string,
  playerCount: number
});

// Host disconnected (to clients)
socket.on('host-disconnected', {});

// WebRTC signal
socket.on('signal', {
  signal: any,
  from: string
});

// Error
socket.on('error', { message: string });
```

## postMessage API (iframe ↔ parent)

### Parent → iframe

```typescript
{
  type: 'LOAD_CODE',
  payload: {
    code: string,
    assets: Array<{ name: string, url: string }>
  }
}

{
  type: 'STATE_UPDATE',
  payload: {
    frame: number,
    players: Array<Player>,
    entities: Array<Entity>
  }
}

{
  type: 'PAUSE' | 'RESUME'
}
```

### iframe → Parent

```typescript
{
  type: 'READY'
}

{
  type: 'INPUT',
  payload: {
    playerId: string,
    keys: string[],
    frame: number
  }
}

{
  type: 'STATE',
  payload: {
    frame: number,
    players: Array<Player>,
    entities: Array<Entity>
  }
}

{
  type: 'ERROR',
  payload: {
    message: string,
    stack?: string
  }
}

{
  type: 'LOG',
  payload: { message: string }
}

{
  type: 'HEARTBEAT'
}
```
