/**
 * @martini/transport-local
 *
 * In-memory transport for same-page multiplayer demos and testing.
 *
 * Use this transport when you want to run multiple game instances
 * on the same page (e.g., side-by-side demo views) without the
 * complexity of WebRTC signaling.
 *
 * @example
 * ```ts
 * // Create two instances in the same room
 * const host = new LocalTransport({
 *   roomId: 'demo-room',
 *   isHost: true
 * });
 *
 * const client = new LocalTransport({
 *   roomId: 'demo-room',
 *   isHost: false
 * });
 *
 * // They instantly see each other
 * host.getPeerIds(); // [client.playerId]
 * client.getPeerIds(); // [host.playerId]
 * ```
 */
export { LocalTransport, type LocalTransportConfig } from './LocalTransport';
//# sourceMappingURL=index.d.ts.map