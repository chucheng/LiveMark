# LiveMark — System Design

## 1. Editor Engine Design

### Document Model

The document is represented as a ProseMirror `Node` tree. This tree is the single source of truth during editing.

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

### Markdown ↔ ProseMirror Bridge

**Parsing (file → editor):**

```
Markdown string
  → markdown-it tokenize
  → Token stream
  → Custom token-to-PM-node mapper
  → ProseMirror document Node
```

We use `prosemirror-markdown`'s parser infrastructure but with our custom schema and token handlers.

**Serialization (editor → file):**

```
ProseMirror document Node
  → Walk tree
  → Each node type → Markdown syntax string
  → Join with appropriate line breaks
  → Markdown string (preserving original formatting where possible)
```

### Serialization Fidelity

Critical requirement: **round-trip fidelity**. Opening a Markdown file and saving it without edits must produce an identical file (byte-for-byte when possible).

To achieve this:
- Store original Markdown tokens as node attributes where ambiguous (e.g., `*` vs `_` for emphasis)
- Preserve blank line patterns
- Preserve indentation style (spaces vs tabs)
- Preserve list marker style (`-` vs `*` vs `+`)

## 2. Live Rendering System

### State Machine per Node

Each block-level node has two visual states:

```
┌──────────┐     cursor enters      ┌──────────┐
│ RENDERED │ ──────────────────────→ │ EDITING  │
│          │ ←────────────────────── │          │
└──────────┘     cursor leaves       └──────────┘
```

**RENDERED state:**
- Markdown syntax hidden
- Content styled according to element type
- Not directly editable (but click transitions to EDITING)

**EDITING state:**
- Raw Markdown syntax visible
- Standard text editing behavior
- Cursor visible within the element

### Inline Mark Handling

Inline marks (bold, italic, code, strikethrough, links) are handled differently from block nodes because they don't have their own NodeViews.

Strategy:
1. ProseMirror stores marks as semantic annotations, not as literal `**` characters
2. When the cursor is inside a marked range, **decorations** are added to show the syntax markers (e.g., `**` before and after bold text)
3. When the cursor leaves, decorations are removed, and the text appears styled

This avoids storing Markdown syntax characters in the document model while still allowing the user to see and edit them.

### Cursor Position Preservation

When transitioning between RENDERED and EDITING states:

1. Record the cursor's document position (PM position) before transition
2. Switch the NodeView's render mode
3. Map the PM position to the new DOM structure
4. Restore the cursor

ProseMirror's position mapping handles this natively for most cases. For complex elements (tables, code blocks), custom mapping may be needed.

## 3. State Management

### Signal Architecture

Using SolidJS's built-in signal system:

```typescript
// Document state
const [filePath, setFilePath] = createSignal<string | null>(null);
const [isModified, setIsModified] = createSignal(false);
const [fileName, setFileName] = createSignal("Untitled");

// UI state
const [isPaletteOpen, setIsPaletteOpen] = createSignal(false);
const [isFindOpen, setIsFindOpen] = createSignal(false);
const [theme, setTheme] = createSignal<"light" | "dark" | "system">("system");

// Preferences (persisted)
const [prefs, setPrefs] = createStore<Preferences>({
  theme: "system",
  fontSize: 16,
  fontFamily: "default",
  lineHeight: 1.7,
  autoSave: true,
  autoSaveInterval: 30000,
});
```

### Why Signals, Not a State Library

- LiveMark's state is simple: one document, a few UI flags, user preferences
- SolidJS signals are reactive primitives — no boilerplate
- No need for Redux/MobX/Zustand complexity
- Signals compose naturally with Solid's reactivity

## 4. File System Integration

### Tauri Commands

```rust
#[tauri::command]
fn open_file(path: String) -> Result<FileContent, String>

#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String>

#[tauri::command]
fn pick_file() -> Result<Option<String>, String>

#[tauri::command]
fn pick_save_path(default_name: String) -> Result<Option<String>, String>

#[tauri::command]
fn read_preferences() -> Result<Preferences, String>

#[tauri::command]
fn write_preferences(prefs: Preferences) -> Result<(), String>

#[tauri::command]
fn get_recent_files() -> Result<Vec<RecentFile>, String>

#[tauri::command]
fn export_html(markdown: String, css: String) -> Result<String, String>
```

### File Encoding

- Detect encoding on read (UTF-8, UTF-16, Latin-1)
- Preserve original encoding on save
- Default to UTF-8 for new files
- Preserve BOM if present
- Preserve line ending style (LF vs CRLF)

### Auto-Save

- Debounced: only save if no keystrokes for N seconds
- Write to a temporary file first, then atomic rename
- Never auto-save an untitled (never-saved) document
- Show auto-save status in status bar

## 5. Undo/Redo System

ProseMirror provides a robust undo/redo system via `prosemirror-history`:

- Transactions are grouped by time proximity (300ms default)
- Each undo step reverses a group of related changes
- Redo replays the reversed changes
- History is document-scoped (lost when closing document)

### Grouping Strategy

- Sequential typing: grouped into one undo step (until pause)
- Structural changes (e.g., convert to heading): separate undo step
- Paste: separate undo step
- Find-and-replace: each replacement is separate; "Replace All" is one step

## 6. Export Pipeline

### HTML Export

```
ProseMirror document
  → Serialize to Markdown string
  → markdown-it render to HTML
  → Inject CSS (bundled stylesheet)
  → Wrap in HTML template
  → Write to file
```

The exported HTML is self-contained: all styles are embedded. The CSS matches LiveMark's rendered appearance.

### PDF Export

```
HTML export output
  → Tauri: invoke system print-to-PDF via webview
  → Uses the same HTML + embedded CSS from HTML export
  → No external dependencies (wkhtmltopdf/Puppeteer not needed)
```

Tauri 2.x exposes webview print functionality that can target PDF output. Since we already generate standalone HTML for HTML export, PDF export reuses that pipeline:

1. Generate HTML string (same as HTML export)
2. Load into a hidden webview
3. Call the webview's print-to-PDF API
4. Save the resulting PDF to disk

This keeps the dependency footprint at zero — no headless browser or external binary required.

## 7. Theme System

### CSS Custom Properties

All colors and spacing defined as CSS custom properties:

```css
:root {
  --lm-bg: #FAFAFA;
  --lm-text: #1A1A2E;
  --lm-accent: #4A90D9;
  --lm-code-bg: #F0F0F5;
  --lm-font-body: "Inter", sans-serif;
  --lm-font-mono: "JetBrains Mono", monospace;
  --lm-font-size: 16px;
  --lm-line-height: 1.7;
  --lm-content-width: 720px;
  --lm-editor-padding: 48px;
}

[data-theme="dark"] {
  --lm-bg: #1E1E2E;
  --lm-text: #CDD6F4;
  --lm-accent: #89B4FA;
  --lm-code-bg: #2A2A3E;
}
```

### System Theme Follow

- Listen to `prefers-color-scheme` media query
- When set to "system", auto-switch between light and dark
- Smooth 200ms transition on theme change

## 8. Command Palette

### Design

- Activated via Cmd/Ctrl+Shift+P
- Full-text fuzzy search over all registered commands
- Each command has: id, label, shortcut (optional), handler
- Sorted by relevance, with recently used commands promoted

### Command Registry

```typescript
interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category: string;
  execute: () => void;
}

const commands: Command[] = [
  { id: "file.open", label: "Open File", shortcut: "Cmd+O", category: "File", execute: openFile },
  { id: "file.save", label: "Save", shortcut: "Cmd+S", category: "File", execute: saveFile },
  { id: "theme.toggle", label: "Toggle Theme", category: "View", execute: toggleTheme },
  // ...
];
```

## 9. Source View Mode

### Purpose

Users often need to see or copy raw Markdown — for pasting into GitHub, Slack, documentation systems, or debugging formatting issues. Source view provides this without breaking the "one editing surface" principle.

### Design

- **Source view** is a temporary, read-only overlay that replaces the ProseMirror editor view
- Activated via `Cmd/Ctrl+/` toggle or command palette
- Displays the serialized Markdown string in a monospace `<pre>` block
- The source text is generated on-demand by running the existing PM → Markdown serializer
- No separate editor instance — just a styled text container with selection support
- Pressing `Cmd/Ctrl+/` or `Esc` returns to the rendered ProseMirror view
- Cursor position (mapped to document offset) is restored when switching back

### "Copy as Markdown" Command

- Serializes the current document (or selection) to a Markdown string via the existing serializer
- Copies the string to the system clipboard
- Does not require entering source view — works from the rendered editing view
- Selection-aware: if text is selected, only the selected range is serialized

### State

```typescript
const [isSourceView, setIsSourceView] = createSignal(false);
```

The source view signal controls which panel is displayed. The ProseMirror editor state is untouched while source view is active.

## 10. Error Handling Strategy

### Principle: Never Lose Data

- All file writes use atomic rename (write to temp, rename)
- If save fails, show error but keep document in memory
- If app crashes, ProseMirror state can be recovered from auto-save

### Rendering Errors

- If a NodeView throws during rendering, fall back to raw text display
- Log errors but don't show to user unless actionable
- Malformed Markdown is displayed as plain text, never crashes the parser
