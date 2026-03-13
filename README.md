# LiveMark

A fast, distraction-free Markdown editor where what you type is what you see — no split panes, no preview toggle, just writing.

![Version](https://img.shields.io/badge/version-1.3.2-blue)
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
- **Table editing** — visual tables with Tab navigation between cells
- **Task list checkboxes** — clickable checkboxes that toggle state
- **Image preview** — inline rendering, drag-and-drop or paste to insert
- **Clickable links** — Cmd/Ctrl+click opens in default browser
- **Find & replace** — Cmd+F, regex and case-sensitive toggles, replace all
- **Full keyboard workflow** — Cmd+B/I for bold/italic, Markdown shortcuts (`# `, `> `, `- [ ] `), undo/redo

### File Operations
- Open, save, save-as, new file (Cmd+O/S/Shift+S/N)
- **Auto-save** — 30s after last edit, toggleable from status bar
- CLI argument support (`livemark file.md`)
- Unsaved changes protection on close

### UI
- **Light & dark themes** — system-follow or manual toggle (Cmd+Shift+T), persisted
- **Command palette** — Cmd+Shift+P, fuzzy search across all actions
- **Source view** — Cmd+/ toggles read-only raw Markdown
- **Focus mode** — Cmd+Shift+F dims inactive blocks
- **Review panel** — Cmd+Shift+R, document quality checks (headings, images, links, code blocks)
- **Status bar** — line/column, selection count, word count, encoding, theme toggle

### Export
- HTML export (Cmd+Shift+E) — standalone file with embedded styles
- PDF export (Cmd+P) — via system print dialog
- Copy as HTML (Cmd+Shift+C)
- Copy as Markdown (Cmd+Alt+C)

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
    markdown/
      parser.ts           — markdown-it → ProseMirror document
      serializer.ts       — ProseMirror document → Markdown string
      task-list-plugin.ts — Custom markdown-it plugin for task lists
      math-plugin.ts      — Custom markdown-it plugin for math ($, $$)
    nodeviews/            — Cursor-aware NodeViews (heading, code-block, blockquote, math, etc.)
    plugins/
      live-render.ts      — Active block detection + decorations
      find-replace.ts     — Search decorations + match navigation
      placeholder.ts      — Empty doc placeholder
      link-click.ts       — Cmd+click opens links
      image-drop-paste.ts — Image drag-drop/paste handler
      trailing-paragraph.ts — Ensures doc ends with paragraph (click below blocks)
  ui/
    App.tsx               — Root component
    StatusBar.tsx         — Status bar (line/col, words, theme toggle)
    CommandPalette.tsx    — Command palette overlay
    FindReplace.tsx       — Find & replace bar
    SourceView.tsx        — Raw Markdown source view
    AboutModal.tsx        — About dialog (version info)
    ReviewPanel.tsx       — Document review panel
  state/
    document.ts           — File path, modified flag, title signals
    theme.ts              — Light/dark/system theme management
    preferences.ts        — Preferences persistence (Tauri IPC)
    ui.ts                 — UI state signals
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
  styles/                 — CSS (variables, editor, app, status-bar, command-palette, etc.)
src-tauri/
  src/
    main.rs               — Tauri entry point, command handlers
    commands/
      file.rs             — Rust read_file/write_file (atomic writes)
      image.rs            — Rust save_image command
      preferences.rs      — Rust read/write preferences (atomic)
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

## Future Candidates

- Multi-tab / multi-file editing
- Plugin/extension API
- Vim/Emacs keybindings
- Mermaid diagram rendering
- Custom CSS themes
- File tree sidebar
- YAML frontmatter support
- Recent files list
- Spell checking
- Version history / local snapshots
- Auto-update mechanism

## Documentation

Detailed design docs live in [`docs/`](docs/):

- [VISION.md](docs/VISION.md) — Product vision and target users
- [PRD.md](docs/PRD.md) — v1 feature spec and requirements
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture and data flows
- [SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) — Document model, state machine, serialization
- [TECH_STACK.md](docs/TECH_STACK.md) — Technology choices with comparison tables
- [TECH_DECISIONS.md](docs/TECH_DECISIONS.md) — Architecture Decision Records
- [UX_PRINCIPLES.md](docs/UX_PRINCIPLES.md) — Design principles and visual guidelines
- [USER_FLOWS.md](docs/USER_FLOWS.md) — Detailed user interaction flows
- [ROADMAP.md](docs/ROADMAP.md) — Development roadmap
- [MILESTONES.md](docs/MILESTONES.md) — Detailed milestone specs
- [UI_TEST_PLAN.md](docs/UI_TEST_PLAN.md) — Manual UI testing checklist
- [tutorial.md](docs/tutorial.md) — Getting started tutorial for new users

## License

[MIT](LICENSE)
