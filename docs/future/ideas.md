# LiveMark — Ideas

Future possibilities for LiveMark. These are **not commitments** — they are ideas, improvements, and directions to explore. Items are removed from this list once implemented.

---

## Features

### Recent Files List
- Track and display recently opened files
- Quick-open from a list on launch or via command palette

### Plugin / Extension API
- Public API for third-party plugins
- The architecture already supports extension points: schema extensions, ProseMirror plugins, NodeView registry, command registry, theme system, export pipelines
- Would require designing a stable API surface and plugin distribution mechanism

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

### Incremental Markdown Parsing
- Move parsing to Rust backend using pulldown-cmark for very large files
- Send token stream to frontend via IPC
- Currently markdown-it is fast enough for typical files

### Typewriter Mode
- Keep the current line vertically centered while typing

### Line Numbers
- Optional line numbers in the editor gutter (off by default)

---

## Export Improvements

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
