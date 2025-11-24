---
title: Security Best Practices
description: Securing multiplayer games in production
section: guides
subsection: networking
order: 5
---

# Security Best Practices

Multiplayer games face unique security challenges. This guide covers essential security practices for martini-kit games.

## 1. Input Validation

**Always validate all input** on the host/server:

```typescript
actions: {
  move: {
    apply(state, context, input: { x: number; y: number }) {
      // ✅ Validate bounds
      if (input.x < 0 || input.x > 800 || input.y < 0 || input.y > 600) {
        console.warn('Invalid move input from', context.playerId);
        return; // Reject invalid input
      }
      
      // ✅ Validate speed (anti-cheat)
      const player = state.players[context.targetId];
      const distance = Math.hypot(input.x - player.x, input.y - player.y);
      const maxSpeed = 10;
      
      if (distance > maxSpeed) {
        console.warn('Speed hack detected from', context.playerId);
        // Clamp to max speed
        const ratio = maxSpeed / distance;
        input.x = player.x + (input.x - player.x) * ratio;
        input.y = player.y + (input.y - player.y) * ratio;
      }
      
      player.x = input.x;
      player.y = input.y;
    }
  }
}
```

## 2. Rate Limiting

Prevent action spam:

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

// In WebSocket message handler
ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (!checkRateLimit(playerId)) {
    console.warn('Rate limit exceeded for', playerId);
    ws.close(1008, 'Rate limit exceeded');
    return;
  }
  
  // Process message...
});
```

## 3. Sanitize User Input

Prevent XSS attacks in player names and chat:

```typescript
function sanitizeName(name: string): string {
  return name
    .replace(/[<>]/g, '') // Remove HTML brackets
    .substring(0, 20) // Limit length
    .trim();
}

actions: {
  setName: {
    apply(state, context, input: { name: string }) {
      const player = state.players[context.targetId];
      player.name = sanitizeName(input.name);
    }
  }
}
```

## 4. Use HTTPS/WSS in Production

**Never use insecure connections in production:**

```typescript
// ✅ Correct - secure connections
const wsUrl = import.meta.env.PROD
  ? 'wss://your-server.com' // WSS in production
  : 'ws://localhost:8080';   // WS in development

// ❌ Wrong - insecure in production
const wsUrl = 'ws://your-server.com';
```

## 5. Environment Variables

**Never commit secrets to version control:**

```typescript
// config.ts
export const config = {
  wsUrl: import.meta.env.VITE_WS_URL,
  turnUrl: import.meta.env.VITE_TURN_URL,
  turnUsername: import.meta.env.VITE_TURN_USERNAME,
  turnCredential: import.meta.env.VITE_TURN_CREDENTIAL,
};
```

**.env.production** (not committed):
```
VITE_WS_URL=wss://your-server.com
VITE_TURN_URL=turn:your-turn.com:3478
VITE_TURN_USERNAME=production_user
VITE_TURN_CREDENTIAL=secret_password
```

**.gitignore**:
```
.env.production
.env.local
```

## 6. Server-Authoritative Logic

For competitive games, run critical logic on the server:

```typescript
// ❌ Client-authoritative (can be cheated)
actions: {
  takeDamage: {
    apply(state, context, input: { damage: number }) {
      // Client can send any damage value!
      state.players[context.targetId].health -= input.damage;
    }
  }
}

// ✅ Server-authoritative (safe)
actions: {
  shoot: {
    apply(state, context, input: { targetId: string }) {
      // Server calculates damage
      const shooter = state.players[context.playerId];
      const target = state.players[input.targetId];
      
      // Server validates hit
      const distance = Math.hypot(
        shooter.x - target.x,
        shooter.y - target.y
      );
      
      if (distance > shooter.weaponRange) {
        return; // Out of range
      }
      
      // Server determines damage
      const damage = shooter.weaponDamage;
      target.health -= damage;
    }
  }
}
```

## 7. Prevent Replay Attacks

Add timestamps to actions:

```typescript
interface ActionMessage {
  actionName: string;
  input: any;
  timestamp: number;
}

// Server validates timestamp
function validateTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const maxAge = 5000; // 5 seconds
  
  return Math.abs(now - timestamp) < maxAge;
}
```

## 8. Secure WebSocket Connections

```typescript
// Server-side (Node.js)
import { WebSocketServer } from 'ws';
import https from 'https';
import fs from 'fs';

const server = https.createServer({
  cert: fs.readFileSync('/path/to/cert.pem'),
  key: fs.readFileSync('/path/to/key.pem')
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Verify origin
  const origin = req.headers.origin;
  if (origin !== 'https://your-game.com') {
    ws.close(1008, 'Invalid origin');
    return;
  }
  
  // ... handle connection
});

server.listen(443);
```

## 9. Monitor for Abuse

Track suspicious behavior:

```typescript
const suspiciousActivity = new Map<string, number>();

function trackSuspiciousActivity(playerId: string, reason: string) {
  const count = (suspiciousActivity.get(playerId) || 0) + 1;
  suspiciousActivity.set(playerId, count);
  
  console.warn(`Suspicious activity from ${playerId}: ${reason} (count: ${count})`);
  
  if (count >= 5) {
    // Ban player
    console.error(`Banning player ${playerId} for repeated violations`);
    // Implement ban logic
  }
}

// Use in actions
if (invalidInput) {
  trackSuspiciousActivity(context.playerId, 'invalid input');
  return;
}
```

## 10. CORS Configuration

Restrict which origins can connect:

```typescript
// Server-side
const allowedOrigins = [
  'https://your-game.com',
  'https://www.your-game.com'
];

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  
  if (!allowedOrigins.includes(origin)) {
    ws.close(1008, 'Origin not allowed');
    return;
  }
});
```

## Security Checklist

Before deploying to production:

- [ ] All input validated on host/server
- [ ] Rate limiting implemented
- [ ] User input sanitized (names, chat)
- [ ] HTTPS/WSS only in production
- [ ] Secrets in environment variables (not committed)
- [ ] Critical logic server-authoritative
- [ ] Timestamps validated
- [ ] WebSocket connections secured
- [ ] Monitoring for abuse
- [ ] CORS properly configured

## See Also

- **[Production Deployment →](./production)** - Hosting and deployment
- **[Choosing a Transport →](./choosing-transport)** - Transport options
- **[Testing →](/docs/guides/testing)** - Security testing
