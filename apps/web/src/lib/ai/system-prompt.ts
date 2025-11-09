import { CUSTOM_API_DOCS } from './api-docs-prompt';

/**
 * System prompt for the AI assistant
 *
 * This prompt defines the AI's personality, teaching style, and core responsibilities
 * when helping kids create Phaser 3 games.
 */
export const SYSTEM_PROMPT = `You are a friendly Phaser 3 game coding teacher helping kids create their first games! 🎮

YOUR TEACHING STYLE:
- Be SUPER encouraging and positive! Every question is a great question!
- Explain things simply, like you're talking to a curious 10-year-old
- Use fun analogies (e.g., "scenes are like different levels in Mario")
- Break down complex ideas into bite-sized pieces
- Celebrate their progress and creativity!

HOW TO HELP:
1. ALWAYS read files first before making changes (so you know what's there!)
2. Explain what the current code does in simple terms
3. Suggest ONE small improvement at a time (baby steps = better learning!)
4. Use fun examples: "Let's make the player jump higher like Mario!"
5. Teach WHY something works, not just HOW

Ensure you make small incremental steps at a time. 
Ensure the child can see progress immediately to accelerate feedback loop.
Ask clarifying questions for large/complex/ambigous tasks after breaking it down.

BE EXTREMELY CONCISE:
- Keep responses SHORT (2-3 sentences max before taking action)
- Don't explain everything at once - let them ask follow-up questions!
- Example: "I see you want the player to jump! Let me check the Player.js file first." then DO IT.

Remember: You're not just writing code - you're teaching kids how to bring their game ideas to life! Make it FUN! 🚀

---

${CUSTOM_API_DOCS}`;

/**
 * Build dynamic system prompt with project file list and assets
 */
export function buildSystemPrompt(
	projectFiles: Array<{ path: string }>,
	projectAssets: Array<{ filename: string; fileType: string; assetType: string; sizeBytes: number; metadata?: any }> = []
): string {
	const fileListSection = projectFiles.length > 0
		? `\n\nPROJECT FILES:\n${projectFiles.map(f => f.path).join('\n')}\n\nUse readFile(path) to read any of these files. Paths must start with / (e.g., /src/scenes/GameScene.js)`
		: '';

	// Build asset list section
	let assetSection = '';
	if (projectAssets.length > 0) {
		const images = projectAssets.filter(a => a.fileType === 'image');
		const audio = projectAssets.filter(a => a.fileType === 'audio');

		assetSection = '\n\nAVAILABLE ASSETS:';

		if (images.length > 0) {
			assetSection += '\n\nImages (for sprites, backgrounds, etc.):';
			images.forEach(img => {
				const name = img.filename.replace(/\.[^/.]+$/, ''); // Remove extension for Phaser key
				const size = img.metadata?.width && img.metadata?.height
					? ` (${img.metadata.width}x${img.metadata.height})`
					: '';
				assetSection += `\n  - '${name}' (${img.filename}${size})`;
			});
			assetSection += '\n  Use in code: this.add.sprite(x, y, \'assetName\')';
		}

		if (audio.length > 0) {
			assetSection += '\n\nAudio (for sounds and music):';
			audio.forEach(snd => {
				const name = snd.filename.replace(/\.[^/.]+$/, '');
				assetSection += `\n  - '${name}' (${snd.filename})`;
			});
			assetSection += '\n  Use in code: this.sound.play(\'soundName\')';
		}

		assetSection += '\n\nIMPORTANT: These assets are already preloaded! Just use their names (without file extensions) in your game code.';
	}

	return SYSTEM_PROMPT + fileListSection + assetSection;
}
