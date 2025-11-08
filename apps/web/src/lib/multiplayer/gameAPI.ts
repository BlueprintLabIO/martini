/**
 * gameAPI.multiplayer - Multiplayer Wrapper for Sandbox
 *
 * This module is injected into the sandbox iframe when multiplayer is active.
 * It provides a simple API that abstracts P2P (SimplePeer) and future server modes.
 *
 * Architecture:
 * - Parent window manages Socket.IO connection to signaling server
 * - Parent window manages SimplePeer instances
 * - Sandbox (game code) uses this API to send/receive data
 * - All communication happens via postMessage between parent and iframe
 */

export interface MultiplayerTransport {
	type: 'p2p' | 'server';
	peer?: any; // SimplePeer instance (P2P mode)
	socket?: any; // Socket.IO client (server mode - future)
}

/**
 * Create gameAPI.multiplayer interface
 *
 * This is injected into the sandbox and exposes multiplayer functionality
 * to game code in a safe, abstracted way.
 */
export function createMultiplayerAPI() {
	let playerId: string | null = null;
	let roomCode: string | null = null;
	let isHost: boolean = false;
	let players: string[] = [];
	let dataCallbacks: Array<(playerId: string, data: any) => void> = [];
	let playerJoinedCallbacks: Array<(playerId: string) => void> = [];
	let playerLeftCallbacks: Array<(playerId: string) => void> = [];

	// Listen for multiplayer events from parent
	window.addEventListener('message', (event) => {
		if (event.data.type === 'MULTIPLAYER_INIT') {
			// Initialize multiplayer state
			playerId = event.data.payload.playerId;
			roomCode = event.data.payload.roomCode;
			isHost = event.data.payload.isHost;
			players = event.data.payload.players || [];
		} else if (event.data.type === 'MULTIPLAYER_DATA') {
			// Received data from peer
			const { from, data } = event.data.payload;
			dataCallbacks.forEach((cb) => cb(from, data));
		} else if (event.data.type === 'MULTIPLAYER_PLAYER_JOINED') {
			// Player joined
			const { playerId: newPlayerId } = event.data.payload;
			if (!players.includes(newPlayerId)) {
				players.push(newPlayerId);
			}
			playerJoinedCallbacks.forEach((cb) => cb(newPlayerId));
		} else if (event.data.type === 'MULTIPLAYER_PLAYER_LEFT') {
			// Player left
			const { playerId: leftPlayerId } = event.data.payload;
			players = players.filter((p) => p !== leftPlayerId);
			playerLeftCallbacks.forEach((cb) => cb(leftPlayerId));
		}
	});

	return {
		/**
		 * Send data to all connected peers
		 */
		send(data: any): void {
			if (!playerId || !roomCode) {
				console.warn('[gameAPI.multiplayer] Not connected to multiplayer session');
				return;
			}

			parent.postMessage(
				{
					type: 'MULTIPLAYER_SEND',
					payload: { data }
				},
				'*'
			);
		},

		/**
		 * Register callback for receiving data from peers
		 */
		onData(callback: (playerId: string, data: any) => void): void {
			dataCallbacks.push(callback);
		},

		/**
		 * Register callback for when a player joins
		 */
		onPlayerJoined(callback: (playerId: string) => void): void {
			playerJoinedCallbacks.push(callback);
		},

		/**
		 * Register callback for when a player leaves
		 */
		onPlayerLeft(callback: (playerId: string) => void): void {
			playerLeftCallbacks.push(callback);
		},

		/**
		 * Get list of all connected player IDs (including self)
		 */
		getPlayers(): string[] {
			return [...players];
		},

		/**
		 * Check if current player is the host
		 */
		isHost(): boolean {
			return isHost;
		},

		/**
		 * Get current player's ID
		 */
		getPlayerId(): string | null {
			return playerId;
		},

		/**
		 * Get room code
		 */
		getRoomCode(): string | null {
			return roomCode;
		},

		/**
		 * Get raw transport (for advanced users)
		 * Returns null in sandbox - transport is managed by parent window
		 */
		getTransport(): MultiplayerTransport | null {
			console.warn(
				'[gameAPI.multiplayer] getTransport() is not available in sandbox. Transport is managed by parent window.'
			);
			return null;
		}
	};
}

/**
 * Serialized version of the multiplayer API to inject into sandbox
 * This is a string that will be evaluated in the sandbox context
 */
export const MULTIPLAYER_API_INJECTION = `
// gameAPI.multiplayer - Injected by parent window
(function() {
  let playerId = null;
  let roomCode = null;
  let isHost = false;
  let players = [];
  let dataCallbacks = [];
  let playerJoinedCallbacks = [];
  let playerLeftCallbacks = [];

  // Listen for multiplayer events from parent
  window.addEventListener('message', (event) => {
    if (event.data.type === 'MULTIPLAYER_INIT') {
      playerId = event.data.payload.playerId;
      roomCode = event.data.payload.roomCode;
      isHost = event.data.payload.isHost;
      players = event.data.payload.players || [];
    } else if (event.data.type === 'MULTIPLAYER_DATA') {
      const { from, data } = event.data.payload;
      dataCallbacks.forEach(cb => cb(from, data));
    } else if (event.data.type === 'MULTIPLAYER_PLAYER_JOINED') {
      const { playerId: newPlayerId } = event.data.payload;
      if (!players.includes(newPlayerId)) {
        players.push(newPlayerId);
      }
      playerJoinedCallbacks.forEach(cb => cb(newPlayerId));
    } else if (event.data.type === 'MULTIPLAYER_PLAYER_LEFT') {
      const { playerId: leftPlayerId } = event.data.payload;
      players = players.filter(p => p !== leftPlayerId);
      playerLeftCallbacks.forEach(cb => cb(leftPlayerId));
    }
  });

  gameAPI.multiplayer = {
    send(data) {
      if (!playerId || !roomCode) {
        console.warn('[gameAPI.multiplayer] Not connected');
        return;
      }
      parent.postMessage({ type: 'MULTIPLAYER_SEND', payload: { data } }, '*');
    },

    onData(callback) {
      dataCallbacks.push(callback);
    },

    onPlayerJoined(callback) {
      playerJoinedCallbacks.push(callback);
    },

    onPlayerLeft(callback) {
      playerLeftCallbacks.push(callback);
    },

    getPlayers() {
      return [...players];
    },

    isHost() {
      return isHost;
    },

    getPlayerId() {
      return playerId;
    },

    getRoomCode() {
      return roomCode;
    },

    getTransport() {
      console.warn('[gameAPI.multiplayer] getTransport() not available in sandbox');
      return null;
    }
  };
})();
`;
