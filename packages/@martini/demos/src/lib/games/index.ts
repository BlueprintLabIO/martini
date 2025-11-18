/**
 * Demo Games Collection
 *
 * This file exports metadata for all available demo games.
 * The actual game implementations live in the config files (single source of truth).
 */

export interface DemoGame {
  id: string;
  name: string;
  description: string;
  players: string;
  type: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  thumbnail?: string;
  controls: string[];
}

export const demoGames: DemoGame[] = [
  {
    id: 'blob-battle',
    name: 'Blob Battle',
    description: 'Agar.io-style multiplayer game. Eat food to grow, eat smaller players, avoid bigger ones! Showcases StateDrivenSpawner and server-authoritative gameplay.',
    players: '2-8',
    type: 'Competitive Arena',
    difficulty: 'beginner',
    controls: ['Click - Move your blob'],
  },
  {
    id: 'fire-and-ice',
    name: 'Fire & Ice',
    description: 'Cooperative platformer where two players must work together to overcome obstacles. Showcases PhysicsManager and collision handling.',
    players: '2',
    type: 'Cooperative Platformer',
    difficulty: 'beginner',
    controls: ['Arrow Keys - Move & Jump'],
  },
  {
    id: 'paddle-battle',
    name: 'Paddle Battle',
    description: 'Classic Pong-style game. First to 11 points wins! Showcases CollisionManager and PlayerUIManager.',
    players: '2',
    type: 'Competitive Arcade',
    difficulty: 'beginner',
    controls: ['Arrow Keys or W/S - Move Paddle'],
  },
  {
    id: 'circuit-racer',
    name: 'Circuit Racer',
    description: 'Top-down racing game. Complete 3 laps before your opponents! Showcases PhysicsManager racing behavior and reactive UI.',
    players: '2-4',
    type: 'Competitive Racing',
    difficulty: 'intermediate',
    controls: ['Arrow Keys or WASD - Accelerate/Brake/Steer'],
  },
  {
    id: 'arena-blaster',
    name: 'Arena Blaster',
    description: 'Fast-paced shooter. Eliminate opponents to score points in intense arena combat. Showcases HealthBarManager and bullet physics.',
    players: '2-4',
    type: 'Competitive Shooter',
    difficulty: 'advanced',
    controls: ['WASD - Move', 'Space - Shoot'],
  },
];
