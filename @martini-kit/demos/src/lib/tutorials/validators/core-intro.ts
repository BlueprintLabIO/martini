export interface ValidationResult {
	success: boolean;
	message: string;
}

/**
 * Simple static validator for the core intro lesson.
 * Checks for createInputAction usage and onTick movement logic presence.
 */
export default function validate(files: Record<string, string>): ValidationResult {
	const game = files['/src/game.ts'] || '';

	if (!game.includes('createInputAction')) {
		return {
			success: false,
			message: 'Use createInputAction to capture inputs (e.g., createInputAction("inputs")).'
		};
	}

	if (!/onTick\s*\(state/.test(game)) {
		return {
			success: false,
			message: 'Implement onTick to apply inputs on the host.'
		};
	}

	if (!game.includes('state.inputs')) {
		return {
			success: false,
			message: 'Store and read inputs from state.inputs.'
		};
	}

	if (!/players\[/i.test(game) && !/state\.players/.test(game)) {
		return {
			success: false,
			message: 'Update player positions based on inputs (state.players[...] = ...).'
		};
	}

	return {
		success: true,
		message: 'Looks good! createInputAction and onTick movement are present.'
	};
}
