# Paddle Battle

A modern multiplayer take on the classic Pong game.

## Gameplay

- **Players**: 2
- **Type**: Competitive Arcade
- **Controls**: Up/Down Arrow Keys or W/S

## Objective

Score 11 points before your opponent by hitting the ball past their paddle!

## Mechanics

- Ball bounces off paddles and walls
- Ball speed increases with each paddle hit
- Angle of return depends on where ball hits paddle
- First to 11 points wins

## How to Play

1. Host creates a room and shares the link
2. Second player joins
3. Use arrow keys to move paddle up/down
4. Hit the ball past opponent to score

## Technical Details

- **Host-authoritative**: All physics and collision on host
- **Deterministic**: Predictable ball physics
- **Low latency**: Simple game state for fast synchronization
