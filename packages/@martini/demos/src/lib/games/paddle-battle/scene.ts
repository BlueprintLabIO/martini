import type Phaser from 'phaser';
import type { GameRuntime } from '@martini/core';
import type { LocalTransport } from '@martini/transport-local';
import { PhaserAdapter } from '@martini/phaser';

export function createPaddleBattleScene(
	runtime: GameRuntime,
	transport: LocalTransport,
	isHost: boolean,
	playerId: string,
	role: 'host' | 'client',
	keys: { host: { left: boolean; right: boolean; up: boolean; down: boolean }; client: { left: boolean; right: boolean; up: boolean; down: boolean } }
) {
	return {
		create: function (this: Phaser.Scene) {
			// Background
			this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);

			// Center line
			for (let i = 0; i < 600; i += 20) {
				this.add.rectangle(400, i + 10, 4, 10, 0x444444);
			}

			// Create adapter
			const adapter = new PhaserAdapter(runtime, this);
			(this as any).adapter = adapter;

			// Store sprites
			(this as any).paddles = {};
			(this as any).ball = null;
			(this as any).scoreTexts = {};

			if (isHost) {
				// HOST: Create all game objects
				const state = runtime.getState();

				// Create paddles for each player
				for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
					const x = playerData.side === 'left' ? 50 : 750;
					const paddle = this.add.rectangle(x, playerData.y, 15, 100, 0xffffff);
					this.physics.add.existing(paddle, false);
					(paddle.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
					(paddle.body as Phaser.Physics.Arcade.Body).setImmovable(true);
					(this as any).paddles[pid] = paddle;
					adapter.trackSprite(paddle, `paddle-${pid}`);

					// Score text
					const scoreX = playerData.side === 'left' ? 200 : 600;
					const scoreText = this.add.text(scoreX, 50, '0', {
						fontSize: '48px',
						color: '#ffffff',
					});
					(this as any).scoreTexts[pid] = scoreText;
				}

				// Create ball - NO world bounds collision (we handle scoring manually)
				const ball = this.add.circle(state.ball.x, state.ball.y, 10, 0xff6b6b);
				this.physics.add.existing(ball);
				const ballBody = ball.body as Phaser.Physics.Arcade.Body;
				ballBody.setBounce(1, 1);
				ballBody.setCollideWorldBounds(false); // Disable world bounds - we check manually
				ballBody.setVelocity(state.ball.velocityX, state.ball.velocityY);
				(this as any).ball = ball;
				adapter.trackSprite(ball, 'ball');

				// Add colliders between ball and paddles
				for (const paddle of Object.values((this as any).paddles)) {
					this.physics.add.collider(ball, paddle as Phaser.GameObjects.GameObject);
				}
			} else {
				// CLIENT: Render sprites from state
				adapter.onChange((state: any) => {
					if (!state._sprites) return;

					for (const [key, data] of Object.entries(state._sprites) as [string, any][]) {
						// Render paddles
						if (key.startsWith('paddle-')) {
							if (!(this as any).paddles[key]) {
								const paddle = this.add.rectangle(data.x || 50, data.y || 300, 15, 100, 0xffffff);
								(this as any).paddles[key] = paddle;
								adapter.registerRemoteSprite(key, paddle);
							}
						}
						// Render ball
						else if (key === 'ball') {
							if (!(this as any).ball) {
								const ball = this.add.circle(data.x || 400, data.y || 300, 10, 0xff6b6b);
								(this as any).ball = ball;
								adapter.registerRemoteSprite(key, ball);
							}
						}
					}

					// Update scores
					if (state.players) {
						for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
							if (!(this as any).scoreTexts[pid]) {
								const scoreX = playerData.side === 'left' ? 200 : 600;
								const scoreText = this.add.text(scoreX, 50, String(playerData.score || 0), {
									fontSize: '48px',
									color: '#ffffff',
								});
								(this as any).scoreTexts[pid] = scoreText;
							} else {
								(this as any).scoreTexts[pid].setText(String(playerData.score || 0));
							}
						}
					}
				});
			}

			// Labels
			const label = isHost ? 'LEFT PADDLE (Host)' : 'RIGHT PADDLE (Client)';
			this.add
				.text(10, 10, label, {
					fontSize: '16px',
					color: '#ffffff',
				})
				.setDepth(100);

			const controls = role === 'host' ? 'W/S to Move Paddle' : 'Up/Down Arrows to Move';
			this.add
				.text(400, 570, controls, {
					fontSize: '14px',
					color: '#ffffff',
				})
				.setOrigin(0.5)
				.setDepth(100);
		},

		update: function (this: Phaser.Scene) {
			const speed = 300;

			// CLIENT: Smooth interpolation
			if (!isHost) {
				(this as any).adapter?.updateInterpolation();
			}

			// Capture local input based on role
			const playerKeys = role === 'host' ? keys.host : keys.client;
			const input = {
				up: playerKeys.up,
				down: playerKeys.down,
			};

			// Send input to runtime
			runtime.submitAction('move', input);

			if (isHost) {
				// HOST: Apply physics
				const state = runtime.getState();
				const inputs = state.inputs || {};

				// Update paddles
				for (const [pid, playerInput] of Object.entries(inputs) as [string, any][]) {
					const paddle = (this as any).paddles[pid];
					if (!paddle || !paddle.body) continue;

					const body = paddle.body as Phaser.Physics.Arcade.Body;

					if (playerInput.up) {
						body.setVelocityY(-speed);
					} else if (playerInput.down) {
						body.setVelocityY(speed);
					} else {
						body.setVelocityY(0);
					}

					// Update state with paddle position
					state.players[pid].y = paddle.y;
				}

				// Ball physics and scoring
				const ball = (this as any).ball;
				if (ball) {
					const ballBody = ball.body as Phaser.Physics.Arcade.Body;

					// Update ball state
					state.ball.x = ball.x;
					state.ball.y = ball.y;
					state.ball.velocityX = ballBody.velocity.x;
					state.ball.velocityY = ballBody.velocity.y;

					// Manual top/bottom bounce (since we disabled world bounds)
					if (ball.y <= 10) {
						ball.y = 10;
						ballBody.setVelocityY(Math.abs(ballBody.velocity.y));
					} else if (ball.y >= 590) {
						ball.y = 590;
						ballBody.setVelocityY(-Math.abs(ballBody.velocity.y));
					}

					// Check for scoring (ball goes past left or right edge)
					if (ball.x < -10) {
						// Ball went past left edge - RIGHT player scores
						const rightPlayer = Object.entries(state.players).find(
							([_, data]: [string, any]) => data.side === 'right'
						);
						if (rightPlayer) {
							// Use targetId parameter to specify who scores
							runtime.submitAction('score', undefined, rightPlayer[0]);
							// Wait for state update, then reset
							setTimeout(() => {
								const newState = runtime.getState();
								ball.setPosition(newState.ball.x, newState.ball.y);
								ballBody.setVelocity(newState.ball.velocityX, newState.ball.velocityY);
							}, 10);
						}
					} else if (ball.x > 810) {
						// Ball went past right edge - LEFT player scores
						const leftPlayer = Object.entries(state.players).find(
							([_, data]: [string, any]) => data.side === 'left'
						);
						if (leftPlayer) {
							// Use targetId parameter to specify who scores
							runtime.submitAction('score', undefined, leftPlayer[0]);
							// Wait for state update, then reset
							setTimeout(() => {
								const newState = runtime.getState();
								ball.setPosition(newState.ball.x, newState.ball.y);
								ballBody.setVelocity(newState.ball.velocityX, newState.ball.velocityY);
							}, 10);
						}
					}
				}

				// Update score displays
				for (const [pid, playerData] of Object.entries(state.players) as [string, any][]) {
					if ((this as any).scoreTexts[pid]) {
						(this as any).scoreTexts[pid].setText(String(playerData.score || 0));
					}
				}
			}
		},
	};
}
