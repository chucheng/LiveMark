# LiveMark

A fast, distraction-free Markdown editor where what you type is what you see — no split panes, no preview toggle, just writing.

![Version](https://img.shields.io/badge/version-2.8.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-AGPL--3.0-green)

## What is LiveMark?

LiveMark renders Markdown **inline as you type**. Headings become headings. Bold becomes bold. Links become clickable. There is no preview — the editor *is* the preview.

When your cursor enters a Markdown element, the raw syntax is revealed for editing. When you move away, it renders. The transition is instant and seamless.

## Features

### Editor
- **Inline live rendering** — Markdown transforms visually as you type
- **Cursor-aware editing** — raw syntax shown on focus, rendered on blur
- **CommonMark + GFM** — headings, bold, italic, strikethrough, code, blockquotes, lists, links, images, tables, task lists, horizontal rules
- **Syntax highlighting** — 14 languages in fenced code blocks (JS, TS, Python, Rust, Go, Java, C/C++, HTML, CSS, JSON, Bash, SQL, Ruby)
- **Math rendering** — inline `$...$` and block `$$...$$` with KaTeX
- **Mermaid diagrams** — fenced code blocks with `mermaid` language render as interactive diagrams
- **YAML frontmatter** — parse, edit, and serialize frontmatter blocks
- **Table editing** — visual tables with Tab navigation between cells
- **Task list checkboxes** — clickable checkboxes that toggle state
- **Image preview** — inline rendering, drag-and-drop or paste to insert, HTML `<img>` width preservation
- **Link popover** — click any rendered link for a compact popover with Open, Copy, Edit, and Unlink actions
- **Smart link open** — local file links (e.g. `tutorial.md`) open in a tab; external URLs open in browser. Works in popover and Cmd+click
- **Clickable links** — Cmd/Ctrl+click opens links (local files in-app, URLs in browser)
- **Find & replace** — Cmd+F with selection pre-fill, jumps to nearest match, case-sensitive toggle (Aa), regex toggle (.*), replace and replace-all; per-textblock search for accurate matching in tables and nested lists
- **Full keyboard workflow** — Cmd+B/I for bold/italic, Markdown shortcuts (`# `, `> `, `- [ ] `), undo/redo
- **Large file lazy rendering** — IntersectionObserver-based viewport rendering

### File Operations
- **Multi-tab** — open multiple files in tabs with per-tab editor state
- Open, save, save-as, new file (Cmd+O/S/Shift+S/N)
- **Auto-save** — 30s after last edit, toggleable from status bar
- CLI argument support (`livemark file.md`)
- Unsaved changes protection on close

### App
- **Auto-update** — planned (currently disabled)

### UI
- **Sidebar file tree** — navigate and open files from a sidebar
- **Document outline** — Cmd+Shift+O, heading tree with active heading tracking and click-to-navigate
- **Light & dark themes** — system-follow or manual toggle (Cmd+Shift+T), persisted
- **Command palette** — Cmd+Shift+P, fuzzy search across all actions
- **Source view** — Cmd+/ toggles read-only raw Markdown
- **Focus mode** — Cmd+T toggles off → block focus (dims inactive blocks)
- **Typewriter mode** — keeps cursor vertically centered as you type
- **Callout admonitions** — `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!CAUTION]`, `> [!IMPORTANT]` with styled badges and type dropdown
- **Font size zoom** — Cmd+=/Cmd+-/Cmd+0 to increase, decrease, reset (12–28px, persisted)
- **Status bar** — line/column, selection count, word count, zoom %, encoding, theme toggle

### Export
- HTML export (Cmd+Shift+E) — standalone file with embedded styles
- **Word document export** (Cmd+Shift+D) — `.docx` with headings, lists, tables, code blocks, math, and images
- PDF export (Cmd+P) — opens in browser for print/save-as-PDF
- Copy as HTML (Cmd+Shift+C)
- Copy as Markdown (Cmd+Alt+C) — selection-aware
- **Smart copy** — copy/cut produces Markdown as text/plain + styled HTML as text/html
- **Smart paste** — pasting Markdown text auto-parses into structured content (headings, lists, tables, etc.); plain text pastes normally

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+W` | Close Tab |
| `Cmd+\` | Toggle Sidebar |
| `Cmd+Shift+O` | Show Outline |
| `Cmd+,` | Settings |
| `Cmd+K` | Insert Link |
| `Cmd+Shift+H` | Toggle Find and Replace |
| `Cmd+Shift+X` | Strikethrough |
| `Cmd+T` | Toggle Focus Mode (off → block) |
| `Cmd+J P` | Copy File Path |
| `Cmd+J W` | Close All Tabs |
| `Cmd+J T` | Cycle Theme |

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | [Tauri 2.x](https://v2.tauri.app/) (Rust) |
| UI framework | [SolidJS](https://www.solidjs.com/) |
| Editor engine | [ProseMirror](https://prosemirror.net/) + [prosemirror-tables](https://github.com/ProseMirror/prosemirror-tables) |
| Markdown parser | [markdown-it](https://github.com/markdown-it/markdown-it) |
| Math rendering | [KaTeX](https://katex.org/) |
| Syntax highlighting | [highlight.js](https://highlightjs.org/) |
| Build tool | [Vite](https://vitejs.dev/) + TypeScript |
| Package manager | pnpm |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Tauri system dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Install & Run

```bash
git clone https://github.com/chucheng/LiveMark.git
cd LiveMark
pnpm install
pnpm tauri dev
```

Open a file directly:

```bash
pnpm tauri dev -- -- path/to/file.md
```

### Build

```bash
pnpm tauri build
```

### Run Tests

```bash
pnpm test
```

## Architecture

```
┌──────────────────────────────────────────────┐
│                 Tauri Shell                   │
│  ┌────────────────────────────────────────┐  │
│  │         Frontend (WebView)             │  │
│  │                                        │  │
│  │   UI Layer (SolidJS)                   │  │
│  │     ↕                                  │  │
│  │   Editor Core (ProseMirror)            │  │
│  │     Schema · NodeViews · Plugins       │  │
│  │     ↕                                  │  │
│  │   Markdown Bridge (markdown-it)        │  │
│  │     Parse (MD→PM) · Serialize (PM→MD)  │  │
│  └──────────────┬─────────────────────────┘  │
│                 │ Tauri IPC                   │
│  ┌──────────────▼─────────────────────────┐  │
│  │          Backend (Rust)                │  │
│  │   File I/O (atomic) · Preferences     │  │
│  │   OS dialogs · Clipboard              │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

## Project Structure

```
src/
  editor/
    schema.ts             — ProseMirror schema (1:1 Markdown mapping)
    editor.ts             — Editor init, getMarkdown/setMarkdown API
    highlight.ts          — highlight.js wrapper (syntax highlighting)
    input-rules.ts        — Auto-transforms (# heading, **bold**, etc.)
    keymaps.ts            — Keyboard shortcuts
    mermaid-loader.ts     — Lazy mermaid.js loader and renderer
    markdown/
      parser.ts           — markdown-it → ProseMirror document
      serializer.ts       — ProseMirror document → Markdown string
      task-list-plugin.ts — Custom markdown-it plugin for task lists
      math-plugin.ts      — Custom markdown-it plugin for math ($, $$)
      frontmatter-plugin.ts — Custom markdown-it plugin for YAML frontmatter
      callout-plugin.ts   — Custom markdown-it plugin for callout admonitions
      html-image-plugin.ts — Custom markdown-it plugin for HTML <img> tags with width
    nodeviews/            — Cursor-aware NodeViews (heading, code-block, blockquote, math, mermaid, frontmatter, etc.)
    plugins/
      live-render.ts      — Active block detection + decorations
      heading-collapse.ts — Heading fold/unfold
      find-replace.ts     — Search decorations + match navigation
      placeholder.ts      — Empty doc placeholder
      link-click.ts       — Cmd+click opens links (smart local/external)
      link-helpers.ts     — Shared link detection and path resolution
      link-popover.ts     — Link popover (Open, Copy, Edit, Unlink)
      image-drop-paste.ts — Image drag-drop/paste handler
      inline-decorations.ts — Inline mark decorations
      lazy-render.ts      — IntersectionObserver-based lazy rendering
      trailing-paragraph.ts — Ensures doc ends with paragraph
      typewriter.ts       — Typewriter mode (cursor vertical centering)
      smart-copy.ts       — Smart copy/cut (Markdown + styled HTML clipboard)
      markdown-paste.ts   — Smart paste (Markdown text → structured content)
  ui/
    App.tsx               — Root component
    StatusBar.tsx         — Status bar (line/col, words, zoom, theme toggle)
    CommandPalette.tsx    — Command palette overlay
    FindReplace.tsx       — Find & replace bar
    SourceView.tsx        — Raw Markdown source view (scroll-synced)
    scroll-sync.ts        — Editor ↔ source view scroll position mapping
    AboutModal.tsx        — About dialog (version info)
    SettingsPanel.tsx     — Settings panel (editor customization, shortcuts)
    Sidebar.tsx           — File tree sidebar with tab bar (Files/Outline)
    OutlineTree.tsx       — Document outline tree (heading hierarchy)
    TabBar.tsx            — Multi-tab bar
  state/
    document.ts           — File path, modified flag, title signals
    theme.ts              — Light/dark/system theme management
    preferences.ts        — Preferences persistence (Tauri IPC)
    ui.ts                 — UI state signals
    tabs.ts               — Multi-tab state management
    filetree.ts           — File tree state and sidebar toggle
    file-watch.ts         — File system watcher for external changes
    shortcuts.ts          — Custom keyboard shortcut management
  commands/
    file-commands.ts      — File operation handlers
    export-commands.ts    — Export action handlers
    registry.ts           — Command registry with fuzzy search
    all-commands.ts       — All registered commands
  export/
    html-template.ts      — HTML document template generation
    export-css.ts         — Bundled CSS for export
    docx-generator.ts     — Word document (.docx) generation from ProseMirror doc
  styles/                 — CSS (variables, editor, app, status-bar, etc.)
src-tauri/
  src/
    main.rs               — Tauri entry point, command handlers
    commands/
      file.rs             — Rust read_file/write_file (atomic writes)
      image.rs            — Rust save_image command
      preferences.rs      — Rust read/write preferences (atomic)
      filetree.rs         — Rust file tree directory listing
.github/
  workflows/
    ci.yml                — CI: cross-platform test + typecheck + build
    release.yml           — Release: auto-changelog + multi-platform Tauri builds
```

## Release History

| Version | Highlights |
|---|---|
| v1.0.0 | Full Markdown editor: inline live rendering, file operations, themes, export, command palette, find & replace |
| v1.1.0–v1.3.7 | Math (KaTeX), review panel, auto-save, font size zoom, UI polish, 8-bug audit, misc fixes |
| v1.3.8–v1.3.12 | Multi-tab, sidebar file tree, block handles, mermaid diagrams, frontmatter, mind map, CI/CD |
| v1.4.0 | Auto-update, settings panel UX, chord keybinding fixes |
| v2.0.0 | Typewriter mode, sentence focus, callout admonitions, block transform menu |
| v2.0.1–v2.1.7 | Mind map zoom/pan, smart copy, editable source view, DOCX export prep, CJK fix, bug fixes |
| v2.2.0–v2.3.1 | DOCX export, document outline sidebar, edge case hardening |
| v2.4.0 | Link popover — click rendered links for compact URL preview with Open, Copy, Edit, Unlink actions |
| v2.4.1 | Find & Replace UX — jump to nearest match on search, pre-fill from selection, auto-advance after replace, re-focus on Cmd+F |
| v2.5.0 | Smart link open — local file links open in-app tabs, external URLs open in browser; works in popover and Cmd+click |
| v2.6.0 | Smart Markdown paste — pasting Markdown text auto-parses into headings, lists, tables, etc.; skips code blocks; detects structural HTML; find & replace scroll fix |
| v2.7.0 | Find & Replace overhaul — per-textblock search for accurate matching, regex support, sticky find bar; welcome beta feedback message; email update |
| v2.8.0 | Feature cleanup — removed mind map, review panel, block handles, block transform, copy as beautiful doc, sentence focus; Cmd+T now toggles focus mode (off/block); simplified focus mode to 2-stage |

## Documentation

- [Tutorial](docs/tutorial.md) — All supported Markdown syntax and features (open in LiveMark)
- [PRD](docs/v2/prd-v2.md) — Product requirements
- [Architecture](docs/v2/architecture-v2.md) — System architecture and module design
- [Roadmap](docs/v2/roadmap-v2.md) — Milestones and progress (M1–M5, M7 complete)
- [Design System](docs/v2/design-system-light-theme.md) — Light theme design system
- [UX Specifications](docs/v2/ux-v2.md) — Interaction flows and component specs
- [Test Plan](docs/v2/testing-v2.md) — Test strategy and test cases
- [Ideas](docs/future/ideas.md) — Feature ideas and future directions
- [Archive](docs/archive/) — Historical V1 planning and reference documents

## License

[AGPL-3.0](LICENSE)
