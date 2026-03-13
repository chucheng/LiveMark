# LiveMark — Milestones

## Milestone 1 — Project Scaffold

### Goals
- Set up Tauri 2.x project with SolidJS frontend
- Configure build tooling (Vite, TypeScript, pnpm)
- Integrate ProseMirror with a minimal schema
- Verify the full stack works: Tauri window shows a ProseMirror editor
- Set up project structure and linting

### Deliverables
- Working Tauri app that opens a window with a basic text editor
- Editable ProseMirror instance with paragraph-only schema
- Hot-reload development workflow functional

### Files to Create
```
package.json
pnpm-workspace.yaml
tsconfig.json
vite.config.ts
index.html
src/
  main.tsx                  — SolidJS entry point
  App.tsx                   — Root component, mounts editor
  editor/
    editor.ts               — ProseMirror initialization
    schema.ts               — Minimal schema (doc, paragraph, text)
  styles/
    reset.css               — CSS reset
    editor.css              — Basic editor styling
    variables.css           — CSS custom properties
src-tauri/
  Cargo.toml
  tauri.conf.json
  src/
    main.rs                 — Tauri entry point
```

---

## Milestone 2 — Core Editor Engine

### Goals
- Implement full Markdown schema (all block nodes and inline marks)
- Build Markdown parser (markdown-it → ProseMirror document)
- Build Markdown serializer (ProseMirror document → Markdown string)
- Add input rules for Markdown shortcuts (e.g., `# ` → heading)
- Add keymaps (bold, italic, undo/redo)
- Verify round-trip: parse → edit → serialize produces valid Markdown

### Deliverables
- ProseMirror editor that understands all Markdown elements
- Typing `# ` at line start creates a heading node
- Typing `**text**` creates bold text
- Cmd+B toggles bold, Cmd+I toggles italic
- Undo/redo works

### Files to Create/Modify
```
src/editor/
  schema.ts                 — Full schema (headings, lists, code blocks, tables, etc.)
  input-rules.ts            — Markdown auto-transforms
  keymaps.ts                — Keyboard shortcuts
  markdown/
    parser.ts               — markdown-it → PM document
    serializer.ts           — PM document → Markdown string
  plugins/
    history.ts              — Undo/redo configuration
```

---

## Milestone 3 — Live Markdown Rendering

### Goals
- Implement NodeViews for all block elements with dual-mode rendering
- Build the live-render plugin (cursor-aware rendering transitions)
- Implement inline mark decoration system (show/hide `**`, `*`, etc.)
- Ensure cursor position is preserved during transitions
- Ensure no layout shift during rendering transitions

### Deliverables
- Headings render as styled headings when cursor is elsewhere
- Bold/italic text appears styled with markers hidden
- Code blocks show syntax-highlighted content
- Blockquotes render with left border
- Lists render with proper bullets/numbers
- Moving cursor into any element reveals raw Markdown syntax
- Moving cursor out renders the element

### Files to Create/Modify
```
src/editor/
  nodeviews/
    heading.ts              — Heading NodeView (dual mode)
    code-block.ts           — Code block NodeView
    blockquote.ts           — Blockquote NodeView
    bullet-list.ts          — Bullet list NodeView
    ordered-list.ts         — Ordered list NodeView
    list-item.ts            — List item NodeView
    horizontal-rule.ts      — HR NodeView
    task-list-item.ts       — Task list checkbox
  plugins/
    live-render.ts          — Cursor tracking + mode switching
    inline-decorations.ts   — Show/hide inline mark syntax
  styles/
    nodeviews.css           — Styles for rendered elements
    transitions.css         — Render/edit transition animations
```

---

## Milestone 4 — File Operations

### Goals
- Implement open file (native dialog → read → parse → display)
- Implement save file (serialize → write)
- Implement save-as
- Implement new file
- Track modified state (dirty flag)
- Unsaved changes confirmation dialog
- Implement title bar with filename + modified indicator
- Command-line argument: `livemark file.md`

### Deliverables
- Cmd+O opens a file picker and loads a Markdown file
- Cmd+S saves the current file
- Cmd+Shift+S save-as to new location
- Cmd+N creates a new empty document
- Title bar shows filename and `●` when modified
- Closing with unsaved changes prompts save dialog
- Can open a file from the command line

### Files to Create/Modify
```
src-tauri/src/
  commands/
    file.rs                 — open_file, save_file, pick_file, pick_save_path
  main.rs                   — Register commands, handle CLI args
src/
  state/
    document.ts             — File path, modified flag, title signals
  ui/
    TitleBar.tsx             — Title bar component
    Dialogs.tsx              — Save confirmation dialog
  commands/
    file-commands.ts         — Open, save, new file handlers
```

---

## Milestone 5 — Stabilization & Correctness

### Goals
- Fix all known correctness bugs before adding new features
- Set up test infrastructure (vitest)
- Ensure Markdown round-trip fidelity with a comprehensive test suite

### Deliverables
- Table tokens disabled in parser (no schema nodes → silent data loss)
- `setMarkdown()` resets EditorState instead of dispatching (prevents cross-file undo)
- `confirmUnsavedChanges()` supports 3 outcomes: Save, Don't Save, Cancel
- All file operations have try/catch with error dialogs
- 32 round-trip tests passing (headings, inline marks, lists, code blocks, blockquotes, images, hard breaks, mixed documents)

### Files Created/Modified
```
vitest.config.ts                                — Test configuration
src/editor/markdown/parser.ts                   — Removed .enable("table")
src/editor/editor.ts                            — Rewrote setMarkdown() to reset state
src/commands/file-commands.ts                   — 3-outcome confirm, try/catch error dialogs
src/editor/markdown/__tests__/round-trip.test.ts — Round-trip test suite
```

---

## Milestone 6 — Rich Elements ✓

### Goals
- Task list checkboxes (clickable)
- Clickable links (Cmd+click opens in browser)
- Image support: inline preview, drag-and-drop, paste
- Code block syntax highlighting with highlight.js
- Table support: visual rendering, cell navigation with Tab

### Deliverables
- Task list items with clickable checkboxes (custom markdown-it plugin for parsing)
- Cmd+click opens links in default browser via tauri-plugin-shell
- Images render inline with Tauri asset protocol for local paths
- Drag/paste image files saves to disk via Rust command and inserts node
- Code blocks show syntax highlighting (14 languages) when cursor is outside
- Tables parse/serialize with GFM format; Tab navigates between cells
- 37 round-trip tests passing (5 new: task list + table tests)

### Files Created/Modified
```
src/editor/markdown/task-list-plugin.ts  — Custom markdown-it plugin for task list tokens
src/editor/nodeviews/task-list-item.ts   — Task list item NodeView with checkbox
src/editor/nodeviews/image.ts            — Image inline preview NodeView
src/editor/plugins/link-click.ts         — Cmd+click opens links in browser
src/editor/plugins/image-drop-paste.ts   — Image drag-and-drop / paste handler
src/editor/highlight.ts                  — highlight.js wrapper (14 languages)
src-tauri/src/commands/image.rs          — Rust save_image command
src/editor/schema.ts                     — Added task_list, task_list_item, table nodes
src/editor/markdown/parser.ts            — Task list plugin, table support, thead/tbody strip
src/editor/markdown/serializer.ts        — Added serializers for 6 new nodes
src/editor/nodeviews/index.ts            — Registered task_list_item, image
src/editor/nodeviews/code-block.ts       — Added highlight overlay
src/editor/input-rules.ts               — Task list input rules
src/editor/keymaps.ts                    — Tab/Shift-Tab context-aware (tables + lists)
src/editor/editor.ts                     — Registered linkClick, imageDropPaste, tableEditing plugins
src/styles/live-render.css               — Task list, image, table, code highlight styles
src/editor/markdown/__tests__/round-trip.test.ts — 5 new round-trip tests
src-tauri/Cargo.toml                     — Added tauri-plugin-shell
src-tauri/src/main.rs                    — Registered shell plugin, save_image command
src-tauri/capabilities/default.json      — Added shell:default, shell:allow-open
package.json                             — Added highlight.js, prosemirror-tables, @tauri-apps/plugin-shell
```

---

## Milestone 7 — Export ✓

### Goals
- Export to standalone HTML (embedded CSS)
- Export to PDF via system print dialog (Save as PDF)
- Copy as HTML to clipboard
- Copy as Markdown to clipboard
- Export template with LiveMark styling

### Deliverables
- Cmd+Shift+E → save dialog → standalone HTML file with bundled CSS
- Cmd+P → system print dialog (Save as PDF via hidden iframe)
- Cmd+Shift+C → rendered HTML content on clipboard
- Cmd+Alt+C → raw Markdown on clipboard
- Exported HTML includes full LiveMark styling (typography, code highlighting, tables, task lists)
- Uses @tauri-apps/plugin-clipboard-manager for clipboard access
- Reuses existing markdown-it instance and write_file Tauri command

### Files Created/Modified
```
src/export/html-template.ts             — HTML document template generation (generateHTML, renderHTMLBody)
src/export/export-css.ts                — Bundled CSS for export (typography, code, tables, task lists, print)
src/commands/export-commands.ts         — Export action handlers (exportHTML, exportPDF, copyAsHTML, copyAsMarkdown)
src/editor/markdown/parser.ts           — Exported md instance for HTML rendering
src/ui/App.tsx                          — Added export keyboard shortcuts + editor ref
src-tauri/Cargo.toml                    — Added tauri-plugin-clipboard-manager
src-tauri/src/main.rs                   — Registered clipboard-manager plugin
src-tauri/capabilities/default.json     — Added clipboard-manager permissions
package.json                            — Added @tauri-apps/plugin-clipboard-manager
```

---

## Milestone 8 — UI Polish and Themes ✓

### Goals
- Light and dark themes with system-follow
- Command palette (Cmd+Shift+P)
- Find and replace (Cmd+F)
- Status bar (word count, line/column, encoding)
- Source view toggle (Cmd+/ to view raw Markdown)
- Focus mode (dim non-current paragraphs)
- Preferences persistence

### Deliverables
- Cmd+Shift+T cycles light → dark → system theme (with CSS variable swap)
- Cmd+Shift+P opens command palette with fuzzy search across all registered commands
- Cmd+F opens find bar with regex/case-sensitive toggles, replace, replace all
- Cmd+/ toggles read-only raw Markdown source view
- Cmd+Shift+F toggles focus mode (dims non-active blocks via opacity)
- Enhanced status bar: line/column, selection count, word count, UTF-8, theme toggle button
- Preferences auto-saved to Tauri app_config_dir/preferences.json (debounced)
- All actions registered in command registry, accessible via palette

### Files Created/Modified
```
src/state/theme.ts                     — Theme signals (light/dark/system), system media query listener
src/state/preferences.ts               — Preferences signals + debounced Tauri persistence
src/state/ui.ts                        — UI state signals (palette, find, source view)
src/ui/StatusBar.tsx                   — Enhanced status bar component
src/ui/CommandPalette.tsx              — Command palette overlay with fuzzy search
src/ui/FindReplace.tsx                 — Find & replace bar
src/ui/SourceView.tsx                  — Read-only raw Markdown view
src/commands/registry.ts               — Command registry with fuzzy search
src/commands/all-commands.ts           — All registered commands
src/editor/plugins/find-replace.ts     — ProseMirror search decoration plugin
src/editor/editor.ts                   — Added onSelectionChange callback, find-replace plugin
src/ui/App.tsx                         — Wired all M8 components and keyboard shortcuts
src/main.tsx                           — Added new CSS imports
src/styles/status-bar.css              — Status bar styles
src/styles/command-palette.css         — Command palette styles
src/styles/find-replace.css            — Find/replace bar styles
src/styles/source-view.css             — Source view styles
src/styles/editor.css                  — Focus mode CSS rules
src/styles/app.css                     — Removed old statusbar styles (moved to status-bar.css)
src-tauri/src/commands/preferences.rs  — Rust read/write preferences (atomic)
src-tauri/src/commands/mod.rs          — Added preferences module
src-tauri/src/main.rs                  — Registered preference commands
```

---

## Testing Strategy (Across All Milestones)

Each milestone includes tests:

| Milestone | Tests |
|---|---|
| M1 | Build succeeds, app opens, editor renders |
| M2 | Schema validates, parser round-trips, input rules fire correctly |
| M3 | NodeViews render both modes, cursor transitions work, no layout shift |
| M4 | File open/save/save-as work, modified flag tracks correctly |
| M5 | 32 round-trip tests, bug fixes verified manually |
| M6 | 37 round-trip tests (task list + table), manual verification of all rich elements |
| M7 | HTML export produces valid HTML, styling matches editor |
| M8 | Theme switching works, command palette searches correctly, find works |

### Test Files
```
tests/
  unit/
    schema.test.ts
    parser.test.ts
    serializer.test.ts
    input-rules.test.ts
  integration/
    editor.test.ts
    file-operations.test.ts
    rendering.test.ts
  e2e/
    app.test.ts
    editing.test.ts
    file-workflow.test.ts
```
