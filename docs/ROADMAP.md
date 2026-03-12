# LiveMark — Development Roadmap

## Overview

LiveMark v1 is developed in 7 milestones, each producing a working (if incomplete) application. Every milestone builds on the previous one and can be demoed independently.

```
M1: Scaffold ──→ M2: Editor Core ──→ M3: Live Rendering ──→ M4: File I/O
                                                                  │
M7: Polish ←── M6: Export ←── M5: Rich Elements ←─────────────────┘
```

## Timeline Estimate

| Milestone | Scope |
|---|---|
| M1 — Project Scaffold | Tauri + SolidJS + ProseMirror wired together |
| M2 — Core Editor | Basic ProseMirror editor with Markdown schema |
| M3 — Live Rendering | Cursor-aware inline rendering for all elements |
| M4 — File Operations | Open, save, save-as, new file, recent files |
| M5 — Rich Elements | Images, tables, code highlighting, task lists |
| M6 — Export | HTML export, copy-as-HTML |
| M7 — UI Polish & Themes | Light/dark themes, command palette, find/replace, status bar |

## Definition of Done for v1

- [ ] User can create, open, edit, and save Markdown files
- [ ] All CommonMark + GFM elements render inline while typing
- [ ] Cursor-aware editing: raw syntax shown on focus, rendered on blur
- [ ] Code blocks have syntax highlighting
- [ ] Images render inline
- [ ] Tables are visually rendered and editable
- [ ] Light and dark themes
- [ ] HTML export
- [ ] View Source mode (Cmd/Ctrl+/ to see raw Markdown)
- [ ] Copy as Markdown to clipboard
- [ ] Command palette for all actions
- [ ] Find and replace
- [ ] Undo/redo
- [ ] Sub-200ms startup
- [ ] Works on macOS, Windows, Linux
- [ ] Clean, documented codebase

## Post-v1 Candidates

These features are architected for but not implemented in v1:

- Multi-tab editing
- Plugin/extension API
- Vim keybindings
- Mermaid diagram rendering
- Math (KaTeX) rendering
- Custom CSS themes
- File tree sidebar
- YAML frontmatter support
- Spell checking integration
- PDF export
- Auto-update mechanism
- Version history / local snapshots
