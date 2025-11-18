import { j as json } from './index-Djsj11qr.js';
import { d as db, p as projects, f as files } from './index3-Cd3ryqyN.js';
import { eq, desc } from 'drizzle-orm';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm/pg-core';
import './shared-server-DaWdgxVh.js';

const martiniTypeScriptStarter = [
  {
    path: "/src/game.ts",
    content: `/**
 * Game Logic - Pure state management
 *
 * This file defines your game rules and state using Martini SDK.
 * No Phaser code here - just pure TypeScript!
 */

import { defineGame } from '@martini/phaser';

export const myGame = defineGame({
  // Initial state setup
  setup: ({ playerIds }) => ({
    players: Object.fromEntries(
      playerIds.map((id, index) => [
        id,
        {
          x: 200 + index * 400,
          y: 300,
          score: 0,
          velocity: { x: 0, y: 0 }
        }
      ])
    ),
    // Store player inputs (updated every frame)
    inputs: {} as Record<string, { left: boolean; right: boolean; up: boolean }>
  }),

  // Actions - How state changes
  actions: {
    // Update player input
    input: {
      apply: (state, context, input) => {
        state.inputs[context.targetId] = input;
      }
    },

    // Increment score
    addScore: {
      apply: (state, context, points: number) => {
        const player = state.players[context.targetId];
        if (player) {
          player.score += points;
        }
      }
    }
  },

  // Player join/leave handlers
  onPlayerJoin: (state, playerId) => {
    const existingCount = Object.keys(state.players).length;
    state.players[playerId] = {
      x: 200 + existingCount * 400,
      y: 300,
      score: 0,
      velocity: { x: 0, y: 0 }
    };
  },

  onPlayerLeave: (state, playerId) => {
    delete state.players[playerId];
    delete state.inputs[playerId];
  }
});
`
  },
  {
    path: "/src/scene.ts",
    content: `/**
 * Phaser Scene - Rendering and input
 *
 * This file handles all Phaser-specific rendering logic.
 * It reads from game state and submits actions.
 */

import Phaser from 'phaser';
import { PhaserAdapter } from '@martini/phaser';
import type { GameRuntime } from '@martini/phaser';

export function createGameScene(runtime: GameRuntime) {
  return class GameScene extends Phaser.Scene {
    adapter!: PhaserAdapter;
    sprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

    create() {
      // Initialize Phaser adapter
      this.adapter = new PhaserAdapter(runtime, this);

      // Expose for HMR (will be added in Phase 3)
      if ((window as any).__HMR__) {
        (window as any).__HMR__.adapter = this.adapter;
      }

      // Background
      this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

      // Platform
      const platform = this.add.rectangle(400, 550, 600, 20, 0x8b4513);
      this.physics.add.existing(platform, true);

      // UI
      this.add.text(10, 10, 'Use Arrow Keys to Move', {
        fontSize: '16px',
        color: '#000000'
      });

      // Listen for state changes to create/update sprites
      this.adapter.onChange((state) => {
        for (const [playerId, player] of Object.entries(state.players)) {
          if (!this.sprites.has(playerId)) {
            // Create sprite
            const color = playerId === this.adapter.getMyPlayerId() ? 0x00ff00 : 0xff0000;
            const sprite = this.add.circle(player.x, player.y, 20, color);
            this.physics.add.existing(sprite);
            (sprite.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
            this.physics.add.collider(sprite, platform);

            this.sprites.set(playerId, sprite);

            // Track my sprite for auto-sync
            if (playerId === this.adapter.getMyPlayerId()) {
              this.adapter.trackSprite(sprite, \`player-\${playerId}\`);
            } else {
              // Register remote sprite for interpolation
              this.adapter.registerRemoteSprite(\`player-\${playerId}\`, sprite);
            }
          }
        }
      });
    }

    update() {
      // Smooth interpolation for remote players
      this.adapter.updateInterpolation();

      // Input handling
      const cursors = this.input.keyboard!.createCursorKeys();
      const mySprite = this.sprites.get(this.adapter.getMyPlayerId());

      if (mySprite) {
        // Apply physics
        const body = mySprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        if (cursors.left.isDown) {
          body.setVelocityX(-200);
        } else if (cursors.right.isDown) {
          body.setVelocityX(200);
        }

        if (cursors.up.isDown && body.touching.down) {
          body.setVelocityY(-400);
        }

        // Send input state to other players
        this.adapter.submitAction('input', {
          left: cursors.left.isDown,
          right: cursors.right.isDown,
          up: cursors.up.isDown
        });
      }
    }
  };
}
`
  },
  {
    path: "/src/main.ts",
    content: `/**
 * Entry Point - Auto-wired by Martini
 *
 * This file is auto-generated and should rarely need editing.
 * It wires up the runtime, transport, and Phaser game.
 */

import Phaser from 'phaser';
import { GameRuntime, TrysteroTransport } from '@martini/phaser';
import { myGame } from './game';
import { createGameScene } from './scene';

// Get multiplayer config from URL params
// (Auto-injected by sandbox runtime)
const roomId = (window as any).__ROOM_ID__ || 'default-room';
const isHost = (window as any).__IS_HOST__ || false;

// Create P2P transport
const transport = new TrysteroTransport({
  roomId,
  isHost,
  appId: 'martini-game',
  // Use HiveMQ public broker (more reliable than mosquitto/emqx)
  relayUrls: ['wss://broker.hivemq.com:8884/mqtt']
});

// Create game runtime
const runtime = new GameRuntime(myGame, transport, { isHost });

// Expose for HMR (will be added in Phase 3)
if ((window as any).__HMR__) {
  (window as any).__HMR__.runtime = runtime;
}

// Create Phaser game
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  backgroundColor: '#87ceeb',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 400 },
      debug: false
    }
  },
  scene: createGameScene(runtime)
});

// Notify parent that game is ready
if (window.parent !== window) {
  window.parent.postMessage({ type: 'READY' }, '*');
}
`
  },
  {
    path: "/tsconfig.json",
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["phaser"]
  },
  "include": ["src/**/*"]
}
`
  }
];
const GET = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const userProjects = await db.select().from(projects).where(eq(projects.userId, user.id)).orderBy(desc(projects.updatedAt));
  return json({ projects: userProjects });
};
const POST = async ({ request, locals }) => {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { name } = body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return json({ error: "Project name is required" }, { status: 400 });
  }
  if (name.length > 100) {
    return json({ error: "Project name must be 100 characters or less" }, { status: 400 });
  }
  const [project] = await db.insert(projects).values({
    userId: user.id,
    name: name.trim()
  }).returning();
  await db.insert(files).values(
    martiniTypeScriptStarter.map((file) => ({
      projectId: project.id,
      path: file.path,
      content: file.content
    }))
  );
  return json({ project }, { status: 201 });
};

export { GET, POST };
//# sourceMappingURL=_server.ts-Cn_mqTp3.js.map
