export type FileNode = {
	path: string;
	name: string;
	type: 'file' | 'folder';
	children?: FileNode[];
};

class FileTreeStore {
	files = $state<FileNode[]>([]);
	activeFile = $state<string | null>(null);

	buildTree(filePaths: string[]) {
		const root: FileNode[] = [];

		filePaths.forEach((path) => {
			const parts = path.split('/').filter(Boolean);
			let current = root;

			parts.forEach((part, i) => {
				const isFile = i === parts.length - 1;
				let node = current.find((n) => n.name === part);

				if (!node) {
					node = {
						path: '/' + parts.slice(0, i + 1).join('/'),
						name: part,
						type: isFile ? 'file' : 'folder',
						children: isFile ? undefined : []
					};
					current.push(node);
				}

				if (!isFile && node.children) {
					current = node.children;
				}
			});
		});

		this.files = root;
	}

	setActiveFile(path: string) {
		this.activeFile = path;
	}
}

export const fileTree = new FileTreeStore();
