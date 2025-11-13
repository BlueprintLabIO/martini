<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Get the Supabase client from the parent layout
	const supabase = $derived(data.supabase);

	let loggingOut = $state(false);
	let projects = $state<Array<{
		id: string;
		name: string;
		createdAt: string;
		updatedAt: string;
	}>>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);
	let newProjectName = $state('');
	let creating = $state(false);

	async function loadProjects() {
		try {
			loading = true;
			error = '';
			const response = await fetch('/api/projects');
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to load projects');
			}

			projects = result.projects;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load projects';
		} finally {
			loading = false;
		}
	}

	async function createProject() {
		if (!newProjectName.trim()) return;

		try {
			creating = true;
			error = '';

			const response = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newProjectName.trim() })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create project');
			}

			// Reset form and reload projects
			newProjectName = '';
			showCreateModal = false;
			await loadProjects();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create project';
		} finally {
			creating = false;
		}
	}

	async function handleLogout() {
		loggingOut = true;
		try {
			await supabase.auth.signOut();
			await invalidate('supabase:auth');
			goto('/');
		} catch (err) {
			console.error('Logout failed:', err);
			loggingOut = false;
		}
	}

	onMount(() => {
		loadProjects();
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900">
	<nav class="bg-white/10 backdrop-blur-lg border-b border-white/20">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<div class="flex items-center">
					<h1 class="text-2xl font-bold text-white">Martini</h1>
				</div>
				<button
					onclick={handleLogout}
					disabled={loggingOut}
					class="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
				>
					{loggingOut ? 'Logging out...' : 'Log Out'}
				</button>
			</div>
		</div>
	</nav>

	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="mb-8">
			<div class="flex justify-between items-center mb-6">
				<div>
					<h2 class="text-3xl font-bold text-white">My Projects</h2>
					<p class="text-purple-200 mt-1">Logged in as: <span class="font-mono">{data.user.email}</span></p>
				</div>
				<button
					onclick={() => showCreateModal = true}
					class="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all"
				>
					+ New Project
				</button>
			</div>

			{#if error}
				<div class="bg-red-500/20 border border-red-400 text-red-200 px-4 py-3 rounded-lg mb-6">
					<p class="font-semibold">Error: {error}</p>
				</div>
			{/if}

			{#if loading}
				<div class="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-2xl text-center">
					<div class="text-white text-lg">Loading projects...</div>
				</div>
			{:else if projects.length === 0}
				<div class="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-2xl text-center">
					<h3 class="text-2xl font-bold text-white mb-2">No projects yet</h3>
					<p class="text-purple-200 mb-6">Create your first game project to get started!</p>
					<button
						onclick={() => showCreateModal = true}
						class="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all"
					>
						Create Your First Project
					</button>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each projects as project}
						<div class="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-lg hover:bg-white/15 transition-all cursor-pointer border border-white/10">
							<h3 class="text-xl font-bold text-white mb-2">{project.name}</h3>
							<div class="text-sm text-purple-200 space-y-1">
								<p>Created: {new Date(project.createdAt).toLocaleDateString()}</p>
								<p>Updated: {new Date(project.updatedAt).toLocaleDateString()}</p>
							</div>
							<div class="mt-4 flex gap-2">
								<a
									href="/editor/{project.id}"
									class="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm transition-colors text-center"
								>
									Open Editor
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>

	{#if showCreateModal}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
			<div class="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/20">
				<h3 class="text-2xl font-bold text-white mb-4">Create New Project</h3>

				<form onsubmit={(e) => { e.preventDefault(); createProject(); }}>
					<div class="mb-4">
						<label for="projectName" class="block text-sm font-medium text-purple-200 mb-2">
							Project Name
						</label>
						<input
							id="projectName"
							type="text"
							bind:value={newProjectName}
							placeholder="My Awesome Game"
							maxlength="100"
							required
							class="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
						/>
					</div>

					<div class="flex gap-3">
						<button
							type="button"
							onclick={() => { showCreateModal = false; newProjectName = ''; }}
							class="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
							disabled={creating}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={creating || !newProjectName.trim()}
							class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{creating ? 'Creating...' : 'Create'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
