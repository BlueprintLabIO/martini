# IDE Enhancements (deferred)

- Multi-select and drag-and-drop moves in the file tree (preserve nested folders, show drop targets, undoable).
- Undo stack with toast affordance for create/delete/rename/move (session-scoped, with future Yjs syncing).
- Theming tokens and dark mode surface: migrate hard-coded colors in `src/lib/styles/ide.css` to CSS variables and expose light/dark theme classes.
- Command palette / fuzzy actions for open/create/rename/delete with keyboard shortcuts (Ctrl/Cmd+P style).
- Context menu polish: “Reveal in OS” once host environment APIs are available.
