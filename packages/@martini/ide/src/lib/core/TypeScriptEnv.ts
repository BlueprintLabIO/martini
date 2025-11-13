/**
 * TypeScriptEnvironment - @typescript/vfs wrapper for type checking
 *
 * Provides TypeScript language services for autocomplete, type errors, etc.
 */

import {
	createSystem,
	createVirtualTypeScriptEnvironment,
	createFSBackedSystem
} from '@typescript/vfs';
import ts from 'typescript';
import type { VirtualFileSystem } from './VirtualFS';

export interface TypeDiagnostic {
	file: string;
	line: number;
	column: number;
	message: string;
	severity: 'error' | 'warning' | 'info';
	code: number;
}

export class TypeScriptEnvironment {
	private env: ReturnType<typeof createVirtualTypeScriptEnvironment> | null = null;
	private compilerOptions: ts.CompilerOptions;

	constructor() {
		// Default compiler options
		this.compilerOptions = {
			target: ts.ScriptTarget.ES2020,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			strict: true,
			esModuleInterop: true,
			skipLibCheck: true,
			allowSyntheticDefaultImports: true,
			resolveJsonModule: true,
			isolatedModules: true,
			lib: ['ES2020', 'DOM']
		};
	}

	/**
	 * Initialize TypeScript environment with files from VFS
	 */
	async initialize(vfs: VirtualFileSystem): Promise<void> {
		// Create a map of files for TypeScript
		const fsMap = new Map<string, string>();

		// Add user files
		for (const [path, content] of Object.entries(vfs.getAllFiles())) {
			fsMap.set(path, content);
		}

		// Add default lib files
		// Note: In a real implementation, you'd fetch lib.d.ts files
		// For now, we'll use a minimal setup

		// Create virtual file system
		const system = createSystem(fsMap);

		// Create TypeScript environment
		const rootFiles = vfs.getFilePaths();
		this.env = createVirtualTypeScriptEnvironment(system, rootFiles, ts, this.compilerOptions);
	}

	/**
	 * Update file content and re-check
	 */
	updateFile(path: string, content: string): void {
		if (!this.env) {
			throw new Error('TypeScript environment not initialized');
		}

		this.env.createFile(path, content);
	}

	/**
	 * Get type diagnostics for a file
	 */
	getDiagnostics(filePath: string): TypeDiagnostic[] {
		if (!this.env) {
			return [];
		}

		try {
			const languageService = this.env.languageService;

			// Get semantic diagnostics (type errors)
			const semanticDiagnostics = languageService.getSemanticDiagnostics(filePath);

			// Get syntactic diagnostics (syntax errors)
			const syntacticDiagnostics = languageService.getSyntacticDiagnostics(filePath);

			// Combine and format diagnostics
			const allDiagnostics = [...syntacticDiagnostics, ...semanticDiagnostics];

			return allDiagnostics.map((diagnostic) => {
				const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

				let line = 1;
				let column = 1;

				if (diagnostic.start !== undefined && diagnostic.file) {
					const lineAndChar = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
					line = lineAndChar.line + 1; // 1-indexed
					column = lineAndChar.character + 1; // 1-indexed
				}

				return {
					file: filePath,
					line,
					column,
					message,
					severity: getSeverity(diagnostic.category),
					code: diagnostic.code
				};
			});
		} catch (error) {
			console.error('Error getting diagnostics:', error);
			return [];
		}
	}

	/**
	 * Get all diagnostics for all files
	 */
	getAllDiagnostics(vfs: VirtualFileSystem): TypeDiagnostic[] {
		const allDiagnostics: TypeDiagnostic[] = [];

		for (const filePath of vfs.getFilePaths()) {
			const diagnostics = this.getDiagnostics(filePath);
			allDiagnostics.push(...diagnostics);
		}

		return allDiagnostics;
	}

	/**
	 * Get completion suggestions at a position
	 * (Phase 1: Basic implementation, can be enhanced later)
	 */
	getCompletions(filePath: string, position: number): ts.CompletionEntry[] {
		if (!this.env) {
			return [];
		}

		try {
			const completions = this.env.languageService.getCompletionsAtPosition(
				filePath,
				position,
				undefined
			);

			return completions?.entries || [];
		} catch (error) {
			console.error('Error getting completions:', error);
			return [];
		}
	}

	/**
	 * Cleanup resources
	 */
	dispose(): void {
		this.env = null;
	}
}

/**
 * Convert TypeScript diagnostic category to severity
 */
function getSeverity(category: ts.DiagnosticCategory): 'error' | 'warning' | 'info' {
	switch (category) {
		case ts.DiagnosticCategory.Error:
			return 'error';
		case ts.DiagnosticCategory.Warning:
			return 'warning';
		case ts.DiagnosticCategory.Suggestion:
		case ts.DiagnosticCategory.Message:
			return 'info';
		default:
			return 'info';
	}
}
