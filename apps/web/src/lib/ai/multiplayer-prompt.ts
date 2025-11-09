/**
 * Multiplayer API System Prompt
 *
 * This string is injected into AI agent system prompts to teach
 * it how to generate multiplayer game code correctly.
 *
 * Import: import { MULTIPLAYER_PROMPT } from '$lib/ai/multiplayer-prompt';
 */

export const MULTIPLAYER_PROMPT = `
# Multiplayer Game API Reference

## Quick Examples

### Fire Boy & Water Girl (Co-op Platformer)
\`\`\`javascript
create(scene) {
  this.myPlayer = scene.physics.add.sprite(100, 100, 'player');

  // ✨ ONE LINE ENABLES MULTIPLAYER
  gameAPI.multiplayer.trackPlayer(this.myPlayer, {
    role: gameAPI.multiplayer.isHost() ? 'fireboy' : 'watergirl'
  });

  // ⚠️ CRITICAL: Only host spawns level
  if (gameAPI.multiplayer.isHost()) {
    this.createLevel(scene);
  }
}

update(scene) {
  // Standard Phaser code - sync is automatic!
  const cursors = scene.input.keyboard.createCursorKeys();
  if (cursors.left.isDown) this.myPlayer.setVelocityX(-160);
}
\`\`\`

### Pokemon Battle (Turn-Based)
\`\`\`javascript
create(scene) {
  this.myTrainer = scene.add.sprite(100, 100, 'trainer');

  gameAPI.multiplayer.trackPlayer(this.myTrainer, {
    sync: ['x', 'y', 'frame'],
    updateRate: 10
  });

  gameAPI.multiplayer.on('attack', (peerId, data) => {
    this.playAnimation(data.move);
  });
}

executeMove() {
  gameAPI.multiplayer.broadcast('attack', {
    move: 'fireball',
    target: this.selectedEnemy
  });
}
\`\`\`

### Collectibles
\`\`\`javascript
create(scene) {
  gameAPI.multiplayer.on('coin-collected', (peerId, data) => {
    this.coins.find(c => c.id === data.coinId)?.destroy();
  });
}

collectCoin(coinId) {
  this.score += 10;
  gameAPI.multiplayer.broadcast('coin-collected', { coinId, score: this.score });
}
\`\`\`

### Deterministic Level
\`\`\`javascript
create(scene) {
  if (gameAPI.multiplayer.isHost()) {
    gameAPI.random.setSeed(12345);
    for (let i = 0; i < 10; i++) {
      const x = gameAPI.random.next() * 800;  // Same on all clients
      scene.add.platform(x, 400);
    }
  }
}
\`\`\`

## API Methods

### gameAPI.multiplayer.trackPlayer(sprite, options?)
Auto-sync player sprite. Call in create() after creating player.

Options:
- sync: ['x', 'y', 'velocityX', 'velocityY', 'frame'] (default)
- updateRate: 30 (action), 10 (turn-based), 60 (racing)
- role: String metadata

### gameAPI.multiplayer.broadcast(eventName, data)
Send event to all players. Use kebab-case names.

### gameAPI.multiplayer.on(eventName, callback)
Listen for events. Register in create(). Callback: (peerId, data) => void

### gameAPI.multiplayer.isHost()
Returns true if you're the host. Only host spawns enemies/collectibles!

### gameAPI.multiplayer.getMyId()
Returns your unique player ID string.

### gameAPI.random.setSeed(seed)
Set deterministic seed. Only host calls, all clients use next().

### gameAPI.random.next()
Returns 0-1. Use instead of Math.random() in multiplayer!

## 5 CRITICAL RULES

1. ALWAYS call trackPlayer() in create() after creating player sprite
2. ALWAYS wrap spawning in if (gameAPI.multiplayer.isHost())
3. ALWAYS use gameAPI.random.next() not Math.random()
4. ALWAYS broadcast() when game state changes
5. ALWAYS register on() in create(), NEVER in update()

## Common Mistakes

❌ this.enemy = scene.add.sprite(400, 300, 'enemy');
✅ if (gameAPI.multiplayer.isHost()) { this.enemy = scene.add.sprite(400, 300, 'enemy'); }

❌ const x = Math.random() * 800;
✅ const x = gameAPI.random.next() * 800;

❌ update(scene) { gameAPI.multiplayer.on('attack', ...); }
✅ create(scene) { gameAPI.multiplayer.on('attack', ...); }
`;

/**
 * Concise version for token-limited contexts
 */
export const MULTIPLAYER_PROMPT_SHORT = `
Multiplayer API:
- trackPlayer(sprite, {role?}): Auto-sync player (call in create)
- broadcast(event, data): Send event to all
- on(event, cb): Listen for events (register in create)
- isHost(): Only host spawns enemies/collectibles
- random.setSeed(n), random.next(): Deterministic random (not Math.random!)

Rules:
1. trackPlayer() after creating player
2. if (isHost()) { spawn enemies }
3. random.next() not Math.random()
4. broadcast() on state changes
5. on() in create(), not update()
`;

/**
 * Genre-specific templates
 */
export const MULTIPLAYER_TEMPLATES = {
  platformer: `create(scene) {
  this.myPlayer = scene.physics.add.sprite(100, 100, 'player');
  gameAPI.multiplayer.trackPlayer(this.myPlayer);
  if (gameAPI.multiplayer.isHost()) this.createLevel(scene);
}`,

  turnBased: `create(scene) {
  this.myTrainer = scene.add.sprite(100, 100, 'trainer');
  gameAPI.multiplayer.trackPlayer(this.myTrainer, { sync: ['x', 'y', 'frame'], updateRate: 10 });
  gameAPI.multiplayer.on('attack', (peerId, data) => this.handleAttack(data));
}`,

  racing: `create(scene) {
  this.myCar = scene.physics.add.sprite(100, 300, 'car');
  gameAPI.multiplayer.trackPlayer(this.myCar, { sync: ['x', 'y', 'angle', 'velocityX', 'velocityY'], updateRate: 60 });
  if (gameAPI.multiplayer.isHost()) this.createTrack(scene);
}`
};
