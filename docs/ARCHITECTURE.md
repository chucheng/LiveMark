# LiveMark — Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Tauri Shell                        │
│  ┌───────────────────────────────────────────────┐  │
│  │              Frontend (WebView)                │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │          UI Layer (SolidJS)              │  │  │
│  │  │  Title Bar · Status Bar · Command Palette│ │  │
│  │  └──────────────┬──────────────────────────┘  │  │
│  │                 │                             │  │
│  │  ┌──────────────▼──────────────────────────┐  │  │
│  │  │        Editor Core (ProseMirror)        │  │  │
│  │  │  Schema · NodeViews · Input Rules ·     │  │  │
│  │  │  Keymaps · Plugins · Decorations        │  │  │
│  │  └──────────────┬──────────────────────────┘  │  │
│  │                 │                             │  │
│  │  ┌──────────────▼──────────────────────────┐  │  │
│  │  │      Markdown Bridge (markdown-it)      │  │  │
│  │  │  Parse (file→PM) · Serialize (PM→file)  │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  │                                               │  │
│  │  ┌────────────────────────────────────────┐   │  │
│  │  │         State Store (Signals)          │   │  │
│  │  │  Document · UI · Preferences           │   │  │
│  │  └────────────────────────────────────────┘   │  │
│  └───────────────────┬───────────────────────────┘  │
│                      │ Tauri IPC (Commands)          │
│  ┌───────────────────▼───────────────────────────┐  │
│  │             Backend (Rust)                     │  │
│  │  File I/O · Export · Preferences · OS APIs     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Module Breakdown

### 1. Editor Core (`src/editor/`)

The heart of LiveMark. Built on ProseMirror.

```
src/editor/
  schema.ts          — Document schema (nodes + marks)
  nodeviews/         — Custom renderers for each Markdown element
    heading.ts
    code-block.ts
    image.ts
    table.ts
    blockquote.ts
    list.ts
    task-list.ts
    horizontal-rule.ts
  input-rules.ts     — Auto-transforms (e.g., "# " → heading)
  keymaps.ts         — Keyboard shortcuts
  plugins/           — ProseMirror plugins
    live-render.ts   — Show/hide syntax based on cursor position
    placeholder.ts   — Empty document placeholder
    drop-paste.ts    — Handle image drop/paste
  markdown/
    parser.ts        — markdown-it → ProseMirror document
    serializer.ts    — ProseMirror document → Markdown string
  editor.ts          — Editor initialization and lifecycle
```

### 2. UI Shell (`src/ui/`)

Thin SolidJS layer for non-editor UI elements.

```
src/ui/
  App.tsx            — Root component
  TitleBar.tsx       — File name, modified indicator
  StatusBar.tsx      — Word count, position, encoding
  CommandPalette.tsx — Cmd+Shift+P action search
  FindReplace.tsx    — Search overlay
  Dialogs.tsx        — Save confirmation, settings
  ThemeProvider.tsx   — Theme context and switching
```

### 3. State Management (`src/state/`)

SolidJS signals for reactive state. No external state library.

```
src/state/
  document.ts        — Current file path, modified flag, title
  editor.ts          — Editor instance reference
  preferences.ts     — User settings (theme, font, etc.)
  ui.ts              — UI state (palette open, find bar, etc.)
```

### 4. Backend (Rust) (`src-tauri/`)

Tauri commands for operations that require native capabilities.

```
src-tauri/
  src/
    main.rs          — Tauri app entry point
    commands/
      file.rs        — Open, save, save-as, recent files
      export.rs      — HTML/PDF export
      preferences.rs — Read/write preferences file
    utils/
      encoding.rs    — File encoding detection
```

## Data Flow

### Opening a File

```
User triggers "Open File"
  → Tauri: native file dialog → returns file path
  → Rust: read file bytes, detect encoding, return string
  → Frontend: markdown-it parses Markdown string → ProseMirror document
  → ProseMirror: renders document with NodeViews
  → User sees rendered Markdown
```

### Typing and Live Rendering

```
User types a character
  → ProseMirror input handler processes keystroke
  → Input rules check for Markdown patterns (e.g., "# " at line start)
  → If pattern matches: transaction transforms node type
  → live-render plugin: checks cursor position
      → Nodes under cursor: show raw syntax (via decoration)
      → Nodes away from cursor: show rendered view (via NodeView)
  → DOM updates surgically (only changed nodes)
  → State store: mark document as modified
```

### Saving a File

```
User presses Cmd+S
  → Frontend: serialize ProseMirror document → Markdown string
  → Tauri IPC: invoke "save_file" command with content + path
  → Rust: write string to file (preserve encoding + line endings)
  → Return success
  → Frontend: clear modified flag, show "Saved" indicator
```

## ProseMirror Schema Design

The schema defines the document model. Each Markdown element maps to a ProseMirror node or mark type.

### Block Nodes

| Node | Markdown | Attrs |
|---|---|---|
| `doc` | (root) | — |
| `paragraph` | Plain text | — |
| `heading` | `# ... ######` | `level: 1-6` |
| `code_block` | ````lang ... ```` | `language: string` |
| `blockquote` | `> ...` | — |
| `bullet_list` | `- / * / +` | — |
| `ordered_list` | `1. 2. 3.` | `start: number` |
| `list_item` | (list child) | — |
| `task_list_item` | `- [ ] / - [x]` | `checked: boolean` |
| `table` | `| ... |` | — |
| `table_row` | (table child) | — |
| `table_cell` | (row child) | `alignment: left/center/right` |
| `table_header` | (header row child) | `alignment` |
| `horizontal_rule` | `---` | — |
| `image` | `![alt](src)` | `src, alt, title` |

### Inline Marks

| Mark | Markdown | Attrs |
|---|---|---|
| `strong` | `**...**` | — |
| `em` | `*...*` | — |
| `code` | `` `...` `` | — |
| `strikethrough` | `~~...~~` | — |
| `link` | `[text](url)` | `href, title` |

## Cursor-Aware Rendering

This is the core UX challenge. The system must:

1. Know which ProseMirror node(s) the cursor is currently inside
2. For those nodes: show raw Markdown syntax
3. For all other nodes: show rendered output
4. Transition between these states without layout shift or cursor jump

### Implementation Strategy

**NodeViews** handle rendering for each block element. Each NodeView has two render modes:

- **Rendered mode**: Shows the formatted output (e.g., bold text, styled heading)
- **Editing mode**: Shows the raw Markdown syntax with appropriate styling

The `live-render` plugin listens to cursor position changes (`selectionChanged` event). On each change:

1. Determine which top-level node the cursor is in
2. If the node changed: tell the old node's NodeView to switch to rendered mode
3. Tell the new node's NodeView to switch to editing mode
4. For inline marks (bold, italic), use ProseMirror decorations to show/hide markers

### Layout Stability

To prevent layout shifts during mode transitions:

- Both modes occupy the same vertical space (CSS carefully matched)
- Transitions use opacity/transform, not display/height changes
- When switching modes, the cursor position is recalculated and restored
- The scroll position is locked during transitions

## Performance Architecture

### Viewport-Based Rendering

For large files, only nodes in and near the viewport are fully rendered. Nodes far from the viewport use lightweight placeholder rendering.

ProseMirror's built-in `nodeViews` already support lazy rendering. We enhance this with:

1. IntersectionObserver on each block-level NodeView
2. Nodes outside viewport render as simple `<div>` with correct height
3. When scrolled into view, full rendering activates

### Incremental Parsing

When opening a file, the Markdown parser runs on the full document. But during editing:

- ProseMirror's transaction system applies changes incrementally
- No re-parsing of the full document on each keystroke
- Input rules handle Markdown pattern detection locally

### Debounced Operations

Non-critical operations are debounced:

- Word count: updated every 500ms
- Auto-save: configurable interval (default 30s)
- Status bar updates: batched per animation frame

## Extension Points

While v1 ships no public plugin API, the architecture supports future extensibility:

1. **Schema extensions**: New node/mark types can be registered
2. **ProseMirror plugins**: Standard PM plugin interface
3. **NodeView registry**: New rendering strategies for any node type
4. **Command registry**: New commands for the command palette
5. **Theme system**: CSS custom properties for full theme control
6. **Export pipelines**: Pluggable export formats

## Security Model

Tauri's security model is strict by default:

- WebView has no direct file system access
- All file operations go through Tauri commands
- Tauri's `allowlist` restricts which commands are available
- CSP headers prevent script injection
- No `eval()`, no dynamic script loading
- Image loading restricted to local files and data URIs
