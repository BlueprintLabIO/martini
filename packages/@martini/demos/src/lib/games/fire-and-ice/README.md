# Fire & Ice

A cooperative 2-player platformer where teamwork is essential.

## Gameplay

- **Players**: 2
- **Type**: Cooperative Platformer
- **Controls**: Arrow Keys (Move & Jump)

## Roles

- **Fire Player (Red)**: Controls the fire character
- **Ice Player (Blue)**: Controls the ice character

## How to Play

1. Host creates a room and shares the link
2. Second player joins via the shared link
3. Work together to navigate platforms
4. Use arrow keys to move left/right and jump

## Technical Details

- **Host-authoritative**: Physics runs on host, synced to client
- **Input prediction**: Client inputs sent to host for processing
- **State sync**: Position updates streamed to clients
