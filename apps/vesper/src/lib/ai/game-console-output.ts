/**
 * Game console output store for AI debugging
 *
 * Stores game console logs in memory so AI tools can access them.
 * Each project has its own log buffer (last 100 logs).
 * Named "game-console-output" to avoid conflicts with browser console APIs.
 */

export type ConsoleLog = {
	message: string;
	frame: number;
	timestamp: number;
};

// In-memory storage: projectId -> logs
const logBuffers = new Map<string, ConsoleLog[]>();

/**
 * Add a console log for a project
 */
export function addConsoleLog(projectId: string, log: { message: string; frame: number }) {
	if (!logBuffers.has(projectId)) {
		logBuffers.set(projectId, []);
	}

	const logs = logBuffers.get(projectId)!;
	logs.push({
		...log,
		timestamp: Date.now()
	});

	// Keep only last 100 logs
	if (logs.length > 100) {
		logs.shift();
	}
}

/**
 * Get console logs for a project
 */
export function getConsoleLogs(projectId: string, limit: number = 20): ConsoleLog[] {
	const logs = logBuffers.get(projectId) || [];
	return logs.slice(-limit);
}

/**
 * Clear logs for a project (when game restarts)
 */
export function clearConsoleLogs(projectId: string) {
	logBuffers.set(projectId, []);
}
