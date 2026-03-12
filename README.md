# LiveMark

A fast, distraction-free Markdown editor where what you type is what you see — no split panes, no preview toggle, just writing.

![Status](https://img.shields.io/badge/status-in%20development-orange)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## What is LiveMark?

LiveMark renders Markdown **inline as you type**. Headings become headings. Bold becomes bold. Links become clickable. There is no preview — the editor *is* the preview.

When your cursor enters a Markdown element, the raw syntax is revealed for editing. When you move away, it renders. The transition is instant and seamless.

### Key Features

- **Inline live rendering** — Markdown transforms visually as you type
- **Cursor-aware editing** — raw syntax shown on focus, rendered on blur
- **Native performance** — Tauri-powered, sub-200ms cold start
- **Lightweight** — ~10-20MB binary, ~30-80MB memory
- **CommonMark + GFM** — headings, bold, italic, code blocks, lists, blockquotes, links, images, tables, task lists
- **Task list checkboxes** — clickable checkboxes that toggle checked state
- **Clickable links** — Cmd/Ctrl+click opens links in your default browser
- **Image preview** — images render inline; drag-and-drop or paste to insert
- **Syntax highlighting** — 14 languages highlighted in code blocks (JS, TS, Python, Rust, Go, Java, C/C++, HTML, CSS, JSON, Bash, SQL, Ruby)
- **Table editing** — visual tables with Tab navigation between cells
- **Full keyboard workflow** — Cmd/Ctrl+B (bold), Cmd/Ctrl+I (italic), Markdown shortcuts like `# `, `> `, `- [ ] `
- **File operations** — open, save, save-as, new file, CLI arg support, unsaved changes protection
- **Export** — HTML export (Cmd+Shift+E), PDF via print dialog (Cmd+P), copy as HTML (Cmd+Shift+C), copy as Markdown (Cmd+Alt+C)
- **Cross-platform** — macOS, Windows, Linux

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | [Tauri 2.x](https://v2.tauri.app/) (Rust) |
| UI framework | [SolidJS](https://www.solidjs.com/) |
| Editor engine | [ProseMirror](https://prosemirror.net/) + [prosemirror-tables](https://github.com/ProseMirror/prosemirror-tables) |
| Markdown parser | [markdown-it](https://github.com/markdown-it/markdown-it) |
| Syntax highlighting | [highlight.js](https://highlightjs.org/) (14 languages) |
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
# Clone the repo
git clone https://github.com/chucheng/LiveMark.git
cd LiveMark

# Install dependencies
pnpm install

# Run in development mode (with hot reload)
pnpm tauri dev

# Open a file directly
pnpm tauri dev -- -- path/to/file.md
```

### Build

```bash
pnpm tauri build
```

The output binary is in `src-tauri/target/release/`.

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
│  │   File I/O (atomic) · OS dialogs      │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**How it works:**

1. **Opening a file** — Rust reads the file → markdown-it parses to ProseMirror document → NodeViews render it
2. **Typing** — ProseMirror handles input → input rules detect Markdown patterns → live-render plugin shows/hides syntax based on cursor position
3. **Saving** — ProseMirror document serializes to Markdown string → Rust writes atomically to disk

## Project Structure

```
src/
  editor/
    schema.ts             — ProseMirror schema (1:1 Markdown mapping)
    editor.ts             — Editor init, getMarkdown/setMarkdown API
    highlight.ts          — highlight.js wrapper (syntax highlighting)
    input-rules.ts        — Auto-transforms (# heading, **bold**, - [ ], etc.)
    keymaps.ts            — Keyboard shortcuts (Tab for tables + lists)
    markdown/
      parser.ts           — markdown-it → ProseMirror document
      serializer.ts       — ProseMirror document → Markdown string
      task-list-plugin.ts — Custom markdown-it plugin for task lists
    nodeviews/
      heading.ts          — Heading NodeView
      code-block.ts       — Code block with syntax highlight overlay
      blockquote.ts       — Blockquote NodeView
      horizontal-rule.ts  — Horizontal rule NodeView
      task-list-item.ts   — Task list item with checkbox
      image.ts            — Image inline preview
    plugins/
      placeholder.ts      — Empty doc placeholder
      link-click.ts       — Cmd+click opens links in browser
      image-drop-paste.ts — Image drag-drop/paste handler
  ui/
    App.tsx               — Root SolidJS component
  state/
    document.ts           — File path, modified flag, title signals
  export/
    html-template.ts      — HTML document template generation
    export-css.ts         — Bundled CSS for export
  commands/
    file-commands.ts      — Open/save/saveAs/new file handlers
    export-commands.ts    — Export action handlers (HTML, PDF, clipboard)
src-tauri/
  src/
    main.rs               — Tauri entry point, command handlers
    commands/
      file.rs             — Rust read_file/write_file (atomic writes)
      image.rs            — Rust save_image command
```

## Roadmap

| Milestone | Description | Status |
|---|---|---|
| M1 — Scaffold | Tauri + SolidJS + ProseMirror wired together | Done |
| M2 — Core Editor | Full Markdown schema, parser, serializer, input rules | Done |
| M3 — Live Rendering | Cursor-aware inline rendering for all elements | Done |
| M4 — File Operations | Open, save, save-as, new file, CLI args | Done |
| M5 — Stabilization | Round-trip tests, bug fixes, error handling | Done |
| M6 — Rich Elements | Images, tables, syntax highlighting, task lists | Done |
| M7 — Export | HTML export, PDF export, copy-as-HTML, copy-as-Markdown | Done |
| M8 — UI Polish | Themes, command palette, find/replace, status bar | Planned |

See [docs/MILESTONES.md](docs/MILESTONES.md) for detailed milestone specs and [docs/ROADMAP.md](docs/ROADMAP.md) for the full roadmap.

## Documentation

Detailed design documentation lives in [`docs/`](docs/):

- [VISION.md](docs/VISION.md) — Product vision and target users
- [PRD.md](docs/PRD.md) — v1 feature spec and requirements
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture and data flows
- [SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) — Document model, state machine, serialization
- [TECH_STACK.md](docs/TECH_STACK.md) — Technology choices with comparison tables
- [TECH_DECISIONS.md](docs/TECH_DECISIONS.md) — Architecture Decision Records
- [UX_PRINCIPLES.md](docs/UX_PRINCIPLES.md) — Design principles and visual guidelines
- [USER_FLOWS.md](docs/USER_FLOWS.md) — Detailed user interaction flows

## License

[MIT](LICENSE)
