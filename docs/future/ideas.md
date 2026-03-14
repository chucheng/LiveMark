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
Settings panel, font size zoom, font family, content max-width, line height, paragraph spacing, two-column layout, and saveable presets are shipped. Remaining:
- **Content margins** — adjust left/right padding independently from content width (currently fixed ~48px)

### Spell Checking
- Integrate spell checking (OS-level or library-based)
- Currently relies on OS-level WebView spell check
- Could add grammar checking via external service

---

---

## Editor Improvements

### Link Hover Effects
- Links should give visual feedback on hover (color shift, underline thickening)
- Makes it obvious the link is clickable without needing Cmd+click hint

### Code Block Copy Button
- Show a copy-to-clipboard icon at the top-right of rendered code blocks
- Only visible on hover — keeps the UI clean
- Standard affordance in all quality Markdown renderers

### Cursor & Live-Preview Polish
Identified from a deep audit comparing LiveMark's editing UX to Typora:

- **Inline math direct editing** — Currently `atom: true` so cursor can't enter. Need an interaction mode (e.g. double-click to open editable source, Escape to close). Typora does this well.
- **Input rule cursor positioning** — `# heading`, `**bold**` auto-transforms rely on ProseMirror's implicit position mapping. Usually fine, but can cause subtle cursor jumps. Consider explicit cursor repositioning after transforms.
- **GapCursor visual feedback** — Gap positions between blocks have no visual indicator. Add a thin blinking line or highlight so users know the cursor is in a valid gap.
- **Large-file lazy render latency** — Off-screen blocks collapse past 500 blocks. Cursor entering a collapsed block triggers render, causing momentary lag. Consider pre-expanding a buffer zone around the viewport.

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
Auto-update mechanism was added then reverted (`tauri-plugin-updater` removed due to missing endpoint config). Remaining:
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

## Big Changes

### LLM-Powered Inline Editing
Native integration with large language models for text revision — not generation, but refinement. No mainstream Markdown editor has this as a first-class feature.

**UX concept:**
1. Select text → shortcut or context menu → revision panel appears
2. One-click presets: "More formal", "More concise", "Fix grammar", "Translate to English/Chinese"
3. Free-form prompt input for custom instructions
4. AI result displayed as inline diff on the original text (strikethrough + green insertion)
5. Accept / Reject per change, or accept all

**Status:** Idea phase — needs deeper UX design and implementation planning before starting. Do not implement yet.

**Technical notes:**
- ProseMirror decorations for inline diff preview; AI changes are undoable transactions
- Streaming response to avoid perceived latency
- Support multiple backends: Claude API, OpenAI, local models (Ollama) for privacy
- API key management via Tauri secure storage
- Consider free tier with usage limits + paid unlimited as business model

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
