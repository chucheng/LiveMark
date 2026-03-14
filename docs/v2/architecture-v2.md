# LiveMark v2 — Architecture Document

## 1. Architecture Changes from v1

### What Stays the Same

- **Tech stack**: Tauri 2.x (Rust) + SolidJS + ProseMirror. No framework changes.
- **Three-layer architecture**: UI Layer (SolidJS) → Editor Core (ProseMirror) → Backend (Rust/Tauri)
- **Markdown bridge**: markdown-it → ProseMirror doc (parse), PM doc → Markdown string (serialize)
- **Live rendering system**: NodeViews with cursor-aware dual render/edit modes
- **Atomic writes**: All Rust file writes use write-to-temp-then-rename
- **ProseMirror schema**: Existing schema unchanged; new node types added additively
- **CSS custom property theming**: `--lm-*` prefix, `data-theme` attribute
- **Export pipeline**: HTML template generation with bundled CSS

### What Changes

- **State management**: From single-document signals to per-tab isolated state + shared app state
- **Editor lifecycle**: From single EditorView to a tab manager that creates/destroys/caches EditorView instances
- **File operations**: From single-file to multi-file awareness; file commands now target the active tab
- **UI shell**: App.tsx grows to host tab bar, sidebar, settings panel, mind map overlay
- **Status bar**: Updates dynamically per active tab (word count, line/col, file path)
- **Window title**: Shows project folder name + active file name

### What's New

- **Tab manager** — manages per-tab editor instances, state, lifecycle
- **File tree sidebar** — directory tree with filesystem watching
- **Block handles** — ProseMirror decorations for hover handles, drag-and-drop, context menu
- **Heading collapse** — ProseMirror plugin for folding heading sections
- **Mind Map View** — Mermaid-based heading hierarchy visualization
- **Mermaid renderer** — lazy-loaded Mermaid.js NodeView for diagram code blocks
- **YAML frontmatter** — new schema node type + NodeView
- **Settings panel** — editor template preferences UI
- **Keyboard shortcut customization** — user-configurable keybindings
- **Auto-update** — Tauri updater plugin integration
- **CI/CD** — GitHub Actions workflows
- **Beautiful Doc export** — styled HTML clipboard export
- **Filesystem watcher** — Rust-side file watching for sidebar updates

---

## 2. Module Breakdown

### 2.1 Tab Manager (`src/state/tabs.ts`)

Manages the lifecycle of multiple open documents.

```
src/state/
  tabs.ts              — Tab store: create, close, switch, reorder tabs
  tab-types.ts         — Tab type definitions
```

**Key interfaces:**

```typescript
interface Tab {
  id: string;                          // Unique tab ID (nanoid)
  filePath: string | null;             // null = untitled
  fileName: string;                    // Display name
  isModified: boolean;                 // Unsaved changes flag
  editorState: EditorState | null;     // Cached PM state (null if not yet loaded)
  scrollPosition: number;              // Scroll offset for restore
  cursorPosition: number;              // PM selection anchor for restore
  foldedHeadings: Set<number>;         // Positions of collapsed headings
}

interface TabStore {
  tabs: Tab[];                         // Ordered list of tabs
  activeTabId: string | null;          // Currently focused tab
}

// Tab operations
function createTab(filePath?: string): Tab;
function closeTab(tabId: string): void;
function switchTab(tabId: string): void;
function moveTab(fromIndex: number, toIndex: number): void;
function getActiveTab(): Tab | undefined;
function findTabByPath(filePath: string): Tab | undefined;
```

**Integration with ProseMirror:**
- Each tab owns an `EditorState`. When switching tabs, the current tab's state is snapshot (including scroll position and cursor), and the target tab's state is restored into the single shared `EditorView`.
- Only one `EditorView` DOM element exists — we swap `EditorState` objects, not DOM trees. This is ProseMirror's native approach and avoids memory issues from multiple DOM-mounted editors.
- Undo/redo history is per-tab (stored in the EditorState's history plugin state).

**State with SolidJS signals:**

```typescript
// src/state/tabs.ts
const [tabs, setTabs] = createSignal<Tab[]>([]);
const [activeTabId, setActiveTabId] = createSignal<string | null>(null);

// Derived signals
const activeTab = () => tabs().find(t => t.id === activeTabId());
const isModified = () => activeTab()?.isModified ?? false;
const fileName = () => activeTab()?.fileName ?? "Untitled";
```

The existing `src/state/document.ts` signals (`filePath`, `isModified`, `fileName`) become derived from `activeTab()`. The old signals are replaced, not layered on top.

### 2.2 File Tree Sidebar (`src/ui/Sidebar.tsx`, `src/state/filetree.ts`)

```
src/ui/
  Sidebar.tsx            — SolidJS sidebar component (tree view)
  SidebarTreeNode.tsx    — Individual tree node (file or directory)
src/state/
  filetree.ts            — File tree state, expansion state, folder watching
```

**Key interfaces:**

```typescript
interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];     // Only for directories
}

interface FileTreeState {
  rootPath: string | null;         // Open folder path
  tree: FileTreeNode | null;       // Root node
  expandedPaths: Set<string>;      // Expanded directory paths
}
```

**Rust commands (new):**

```rust
#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileEntry>, String>

#[tauri::command]
fn watch_directory(path: String) -> Result<(), String>

#[tauri::command]
fn unwatch_directory(path: String) -> Result<(), String>
```

File watching uses `notify` crate in Rust, sends events to frontend via Tauri event system. Frontend debounces (500ms) and refreshes affected subtree.

**Integration:** Clicking a file in the sidebar calls `createTab(filePath)` or `switchTab(existingTab.id)`.

### 2.3 Block Handles (`src/editor/plugins/block-handles.ts`, `src/ui/BlockContextMenu.tsx`)

```
src/editor/plugins/
  block-handles.ts         — ProseMirror plugin: hover detection, decoration creation
  block-drag.ts            — Drag-and-drop handling for block reordering
  heading-collapse.ts      — Heading fold/unfold plugin
src/ui/
  BlockContextMenu.tsx     — Context menu component (Move Up/Down, Duplicate, Delete, Copy Link)
```

**Implementation approach:**

Block handles are implemented as ProseMirror **widget decorations** positioned at each top-level node. The plugin:
1. On `mousemove` (throttled 50ms): determines which top-level node the mouse is over
2. Creates a widget decoration at that node's start position
3. The widget renders a handle DOM element with event listeners for click (context menu) and mousedown (drag)

**Key interfaces:**

```typescript
interface BlockHandleState {
  hoveredNodePos: number | null;     // Position of hovered top-level node
  contextMenuPos: number | null;     // Position of node with open context menu
  dragSourcePos: number | null;      // Position of node being dragged
}

// Block operations (ProseMirror commands)
function moveBlockUp(state: EditorState, dispatch?: (tr: Transaction) => void): boolean;
function moveBlockDown(state: EditorState, dispatch?: (tr: Transaction) => void): boolean;
function duplicateBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean;
function deleteBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean;
function copyBlockLink(state: EditorState, nodePos: number): string;
```

**Drag-and-drop** uses ProseMirror's `handleDOMEvents` for `dragstart`, `dragover`, `drop`. On `dragstart`, a node selection is created for the block; ProseMirror's built-in drag handling moves it. A drop indicator decoration shows the insertion point.

**Heading collapse** is a separate plugin (`heading-collapse.ts`):
- Tracks a `Set<number>` of collapsed heading positions
- Collapsed ranges are replaced with a **node decoration** that hides the content and shows a placeholder
- The plugin maps collapsed positions through transactions to keep them stable after edits

### 2.4 Mind Map View (`src/ui/MindMap.tsx`, `src/editor/mind-map.ts`)

```
src/ui/
  MindMap.tsx              — SolidJS overlay component
src/editor/
  mind-map.ts              — Heading tree extraction, Mermaid source generation
```

**Key interfaces:**

```typescript
interface HeadingNode {
  level: number;          // 1-6
  text: string;           // Heading text (truncated at 40 chars)
  pos: number;            // ProseMirror position (for scroll-to)
  children: HeadingNode[];
}

function extractHeadingTree(doc: PMNode): HeadingNode[];
function generateMermaidSource(tree: HeadingNode[]): string;
```

**Integration:**
1. `extractHeadingTree()` walks the ProseMirror doc and builds a tree from heading nodes
2. `generateMermaidSource()` converts the tree to Mermaid `graph TD` syntax
3. `MindMap.tsx` renders the Mermaid source using the shared Mermaid renderer (lazy-loaded)
4. Click handler on SVG nodes maps back to `HeadingNode.pos` and scrolls the editor

### 2.5 Mermaid Renderer (`src/editor/nodeviews/mermaid.ts`, `src/editor/mermaid-loader.ts`)

```
src/editor/
  nodeviews/
    mermaid.ts             — Mermaid code block NodeView (render/edit dual mode)
  mermaid-loader.ts        — Lazy loader for Mermaid.js library
```

**Lazy loading strategy:**
- Mermaid.js (~2.5MB) is loaded on first encounter of a `mermaid` code block or mind map toggle
- `mermaid-loader.ts` exports `getMermaid(): Promise<MermaidAPI>` — returns cached instance after first load
- Uses dynamic `import()` — Vite code-splits automatically
- While loading: show a spinner placeholder in the NodeView

**NodeView behavior:**
- Extends the existing code block NodeView pattern
- When `language === "mermaid"` and cursor is outside: render Mermaid SVG
- When cursor enters: show raw source for editing
- Render is debounced (300ms) to avoid flicker during typing
- On render error: show error message below the block

### 2.6 YAML Frontmatter (`src/editor/nodeviews/frontmatter.ts`, schema extension)

```
src/editor/
  nodeviews/
    frontmatter.ts         — Frontmatter NodeView (rendered card / raw YAML)
  markdown/
    frontmatter-plugin.ts  — markdown-it plugin for frontmatter detection
```

**Schema addition:**

```typescript
// New node type in schema.ts
frontmatter: {
  content: "text*",
  group: "block",
  marks: "",
  code: true,
  defining: true,
  attrs: {},
  parseDOM: [{ tag: "pre.frontmatter" }],
  toDOM: () => ["pre", { class: "frontmatter" }, 0],
}
```

Frontmatter is always the first node in the document (if present). The parser detects `---` fences at document start. The serializer emits `---\n{content}\n---\n` at document start.

### 2.7 Settings & Preferences (`src/ui/SettingsPanel.tsx`, `src/state/preferences.ts`)

```
src/ui/
  SettingsPanel.tsx        — Modal settings panel (includes keyboard shortcut customization)
src/state/
  preferences.ts           — Extended with editor template prefs + custom shortcuts
```

**Preferences extension:**

```typescript
interface Preferences {
  // Existing
  theme: "light" | "dark" | "system";
  autoSave: boolean;
  // New — editor template
  fontFamily: string;
  contentMargin: number;        // px, 16-96
  contentMaxWidth: number;      // px, 500-1200, 0 = full width
  lineHeight: number;           // 1.2-2.4
  paragraphSpacing: number;     // em, 0.5-2.0
  twoColumnLayout: boolean;
  // New — custom shortcuts
  customShortcuts: Record<string, string>;  // commandId → shortcut string
  // New — sidebar
  sidebarVisible: boolean;
  sidebarWidth: number;         // px, 180-400
  // New — recent files
  recentFiles: string[];        // file paths, max 20
}
```

Editor template preferences are applied as CSS custom properties on the editor container, so they work instantly without re-rendering the ProseMirror document.

### 2.8 Copy as Beautiful Doc (`src/export/beautiful-doc.ts`)

```
src/export/
  beautiful-doc.ts         — Styled HTML generation for clipboard
```

**Pipeline:**

```
ProseMirror document
  → markdown-it render to HTML (reuse existing export path)
  → Inject inline CSS (not external stylesheet — must be inline for clipboard)
  → Convert local image srcs to base64 data URIs
  → Place on clipboard as text/html via Tauri clipboard plugin
```

Differs from "Copy as HTML" (which copies raw HTML markup) in that this copies fully-styled, paste-ready rich text with inline styles on every element.

### 2.9 Auto-Update (`src-tauri/`, `src/ui/UpdateBanner.tsx`) — REVERTED

> **Note:** `tauri-plugin-updater` was removed (commit e1ebb20) due to missing updater endpoint configuration. This section describes the intended design; re-implementation is pending proper endpoint config.

```
src/ui/
  UpdateBanner.tsx         — Update notification banner
src-tauri/
  tauri.conf.json          — Updater plugin configuration
```

Was intended to use `tauri-plugin-updater`. The Rust side would check for updates at launch, emit events to the frontend. Frontend renders the banner.

### 2.10 CI/CD (`.github/workflows/`)

```
.github/workflows/
  ci.yml                   — Build + test on PR (macOS, Windows, Linux)
  release.yml              — Build + sign + publish on tag push
```

---

## 3. State Management

### Per-Tab vs. Shared State

```
┌─────────────────────────────────────────────┐
│                SHARED STATE                  │
│  (SolidJS signals in src/state/)             │
│                                             │
│  tabs[]          — list of Tab objects       │
│  activeTabId     — which tab is focused      │
│  fileTree        — sidebar directory tree    │
│  preferences     — all user preferences      │
│  theme           — light/dark/system         │
│  isPaletteOpen   — command palette state     │
│  isFindOpen      — find/replace state        │
│  updateAvailable — auto-update state         │
│  recentFiles     — recently opened files     │
└─────────────┬───────────────────────────────┘
              │
              │ activeTab() derived signal
              ▼
┌─────────────────────────────────────────────┐
│             PER-TAB STATE                    │
│  (stored inside each Tab object)             │
│                                             │
│  editorState     — ProseMirror EditorState   │
│  isModified      — unsaved changes           │
│  filePath        — file on disk              │
│  scrollPosition  — viewport scroll offset    │
│  cursorPosition  — PM selection anchor       │
│  foldedHeadings  — collapsed heading set     │
│  isSourceView    — source view toggle        │
│  isMindMap       — mind map toggle           │
└─────────────────────────────────────────────┘
```

### Tab Lifecycle

**Creating a tab:**
1. `createTab(filePath?)` → creates Tab object with null `editorState`
2. If `filePath` provided → `read_file` IPC → parse Markdown → create EditorState
3. Tab added to `tabs[]`, `activeTabId` set to new tab

**Switching tabs:**
1. Snapshot current tab: `currentTab.editorState = editorView.state`, save scroll/cursor position
2. Set `activeTabId` to target tab
3. `editorView.updateState(targetTab.editorState)` — ProseMirror swaps state
4. Restore scroll position and cursor
5. UI updates reactively via derived signals

**Closing a tab:**
1. If modified → prompt save
2. Remove tab from `tabs[]`
3. If was active → activate adjacent tab (prefer right, then left)
4. If last tab → create new untitled tab (single-file mode)
5. GC: EditorState and all plugin state become unreferenced → garbage collected

---

## 4. Data Flow Diagrams

### 4.1 Multi-Tab Document Lifecycle

```
                    ┌──────────────────┐
                    │   User Action    │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     [Open File]      [Switch Tab]      [Close Tab]
            │                │                │
            ▼                ▼                ▼
   ┌────────────┐   ┌──────────────┐   ┌──────────────┐
   │ Check if   │   │ Snapshot     │   │ Is modified? │
   │ already    │   │ current tab  │   │              │
   │ open       │   │ (state,      │   └──────┬───────┘
   └──────┬─────┘   │  scroll,     │      yes │  no
     yes  │  no     │  cursor)     │          ▼        │
          ▼  │      └──────┬───────┘   ┌──────────┐    │
   [Switch │  │             │          │ Prompt   │    │
    to tab]│  ▼             ▼          │ Save?    │    │
          │  ┌──────────┐  ┌────────┐  └────┬─────┘    │
          │  │ read_file│  │ Update │       │          │
          │  │ IPC      │  │ editor │       ▼          ▼
          │  └────┬─────┘  │ view   │  [Save/Don't] [Remove tab]
          │       │        │ state  │       │          │
          │       ▼        └────┬───┘       ▼          │
          │  ┌──────────┐      │      [Remove tab]     │
          │  │ Parse MD  │      ▼           │          │
          │  │ → PM doc  │  [Restore        ▼          │
          │  └────┬─────┘   scroll]   [Activate       │
          │       │              │     adjacent tab]   │
          │       ▼              │           │          │
          │  ┌──────────┐       │           ▼          │
          │  │ Create   │       │     ┌──────────┐    │
          │  │ new Tab  │       │     │ If last: │    │
          │  │ + state  │       │     │ new      │    │
          │  └────┬─────┘       │     │ untitled │    │
          │       │              │     └──────────┘    │
          └───────┴──────────────┘                     │
                      │                                │
                      ▼                                │
               [Tab bar updates reactively] ◄──────────┘
```

### 4.2 Block Handle Interactions

```
Mouse hovers over block
        │
        ▼
┌────────────────────┐
│ Throttled mousemove│
│ (50ms) detects     │
│ top-level node pos │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Widget decoration  │
│ renders handle (⋮⋮) │
│ at node start pos  │
└────────┬───────────┘
         │
    ┌────┴─────┐
    ▼          ▼
 [Click]    [Drag start]
    │          │
    ▼          ▼
┌────────┐ ┌──────────────────┐
│Context │ │ Create node      │
│menu    │ │ selection         │
│appears │ │ → dragstart event │
└───┬────┘ └────────┬─────────┘
    │               │
    ▼               ▼
┌─────────────┐  ┌──────────────┐
│ User picks  │  │ Show drop    │
│ action:     │  │ indicator    │
│ Move Up/    │  │ between      │
│ Down/       │  │ blocks       │
│ Duplicate/  │  └──────┬───────┘
│ Delete/     │         │
│ Copy Link   │         ▼
└──────┬──────┘  ┌──────────────┐
       │         │ Drop: move   │
       ▼         │ node in PM   │
┌──────────────┐ │ transaction  │
│ PM command   │ │ (undoable)   │
│ dispatched   │ └──────────────┘
│ (undoable)   │
└──────────────┘
```

### 4.3 Mind Map View Toggle

```
User presses Cmd+T
        │
        ▼
┌───────────────────┐     ┌──────────────────────┐
│ Is mind map open? │─no─→│ Extract heading tree  │
│                   │     │ from PM doc            │
└───────┬───────────┘     └──────────┬────────────┘
       yes                           │
        │                            ▼
        ▼                   ┌──────────────────────┐
┌───────────────┐           │ Generate Mermaid      │
│ Close overlay │           │ source string          │
│ Restore editor│           └──────────┬────────────┘
│ focus         │                      │
└───────────────┘                      ▼
                            ┌──────────────────────┐
                            │ Lazy-load Mermaid.js  │
                            │ (if not cached)       │
                            └──────────┬────────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │ Render SVG into       │
                            │ MindMap overlay        │
                            │ component              │
                            └──────────┬────────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │ User clicks a node    │
                            │ → close overlay       │
                            │ → scrollToHeading(pos)│
                            └───────────────────────┘
```

### 4.4 Copy as Beautiful Doc Pipeline

```
User invokes "Copy as Beautiful Doc"
        │
        ▼
┌───────────────────────────┐
│ Get PM doc (or selection) │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│ Serialize to Markdown     │
│ (reuse serializer)        │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│ markdown-it render → HTML │
│ (reuse existing renderer) │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│ Walk HTML DOM:            │
│ • Inline all CSS styles   │
│ • Convert <img src=local> │
│   to base64 data URIs     │
│ • Add KaTeX inline styles │
│ • Add code highlight      │
│   inline styles           │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│ Write to clipboard as     │
│ text/html via Tauri        │
│ clipboard plugin           │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│ Status bar: "Copied as    │
│ styled document" (2s)     │
└───────────────────────────┘
```

---

## 5. Dependency Changes

### New npm Dependencies

| Package | Purpose | Size Impact | Loading |
|---|---|---|---|
| `mermaid` | Diagram rendering (Mind Map + Mermaid blocks) | ~2.5MB | Lazy — dynamic import on first use |
| `nanoid` | Tab IDs, block IDs | ~1KB | Bundled |

### New Cargo Dependencies

| Crate | Purpose |
|---|---|
| `notify` (~v6) | Filesystem watching for file tree sidebar |
| `tauri-plugin-updater` | Auto-update mechanism — *removed (commit e1ebb20), pending re-integration* |

### Bundle Size Strategy

- **Mermaid.js** is the only large new dependency. It is code-split via dynamic `import()` and only loaded when needed (first Mermaid code block or Mind Map toggle). Initial bundle size increase: ~0.
- **notify** adds ~200KB to the Rust binary. Acceptable for a file-watching crate.
- **tauri-plugin-updater** was removed (commit e1ebb20); will be re-added when updater endpoint is configured.

---

## 6. Migration Path

### Incremental Migration Strategy

The v2 features are designed to be additive — the existing v1 editor is not rewritten. Migration happens in layers:

**Phase 1 — Foundation (no user-visible changes at first)**
1. Refactor `src/state/document.ts` → introduce `src/state/tabs.ts`. The tab store wraps the existing document signals. With one tab, behavior is identical to v1.
2. Move EditorView lifecycle from `App.tsx` into a `TabEditor` component that manages state swap.
3. Add CI/CD pipeline (fully parallel — no code changes needed).

**Phase 2 — Multi-Tab**
1. Enable tab bar UI when ≥2 files are open.
2. `Cmd+O` creates a new tab instead of replacing the current document.
3. `Cmd+W` closes the active tab.
4. Existing file commands (`save`, `saveAs`) operate on `activeTab()`.

**Phase 3 — Sidebar + Block Handles**
1. Add file tree sidebar (new components, new Rust commands).
2. Add block handle plugin (new ProseMirror plugin + decorations).
3. Both are additive — no changes to existing editor core.

**Phase 4 — Rich Features**
1. Mermaid NodeView (extends existing code block pattern).
2. Mind Map overlay (new component, uses Mermaid infrastructure).
3. YAML frontmatter (new schema node + NodeView + markdown-it plugin).
4. Copy as Beautiful Doc (new export path).

**Phase 5 — Polish & Infrastructure**
1. Settings panel, keyboard shortcut customization.
2. Auto-update integration.
3. Large file performance.

### Breaking Changes

- **`src/state/document.ts`**: Signals become derived from tab state. Any code importing `filePath`, `isModified`, `fileName` directly will need to use the new derived signals from `tabs.ts`. This is the only breaking internal API change.
- **Preferences format**: New fields added. Old preferences files are forward-compatible (new fields get defaults). No migration needed.

---

## 7. Risks & Open Questions

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **EditorView state swap performance** — switching tabs must be instant, but PM state deserialization may lag for large documents | High | Profile early in multi-tab milestone. If state swap is > 50ms, consider keeping a small pool of pre-created EditorViews (2-3) instead of a single shared one. |
| **Mermaid.js bundle size** — even with lazy loading, the initial download is ~2.5MB | Medium | Lazy load on first use. Consider hosting Mermaid as a Tauri sidecar asset instead of a JS bundle if Vite chunk is too large. |
| **Filesystem watcher reliability** — `notify` crate behavior varies across macOS (FSEvents), Linux (inotify), Windows (ReadDirectoryChanges) | Medium | Test on all platforms early. Debounce events (500ms). Provide "Refresh" manual fallback in sidebar. |
| **Block drag-and-drop UX** — ProseMirror's drag handling is adequate for simple cases but may struggle with nested structures (lists, blockquotes) | Medium | Prototype block drag early. If PM's native drag is insufficient, implement a custom drag layer that computes transactions manually. |
| **Heading collapse position tracking** — collapsed positions must survive edits above and below the fold | Medium | Use PM's position mapping via `tr.mapping.map()`. Test thoroughly with edits at fold boundaries. |
| **Memory pressure with many tabs** — each tab holds a full EditorState | Low | EditorState is lightweight (tree structure, no DOM). 50 tabs of 1K-line docs ≈ 10MB. Not a concern until combined with Large File Performance work. |

### Open Questions

1. **Tab persistence across sessions** — Should tab state (which files are open, their positions) be persisted and restored on next launch? Probably yes, but adds complexity to preferences. Decide in multi-tab milestone.
2. **Sidebar file operations** — Should the sidebar support file/folder creation, rename, delete? Ideas list doesn't mention this. Recommend: not in v2, add in v2.x. Sidebar is read-only with "open" action.
3. **Block handle behavior in nested structures** — If the user hovers over a paragraph inside a blockquote, does the handle appear on the paragraph or the blockquote? Recommend: handle always appears on the outermost (top-level) block to keep behavior predictable.
4. **Mermaid security** — Mermaid.js renders arbitrary user input as SVG. Need to sanitize or sandbox Mermaid's output to prevent XSS. Use Mermaid's built-in `securityLevel: 'strict'` configuration.
5. **Custom shortcut storage format** — Store as `{ commandId: "Cmd+Shift+X" }` string? Or a structured `{ key: "X", mod: ["Cmd", "Shift"] }` object? Recommend string — simpler, matches how shortcuts are displayed.
