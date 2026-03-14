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

### Editor Template Expansion
Settings panel and font size zoom are shipped. Remaining:
- **Font family** — choose preferred writing font
- **Content margins** — adjust left/right padding (currently fixed ~48px)
- **Content max-width** — wider or narrower writing column
- **Line height and paragraph spacing**
- **Two-column layout** — reflow document into two newspaper-style columns
- **Saveable presets** — save/load/share template configurations

### Spell Checking
- Integrate spell checking (OS-level or library-based)
- Currently relies on OS-level WebView spell check
- Could add grammar checking via external service

---

## Command Palette & Keyboard Shortcuts

### Shortcut conflict awareness in Command Palette
When displaying commands in Cmd+Shift+P, if a shortcut is already taken by the OS or another app, indicate it visually — strikethrough, greyed out, or a "conflict" badge.

### Custom hotkey assignment
Allow users to reassign keyboard shortcuts for any command:
- Check for conflicts within LiveMark's own keybindings
- Check for conflicts with OS-level shortcuts (Cmd+Q, Cmd+Tab, etc.)
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

### Release Pipeline Completion
Auto-update mechanism is shipped. Remaining:
- macOS notarization (code signing)
- Windows code signing
- End-to-end release pipeline verification (tag → build → publish → update notification)

### Version History / Local Snapshots
- Track document revisions locally
- Browse and restore previous versions
- Could use git-like approach or simple timestamped copies

---

## Architecture Improvements

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
