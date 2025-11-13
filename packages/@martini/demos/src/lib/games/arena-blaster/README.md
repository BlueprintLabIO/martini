# Arena Blaster

A fast-paced top-down shooter for 2 players.

## Gameplay

- **Players**: 2 (dual-view demo)
- **Type**: Competitive Arena Shooter
- **Controls**:
  - **Host**: WASD (Move), Space (Shoot)
  - **Client**: Arrow Keys (Move), Enter (Shoot)

## Objective

Eliminate your opponent to score points. First to 5 kills wins!

## Core Mechanics

### Movement
- Continuous 360° movement with keyboard (modern standard like Brawl Stars, Hades)
- Speed: 200 pixels/second (normalized for diagonals)
- Player rotation smoothly follows movement direction
- Players collide with arena walls (800x600 arena with 20px walls)

### Shooting
- **Aim**: Player automatically aims in the direction they're moving
- **Continuous rotation**: Smooth 360° rotation based on movement input
- **Shoot**: Press Space (host) or Enter (client) to fire
- **Cooldown**: 0.5 seconds between shots
- **Bullet speed**: 400 pixels/second
- **Bullet lifetime**: 2 seconds or until collision
- **Damage**: 20 HP per bullet hit

### Health & Respawn
- Starting health: 100 HP
- Health bar displayed above each player
- On elimination:
  - Opponent gains 1 point
  - Player respawns at their starting position with full health
  - Brief invulnerability: 1 second after respawn (visual indicator: flashing)

### Win Condition
- First player to 5 eliminations wins
- Game displays winner and allows reset with R key

## Visual Design

### Players
- Circles with radius 15px
- Each player sees themselves as green, opponent as red (intentional for clarity)
- Facing indicator: small line extending from circle showing aim direction

### Bullets
- Small circles (radius 4px)
- Color matches owner's color

### Arena
- Background: Dark blue-gray (#2d3748)
- Walls: Gray (#4a5568), 20px thick
- No obstacles (open arena)

### UI Elements
- Health bars above players (50px wide, color-coded by health)
  - Green (>50% HP)
  - Yellow (25-50% HP)
  - Red (<25% HP)
- Score display (top-left): "P1: X  P2: Y"
- Controls reminder (bottom-center)
- Win screen when game ends

## Implementation Plan

### Game State
```typescript
{
  players: {
    [playerId]: {
      x, y: number         // Position
      health: number       // 0-100
      score: number        // Kill count
      rotation: number     // Current facing direction (radians, continuous 360°)
      isInvulnerable: boolean
      invulnerabilityTimer: number  // ms remaining
    }
  },
  bullets: Array<{
    id: number
    x, y: number
    velocityX, velocityY: number
    ownerId: string
    lifetime: number       // Remaining time in ms
  }>,
  inputs: {
    [playerId]: {
      left, right, up, down: boolean
      shoot: boolean
    }
  },
  shootCooldowns: {
    [playerId]: number     // Time until next shot in ms
  },
  nextBulletId: number,
  winner: string | null,
  gameOver: boolean
}
```

### Rotation Calculation
```typescript
// Calculate movement vector from input
const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

// Update rotation if moving
if (dx !== 0 || dy !== 0) {
  player.rotation = Math.atan2(dy, dx);
}

// Normalize velocity for diagonal movement
const length = Math.sqrt(dx * dx + dy * dy);
if (length > 0) {
  velocityX = (dx / length) * SPEED;
  velocityY = (dy / length) * SPEED;
}
```

### Actions

1. **move**: Update player movement input (updates rotation based on movement direction)
2. **shoot**: Attempt to fire a bullet (only succeeds if cooldown expired)
3. **hit**: Apply damage to player, handle elimination and respawn
4. **reset**: Reset game state for new round

### Host Responsibilities

- Update player rotation based on movement direction (continuous 360°)
- Normalize diagonal movement velocity
- Update bullet positions each frame (based on delta time)
- Check bullet-player collisions (skip if player invulnerable)
- Check bullet-wall collisions (remove bullets that hit walls)
- Check bullet lifetime expiration (remove old bullets)
- Apply damage on hits (20 HP per bullet)
- Handle elimination and respawn logic
- Manage shoot cooldowns (500ms per player)
- Update invulnerability timers (1000ms after respawn)
- Check win condition (score >= 5)

### Client Rendering

- Interpolate player positions from state
- Render bullets from state.bullets array
- Render facing indicators (lines from player center at rotation angle)
- Update health bars based on state.players[pid].health
- Display scores
- Show invulnerability flashing effect
- Show win screen when state.gameOver is true

## Technical Details

- **Host-authoritative**: All collision detection and hit registration on host
- **Keyboard-only**: Avoids dual-Phaser-instance input conflicts
- **Auto-aim**: Player faces movement direction, shoots forward
- **Continuous rotation**: Modern standard (atan2 for smooth 360° angles)
- **Normalized diagonal movement**: Prevents faster diagonal movement
- **Simple collision**: Circle-circle distance check for bullets vs players
- **Bullet collision radius**: Player radius (15px) + Bullet radius (4px) = 19px threshold
- **No networking delay simulation**: Instant local sync for demo purposes

## How to Play

1. Open the dual-view demo at http://localhost:5176
2. **Host** uses WASD to move, Space to shoot
3. **Client** uses Arrow keys to move, Enter to shoot
4. Move to aim (rotation follows movement smoothly), shoot to eliminate opponent
5. First to 5 kills wins
6. Press R to reset game after someone wins
