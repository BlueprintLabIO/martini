/**
 * Demo Games Collection
 *
 * This file exports all available demo games for the Martini framework.
 * Each game demonstrates different multiplayer patterns and game mechanics.
 */

import { fireAndIceGame } from './fire-and-ice/game';
import { arenaBlasterGame } from './arena-blaster/game';
import { tileMatcherGame } from './tile-matcher/game';
import { circuitRacerGame } from './circuit-racer/game';
import { paddleBattleGame } from './paddle-battle/game';

export interface DemoGame {
  id: string;
  name: string;
  description: string;
  players: string;
  type: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  gameLogic: any;
  thumbnail?: string;
  controls: string[];
}

export const demoGames: DemoGame[] = [
  {
    id: 'fire-and-ice',
    name: 'Fire & Ice',
    description: 'Cooperative platformer where two players must work together to overcome obstacles.',
    players: '2',
    type: 'Cooperative Platformer',
    difficulty: 'beginner',
    gameLogic: fireAndIceGame,
    controls: ['Arrow Keys - Move & Jump'],
  },
  {
    id: 'paddle-battle',
    name: 'Paddle Battle',
    description: 'Classic Pong-style game. First to 11 points wins!',
    players: '2',
    type: 'Competitive Arcade',
    difficulty: 'beginner',
    gameLogic: paddleBattleGame,
    controls: ['Arrow Keys or W/S - Move Paddle'],
  },
  {
    id: 'tile-matcher',
    name: 'Connect Four',
    description: 'Classic strategy game. Drop discs to get 4 in a row (horizontal, vertical, or diagonal) to win!',
    players: '2',
    type: 'Turn-Based Strategy',
    difficulty: 'beginner',
    gameLogic: tileMatcherGame,
    controls: ['Mouse - Click Column to Drop Disc', 'R - Reset Game'],
  },
  {
    id: 'circuit-racer',
    name: 'Circuit Racer',
    description: 'Top-down racing game. Complete 3 laps before your opponents!',
    players: '2-4',
    type: 'Competitive Racing',
    difficulty: 'intermediate',
    gameLogic: circuitRacerGame,
    controls: ['Arrow Keys or WASD - Accelerate/Brake/Steer'],
  },
  {
    id: 'arena-blaster',
    name: 'Arena Blaster',
    description: 'Fast-paced shooter. Eliminate opponents to score points in intense arena combat.',
    players: '2-4',
    type: 'Competitive Shooter',
    difficulty: 'advanced',
    gameLogic: arenaBlasterGame,
    controls: ['WASD - Move', 'Mouse - Aim', 'Click - Shoot'],
  },
];

export {
  fireAndIceGame,
  arenaBlasterGame,
  tileMatcherGame,
  circuitRacerGame,
  paddleBattleGame,
};
