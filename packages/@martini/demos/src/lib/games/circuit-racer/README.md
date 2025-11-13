# Circuit Racer

A top-down racing game for 2-4 players.

## Gameplay

- **Players**: 2-4
- **Type**: Competitive Racing
- **Controls**: Arrow Keys or WASD

## Objective

Complete 3 laps around the circuit faster than your opponents!

## Mechanics

- Acceleration and braking
- Drift around corners
- Checkpoint system to track progress
- Collision with track boundaries

## How to Play

1. Host creates a room and shares the link
2. Up to 3 other players join
3. Host starts the race
4. First to complete 3 laps wins

## Technical Details

- **Host-authoritative**: Physics and collision on host
- **Input prediction**: Smooth local car control
- **Snapshot interpolation**: Smooth opponent car rendering
