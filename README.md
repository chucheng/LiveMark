# LiveMark

**The Markdown editor with built-in AI revision.** Select text, hit a shortcut, get an inline diff — right where you write. No copy-pasting to ChatGPT. No switching tabs. No breaking your flow.

![Version](https://img.shields.io/badge/version-3.3.1-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-AGPL--3.0-green)

## Why LiveMark?

You know the loop: write something, select it, copy, switch to Claude or some chatbot, paste, type "make this better", copy the result, switch back, paste over the original. Repeat for every paragraph. It's tedious.

LiveMark puts AI revision **inside** your editor. Select any text, press `Cmd+J R`, and watch — deletions struck through in red, additions highlighted in green, right on top of your document. Press Enter to accept, Escape to reject. Your original text is never touched until you say so.

And underneath, LiveMark is a full-featured Markdown editor with **inline live rendering** — what you type is what you see. No split panes. No preview toggle. Headings render as headings. Bold renders as bold. Click into any element to see the raw syntax; click away and it renders. The editor *is* the preview.

## AI Revise

- **One shortcut, inline results** — select text, `Cmd+J R`, get a diff you can accept or reject
- **Bring your own API key** — works with [Anthropic](https://www.anthropic.com/) (Claude), [MiniMax](https://www.minimaxi.com/), or any Anthropic-compatible API endpoint
- **Pick your model** — Anthropic: Haiku (fast) / Sonnet (balanced) / Opus (best quality); MiniMax: M2 / M2.5; custom endpoints accept any model name
- **Custom prompts** — "fix grammar", "make concise", "translate to Japanese", "rewrite for a 5-year-old" — whatever you need
- **Your text, your machine** — text goes directly from your machine to the API. No middleman, no proxy, no data collection
- **Safe by design** — original text untouched until you explicitly accept; Cmd+Z to undo; input blocked during revision
- **Formatting preservation** — strips marks before sending to the LLM, then uses diff-based alignment to re-apply **bold**, *italic*, `code`, links, and other formatting to the revised text. Works reliably even with weaker models that strip Markdown
- **Smart guards** — blocks revision on images, tables, code blocks, math, and frontmatter; warns on large selections; adaptive timeout scales with text length

Set it up once in **Settings → AI Revision** (`Cmd+,`) and it just works.

## Editor

- **Inline live rendering** — Markdown transforms visually as you type
- **Cursor-aware editing** — raw syntax shown on focus, rendered on blur
- **CommonMark + GFM** — headings, bold, italic, strikethrough, code, blockquotes, lists, links, images, tables, task lists, horizontal rules
- **Syntax highlighting** — 14 languages in fenced code blocks (JS, TS, Python, Rust, Go, Java, C/C++, HTML, CSS, JSON, Bash, SQL, Ruby)
- **Math rendering** — inline `$...$` and block `$$...$$` with KaTeX
- **Mermaid diagrams** — fenced code blocks with `mermaid` language render as interactive diagrams
- **YAML frontmatter** — parse, edit, and serialize frontmatter blocks
- **Table editing** — visual tables with Tab navigation between cells
- **Task list checkboxes** — clickable checkboxes that toggle state
- **Image preview** — inline rendering, drag-and-drop, paste, or Cmd+Shift+I to insert from disk
- **Link popover** — click any rendered link for Open, Copy, Edit, and Unlink actions
- **Smart links** — local file links open in a tab; external URLs open in browser
- **Find & replace** — Cmd+F with regex, case-sensitive toggle, replace-all; per-textblock search for tables and nested lists
- **Italic-to-bold upgrade** — type `*text*` to get italic, then type `*` to upgrade to bold; also supports `_text_` for italic
- **Full keyboard workflow** — Cmd+B/I for bold/italic, Markdown shortcuts, undo/redo
- **Large file support** — IntersectionObserver-based lazy rendering

## Writing Experience

- **Focus mode** (`Cmd+T`) — dims every block except the one you're writing in
- **Typewriter mode** — keeps your cursor vertically centered as you type
- **Fullscreen** — titlebar, status bar, and sidebar auto-hide; move your mouse to the edges to bring them back
- **Font size zoom** — Cmd+=/Cmd+-/Cmd+0 (12–28px, persisted)

## File & Project

- **Click-to-rename** — click the filename in the titlebar to rename the file inline
- **Multi-tab** — open multiple files with per-tab editor state
- **Sidebar file tree** (`Cmd+\`) — navigate your project without leaving the editor
- **Document outline** (`Cmd+Shift+O`) — heading tree with active tracking and click-to-navigate
- **Auto-save** — 30s after last edit, toggleable from status bar
- Open, save, save-as, new file (Cmd+O/S/Shift+S/N)
- CLI argument support (`livemark file.md`)
- Unsaved changes protection on close

## Export

- **Word document** (Cmd+Shift+D) — `.docx` with headings, lists, tables, code blocks, math, and images
- **HTML** (Cmd+Shift+E) — standalone file with embedded styles
- **PDF** (Cmd+P) — opens in browser for print/save
- **Smart copy** — copy produces Markdown as text/plain + styled HTML as text/html; paste Markdown and it auto-renders
- Copy as HTML (Cmd+Shift+C) · Copy as Markdown (Cmd+Alt+C)

## UI

- **Light & dark themes** — system-follow or manual toggle (Cmd+Shift+T)
- **Command palette** (Cmd+Shift+P) — fuzzy search across all actions
- **Source view** (Cmd+/) — toggle raw Markdown, scroll-synced
- **Callout admonitions** — `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!CAUTION]`, `> [!IMPORTANT]`
- **Status bar** — line/column, selection count, word count, zoom %, encoding, theme

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+J R` | **AI: Revise Selection** |
| `Cmd+T` | Toggle Focus Mode |
| `Cmd+/` | Toggle Source View |
| `Cmd+\` | Toggle Sidebar |
| `Cmd+Shift+O` | Document Outline |
| `Cmd+Shift+P` | Command Palette |
| `Cmd+K` | Insert Link |
| `Cmd+Shift+I` | Insert Image |
| `Cmd+F` | Find & Replace |
| `Cmd+,` | Settings |

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
    ai-format-preservation.ts — Diff-based mark extraction and re-application for AI revision
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
      ai-revise.ts        — AI revision inline diff plugin
      find-replace.ts     — Search decorations + match navigation
      placeholder.ts      — Empty doc placeholder
      link-click.ts       — Cmd+click opens links (smart local/external)
      link-helpers.ts     — Shared link detection and path resolution
      link-popover.ts     — Link popover (Open, Copy, Edit, Unlink)
      italic-bold-upgrade.ts — Italic-to-bold upgrade on extra `*`
      image-drop-paste.ts — Image drag-drop/paste handler
      inline-decorations.ts — Inline mark decorations
      lazy-render.ts      — IntersectionObserver-based lazy rendering
      trailing-paragraph.ts — Ensures doc ends with paragraph
      typewriter.ts       — Typewriter mode (cursor vertical centering)
      smart-copy.ts       — Smart copy/cut (Markdown + styled HTML clipboard)
      markdown-paste.ts   — Smart paste (Markdown text → structured content)
      italic-bold-upgrade.ts — Upgrades *italic* → **bold** when typing another *
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
    ai-commands.ts        — AI revision command handler
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
      ai.rs               — Rust AI revision HTTP command (Anthropic-compatible API, multi-provider)
      file.rs             — Rust read_file/write_file (atomic writes)
      image.rs            — Rust save_image/copy_image commands
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
| v1.1–v1.4 | Math (KaTeX), auto-save, font zoom, multi-tab, sidebar file tree, mermaid diagrams, frontmatter, settings panel |
| v2.0–v2.3 | Typewriter mode, callout admonitions, smart copy/paste, DOCX export, document outline, link popover |
| v2.4–v2.7 | Smart link open (local files in-app, URLs in browser), regex find & replace, per-textblock search |
| v2.8 | Feature cleanup, warm paper theme, auto-save safety, insert image (Cmd+Shift+I), macOS file association fixes |
| **v3.0** | **AI Revise** — select text, Cmd+J R, inline diff with accept/reject. Bring your own API key (Anthropic, MiniMax, or compatible). Custom prompts, safe diff workflow, full dark mode support |
| **v3.1** | AI multi-provider & model selection — per-provider model dropdown, correct MiniMax endpoint, thinking-block-aware response parsing |
| **v3.2.0** | **AI Revise hardening** — selection validation (blocks images/tables/code), adaptive timeout, gradient shimmer + loading pill, input blocking during revision, source view tab-switch fix |
| v3.2.1 | Markdown-aware AI revision (preserves formatting), dark mode diff readability, AI revise test suite, README & welcome rewrite |
| v3.2.2 | Source view guard — editor-only commands (AI Revise, Find, Insert Link/Image) show a helpful message instead of silently failing |
| v3.2.3 | AI diff widget renders Markdown formatting (bold, italic, code, links) instead of showing raw syntax |
| v3.2.4 | AI formatting preservation — post-processor re-applies **bold**/*italic*/`code` stripped by the LLM; improved AI prompt; italic-to-bold upgrade (`*text*` → `**text**`); `_italic_` input rule |
| v3.2.5 | Fix bold input rule character corruption — `**wrong*` + `*` no longer loses the last character before the closing marker |
| v3.2.6 | **Diff-based formatting preservation** — strips marks before LLM, re-applies via `diff-match-patch` alignment; code spans protected with `{{CODE_N}}` placeholders; works reliably with weaker models |
| v3.2.7 | Empty heading exits to paragraph on Enter (Typora-style); outline sidebar scales with zoom level |
| **v3.3.0** | **Click-to-rename** — click the filename in the titlebar to rename the file inline; Escape cancels, Enter/blur confirms; untitled files trigger Save As |
| v3.3.1 | Heading level adjustment — Backspace at start of heading decreases level (H2→H1→paragraph); `# ` inside a heading increases level (H1→H2→…→H6) |

## Documentation

- [Tutorial](docs/tutorial.md) — All supported Markdown syntax and features (open in LiveMark)
- [AI Revise PRD](docs/v3/prd.md) — AI Revise product requirements
- [AI Revise UX](docs/v3/ux-design.md) — Interaction flows and visual states
- [AI Revise Implementation](docs/v3/implementation.md) — Architecture and implementation plan
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
