# Game Templates

## Template Structure

Each template provides:
- Fully functional multiplayer game
- Clear modification points for AI
- Example prompts for users

---

## 1. Top-Down Shooter

**Game:** 2-4 players, shoot aliens, score points

**Features:**
- WASD/Arrow key movement
- Spacebar to shoot
- Enemies spawn from top
- Collision detection
- Score tracking

**Prompts:**
- "Make enemies move in a zig-zag pattern"
- "Add power-ups that increase fire rate"
- "Change to 4-directional shooting"

---

## 2. Platformer

**Game:** 2-4 players race to finish line

**Features:**
- Left/Right movement
- Jump with Spacebar
- Platforms and obstacles
- Finish line
- Timer

**Prompts:**
- "Add moving platforms"
- "Make players bounce higher"
- "Add coins to collect"

---

## 3. Building Game

**Game:** 2-4 players place blocks collaboratively

**Features:**
- Click to place blocks
- Different block types (1-9 keys)
- Grid-based placement
- Shared world

**Prompts:**
- "Add gravity to blocks"
- "Let players paint blocks different colors"
- "Add enemies that destroy blocks"

---

## Template Code Structure

```javascript
// === CONFIGURATION (AI modifies here) ===
const PLAYER_SPEED = 5;
const JUMP_POWER = 10;

// === GAME STATE ===
let players = {};
let entities = [];
let score = {};

// === INITIALIZATION ===
function init() {
  // Setup game
}

// === GAME LOOP ===
function update() {
  const inputs = gameAPI.getInputs();

  // Process inputs
  inputs.forEach(input => {
    // Move player based on input
  });

  // Update entities
  // Check collisions
  // Update score

  // Host broadcasts state
  if (gameAPI.isHost()) {
    gameAPI.setState({ players, entities, score });
  }
}

// === START ===
init();
gameAPI.onUpdate(update);
```

See full template implementations in `/templates` directory.
