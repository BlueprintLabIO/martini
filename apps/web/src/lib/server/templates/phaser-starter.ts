export const phaserStarterFiles = [
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
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`
	},
	{
		path: '/src/main.js',
		content: `import { GameScene } from './scenes/GameScene.js';

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
  scene: [GameScene]
};

new Phaser.Game(config);`
	},
	{
		path: '/src/scenes/GameScene.js',
		content: `export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Add welcome text
    this.add.text(400, 300, 'Hello Phaser!', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Add instructions
    this.add.text(400, 400, 'Edit the code to create your game!', {
      fontSize: '20px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Add a bouncing sprite placeholder
    const graphics = this.add.graphics();
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillCircle(400, 200, 30);
  }

  update() {
    // Game loop - runs every frame
  }
}`
	}
];
