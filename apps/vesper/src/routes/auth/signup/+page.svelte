<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSignup() {
		error = '';

		// Validation
		if (!email || !password || !confirmPassword) {
			error = 'All fields are required';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}

		loading = true;

		try {
			const { error: signUpError } = await data.supabase.auth.signUp({
				email,
				password
			});

			if (signUpError) throw signUpError;

			// Invalidate layout to refresh session
			await invalidate('supabase:auth');

			// Redirect to dashboard on success
			goto('/dashboard');
		} catch (err: any) {
			error = err.message || 'Failed to sign up';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 px-4">
	<div class="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
		<h1 class="text-4xl font-bold text-white mb-2 text-center">Create Account</h1>
		<p class="text-purple-200 text-center mb-8">Start creating games with AI</p>

		{#if error}
			<div class="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
				{error}
			</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleSignup(); }} class="space-y-6">
			<div>
				<label for="email" class="block text-sm font-medium text-purple-200 mb-2">
					Email
				</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					class="w-full px-4 py-3 bg-white/5 border border-purple-300/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
					placeholder="you@example.com"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-purple-200 mb-2">
					Password
				</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					required
					class="w-full px-4 py-3 bg-white/5 border border-purple-300/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
					placeholder="At least 6 characters"
				/>
			</div>

			<div>
				<label for="confirm-password" class="block text-sm font-medium text-purple-200 mb-2">
					Confirm Password
				</label>
				<input
					type="password"
					id="confirm-password"
					bind:value={confirmPassword}
					required
					class="w-full px-4 py-3 bg-white/5 border border-purple-300/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
					placeholder="Re-enter password"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Creating Account...' : 'Sign Up'}
			</button>
		</form>

		<p class="mt-6 text-center text-purple-200">
			Already have an account?
			<a href="/auth/login" class="text-purple-300 hover:text-purple-100 font-semibold">
				Log In
			</a>
		</p>
	</div>
</div>
