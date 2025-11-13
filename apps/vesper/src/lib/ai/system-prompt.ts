import { MARTINI_SDK_DOCS } from './api-docs-prompt';

/**
 * System Prompt - Ultra-Minimal, Martini-Focused
 */

export const SYSTEM_PROMPT = `You help create multiplayer Phaser games with Martini SDK!

DEFAULTS (don't ask):
- Multiplayer (Martini SDK always)
- 1 level to start
- Basic shapes (rectangles/circles - no art until working)
- 2-player cooperative

BE CONCISE:
- 1-2 sentences max, then code
- Make smart assumptions
- Act first, explain briefly after

CRITICAL MARTINI PATTERNS:

1. **Host = physics, Client = visual only**
   Shapes: this.add.rectangle() + this.physics.add.existing() + adapter.trackSprite()
   Sprites: this.physics.add.sprite() + adapter.trackSprite()
   Client: Same shape/sprite (NO physics) + adapter.registerRemoteSprite()

2. **Client MUST check state._sprites**
   if (!state._sprites) return;

3. **Client MUST call updateInterpolation()**
   if (!isHost) adapter.updateInterpolation();

4. **Store inputs in state**
   state.inputs = {}; // In setup
   state.inputs[ctx.targetId] = input; // In move action

5. **Host reads inputs to apply physics**
   for (const [pid, input] of Object.entries(state.inputs || {})) { ... }

6. **NO TEXTURES = Use Shapes (Common!)**
   Player: this.add.rectangle(x, y, 32, 32, 0xff0000)
   Platform: this.add.rectangle(x, y, w, h, 0x888888)
   Then: this.physics.add.existing(shape) to add physics

---

${MARTINI_SDK_DOCS}`;

/**
 * Planning Mode Prompt
 */
export const PLANNING_PROMPT = `You help plan game ideas!

Create markdown docs in /docs/:
- game-concept.md - Vision
- mechanics.md - Rules
- levels.md - Design

Be concise. Ask questions. Switch to Act mode to code.`;

/**
 * Build dynamic system prompt with project files and assets
 */
export function buildSystemPrompt(
	projectFiles: Array<{ path: string }>,
	projectAssets: Array<{ filename: string; fileType: string; assetType: string; sizeBytes: number; metadata?: any }> = [],
	planMode: boolean = false
): string {
	const fileListSection = projectFiles.length > 0
		? `\n\nPROJECT FILES:\n${projectFiles.map(f => f.path).join('\n')}`
		: '';

	let assetSection = '';
	if (projectAssets.length > 0) {
		const images = projectAssets.filter(a => a.fileType === 'image');
		const audio = projectAssets.filter(a => a.fileType === 'audio');

		assetSection = '\n\nASSETS:';

		if (images.length > 0) {
			assetSection += '\nImages: ' + images.map(img => {
				const name = img.filename.replace(/\.[^/.]+$/, '');
				return `'${name}'`;
			}).join(', ');
		}

		if (audio.length > 0) {
			assetSection += '\nAudio: ' + audio.map(snd => {
				const name = snd.filename.replace(/\.[^/.]+$/, '');
				return `'${name}'`;
			}).join(', ');
		}

		assetSection += '\n(Assets preloaded - just use names in code)';
	}

	const basePrompt = planMode ? PLANNING_PROMPT : SYSTEM_PROMPT;
	return basePrompt + fileListSection + assetSection;
}
