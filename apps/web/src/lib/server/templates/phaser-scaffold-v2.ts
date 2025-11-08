/**
 * Comprehensive Phaser 3 project scaffold
 * Following industry best practices for file organization
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
  <!-- Phaser 3 from CDN -->
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
  <!-- Game entry point -->
  <script type="module" src="/src/main.js"></script>
</body>
</html>`
	},
	{
		path: '/src/main.js',
		content: `// Main game configuration and initialization
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  backgroundColor: '#2d2d2d',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false
    }
  },
  // Scenes run in order: Boot → Preload → Game
  scene: [BootScene, PreloadScene, GameScene]
};

// Start the game
new Phaser.Game(config);`
	},
	{
		path: '/src/scenes/BootScene.js',
		content: `/**
 * Boot Scene - Initializes the game
 * Runs first, sets up global settings
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load any assets needed for the loading screen
    // (progress bar images, fonts, etc.)
  }

  create() {
    // Set up global game settings
    console.log('Game initialized!');

    // Move to preload scene
    this.scene.start('PreloadScene');
  }
}`
	},
	{
		path: '/src/scenes/PreloadScene.js',
		content: `/**
 * Preload Scene - Loads all game assets
 * Shows loading progress bar
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: '20px monospace',
        fill: '#ffffff'
      }
    });
    loadingText.setOrigin(0.5, 0.5);

    // Update progress bar as assets load
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load game assets here
    // Example:
    // this.load.image('player', '/assets/sprites/player.png');
    // this.load.audio('jump', '/assets/sounds/jump.mp3');
  }

  create() {
    // All assets loaded, start the game
    this.scene.start('GameScene');
  }
}`
	},
	{
		path: '/src/scenes/GameScene.js',
		content: `import { Player } from '../entities/Player.js';

/**
 * Game Scene - Main gameplay
 * This is where your game logic lives
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Create welcome text
    this.add.text(400, 200, 'Hello Phaser!', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Instructions
    this.add.text(400, 280, 'Edit the code to create your game!', {
      fontSize: '20px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Create player
    this.player = new Player(this, 400, 400);

    // Add platform
    const platforms = this.physics.add.staticGroup();
    const graphics = this.add.graphics();
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillRect(200, 550, 400, 20);

    // Enable collision (if you add a player sprite later)
    // this.physics.add.collider(this.player.sprite, platforms);
  }

  update(time, delta) {
    // Game loop - runs every frame
    if (this.player) {
      this.player.update();
    }
  }
}`
	},
	{
		path: '/src/entities/Player.js',
		content: `/**
 * Player Entity
 * Example of organizing game objects into classes
 */
export class Player {
  constructor(scene, x, y) {
    this.scene = scene;

    // Create a simple circle to represent player
    // Replace with: this.sprite = scene.add.sprite(x, y, 'player');
    this.graphics = scene.add.graphics();
    this.graphics.fillStyle(0x00aaff, 1);
    this.graphics.fillCircle(x, y, 20);

    this.x = x;
    this.y = y;

    // Setup controls
    this.cursors = scene.input.keyboard.createCursorKeys();
  }

  update() {
    // Movement controls
    if (this.cursors.left.isDown) {
      this.x -= 3;
    } else if (this.cursors.right.isDown) {
      this.x += 3;
    }

    // Update graphics position
    this.graphics.clear();
    this.graphics.fillStyle(0x00aaff, 1);
    this.graphics.fillCircle(this.x, this.y, 20);
  }
}`
	}
];
