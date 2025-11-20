import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export type SDK = 'phaser' | 'core' | 'unity' | 'unreal' | 'godot';

export const SDK_LABELS: Record<SDK, string> = {
	phaser: 'Phaser Helpers',
	core: 'Core Primitives',
	unity: 'Unity',
	unreal: 'Unreal Engine',
	godot: 'Godot'
};

export const SDK_AVAILABLE: Record<SDK, boolean> = {
	phaser: true,
	core: true,
	unity: false,
	unreal: false,
	godot: false
};

const STORAGE_KEY = 'martini-sdk-preference';
const DEFAULT_SDK: SDK = 'phaser';

/**
 * Get initial SDK from localStorage or URL query param
 */
function getInitialSDK(): SDK {
	if (!browser) return DEFAULT_SDK;

	// Check URL query param first (for deep linking)
	const params = new URLSearchParams(window.location.search);
	const urlSDK = params.get('sdk');
	if (urlSDK && isValidSDK(urlSDK)) {
		return urlSDK as SDK;
	}

	// Fall back to localStorage
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored && isValidSDK(stored)) {
		return stored as SDK;
	}

	return DEFAULT_SDK;
}

function isValidSDK(value: string): value is SDK {
	return ['phaser', 'core', 'unity', 'unreal', 'godot'].includes(value);
}

/**
 * Create SDK preference store with URL and localStorage sync
 */
function createSDKStore() {
	const { subscribe, set, update } = writable<SDK>(getInitialSDK());

	return {
		subscribe,
		set: (value: SDK) => {
			if (!isValidSDK(value)) {
				console.warn(`Invalid SDK: ${value}, falling back to ${DEFAULT_SDK}`);
				value = DEFAULT_SDK;
			}

			// Update store
			set(value);

			// Persist to localStorage
			if (browser) {
				localStorage.setItem(STORAGE_KEY, value);

				// Update URL query param without navigation
				const url = new URL(window.location.href);
				if (value === DEFAULT_SDK) {
					// Remove query param if using default
					url.searchParams.delete('sdk');
				} else {
					url.searchParams.set('sdk', value);
				}

				// Update URL without triggering navigation
				window.history.replaceState({}, '', url);
			}
		},
		reset: () => set(DEFAULT_SDK)
	};
}

export const selectedSDK = createSDKStore();

/**
 * Helper to check if current SDK supports a feature
 */
export function supportsSDK(sdks?: SDK[]): boolean {
	if (!sdks || sdks.length === 0) return true; // No SDK restriction

	let currentSDK: SDK = DEFAULT_SDK;
	selectedSDK.subscribe(value => currentSDK = value)(); // Get current value

	return sdks.includes(currentSDK);
}
