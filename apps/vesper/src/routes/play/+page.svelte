<script lang="ts">
	import { goto } from '$app/navigation';
	import { Users } from 'lucide-svelte';

	let roomCode = $state('');
	let error = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		// Validate room code format (6 characters, alphanumeric)
		const code = roomCode.trim().toUpperCase();

		if (code.length !== 6) {
			error = 'Room code must be exactly 6 characters';
			return;
		}

		// Check if code contains only valid characters (no I, O, 0, 1)
		const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
		if (!validChars.test(code)) {
			error = 'Invalid room code format';
			return;
		}

		// Navigate to play page
		goto(`/play/${code}`);
	}
</script>

<svelte:head>
	<title>Join Game - Martini</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
	<div class="w-full max-w-md space-y-8 px-4">
		<!-- Header -->
		<div class="text-center">
			<div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
				<Users class="h-8 w-8 text-white" />
			</div>
			<h1 class="text-4xl font-bold text-white">Join a Game</h1>
			<p class="mt-3 text-lg text-gray-300">
				Enter a room code to join a multiplayer game
			</p>
		</div>

		<!-- Form -->
		<form onsubmit={handleSubmit} class="mt-8 space-y-6">
			<div>
				<label for="roomCode" class="sr-only">Room Code</label>
				<input
					id="roomCode"
					type="text"
					bind:value={roomCode}
					placeholder="Enter 6-digit code"
					maxlength="6"
					class="w-full rounded-lg border-2 border-gray-600 bg-gray-800 px-6 py-4 text-center text-2xl font-bold uppercase tracking-widest text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					autocomplete="off"
					spellcheck="false"
				/>
				{#if error}
					<p class="mt-2 text-sm text-red-400">{error}</p>
				{/if}
			</div>

			<button
				type="submit"
				class="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
			>
				Join Game
			</button>
		</form>

		<!-- Help Text -->
		<div class="text-center">
			<p class="text-sm text-gray-400">
				Don't have a code? Ask a friend to share their game code!
			</p>
		</div>
	</div>
</div>
