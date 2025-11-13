# Arena Blaster

A fast-paced top-down shooter for 2-4 players.

## Gameplay

- **Players**: 2-4
- **Type**: Competitive Arena Shooter
- **Controls**: WASD (Move), Mouse (Aim), Click (Shoot)

## Objective

Eliminate other players to score points. First to 10 kills wins!

## Mechanics

- Health regenerates slowly over time
- Players respawn after elimination
- Bullets travel in straight lines
- Collision detection with arena walls

## How to Play

1. Host creates a room and shares the link
2. Up to 3 other players join
3. Move around the arena and shoot opponents
4. Avoid incoming fire and score eliminations

## Technical Details

- **Host-authoritative**: All collision detection and hit registration on host
- **Client prediction**: Smooth local movement with server reconciliation
- **Snapshot interpolation**: Smooth enemy movement rendering
