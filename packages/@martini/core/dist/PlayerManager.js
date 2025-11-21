/**
 * PlayerManager - Unified player lifecycle management
 *
 * Prevents bugs by ensuring both initial players (in setup) and
 * late-joining players use the same factory logic.
 *
 * @example
 * ```ts
 * const playerManager = createPlayerManager({
 *   roles: ['fire', 'ice'],
 *   factory: (playerId, index) => ({
 *     x: index === 0 ? 200 : 600,
 *     y: 400,
 *     role: index === 0 ? 'fire' : 'ice',
 *   })
 * });
 *
 * export const game = defineGame({
 *   setup: ({ playerIds }) => ({
 *     players: playerManager.initialize(playerIds),
 *     inputs: {}
 *   }),
 *
 *   onPlayerJoin: (state, playerId) => {
 *     playerManager.handleJoin(state.players, playerId);
 *   },
 *
 *   onPlayerLeave: (state, playerId) => {
 *     playerManager.handleLeave(state.players, playerId);
 *   }
 * });
 * ```
 */
/**
 * Create a PlayerManager instance
 *
 * @param config - Configuration for player management
 * @returns PlayerManager instance
 */
export function createPlayerManager(config) {
    const { factory, roles, spawnPoints, worldBounds } = config;
    // Track current player count for role/spawn assignment
    let playerCount = 0;
    const createPlayer = (playerId, index) => {
        let player = factory(playerId, index);
        // Auto-assign spawn point if provided
        if (spawnPoints && spawnPoints[index]) {
            player = { ...player, ...spawnPoints[index] };
        }
        // Auto-assign role if roles are defined
        if (roles && roles[index]) {
            player = { ...player, role: roles[index] };
        }
        // Clamp spawn position to world bounds (if worldBounds provided and player has x/y)
        if (worldBounds) {
            const clamped = player;
            if (typeof clamped.x === 'number') {
                clamped.x = Math.max(0, Math.min(worldBounds.width, clamped.x));
            }
            if (typeof clamped.y === 'number') {
                clamped.y = Math.max(0, Math.min(worldBounds.height, clamped.y));
            }
        }
        return player;
    };
    return {
        initialize(playerIds) {
            playerCount = playerIds.length;
            return Object.fromEntries(playerIds.map((id, index) => [id, createPlayer(id, index)]));
        },
        handleJoin(players, playerId) {
            const currentCount = Object.keys(players).length;
            players[playerId] = createPlayer(playerId, currentCount);
            playerCount = currentCount + 1;
        },
        handleLeave(players, playerId) {
            delete players[playerId];
            playerCount = Object.keys(players).length;
        },
        getConfig(index) {
            return {
                role: roles?.[index],
                spawn: spawnPoints?.[index]
            };
        },
        createHandlers() {
            const manager = this;
            return {
                setup: ({ playerIds }) => {
                    return {
                        players: manager.initialize(playerIds)
                    };
                },
                onPlayerJoin: (state, playerId) => {
                    manager.handleJoin(state.players, playerId);
                },
                onPlayerLeave: (state, playerId) => {
                    manager.handleLeave(state.players, playerId);
                }
            };
        }
    };
}
//# sourceMappingURL=PlayerManager.js.map