# LiveMark — Ideas

Future possibilities for LiveMark. These are **not commitments** — they are ideas, improvements, and directions to explore. Items are removed from this list once implemented.

---

## Features

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

### Vim / Emacs Keybindings
- Modal editing support for Vim users
- Emacs keybindings as an alternative
- Niche but highly requested by developer users

### Mermaid Diagram Rendering
- Render Mermaid diagrams inline (flowcharts, sequence diagrams, etc.)
- Requires adding Mermaid as a dependency (heavy)
- Could use a lazy-load approach to avoid bundle size impact

### YAML Frontmatter Support
- Parse and display YAML frontmatter blocks
- Common in static site generators (Hugo, Jekyll, Astro)
- Could render as a structured form or a styled block

### Custom CSS Themes
- Allow users to load custom CSS themes
- Expose the `--lm-*` CSS custom properties as a theming API
- Ship additional built-in themes beyond light/dark

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
- Optional line numbers in the editor gutter

### Drag-and-Drop File Open
- Drop a .md file onto the window to open it

### Selection-Aware Copy as Markdown
- Copy only the selected range as Markdown (currently copies full document)

---

## Export Improvements

### Advanced PDF Options
- Page size, margins, headers/footers configuration
- Currently uses system print dialog with default settings

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

### Developer Documentation
- API documentation for internal modules
- Contributing guide for external contributors
