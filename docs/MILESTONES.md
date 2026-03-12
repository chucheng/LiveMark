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

## Milestone 5 — Rich Elements

### Goals
- Image support: inline preview, drag-and-drop, paste
- Table support: visual rendering, cell navigation with Tab
- Code block syntax highlighting with Shiki
- Task list checkboxes (clickable)
- Link rendering (clickable when not editing)

### Deliverables
- Images render inline as actual images
- Dragging/pasting an image saves it and inserts Markdown
- Tables render as visual tables; Tab moves between cells
- Code blocks show syntax highlighting for common languages
- Task list items have clickable checkboxes
- Links are clickable (Cmd+click or when cursor is elsewhere)

### Files to Create/Modify
```
src/editor/
  nodeviews/
    image.ts                — Image NodeView with preview
    table.ts                — Table NodeView with cell navigation
    table-row.ts
    table-cell.ts
    link.ts                 — Link mark rendering
  plugins/
    drop-paste.ts           — Handle image drop/paste
    syntax-highlight.ts     — Shiki integration for code blocks
    table-commands.ts       — Tab navigation, cell management
  styles/
    images.css
    tables.css
    code-blocks.css
```

---

## Milestone 6 — Export

### Goals
- Export to standalone HTML (embedded CSS)
- Export to PDF via HTML-to-PDF pipeline (webview print-to-PDF)
- Copy as HTML to clipboard
- Export template with LiveMark styling

### Deliverables
- Command palette: "Export to HTML" → save dialog → HTML file
- Command palette: "Export to PDF" → save dialog → PDF file
- Command palette: "Copy as HTML" → rendered HTML on clipboard
- Command palette: "Copy as Markdown" → raw Markdown on clipboard (whole doc or selection)
- Exported HTML and PDF look like the editor's rendered output

### Files to Create/Modify
```
src-tauri/src/
  commands/
    export.rs               — HTML generation, PDF export via webview
src/
  export/
    html-template.ts        — HTML wrapper template
    export-css.ts           — Bundled CSS for export
  commands/
    export-commands.ts       — Export action handlers (includes Copy as Markdown)
```

---

## Milestone 7 — UI Polish and Themes

### Goals
- Light and dark themes with system-follow
- Command palette (Cmd+Shift+P)
- Find and replace (Cmd+F)
- Status bar (word count, line/column, encoding)
- Typography settings (font, size, line height)
- Source view toggle (Cmd+/ to view raw Markdown)
- Copy as Markdown (whole document or selection)
- Focus mode (dim non-current paragraphs)
- Overall visual polish and consistency
- Preferences storage

### Deliverables
- Polished light and dark themes
- Smooth theme transitions
- Full command palette with fuzzy search
- Find and replace with regex support
- Status bar with live statistics
- Settings panel for typography and behavior
- Source view mode: Cmd+/ toggles a read-only raw Markdown view
- Copy as Markdown: command palette action to copy raw Markdown to clipboard
- Focus mode toggle

### Files to Create/Modify
```
src/
  ui/
    CommandPalette.tsx       — Command palette component
    FindReplace.tsx          — Find/replace overlay
    StatusBar.tsx            — Status bar component
    SourceView.tsx           — Raw Markdown source view overlay
    Settings.tsx             — Settings panel
    ThemeProvider.tsx         — Theme management
  state/
    preferences.ts           — Preferences signals + persistence
    ui.ts                    — UI state signals
  commands/
    registry.ts              — Command registry
    all-commands.ts          — All registered commands
  styles/
    themes/
      light.css
      dark.css
    command-palette.css
    find-replace.css
    status-bar.css
src-tauri/src/
  commands/
    preferences.rs           — Read/write preferences
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
| M5 | Images load, tables navigate, code highlighting renders |
| M6 | HTML export produces valid HTML, styling matches editor |
| M7 | Theme switching works, command palette searches correctly, find works |

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
