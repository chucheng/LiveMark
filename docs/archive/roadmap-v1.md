# LiveMark — Development Roadmap

## Overview

LiveMark v1 is developed in 8 milestones, each producing a working (if incomplete) application. Every milestone builds on the previous one and can be demoed independently.

```
M1: Scaffold ──→ M2: Editor Core ──→ M3: Live Rendering ──→ M4: File I/O
                                                                  │
M8: Polish ←── M7: Export ←── M6: Rich Elements ←── M5: Stabilize ←┘
```

## Timeline Estimate

| Milestone | Scope | Status |
|---|---|---|
| M1 — Project Scaffold | Tauri + SolidJS + ProseMirror wired together | **Done** |
| M2 — Core Editor | Basic ProseMirror editor with Markdown schema | **Done** |
| M3 — Live Rendering | Cursor-aware inline rendering for all elements | **Done** |
| M4 — File Operations | Open, save, save-as, new file, CLI args | **Done** |
| M5 — Stabilization & Correctness | Bug fixes, test infrastructure, round-trip tests | **Done** |
| M6 — Rich Elements | Images, tables, code highlighting, task lists | **Done** |
| M7 — Export | HTML export, PDF export, copy-as-HTML, copy-as-Markdown | **Done** |
| M8 — UI Polish & Themes | Light/dark themes, command palette, find/replace, status bar | **Done** |

## Definition of Done for v1

- [x] User can create, open, edit, and save Markdown files
- [x] All CommonMark + GFM elements render inline while typing
- [x] Cursor-aware editing: raw syntax shown on focus, rendered on blur
- [x] Code blocks have syntax highlighting
- [x] Images render inline
- [x] Tables are visually rendered and editable
- [x] Light and dark themes
- [x] HTML export
- [x] PDF export
- [x] View Source mode (Cmd/Ctrl+/ to see raw Markdown)
- [x] Copy as Markdown to clipboard
- [x] Command palette for all actions
- [x] Find and replace
- [x] Undo/redo
- [x] Sub-200ms startup (Tauri native, minimal JS bundle)
- [x] Works on macOS, Windows, Linux (Tauri cross-platform)
- [x] Clean, documented codebase

## Post-v1 Releases

| Version | Features | Status |
|---|---|---|
| v1.1.0 | Math rendering (KaTeX) — inline `$...$` and block `$$...$$`, tight list support | **Done** |
| v1.1.1 | Code block exit/click-below fixes | **Done** |
| v1.2.0 | Review panel — document quality checks | **Done** |
| v1.3.0 | Auto-save with debounce (30s inactivity), preference toggle, status bar indicator | **Done** |

## Post-v1 Candidates

These features are architected for but not yet implemented:

- Multi-tab editing
- Plugin/extension API
- Vim keybindings
- Mermaid diagram rendering
- Custom CSS themes
- File tree sidebar
- YAML frontmatter support
- Spell checking integration
- PDF export (advanced options: page size, margins, headers/footers)
- Auto-update mechanism
- Version history / local snapshots
