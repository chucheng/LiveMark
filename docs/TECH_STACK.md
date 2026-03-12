# LiveMark — Technology Stack

## Summary

| Layer | Choice | Rationale |
|---|---|---|
| Desktop framework | **Tauri 2.x** | Small binary, native performance, Rust backend |
| Frontend framework | **SolidJS** | Fine-grained reactivity, small bundle, fast |
| Editor engine | **ProseMirror** | Best-in-class for structured rich-text editing |
| Markdown parser | **markdown-it** | Fast, extensible, CommonMark-compliant |
| Syntax highlighting | **Shiki** (via WASM) | Accurate, VS Code-quality highlighting |
| Styling | **Vanilla CSS + CSS Modules** | No runtime overhead, full control |
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

Tauri wins on every metric that matters for LiveMark: startup speed, memory usage, and binary size. The Rust backend gives us native file system performance and a path to compute-heavy features (e.g., incremental parsing) in the future.

### Tauri 2.x specifics
- Uses system WebView (WebKit on macOS, WebView2 on Windows, WebKitGTK on Linux)
- IPC via Tauri commands (Rust functions callable from JS)
- File system access via Tauri's fs plugin with scoped permissions
- Window management via Tauri's window API

## Frontend Framework: SolidJS

### Why SolidJS over React/Svelte/Vue

| Factor | React | SolidJS | Svelte |
|---|---|---|---|
| Runtime size | ~40KB | ~7KB | ~2KB (but larger compiled) |
| Reactivity model | Virtual DOM | Fine-grained signals | Compiled reactivity |
| Re-render behavior | Component-level | Signal-level (surgical) | Component-level |
| Editor integration | Good with refs | Excellent — no VDOM overhead | Good |

For a real-time editor, **fine-grained reactivity without a virtual DOM** is critical. SolidJS updates only the exact DOM nodes that change — no diffing overhead. This matters when every keystroke triggers UI updates.

SolidJS also has a small ecosystem concern, but for a focused desktop app (not a web app with complex routing), the ecosystem gap is minimal.

## Editor Engine: ProseMirror

### Why ProseMirror

ProseMirror is the only editor framework designed for building structured, schema-driven editors with custom rendering. This aligns perfectly with LiveMark's core requirement: rendering Markdown elements inline while maintaining an editable document.

| Factor | ProseMirror | CodeMirror 6 | TipTap | Lexical |
|---|---|---|---|---|
| Schema-driven editing | Yes — core design | No (text-oriented) | Yes (wraps PM) | Partial |
| Custom node rendering | Full control | Limited | Via PM | Via decorators |
| Inline decoration | NodeViews + decorations | Decorations | Via PM | Limited |
| Markdown round-trip | Excellent (prosemirror-markdown) | Manual | Via extensions | Manual |
| Cursor management | Built-in, robust | Built-in | Via PM | Built-in |
| Community maturity | 8+ years | 4+ years (v6) | 4+ years | 3+ years |
| Bundle size | ~80KB | ~120KB | ~100KB+ | ~30KB |

**Key advantage:** ProseMirror's schema system lets us define a document model that maps 1:1 to Markdown elements. Each element (heading, paragraph, code block, etc.) is a typed node with defined behavior. NodeViews give us full control over how each element renders and transitions between "editing" and "rendered" states.

### Why not CodeMirror 6

CodeMirror is a code/text editor, not a structured document editor. While it excels at syntax highlighting and text manipulation, it treats the document as a flat string — not a tree of semantic elements. Building Typora-like inline rendering on CodeMirror would require fighting its architecture.

### Why not TipTap

TipTap wraps ProseMirror with a more convenient API. However, it adds abstraction that we don't need and may limit the low-level control required for custom rendering transitions. Using ProseMirror directly gives us full control while keeping the dependency chain short.

## Markdown Parser: markdown-it

### Why markdown-it

- Full CommonMark compliance
- GFM support via plugins (tables, task lists, strikethrough)
- Extensible plugin system for custom syntax
- Fast: parses 1MB of Markdown in ~50ms
- Mature: 10+ years, widely used

We use markdown-it for **initial document parsing** (file open) and for **export**. During editing, ProseMirror's internal document model is the source of truth — we don't re-parse the entire document on every keystroke.

## Syntax Highlighting: Shiki

Shiki provides VS Code-quality syntax highlighting using TextMate grammars. The WASM version runs in the browser without a server. It supports 200+ languages and produces semantic token output that we can render as styled spans.

For v1, we load languages lazily — only when a code block with that language is encountered.

## Build and Development

- **Vite**: Fast HMR for frontend development, clean integration with Tauri CLI
- **TypeScript**: Strict mode, no `any` allowed in production code
- **pnpm**: Workspace support for potential future packages, fast installs
- **Vitest**: Jest-compatible but much faster, native ESM support
- **Playwright**: End-to-end testing of the actual Tauri window
