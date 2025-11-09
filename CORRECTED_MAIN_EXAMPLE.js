/**
 * 4-Player Fire Boy & Water Girl Clone - CORRECTED VERSION
 *
 * FIX: All helper methods are now defined as local functions or stored on `this`
 * This fixes the "this.createPlatforms is not a function" error
 */

window.scenes = {
  Boot: {
    create(scene) {
      gameAPI.log('4-Player Puzzle Game Booting...');
      scene.input.mouse.disableContextMenu();
      gameAPI.switchScene('Menu');
    }
  },

  Menu: {
    create(scene) {
      // Title
      scene.add.text(400, 150, 'ELEMENTAL HEROES', {
        fontSize: '64px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      scene.add.text(400, 220, '4-Player Cooperative Puzzle', {
        fontSize: '24px',
        color: '#aaaaaa'
      }).setOrigin(0.5);

      // Character showcase
      scene.add.text(400, 280, '🔥 Fire Boy | 💧 Water Girl | 🌬️ Air Boy | 🌍 Earth Girl', {
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5);

      // Instructions
      scene.add.text(400, 350, 'WASD to move your character', {
        fontSize: '18px',
        color: '#ffff00'
      }).setOrigin(0.5);

      scene.add.text(400, 380, 'Work together to reach the exit!', {
        fontSize: '18px',
        color: '#00ff00'
      }).setOrigin(0.5);

      // Start button
      const startBtn = scene.add.text(400, 450, 'START GAME', {
        fontSize: '32px',
        color: '#ffff00',
        backgroundColor: '#333333',
        padding: { x: 30, y: 15 }
      }).setOrigin(0.5).setInteractive();

      startBtn.on('pointerdown', () => {
        gameAPI.switchScene('Game', { level: 1 });
      });
    }
  },

  Game: {
    create(scene, data) {
      gameAPI.log(`Starting Level ${data.level}`);

      // Store game state on `this`
      this.level = data.level;
      this.players = [];
      this.puzzleElements = [];

      // Background
      scene.add.rectangle(400, 300, 800, 600, 0x1a2a3a);

      // ✅ FIX: Define helper functions as local functions or on `this`
      // Option 1: Local functions (best for one-time setup)
      const createPlatforms = (scene) => {
        // Main platforms
        const platforms = [
          { x: 400, y: 550, width: 600, height: 20 }, // Ground
          { x: 200, y: 450, width: 200, height: 20 }, // Left platform
          { x: 600, y: 450, width: 200, height: 20 }, // Right platform
          { x: 400, y: 350, width: 300, height: 20 }, // Middle platform
          { x: 100, y: 250, width: 150, height: 20 }, // High left
          { x: 700, y: 250, width: 150, height: 20 }  // High right
        ];

        platforms.forEach(plat => {
          scene.add.rectangle(plat.x, plat.y, plat.width, plat.height, 0x8b4513);
        });
      };

      const createPuzzleElements = (scene) => {
        // 4 Colored Elemental Boxes
        this.elementalBoxes = [
          {
            box: scene.add.rectangle(200, 400, 60, 60, 0xff4500),
            type: 'fire',
            label: scene.add.text(200, 400, 'FIRE', { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5)
          },
          {
            box: scene.add.rectangle(600, 400, 60, 60, 0x1e90ff),
            type: 'water',
            label: scene.add.text(600, 400, 'WATER', { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5)
          },
          {
            box: scene.add.rectangle(200, 200, 60, 60, 0x87ceeb),
            type: 'air',
            label: scene.add.text(200, 200, 'AIR', { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5)
          },
          {
            box: scene.add.rectangle(600, 200, 60, 60, 0x8b4513),
            type: 'earth',
            label: scene.add.text(600, 200, 'EARTH', { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5)
          }
        ];

        // Obstacles
        this.fireObstacles = [
          scene.add.rectangle(300, 430, 80, 40, 0xff4500),
          scene.add.rectangle(500, 330, 80, 40, 0xff4500)
        ];

        this.waterObstacles = [
          scene.add.rectangle(200, 430, 80, 40, 0x1e90ff),
          scene.add.rectangle(600, 330, 80, 40, 0x1e90ff)
        ];

        this.airPlatforms = [
          scene.add.rectangle(150, 200, 100, 15, 0x87ceeb),
          scene.add.rectangle(650, 200, 100, 15, 0x87ceeb)
        ];

        this.earthButtons = [
          scene.add.rectangle(400, 530, 30, 10, 0x8b4513)
        ];

        this.doors = [
          scene.add.rectangle(750, 200, 20, 80, 0x666666)
        ];
      };

      const createPlayer = (scene) => {
        // Get player role based on multiplayer
        const roles = ['fireboy', 'watergirl', 'airboy', 'earthgirl'];
        const playerId = gameAPI.multiplayer.getMyId();
        const roleIndex = parseInt(playerId) % 4;
        const role = roles[roleIndex];

        // Set colors and properties based on role
        const roleConfig = {
          fireboy: { color: 0xff4500, startX: 100, startY: 500 },
          watergirl: { color: 0x1e90ff, startX: 150, startY: 500 },
          airboy: { color: 0x87ceeb, startX: 200, startY: 500 },
          earthgirl: { color: 0x8b4513, startX: 250, startY: 500 }
        };

        const config = roleConfig[role];

        // Create player sprite
        this.player = scene.add.circle(config.startX, config.startY, 15, config.color);

        // Add role label
        this.roleLabel = scene.add.text(config.startX, config.startY - 25, role.toUpperCase(), {
          fontSize: '10px',
          color: '#ffffff'
        }).setOrigin(0.5);

        // Enable multiplayer tracking
        gameAPI.multiplayer.trackPlayer(this.player, {
          role: role,
          color: config.color
        });

        // Player properties
        this.speed = 3;
        this.jumpPower = 10;
        this.isGrounded = false;
        this.velocityY = 0;
        this.gravity = 0.5;
        this.role = role;

        // Special abilities
        if (role === 'airboy') {
          this.jumpPower = 15;
        }
      };

      // ✅ Now call the local functions
      createPlatforms(scene);
      createPuzzleElements(scene);
      createPlayer(scene);

      // Create exit door
      this.exitDoor = scene.add.rectangle(750, 100, 40, 60, 0x00ff00);
      scene.add.text(750, 80, 'EXIT', {
        fontSize: '12px',
        color: '#ffffff'
      }).setOrigin(0.5);

      // UI
      this.levelText = scene.add.text(400, 16, `Level ${this.level} - Work Together!`, {
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5, 0);

      // ✅ Option 2: Store helper on `this` if needed in update()
      this.checkPuzzleInteractions = (scene) => {
        // Collision checks would go here
        // Each character can only interact with their element
      };
    },

    update(scene, time, delta) {
      // Only update if player exists
      if (!this.player) return;

      // Player movement with WASD
      const keys = scene.input.keyboard.addKeys('W,A,S,D');

      if (keys.A.isDown) {
        this.player.x -= this.speed;
        this.roleLabel.x = this.player.x;
      }
      if (keys.D.isDown) {
        this.player.x += this.speed;
        this.roleLabel.x = this.player.x;
      }

      // Jumping
      if (keys.W.isDown && this.isGrounded) {
        this.velocityY = -this.jumpPower;
        this.isGrounded = false;
      }

      // Apply gravity
      this.velocityY += this.gravity;
      this.player.y += this.velocityY;
      this.roleLabel.y = this.player.y - 25;

      // Ground collision
      if (this.player.y >= 535) {
        this.player.y = 535;
        this.velocityY = 0;
        this.isGrounded = true;
      }

      // Keep player in bounds
      this.player.x = Phaser.Math.Clamp(this.player.x, 15, 785);

      // Check exit condition
      const distToExit = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.exitDoor.x, this.exitDoor.y
      );

      if (distToExit < 50) {
        gameAPI.multiplayer.broadcast('player-reached-exit', {
          playerId: gameAPI.multiplayer.getMyId(),
          role: this.role
        });
      }

      // ✅ Can call helper method stored on `this`
      if (this.checkPuzzleInteractions) {
        this.checkPuzzleInteractions(scene);
      }
    }
  },

  Victory: {
    create(scene, data) {
      scene.add.text(400, 200, 'LEVEL COMPLETE!', {
        fontSize: '64px',
        color: '#00ff00',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      scene.add.text(400, 300, 'Great teamwork!', {
        fontSize: '32px',
        color: '#ffffff'
      }).setOrigin(0.5);

      const menuBtn = scene.add.text(400, 400, 'Back to Menu', {
        fontSize: '24px',
        color: '#ffff00'
      }).setOrigin(0.5).setInteractive();

      menuBtn.on('pointerdown', () => {
        gameAPI.switchScene('Menu');
      });
    }
  }
};

// Set starting scene
window.startScene = 'Boot';
