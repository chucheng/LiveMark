# LiveMark — Ideas

Future possibilities for LiveMark. These are **not commitments** — they are ideas, improvements, and directions to explore. Items are removed from this list once implemented.

---

## Features

### Block Handles
Treat every top-level element (heading, paragraph, code block, quote, list, image) as a discrete **block** with a hover handle on the left edge (like Notion). The handle provides:

- **Drag** — reorder blocks by dragging the handle
- **Collapse** — fold a heading and all its children into a single line (click to expand)
- **Move** — move block up/down via keyboard shortcuts or context menu
- **Copy link to block** — copy a URL like `file:///path/to/doc.md#block-a3f8c2` that deep-links to that specific block

**UI:**
- Handle appears on hover (a grip icon or `⋮⋮` to the left of the block)
- Clicking the handle opens a small context menu: Move Up, Move Down, Copy Link, Duplicate, Delete
- Drag ghost shows a preview of the block being moved
- Collapse is heading-only: click the heading's disclosure triangle to fold/unfold children

**Copy Link — block ID strategy:**
Blocks need stable identifiers for links to work, but we must **not pollute the Markdown**.

- **Headings** — use auto-generated slug from heading text (e.g. `#problem`). No extra markup needed.
- **Other blocks** (paragraph, code, quote, list, image) — **opt-in only**: generate an ID only when the user explicitly clicks "Copy Link", and insert a minimal HTML comment `<!-- id: a3f8c2 -->` above the block. Markdown stays clean; only linked blocks get a marker.
- **Export:** When serializing/exporting Markdown, strip `<!-- id: ... -->` comments by default. Provide an option to keep them if the user wants to preserve block links.

**Implementation notes:**
- Block handles are a ProseMirror decoration or NodeView wrapper at the top-level node layer
- Drag-and-drop uses ProseMirror's built-in drag support on node selections
- Collapse uses a ProseMirror plugin that tracks folded ranges and replaces them with a placeholder widget
- Must not interfere with inline live-preview behavior (NodeViews still switch modes on cursor enter)

### Mind Map View
Toggle the document into a visual mind map derived from its heading structure. Press `Cmd+T` to switch; press again to return to normal editing.

**How it works:**
- Parses the document's heading hierarchy (H1 → H2 → H3…) into a tree
- Renders the tree as a Mermaid diagram (e.g. `graph TD`) inside a full-editor overlay
- H1 is the root node; H2s are direct children; H3s nest under their parent H2, etc.
- Node labels use the heading text (truncated if long)
- The map is **read-only** — it's a visualization, not an editor
- Clicking a node scrolls back to that heading in the document (when toggling back)

**Example:**
```
# AI Startup          →      graph TD
## Problem            →        A[AI Startup] --> B[Problem]
## Solution           →        A --> C[Solution]
## Market             →        A --> D[Market]
```

**Implementation notes:**
- Generate Mermaid source from the ProseMirror doc's heading nodes (no markdown-it re-parse needed)
- Render with Mermaid.js (lazy-loaded to avoid bundle impact — same concern as Mermaid Diagram Rendering feature)
- If Mermaid Diagram Rendering is implemented first, reuse its infrastructure
- Overlay approach: similar to Source View (`Cmd+/`), a full-editor toggle that swaps content
- Keyboard shortcut: `Cmd+T` (check for conflicts — currently unbound)

### Multi-Tab / Multi-File Editing
- Open multiple files in tabs within a single window
- Tab management UI, per-tab editor state, memory management
- Keyboard navigation between tabs
- Deferred from v1 to reduce complexity; users currently open multiple windows

### File Tree Sidebar
- Show a collapsible directory tree alongside the editor
- Quick file switching within a project
- Pairs naturally with multi-tab support

### Recent Files List
- Track and display recently opened files
- Quick-open from a list on launch or via command palette

### Plugin / Extension API
- Public API for third-party plugins
- The architecture already supports extension points: schema extensions, ProseMirror plugins, NodeView registry, command registry, theme system, export pipelines
- Would require designing a stable API surface and plugin distribution mechanism

### Mermaid Diagram Rendering
- Render Mermaid diagrams inline (flowcharts, sequence diagrams, etc.)
- Requires adding Mermaid as a dependency (heavy)
- Could use a lazy-load approach to avoid bundle size impact

### YAML Frontmatter Support
- Parse and display YAML frontmatter blocks
- Common in static site generators (Hugo, Jekyll, Astro)
- Could render as a structured form or a styled block

### User-Configurable Editor Template
Let users customize the editor's visual layout and typography — not just color themes, but the full writing environment. Applies to both the in-editor experience and export output (HTML/PDF).
- **Font family** — choose their preferred writing font (font *size* zoom is already shipped via Cmd+=/Cmd+-/Cmd+0)
- **Content margins** — adjust left/right padding between the writing zone and the window edge (currently fixed ~48px)
- **Content max-width** — wider or narrower writing column
- **Line height and paragraph spacing**
- **Two-column layout** — a toggle (like focus mode) that reflows the document into two newspaper-style columns. Still fully editable, not a separate reading mode — just a layout option for people who prefer denser content on wide screens.
- Templates should be saveable/shareable as presets

### Spell Checking
- Integrate spell checking (OS-level or library-based)
- Currently relies on OS-level WebView spell check
- Could add grammar checking via external service

---

## Command Palette & Keyboard Shortcuts

### Shortcut conflict awareness in Command Palette
When displaying commands in Cmd+Shift+P, if a shortcut is already taken by the OS or another app, indicate it visually — strikethrough, greyed out, or a "conflict" badge. Users should immediately see which shortcuts won't work as expected.

### Custom hotkey assignment
Allow users to reassign keyboard shortcuts for any command. When assigning a new shortcut:
- Check for conflicts within LiveMark's own keybindings
- Check for conflicts with OS-level shortcuts (Cmd+Q, Cmd+Tab, etc.)
- Check for known conflicts with common apps (if feasible)
- Show a warning if a conflict is detected, but still allow the user to proceed

---

## Editor Improvements

### Large File Performance
- Viewport-based rendering (only render nodes near the visible area)
- IntersectionObserver on block-level NodeViews for lazy rendering
- The architecture supports this but it's not yet implemented

### Incremental Markdown Parsing
- Move parsing to Rust backend using pulldown-cmark for very large files
- Send token stream to frontend via IPC
- Currently markdown-it is fast enough for typical files

### Typewriter Mode
- Keep the current line vertically centered while typing

### Line Numbers
- Optional line numbers in the editor gutter (off by default)

### Drag-and-Drop File Open
- Drop a .md file onto the window to open it

### Selection-Aware Copy as Markdown
- Copy only the selected range as Markdown (currently copies full document)

---

## Export Improvements

### Copy as Beautiful Doc
- Copy the current document to clipboard as rich text (HTML) with full styling
- Paste into Google Docs, Notion, Email, Slack, etc. and retain LiveMark's rendered appearance
- Includes headings, bold/italic, code blocks with syntax highlighting, tables, math, images
- Different from the existing "Copy as HTML" (raw markup) — this copies styled, ready-to-paste content

### Additional Export Formats
- DOCX export
- LaTeX export
- Pluggable export pipeline for custom formats

---

## Infrastructure & Distribution

### Auto-Update Mechanism
- In-app update notifications and installation
- Tauri has built-in updater plugin support

### Version History / Local Snapshots
- Track document revisions locally
- Browse and restore previous versions
- Could use git-like approach or simple timestamped copies

### Cross-Platform Testing
- Expand automated testing across macOS, Windows, Linux
- WebView rendering differences need systematic verification

### CI/CD Pipeline
- Automated builds for all platforms
- Automated test runs on pull requests
- Release automation with changelog generation

---

## Architecture Improvements

### State Management Scaling
- If multi-tab is added, signal architecture may need per-tab isolation
- Consider whether a lightweight state library becomes worthwhile

### Schema Extensibility
- Formalize the schema extension mechanism for plugins
- Define how custom node types interact with the serializer

### Theme System Formalization
- Document all `--lm-*` CSS custom properties
- Create a theme specification for third-party themes
- Consider a theme marketplace or community themes

---

## Maybe

Ideas that are interesting but not confirmed — revisit later.

### Vim / Emacs Keybindings
- Modal editing support for Vim users
- Emacs keybindings as an alternative
- Niche but highly requested by developer users

### Custom CSS Themes
- Allow users to load custom CSS themes
- Expose the `--lm-*` CSS custom properties as a theming API
- Ship additional built-in themes beyond light/dark

### Advanced PDF Options
- Page size, margins, headers/footers configuration
- Currently uses system print dialog with default settings

### Developer Documentation
- API documentation for internal modules
- Contributing guide for external contributors
