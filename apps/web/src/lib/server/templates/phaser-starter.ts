/**
 * Simple Phaser 3 starter template using Custom API
 * Single scene example for beginners
 */

export const phaserStarterFiles = [
	{
		path: '/index.html',
		content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My First Game</title>
  <style>
    * { margin: 0; padding: 0; }
    body {
      margin: 0;
      background: #1a1a1a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="game"></div>
  <!-- Game runs in sandboxed iframe -->
  <script type="module" src="/src/main.js"></script>
</body>
</html>`
	},
	{
		path: '/src/main.js',
		content: `/**
 * My First Game!
 *
 * This is a simple example to get you started.
 * See CUSTOM_API.md for full documentation.
 */

// Define your game scenes
window.scenes = {
  Game: {
    // This runs once when the scene starts
    create(scene) {
      // Welcome message
      scene.add.text(400, 200, 'Hello Phaser!', {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }).setOrigin(0.5);

      // Instructions
      scene.add.text(400, 280, 'Use arrow keys to move the player', {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'Arial'
      }).setOrigin(0.5);

      // Create a player (green circle)
      this.player = scene.add.circle(400, 400, 20, 0x00ff00);
      this.speed = 5;

      // Create a platform (green rectangle)
      const platform = scene.add.graphics();
      platform.fillStyle(0x00ff00, 1);
      platform.fillRect(300, 500, 200, 20);

      // Log to console
      gameAPI.log('Game started!');
    },

    // This runs every frame (60 times per second)
    update(scene, time, delta) {
      // Get keyboard input
      const cursors = scene.input.keyboard.createCursorKeys();

      // Move player left/right
      if (cursors.left.isDown) {
        this.player.x -= this.speed;
      }
      if (cursors.right.isDown) {
        this.player.x += this.speed;
      }

      // Move player up/down
      if (cursors.up.isDown) {
        this.player.y -= this.speed;
      }
      if (cursors.down.isDown) {
        this.player.y += this.speed;
      }

      // Keep player on screen
      this.player.x = Phaser.Math.Clamp(this.player.x, 20, 780);
      this.player.y = Phaser.Math.Clamp(this.player.y, 20, 580);
    }
  }
};

// This is the first scene that will run
window.startScene = 'Game';`
	}
];
