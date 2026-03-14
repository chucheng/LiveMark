# LiveMark

A fast, distraction-free Markdown editor where what you type is what you see — no split panes, no preview toggle, just writing.

![Version](https://img.shields.io/badge/version-2.4.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

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
- **Block handles** — hover any block for drag-to-move, context menu (move/duplicate/delete/copy link), and insert-new-block picker
- **Link popover** — click any rendered link for a compact popover with Open, Copy, Edit, and Unlink actions
- **Clickable links** — Cmd/Ctrl+click opens in default browser
- **Find & replace** — Cmd+F with selection pre-fill, jumps to nearest match, regex and case-sensitive toggles, replace all
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
- **Mind map view** — Cmd+T, document headings as an interactive mind map with zoom/pan (scroll wheel, drag, keyboard)
- **Command palette** — Cmd+Shift+P, fuzzy search across all actions
- **Source view** — Cmd+/ toggles read-only raw Markdown
- **Focus mode** — Cmd+J F cycles off → block → sentence focus (dims inactive blocks or non-active sentences)
- **Typewriter mode** — keeps cursor vertically centered as you type
- **Callout admonitions** — `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!CAUTION]`, `> [!IMPORTANT]` with styled badges and type dropdown
- **Block transform** — right-click any block handle → "Turn Into" to convert between paragraph, heading, blockquote, code block, and list types
- **Review panel** — Cmd+Shift+R, document quality checks (headings, images, links, code blocks)
- **Font size zoom** — Cmd+=/Cmd+-/Cmd+0 to increase, decrease, reset (12–28px, persisted)
- **Status bar** — line/column, selection count, word count, zoom %, encoding, theme toggle

### Export
- HTML export (Cmd+Shift+E) — standalone file with embedded styles
- **Word document export** (Cmd+Shift+D) — `.docx` with headings, lists, tables, code blocks, math, and images
- PDF export (Cmd+P) — opens in browser for print/save-as-PDF
- Copy as HTML (Cmd+Shift+C)
- Copy as Markdown (Cmd+Alt+C) — selection-aware
- Copy as Beautiful Doc — styled HTML for pasting into rich editors
- **Smart copy** — copy/cut produces Markdown as text/plain + styled HTML as text/html

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
| `Cmd+J F` | Cycle Focus Mode (off → block → sentence) |
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
    mind-map.ts           — Heading extraction and mermaid mind map generation
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
      block-handles.ts    — Block hover handles (drag, context menu, copy link)
      heading-collapse.ts — Heading fold/unfold
      find-replace.ts     — Search decorations + match navigation
      placeholder.ts      — Empty doc placeholder
      link-click.ts       — Cmd+click opens links
      link-popover.ts     — Link popover (Open, Copy, Edit, Unlink)
      image-drop-paste.ts — Image drag-drop/paste handler
      inline-decorations.ts — Inline mark decorations
      lazy-render.ts      — IntersectionObserver-based lazy rendering
      trailing-paragraph.ts — Ensures doc ends with paragraph
      typewriter.ts       — Typewriter mode (cursor vertical centering)
      sentence-focus.ts   — Sentence-level focus mode decorations
      smart-copy.ts       — Smart copy/cut (Markdown + styled HTML clipboard)
  ui/
    App.tsx               — Root component
    StatusBar.tsx         — Status bar (line/col, words, zoom, theme toggle)
    CommandPalette.tsx    — Command palette overlay
    FindReplace.tsx       — Find & replace bar
    SourceView.tsx        — Raw Markdown source view (scroll-synced)
    scroll-sync.ts        — Editor ↔ source view scroll position mapping
    AboutModal.tsx        — About dialog (version info)
    ReviewPanel.tsx       — Document review panel
    BlockContextMenu.tsx  — Block handle right-click context menu
    BlockTypePicker.tsx   — Block type insertion picker (+ button)
    MindMap.tsx           — Mind map view overlay (Cmd+T)
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
  review/
    engine.ts             — Document analysis engine (quality checks)
  export/
    html-template.ts      — HTML document template generation
    export-css.ts         — Bundled CSS for export
    beautiful-doc.ts      — Styled HTML for rich clipboard copy
    docx-generator.ts     — Word document (.docx) generation from ProseMirror doc
  styles/                 — CSS (variables, editor, app, status-bar, block-handles, etc.)
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
| v1.1.0 | Math rendering (KaTeX — `$...$` and `$$...$$`), tight list support |
| v1.1.1 | Code block exit and click-below behavior fixes |
| v1.2.0 | Review panel — document quality checks with premium minimal UI |
| v1.3.0 | Auto-save — 30s debounce, preference toggle, status bar indicator |
| v1.3.1 | Fix task list checkbox toggle and macOS window close button |
| v1.3.2 | Remove app name from titlebar, center filename horizontally |
| v1.3.3 | UI polish — refined design system, deep graphite dark mode, premium surfaces |
| v1.3.4–v1.3.6 | Code block overlay alignment, inline mark decoration, scroll sync fixes |
| v1.3.7 | Codebase review — 8 bug fixes (image error handling, PDF export race, save_image sanitization, preferences validation, find-replace ReDoS protection, scroll sync refactor) |
| v1.3.8 | Upgrade Rust edition to 2024, docs reorganization (tutorial promoted to top-level) |
| v1.3.9 | Font size zoom — Cmd+=/Cmd+-/Cmd+0 to increase, decrease, reset editor font size (persisted) |
| v1.3.10 | CLAUDE.md project guidance, dependency updates |
| v1.3.11 | Multi-tab, sidebar file tree, block handles, mermaid diagrams, frontmatter, mind map, CI/CD pipeline |
| v1.3.12 | Version sync script, v2 roadmap update, ideas cleanup |
| v1.4.0 | Auto-update — in-app update banner via tauri-plugin-updater, settings panel UX improvements, chord keybinding fixes |
| v2.0.0 | Typewriter mode, sentence focus, callout admonitions, block transform menu, block handles chord shortcuts |
| v2.0.1 | Bug audit — fix sentence focus inside blockquotes/lists, inline atom offset mapping, callout empty body, badge DOM placement, remove dead shortcut |
| v2.0.2 | Fix PDF export (open in browser instead of broken iframe print), 50 MB file size guard, export reentrancy lock |
| v2.1.0 | Mind map zoom/pan (scroll wheel, drag, keyboard, header controls), custom Mermaid color palette, click-to-navigate scroll positioning, resilience hardening (tab/file/image limits, debouncing, URL filtering) |
| v2.1.1 | Sync tauri.conf.json version, bump mermaid render debounce |
| v2.1.2 | Quit app on macOS when window closed via X button, graceful read-only file handling |
| v2.1.3 | Show Tutorial command in command palette, read-only indicator in status bar and title bar |
| v2.1.4 | Fix CJK characters clipped in headings |
| v2.1.5 | Source view is now editable with cursor position sync |
| v2.1.6 | In-app feedback flow: Send Feedback command, enjoyment prompt after 7 launches |
| v2.1.7 | Smart copy (Markdown as text/plain + styled HTML), callout type dropdown, HTML `<img>` width support |
| v2.2.0 | DOCX export — Word document generation with headings, lists, tables, code blocks, math, images, and task lists |
| v2.2.1 | Edge case hardening — auto-save failure feedback, external file deletion detection, disk-full error guidance, unsupported file drop feedback, improved encoding error messages |
| v2.2.2 | Remove two-column layout mode for simplicity |
| v2.3.0 | Document outline — sidebar tab with heading tree, active heading tracking, click-to-navigate (Cmd+Shift+O) |
| v2.3.1 | Add DOCX to welcome.md export list |
| v2.4.0 | Link popover — click rendered links for compact URL preview with Open, Copy, Edit, Unlink actions |
| v2.4.1 | Find & Replace UX — jump to nearest match on search, pre-fill from selection, auto-advance after replace, re-focus on Cmd+F |

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

[MIT](LICENSE)
