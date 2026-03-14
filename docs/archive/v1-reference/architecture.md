# LiveMark — Architecture & System Design

This document describes the implemented architecture of LiveMark v1.x. It covers the high-level system structure, module breakdown, data flows, the ProseMirror document model, live rendering system, state management, file I/O, and all major subsystems.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Tauri Shell                       │
│  ┌───────────────────────────────────────────────┐  │
│  │              Frontend (WebView)                │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │          UI Layer (SolidJS)              │  │  │
│  │  │  Title Bar · Status Bar · Command Palette│  │  │
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
│  │  File I/O · Preferences · Image Save · OS APIs│  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Module Breakdown

### 1. Editor Core (`src/editor/`)

The heart of LiveMark. Built on ProseMirror.

```
src/editor/
  schema.ts              — Document schema (all block nodes + inline marks)
  editor.ts              — Editor initialization, getMarkdown/setMarkdown API
  highlight.ts           — highlight.js wrapper (14 languages)
  input-rules.ts         — Auto-transforms (# heading, **bold**, etc.)
  keymaps.ts             — Keyboard shortcuts (bold, italic, lists, undo/redo)
  nodeviews/             — Custom renderers for each Markdown element
    heading.ts           — Heading NodeView (dual render/edit mode)
    code-block.ts        — Code block with syntax highlight overlay
    blockquote.ts        — Blockquote NodeView
    bullet-list.ts       — Bullet list NodeView
    ordered-list.ts      — Ordered list NodeView
    list-item.ts         — List item NodeView
    horizontal-rule.ts   — Horizontal rule NodeView
    task-list-item.ts    — Task list checkbox NodeView
    image.ts             — Image inline preview NodeView
    math-block.ts        — Math block dual-layer NodeView (KaTeX)
    math-inline.ts       — Math inline atom NodeView (KaTeX)
  plugins/
    live-render.ts       — Cursor tracking + active block detection + inline decorations
    find-replace.ts      — Search decoration plugin + match navigation
    placeholder.ts       — Empty document placeholder
    link-click.ts        — Cmd+click opens links in browser
    image-drop-paste.ts  — Image drag-drop/paste handler
    trailing-paragraph.ts — Ensures doc ends with paragraph
  markdown/
    parser.ts            — markdown-it → ProseMirror document
    serializer.ts        — ProseMirror document → Markdown string
    task-list-plugin.ts  — Custom markdown-it plugin for task list tokens
    math-plugin.ts       — Custom markdown-it plugin for math ($, $$)
```

### 2. UI Shell (`src/ui/`)

Thin SolidJS layer for non-editor UI elements.

```
src/ui/
  App.tsx               — Root component (wires all UI + keyboard shortcuts)
  StatusBar.tsx         — Line/col, selection, word count, encoding, theme toggle
  CommandPalette.tsx    — Command palette overlay (Cmd+Shift+P, fuzzy search)
  FindReplace.tsx       — Find & replace bar (regex, case-sensitive, replace all)
  SourceView.tsx        — Read-only raw Markdown view (Cmd+/)
  AboutModal.tsx        — About dialog (version info)
  ReviewPanel.tsx       — Document review panel (quality checks)
```

### 3. State Management (`src/state/`)

SolidJS signals for reactive state. No external state library.

```
src/state/
  document.ts           — File path, modified flag, fileName signals
  theme.ts              — Light/dark/system theme management
  preferences.ts        — Preferences persistence via Tauri IPC (debounced)
  ui.ts                 — UI state signals (palette, find, source view)
```

### 4. Commands (`src/commands/`)

```
src/commands/
  file-commands.ts      — Open, save, save-as, new file handlers
  export-commands.ts    — Export HTML/PDF, copy as HTML/Markdown
  registry.ts           — Command registry with fuzzy search
  all-commands.ts       — All registered commands
```

### 5. Export (`src/export/`)

```
src/export/
  html-template.ts      — HTML document template generation
  export-css.ts         — Bundled CSS for export (typography, code, tables, print)
```

### 6. Backend (Rust) (`src-tauri/`)

Tauri commands for operations requiring native capabilities.

```
src-tauri/src/
  main.rs               — Tauri entry point, plugin registration, CLI args
  commands/
    file.rs             — read_file, write_file (atomic rename)
    image.rs            — save_image command
    preferences.rs      — read/write preferences (atomic)
```

---

## Document Model

The document is represented as a ProseMirror `Node` tree — the single source of truth during editing.

```
doc
├── heading (level: 1)
│   └── text "My Document"
├── paragraph
│   ├── text "This is "
│   ├── text "bold" [strong]
│   └── text " text."
├── code_block (language: "javascript")
│   └── text "const x = 1;"
├── bullet_list
│   ├── list_item
│   │   └── paragraph
│   │       └── text "Item one"
│   └── list_item
│       └── paragraph
│           └── text "Item two"
└── paragraph
    └── text "Final paragraph."
```

### ProseMirror Schema

The schema maps 1:1 to Markdown elements.

#### Block Nodes

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
| `task_list` | (task list container) | — |
| `task_list_item` | `- [ ] / - [x]` | `checked: boolean` |
| `table` | `\| ... \|` | — |
| `table_row` | (table child) | — |
| `table_cell` | (row child) | `alignment: left/center/right` |
| `table_header` | (header row child) | `alignment` |
| `horizontal_rule` | `---` | — |
| `image` | `![alt](src)` | `src, alt, title` |
| `math_block` | `$$...$$` | — |
| `math_inline` | `$...$` | — |

#### Inline Marks

| Mark | Markdown | Attrs |
|---|---|---|
| `strong` | `**...**` | — |
| `em` | `*...*` | — |
| `code` | `` `...` `` | — |
| `strikethrough` | `~~...~~` | — |
| `link` | `[text](url)` | `href, title` |

---

## Markdown Bridge

### Parsing (file → editor)

```
Markdown string
  → markdown-it tokenize (with custom plugins: task-list, math)
  → Token stream
  → Custom token-to-PM-node mapper (prosemirror-markdown infrastructure)
  → ProseMirror document Node
```

Custom markdown-it plugins handle task lists and math syntax ($, $$) that aren't part of standard CommonMark/GFM.

### Serialization (editor → file)

```
ProseMirror document Node
  → Walk tree
  → Each node type → Markdown syntax string
  → Join with appropriate line breaks
  → Markdown string
```

### Round-Trip Fidelity

Opening a Markdown file and saving without edits must produce structurally identical output. The serializer preserves list marker style, blank line patterns, and formatting conventions.

---

## Live Rendering System

### State Machine per Node

Each block-level node has two visual states:

```
┌──────────┐     cursor enters      ┌──────────┐
│ RENDERED │ ──────────────────────→ │ EDITING  │
│          │ ←────────────────────── │          │
└──────────┘     cursor leaves       └──────────┘
```

**RENDERED state:** Markdown syntax hidden, content styled (bold text, heading sizes, etc.). Click transitions to EDITING.

**EDITING state:** Raw Markdown syntax visible, standard text editing behavior, cursor visible.

### Implementation

**NodeViews** handle rendering for each block element. Each has two render modes:
- **Rendered mode**: Formatted output (styled heading, highlighted code, etc.)
- **Editing mode**: Raw Markdown syntax with appropriate styling

The `live-render` ProseMirror plugin observes cursor position changes. On each selection change:
1. Determine which top-level node the cursor is in
2. Tell the old node's NodeView to switch to rendered mode
3. Tell the new node's NodeView to switch to editing mode
4. For inline marks, use decorations to show/hide syntax markers

### Inline Mark Handling

Inline marks (bold, italic, code, strikethrough, links) don't have their own NodeViews. Strategy:
1. ProseMirror stores marks as semantic annotations, not literal `**` characters
2. When the cursor is inside a marked range, **decorations** show syntax markers (`**` before/after bold)
3. When the cursor leaves, decorations are removed, text appears styled

### Code Block Dual-Layer Architecture

Code blocks use a dual-layer approach:
- **Editable layer**: ProseMirror's `contentDOM` for text editing
- **Highlight overlay**: highlight.js-rendered syntax highlighting positioned over the editable layer
- In RENDERED mode: overlay visible (colored syntax), editable text transparent
- In EDITING mode: overlay hidden, editable text visible with monospace styling

### Layout Stability

To prevent layout shifts during mode transitions:
- Both modes occupy the same vertical space (CSS carefully matched)
- Transitions use opacity/transform, not display/height changes
- Cursor position is preserved during transitions via ProseMirror position mapping

---

## Data Flows

### Opening a File

```
User triggers "Open File" (Cmd+O)
  → Tauri: native file dialog → returns file path
  → Rust: read file bytes, return UTF-8 string
  → Frontend: markdown-it parses Markdown → ProseMirror document
  → Editor: replaces state (not dispatch — prevents cross-file undo)
  → NodeViews render document
  → Title bar shows filename
```

### Typing and Live Rendering

```
User types a character
  → ProseMirror input handler processes keystroke
  → Input rules check for Markdown patterns (e.g., "# " at line start)
  → If pattern matches: transaction transforms node type
  → live-render plugin checks cursor position
      → Node under cursor: show raw syntax (EDITING mode)
      → Other nodes: show rendered view (RENDERED mode)
  → DOM updates surgically (only changed nodes)
  → State store: mark document as modified
```

### Saving a File

```
User presses Cmd+S
  → Frontend: serialize ProseMirror document → Markdown string
  → Tauri IPC: invoke "write_file" with content + path
  → Rust: write to temp file, then atomic rename to target
  → Return success
  → Frontend: clear modified flag, update status bar
```

---

## State Management

### Signal Architecture

SolidJS signals provide reactive state with no external library:

```typescript
// Document state (src/state/document.ts)
const [filePath, setFilePath] = createSignal<string | null>(null);
const [isModified, setIsModified] = createSignal(false);
const [fileName, setFileName] = createSignal("Untitled");

// UI state (src/state/ui.ts)
const [isPaletteOpen, setIsPaletteOpen] = createSignal(false);
const [isFindOpen, setIsFindOpen] = createSignal(false);
const [isSourceView, setIsSourceView] = createSignal(false);

// Theme (src/state/theme.ts)
const [theme, setTheme] = createSignal<"light" | "dark" | "system">("system");

// Preferences (src/state/preferences.ts) — persisted via Tauri IPC
const [prefs, setPrefs] = createStore<Preferences>({ ... });
```

Signals compose naturally with SolidJS's reactivity. No need for Redux/MobX/Zustand for a single-document editor.

---

## File System Integration

### Tauri Commands

```rust
#[tauri::command]
fn read_file(path: String) -> Result<String, String>

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String>

#[tauri::command]
fn save_image(dir: String, name: String, data: Vec<u8>) -> Result<String, String>

#[tauri::command]
fn read_preferences() -> Result<Preferences, String>

#[tauri::command]
fn write_preferences(prefs: Preferences) -> Result<(), String>
```

File dialogs use `tauri-plugin-dialog`. Links open via `tauri-plugin-shell`. Clipboard access via `tauri-plugin-clipboard-manager`.

### Atomic File Saves

All writes use atomic rename: write to a temp file in the same directory, then rename to the target path. If the write fails or the app crashes, the original file is untouched.

### Auto-Save

- Debounced: saves after 30s of inactivity
- Toggleable from status bar
- Never auto-saves an untitled (never-saved) document
- Status bar shows "Auto-saved" indicator

---

## Undo/Redo

ProseMirror's `prosemirror-history` provides the undo/redo system:
- Transactions grouped by time proximity (300ms default)
- Sequential typing grouped into one undo step (until pause)
- Structural changes (e.g., convert to heading): separate undo step
- Paste: separate undo step
- Find-and-replace "Replace All": one undo step
- History is document-scoped (reset when opening a new file)

---

## Export Pipeline

### HTML Export

```
ProseMirror document
  → Serialize to Markdown string
  → markdown-it render to HTML
  → Inject bundled CSS (typography, code, tables, task lists, math, print)
  → Wrap in HTML template
  → Write to file via Tauri
```

Exported HTML is self-contained with all styles embedded. Includes KaTeX CSS for math rendering.

### PDF Export

Uses the system print dialog (Save as PDF) via a hidden iframe loaded with the same HTML output as HTML export. No external dependencies (no wkhtmltopdf or Puppeteer).

### Clipboard Export

- **Copy as HTML**: Rendered HTML to clipboard via `tauri-plugin-clipboard-manager`
- **Copy as Markdown**: Raw Markdown string to clipboard

---

## Theme System

All colors and spacing use CSS custom properties (`--lm-*` prefix). Theme switching swaps a `data-theme` attribute on the root element.

Three modes: light, dark, system (follows OS `prefers-color-scheme`). Transition is 200ms. Theme preference is persisted via Tauri preferences.

---

## Command Palette

- Activated via Cmd+Shift+P
- Full-text fuzzy search over all registered commands
- Each command has: id, label, shortcut (optional), category, execute handler
- All actions registered in the command registry (`src/commands/registry.ts`)

---

## Source View

A temporary read-only overlay that replaces the ProseMirror editor view:
- Toggled via Cmd+/ or command palette
- Displays serialized Markdown in a monospace view
- Generated on-demand by the PM → Markdown serializer
- Scroll position synced with editor via percentage-based mapping
- Esc or Cmd+/ returns to the rendered editor

---

## Security Model

Tauri's strict security model:
- WebView has no direct file system access
- All file operations go through Tauri IPC commands
- Capability-based permissions restrict available commands
- CSP headers prevent script injection
- No `eval()`, no dynamic script loading
- Image loading restricted to local files and data URIs

---

## Error Handling

### Principle: Never Lose Data

- All file writes use atomic rename
- If save fails, document stays in memory with error dialog
- Malformed Markdown renders as plain text, never crashes the parser
- If a NodeView throws during rendering, fall back to raw text display
