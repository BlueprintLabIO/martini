/**
 * Comprehensive Phaser 3 project scaffold using Custom API
 * Multi-scene example with organized code structure
 */

export const phaserScaffoldFiles = [
	{
		path: '/index.html',
		content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Phaser Game</title>
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
 * Game entry point
 *
 * Defines game scenes and configuration.
 * See CUSTOM_API.md for full documentation.
 */

// Define all game scenes
window.scenes = {
  Boot: {
    create(scene) {
      gameAPI.log('Game booting...');

      // Set up global game settings
      scene.input.mouse.disableContextMenu();

      // Move to menu
      gameAPI.switchScene('Menu');
    }
  },

  Menu: {
    create(scene) {
      // Title
      scene.add.text(400, 200, 'My Phaser Game', {
        fontSize: '64px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      // Instructions
      scene.add.text(400, 300, 'Click to start playing!', {
        fontSize: '24px',
        color: '#aaaaaa',
        fontFamily: 'Arial'
      }).setOrigin(0.5);

      // Start on click
      scene.input.on('pointerdown', () => {
        gameAPI.switchScene('Game', { level: 1 });
      });
    }
  },

  Game: {
    create(scene, data) {
      gameAPI.log(\`Starting level \${data.level}\`);

      // Store game state
      this.level = data.level;
      this.score = 0;

      // Background
      scene.add.rectangle(400, 300, 800, 600, 0x2d2d2d);

      // UI
      this.scoreText = scene.add.text(16, 16, 'Score: 0', {
        fontSize: '24px',
        color: '#ffffff'
      });

      this.levelText = scene.add.text(400, 16, \`Level \${this.level}\`, {
        fontSize: '24px',
        color: '#ffffff'
      }).setOrigin(0.5, 0);

      // Create player
      this.player = scene.add.circle(400, 500, 20, 0x00ff00);
      this.speed = 5;

      // Create platform
      const platform = scene.add.graphics();
      platform.fillStyle(0x00ff00, 1);
      platform.fillRect(250, 550, 300, 20);

      // Setup controls hint
      scene.add.text(400, 580, 'Arrow keys to move', {
        fontSize: '16px',
        color: '#888888'
      }).setOrigin(0.5);

      // Spawn collectibles
      this.collectibles = [];
      for (let i = 0; i < 5; i++) {
        const x = 100 + i * 150;
        const y = 200 + gameAPI.random() * 200;
        const coin = scene.add.circle(x, y, 12, 0xffff00);
        this.collectibles.push(coin);
      }
    },

    update(scene, time, delta) {
      // Player movement
      const cursors = scene.input.keyboard.createCursorKeys();

      if (cursors.left.isDown) {
        this.player.x -= this.speed;
      } else if (cursors.right.isDown) {
        this.player.x += this.speed;
      }

      // Keep player in bounds
      this.player.x = Phaser.Math.Clamp(this.player.x, 20, 780);

      // Check collectible collisions
      this.collectibles = this.collectibles.filter(coin => {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          coin.x, coin.y
        );

        if (dist < 32) {
          // Collected!
          coin.destroy();
          this.score += 10;
          this.scoreText.setText(\`Score: \${this.score}\`);
          gameAPI.log(\`Coin collected! Score: \${this.score}\`);
          return false;
        }
        return true;
      });

      // Check if all coins collected
      if (this.collectibles.length === 0) {
        gameAPI.switchScene('Victory', {
          level: this.level,
          score: this.score
        });
      }
    }
  },

  Victory: {
    create(scene, data) {
      // Victory screen
      scene.add.text(400, 200, 'Level Complete!', {
        fontSize: '64px',
        color: '#00ff00',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      scene.add.text(400, 300, \`Score: \${data.score}\`, {
        fontSize: '32px',
        color: '#ffffff'
      }).setOrigin(0.5);

      // Next level button
      const nextBtn = scene.add.text(400, 400, 'Next Level', {
        fontSize: '28px',
        color: '#ffff00',
        backgroundColor: '#333333',
        padding: { x: 20, y: 10 }
      }).setOrigin(0.5).setInteractive();

      nextBtn.on('pointerdown', () => {
        gameAPI.switchScene('Game', {
          level: data.level + 1,
          score: data.score
        });
      });

      // Menu button
      const menuBtn = scene.add.text(400, 480, 'Back to Menu', {
        fontSize: '20px',
        color: '#aaaaaa'
      }).setOrigin(0.5).setInteractive();

      menuBtn.on('pointerdown', () => {
        gameAPI.switchScene('Menu');
      });
    }
  }
};

// Set starting scene
window.startScene = 'Boot';`
	}
];
