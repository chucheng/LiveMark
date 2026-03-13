# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is LiveMark

A Typora-style desktop Markdown editor: inline live-preview with no split pane. Markdown renders as you type; cursor entering an element reveals raw syntax for editing. Built with Tauri 2.x (Rust backend) + SolidJS + ProseMirror.

## Commands

```bash
pnpm install          # Install dependencies
pnpm tauri dev        # Run the app in development mode (Vite dev server + Tauri window)
pnpm tauri build      # Production build
pnpm build:dmg        # Build macOS DMG bundle
pnpm test             # Run tests (vitest, non-watch)
pnpm test:watch       # Run tests in watch mode
pnpm build            # TypeScript check + Vite frontend build only (no Tauri)
```

Open a file directly in dev: `pnpm tauri dev -- -- path/to/file.md`

Tests live in `src/editor/markdown/__tests__/` — run a single test file with `pnpm vitest run src/editor/markdown/__tests__/round-trip.test.ts`.

## Architecture

**Three-layer stack:**
1. **UI Layer (SolidJS)** — `src/ui/` — App shell, status bar, command palette, overlays. State managed via SolidJS signals in `src/state/` (no external state library).
2. **Editor Core (ProseMirror)** — `src/editor/` — The heart of the app. Schema maps 1:1 to Markdown elements. NodeViews provide cursor-aware dual render/edit modes (the key "live preview" behavior). Plugins handle decorations, find-replace, image drop/paste, link clicks.
3. **Backend (Rust/Tauri)** — `src-tauri/` — File I/O (atomic writes), image saving, preferences persistence, OS dialog/clipboard/shell integration via Tauri plugins. Frontend talks to backend via Tauri IPC (`invoke`).

**Markdown round-trip pipeline:**
- **Parse:** `markdown-it` → ProseMirror document (`src/editor/markdown/parser.ts`)
- **Serialize:** ProseMirror document → Markdown string (`src/editor/markdown/serializer.ts`)
- Custom markdown-it plugins extend parsing for task lists and math (`$`, `$$`)

**NodeViews** (`src/editor/nodeviews/`) are central to the live-render UX. Each block type (heading, code block, blockquote, math, image, task list item) has a NodeView that switches between rendered HTML and editable raw syntax based on cursor position. Code blocks use a dual-layer approach: editable `contentDOM` + highlight.js overlay.

**Command system:** Commands are registered in `src/commands/registry.ts` with keyboard shortcuts and metadata. `src/commands/all-commands.ts` wires everything together. The command palette (`Cmd+Shift+P`) does fuzzy search over this registry.

## Key Conventions

- **Path alias:** `@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.json`)
- **Version sync:** `package.json` and `src-tauri/Cargo.toml` versions must stay in sync on version bumps
- **Atomic writes:** All file writes in Rust use write-to-temp-then-rename for crash safety
- **No external state library:** All reactive state uses SolidJS signals directly
- **JSX:** SolidJS JSX (`jsxImportSource: "solid-js"`) — not React. Components use `createSignal`, `createEffect`, `onMount`, etc.
