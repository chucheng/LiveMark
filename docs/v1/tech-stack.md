# LiveMark — Technology Stack

## Summary

| Layer | Choice | Rationale |
|---|---|---|
| Desktop framework | **Tauri 2.x** | Small binary, native performance, Rust backend |
| Frontend framework | **SolidJS** | Fine-grained reactivity, small bundle, fast |
| Editor engine | **ProseMirror** | Best-in-class for structured rich-text editing |
| Markdown parser | **markdown-it** | Fast, extensible, CommonMark-compliant |
| Math rendering | **KaTeX** | Inline and display math, fast rendering |
| Syntax highlighting | **highlight.js** | Lightweight, 14 languages, runtime highlighting |
| Styling | **Vanilla CSS + CSS Custom Properties** | No runtime overhead, full theming control |
| Build tool | **Vite** | Fast HMR, clean Tauri integration |
| Language | **TypeScript** (frontend), **Rust** (backend) | Type safety + native performance |
| Testing | **Vitest** (unit), **Playwright** (e2e) | Fast, modern, good Tauri support |
| Package manager | **pnpm** | Fast, disk-efficient |

## Desktop Framework: Tauri 2.x

### Why Tauri over Electron

| Factor | Electron | Tauri |
|---|---|---|
| Binary size | ~150MB+ | ~10-20MB |
| Memory usage | ~100-300MB | ~30-80MB |
| Startup time | 500ms-2s | 50-200ms |
| Backend language | Node.js | Rust |
| Security | Chromium sandbox | Strict CSP + Rust safety |
| Native APIs | Via Node | Via Rust plugins |

Tauri wins on every metric that matters for LiveMark: startup speed, memory usage, and binary size. The Rust backend gives us native file system performance.

### Tauri 2.x Specifics
- Uses system WebView (WebKit on macOS, WebView2 on Windows, WebKitGTK on Linux)
- IPC via Tauri commands (Rust functions callable from JS)
- File dialogs via `tauri-plugin-dialog`
- Link opening via `tauri-plugin-shell`
- Clipboard via `tauri-plugin-clipboard-manager`

## Frontend Framework: SolidJS

### Why SolidJS over React/Svelte/Vue

| Factor | React | SolidJS | Svelte |
|---|---|---|---|
| Runtime size | ~40KB | ~7KB | ~2KB (but larger compiled) |
| Reactivity model | Virtual DOM | Fine-grained signals | Compiled reactivity |
| Re-render behavior | Component-level | Signal-level (surgical) | Component-level |
| Editor integration | Good with refs | Excellent — no VDOM overhead | Good |

For a real-time editor, **fine-grained reactivity without a virtual DOM** is critical. SolidJS updates only the exact DOM nodes that change — no diffing overhead.

## Editor Engine: ProseMirror

### Why ProseMirror

ProseMirror is the only editor framework designed for building structured, schema-driven editors with custom rendering. This aligns perfectly with LiveMark's core requirement: rendering Markdown elements inline while maintaining an editable document.

| Factor | ProseMirror | CodeMirror 6 | TipTap | Lexical |
|---|---|---|---|---|
| Schema-driven editing | Yes — core design | No (text-oriented) | Yes (wraps PM) | Partial |
| Custom node rendering | Full control | Limited | Via PM | Via decorators |
| Inline decoration | NodeViews + decorations | Decorations | Via PM | Limited |
| Markdown round-trip | Excellent (prosemirror-markdown) | Manual | Via extensions | Manual |

**Key advantage:** ProseMirror's schema system defines a document model that maps 1:1 to Markdown elements. NodeViews give full control over how each element renders and transitions between "editing" and "rendered" states.

### Why Not CodeMirror 6

CodeMirror is a code/text editor, not a structured document editor. It treats the document as a flat string — not a tree of semantic elements. Building Typora-like inline rendering on CodeMirror would require fighting its architecture.

### Why Not TipTap

TipTap wraps ProseMirror with a more convenient API but adds abstraction that limits low-level control required for custom rendering transitions.

## Markdown Parser: markdown-it

- Full CommonMark compliance
- GFM support via plugins (tables, task lists, strikethrough)
- Extensible plugin system for custom syntax (task lists, math)
- Fast: parses 1MB of Markdown in ~50ms
- Used for initial document parsing (file open) and for HTML export

## Math Rendering: KaTeX

- Inline math (`$...$`) and display math (`$$...$$`)
- Custom markdown-it plugin parses math tokens
- KaTeX CSS embedded in HTML/PDF export
- Fast rendering, no server-side dependencies

## Syntax Highlighting: highlight.js

- 14 languages: JavaScript, TypeScript, Python, Rust, Go, Java, C, C++, HTML, CSS, JSON, Bash, SQL, Ruby
- Runtime highlighting in code block NodeViews
- Highlight overlay layer positioned over ProseMirror's editable content

## Build and Development

- **Vite**: Fast HMR for frontend development, clean integration with Tauri CLI
- **TypeScript**: Strict mode, type-safe frontend
- **pnpm**: Fast installs, strict dependency resolution
- **Vitest**: Jest-compatible but faster, native ESM support
- **Playwright**: End-to-end testing of the actual Tauri window
