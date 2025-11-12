import Phaser from 'phaser';
import { defineGame, GameRuntime } from '@martini/core';
import { PhaserAdapter } from '@martini/phaser';
import { TrysteroTransport } from '@martini/transport-trystero';

// Host vs Client based on URL pattern (like Jackbox!)
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
const isHost = !roomId; // No room ID = host creates new room

let finalRoomId;

if (isHost) {
  // HOST: Generate new room ID
  finalRoomId = 'room-' + Math.random().toString(36).substring(2, 8);

  // Show join link for others
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${finalRoomId}`;
  document.getElementById('room-id').innerHTML = `
    <div>Room ID: <strong>${finalRoomId}</strong></div>
    <div style="margin-top: 8px; font-size: 12px;">
      Share this link: <a href="${joinUrl}" target="_blank" style="color: #4da6ff;">${joinUrl}</a>
    </div>
  `;
} else {
  // CLIENT: Join existing room
  finalRoomId = roomId;
  document.getElementById('room-id').textContent = `Joining room: ${finalRoomId}`;
}

// Define game logic with input actions
const gameLogic = defineGame({
  actions: {
    // Client sends input to host
    move: {
      apply: (state, playerId, input) => {
        // Host applies physics based on client input
        // Note: The actual physics is handled in Phaser update()
        // We just store the input state here
        if (!state.inputs) state.inputs = {};
        state.inputs[playerId] = input;
      }
    }
  }
});

// Initialize game
(async () => {
  // Create transport with explicit host mode (Jackbox-style!)
  const transport = new TrysteroTransport({
    roomId: finalRoomId,
    appId: 'fireboy-watergirl-v2',
    isHost: isHost // URL determines host: no ?room param = host
  });

  // No need to wait for election - host is determined by URL!
  document.getElementById('status').textContent = isHost ? 'Host ✓' : 'Connecting...';

  const playerId = transport.getPlayerId();

  // CLIENT: Wait for host to join
  if (!isHost) {
    const waitForHost = () => {
      return new Promise((resolve, reject) => {
        // Check if host is already connected
        const checkHost = () => {
          const peers = transport.getPeerIds();
          if (peers.length > 0) {
            document.getElementById('status').textContent = 'Connected ✓';
            resolve();
          }
        };

        // Listen for host joining
        const cleanup = transport.onPeerJoin((peerId) => {
          console.log('Host joined!', peerId);
          document.getElementById('status').textContent = 'Connected ✓';
          cleanup();
          clearTimeout(timeout);
          resolve();
        });

        // Timeout after 30 seconds
        const timeout = setTimeout(() => {
          cleanup();
          document.getElementById('status').textContent = 'Host not found';
          reject(new Error('Host not found after 30s'));
        }, 30000);

        // Check immediately
        checkHost();
      });
    };

    try {
      document.getElementById('status').textContent = 'Waiting for host...';
      await waitForHost();
    } catch (err) {
      alert('Could not connect to host. Please ask the host to create a new room.');
      return;
    }
  }

  // Handle host disconnect
  transport.onHostDisconnect(() => {
    alert('Host left the game!');
    window.location.reload();
  });

  // Determine role
  const role = isHost ? 'fireboy' : 'watergirl';
  document.getElementById('my-role').textContent = role.toUpperCase();
  document.getElementById('my-role').className = `role ${role}`;
  document.getElementById('status').textContent = isHost ? 'Host ✓' : 'Connected ✓';

  // Create runtime
  const runtime = new GameRuntime(gameLogic, transport, {
    isHost,
    playerIds: [playerId]
  });

  // Create Phaser game
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 400 },
        debug: false
      }
    },
    scene: {
      create: function() {
        // Background
        this.add.rectangle(400, 300, 800, 600, 0x2a2a3e);

        // Create adapter
        this.adapter = new PhaserAdapter(runtime, this);

        // Platform
        const platform = this.add.rectangle(400, 550, 600, 20, 0x888888);
        this.physics.add.existing(platform, true);

        // Store sprites
        this.players = {};

        if (isHost) {
          // HOST: Create fireboy immediately
          const fireboy = this.add.circle(200, 400, 20, 0xff3300);
          this.physics.add.existing(fireboy);
          fireboy.body.setCollideWorldBounds(true);
          fireboy.body.setBounce(0.2);
          this.physics.add.collider(fireboy, platform);
          this.players[playerId] = fireboy;
          this.player = fireboy; // This is the sprite we control

          // Track fireboy
          this.adapter.trackSprite(fireboy, `player-${playerId}`);

          // HOST: Create watergirl when client joins
          transport.onPeerJoin((peerId) => {
            console.log('Peer joined:', peerId);
            const watergirl = this.add.circle(600, 400, 20, 0x0033ff);
            this.physics.add.existing(watergirl);
            watergirl.body.setCollideWorldBounds(true);
            watergirl.body.setBounce(0.2);
            this.physics.add.collider(watergirl, platform);
            this.players[peerId] = watergirl;

            // Track watergirl
            this.adapter.trackSprite(watergirl, `player-${peerId}`);

            document.getElementById('status').textContent = '2 Players Connected ✓';
          });
        } else {
          // CLIENT: Just render sprites from state
          this.adapter.onChange((state) => {
            if (!state._sprites) return;

            for (const [key, data] of Object.entries(state._sprites)) {
              // Create sprite if needed
              if (!this.players[key]) {
                console.log('Creating sprite on client:', key, data);
                const spriteId = key.replace('player-', '');
                const color = spriteId === playerId ? 0x0033ff : 0xff3300;
                const sprite = this.add.circle(data.x || 400, data.y || 400, 20, color);
                this.physics.add.existing(sprite);
                this.physics.add.collider(sprite, platform);
                this.players[key] = sprite;
                this.adapter.registerRemoteSprite(key, sprite);

                // Mark our controllable sprite
                if (spriteId === playerId) {
                  this.player = sprite;
                }

                document.getElementById('status').textContent = '2 Players Connected ✓';
              }
            }
          });
        }

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // Label
        this.add.text(10, 10, isHost ? 'FIRE BOY (Host)' : 'WATER GIRL (Client)', {
          fill: '#ffffff',
          fontSize: '18px',
          fontStyle: 'bold'
        });

        this.add.text(400, 570, 'Use Arrow Keys to Move & Jump', {
          fill: '#ffffff',
          fontSize: '14px',
          align: 'center',
          originX: 0.5
        });
      },

      update: function() {
        const speed = 200;
        const jumpSpeed = -350;

        // Capture local input
        const input = {
          left: this.cursors.left.isDown,
          right: this.cursors.right.isDown,
          up: this.cursors.up.isDown
        };

        // Send input to host
        runtime.submitAction('move', input);

        if (isHost) {
          // HOST: Apply physics for ALL players based on their inputs
          const state = runtime.getState();
          const inputs = state.inputs || {};

          for (const [pid, playerInput] of Object.entries(inputs)) {
            const sprite = this.players[pid];
            if (!sprite || !sprite.body) continue;

            // Apply input to sprite physics
            if (playerInput.left) {
              sprite.body.setVelocityX(-speed);
            } else if (playerInput.right) {
              sprite.body.setVelocityX(speed);
            } else {
              sprite.body.setVelocityX(0);
            }

            if (playerInput.up && sprite.body.touching.down) {
              sprite.body.setVelocityY(jumpSpeed);
            }
          }
        }
        // CLIENT: Physics is handled by host, we just render
      }
    }
  };

  new Phaser.Game(config);
})();
