# LiveMark v2 — Development Roadmap

## Overview

v2 is developed in 7 milestones. Each produces a working, demoable increment. Infrastructure milestones (M1, M7) can be parallelized with feature work.

```
M1: CI/CD ─────────────────────────────────────────────────── (parallel)
                                                                │
M2: Multi-Tab ──→ M3: File Tree ──→ M5: Rich Features         │
                       │                    │                   │
                       └───→ M4: Block ─────┘                  │
                              Handles                           │
                                            │                   │
                                      M6: Polish ──→ M7: Auto-Update
```

**Critical path:** M2 → M3 → M5 → M6 → M7

---

## Milestones

### M1 — CI/CD Pipeline (Complexity: M)

**Scope:**
- GitHub Actions workflow for CI: build + test on macOS, Windows, Linux on every PR
- GitHub Actions workflow for release: build + sign + publish on git tag
- Automated changelog generation from conventional commits
- Cross-platform test matrix (Vitest on all platforms)

**Dependencies:** None — can start immediately, runs in parallel with all other milestones.

**Definition of Done:**
- [x] PR CI workflow runs on macOS, Windows, Linux
- [x] `pnpm test` passes on all three platforms
- [x] `pnpm tauri build` succeeds on all three platforms
- [x] Tag-triggered release workflow builds and publishes artifacts (DMG, MSI/NSIS, AppImage/deb)
- [x] Changelog auto-generated from commits since last tag
- [x] README badge shows CI status

---

### M2 — Multi-Tab Editing (Complexity: L)

**Scope:**
- Tab state management (`src/state/tabs.ts`) — create, close, switch, reorder
- Refactor `src/state/document.ts` signals → derived from active tab
- Tab bar UI component (SolidJS)
- EditorView state swap on tab switch (single EditorView, multiple EditorStates)
- Per-tab undo/redo history, scroll position, cursor position
- Tab keyboard navigation (Cmd+1-9, Cmd+Shift+[/], Cmd+W)
- Modified indicator (●) on tab
- Tab overflow dropdown for many tabs
- "Open already-open file" deduplication (switch to existing tab)
- Single-file mode: no tab bar when only 1 file open

**Dependencies:** None — foundational milestone.

**Definition of Done:**
- [x] Can open multiple files, each in its own tab
- [x] Switching tabs restores exact editor state (text, cursor, scroll, undo history)
- [x] Closing a modified tab prompts to save
- [x] Closing last tab returns to single-file mode (new untitled document)
- [x] All keyboard shortcuts work (Cmd+W, Cmd+1-9, Cmd+Shift+[/])
- [x] Tab bar hidden when only one file is open
- [x] Existing file commands (save, save-as, new) work correctly with tabs
- [x] All existing v1 tests pass (no regressions)
- [x] New unit tests for tab state management

---

### M3 — File Tree Sidebar (Complexity: M)

**Scope:**
- Sidebar UI component (`Sidebar.tsx`, `SidebarTreeNode.tsx`)
- File tree state management (`src/state/filetree.ts`)
- Rust commands: `list_directory`, `watch_directory`, `unwatch_directory`
- Filesystem watching with `notify` crate, debounced event forwarding to frontend
- "Open Folder" command (Cmd+Shift+O) + native folder dialog
- File click → open in tab (or switch to existing tab)
- Sidebar toggle (Cmd+\)
- Sidebar drag-to-resize (180px–400px)
- Sidebar state persisted in preferences
- Recent Files list: track last 20 files, show in command palette "Open Recent"
- Drag-and-drop file open: drop .md onto window → open in new tab

**Dependencies:** M2 (Multi-Tab) — sidebar opens files in tabs.

**Definition of Done:**
- [x] "Open Folder" shows directory tree in sidebar
- [x] Clicking a file opens it in a new tab
- [x] Directory expand/collapse works
- [x] Filesystem changes (new file, delete, rename) update the tree within 1s
- [x] Sidebar toggles with Cmd+\
- [x] Sidebar width is drag-resizable and persisted
- [x] No sidebar shown when no folder is open
- [x] Recent Files accessible via command palette
- [x] Drag-and-drop .md file onto window opens in new tab
- [x] All existing v1 tests pass
- [x] New tests for Rust directory listing and file tree state

---

### M4 — Block Handles (Complexity: L)

**Scope:**
- Block handle ProseMirror plugin (hover detection, widget decoration)
- Block context menu (Move Up/Down, Duplicate, Delete, Copy Link)
- Block drag-and-drop reordering
- Heading collapse/expand (disclosure triangle, fold plugin)
- Copy Link to Block (heading slug for headings; `<!-- id: ... -->` comment for other blocks)
- Keyboard shortcuts for block move (Cmd+Shift+↑/↓)
- Block handle CSS (positioning, animation, theme-aware)

**Dependencies:** None (operates on single-document editor), but benefits from M2 being done first so block handles work correctly with tab state.

**Definition of Done:**
- [x] Hovering any top-level block shows a handle (⋮⋮) on the left edge
- [x] Clicking handle opens context menu with all actions
- [x] Move Up/Down works correctly (PM transaction, undoable)
- [x] Duplicate creates an identical block below
- [x] Delete removes the block (undoable)
- [x] Drag-and-drop reorders blocks with visual drop indicator
- [x] Heading collapse/expand works (fold children, show placeholder)
- [x] Collapsed state survives edits elsewhere in the document
- [x] Copy Link copies correct URL with heading slug or block ID
- [x] Block ID comments (`<!-- id: ... -->`) are stripped on Markdown export by default
- [x] Cmd+Shift+↑/↓ move current block without mouse
- [x] Handles do not appear when cursor is inside the block
- [x] All existing v1 tests pass
- [x] New tests for block move, duplicate, delete, collapse

---

### M5 — Rich Features (Complexity: L)

**Scope:**
- Mermaid diagram rendering (lazy-loaded NodeView for ```mermaid blocks)
- Mind Map View (Cmd+T toggle, heading tree → Mermaid graph, click-to-navigate)
- YAML frontmatter support (new schema node, NodeView, markdown-it plugin, round-trip)
- Copy as Beautiful Doc (styled HTML clipboard export with inline CSS)
- Selection-aware Copy as Markdown (copy only selected range)
- Large file performance (IntersectionObserver-based lazy NodeView rendering)

**Dependencies:** M2 (for tab-aware features), M3 (for testing multi-file + sidebar + Mermaid together). M4 recommended (block handles + mind map can be tested together).

**Definition of Done:**
- [x] ```mermaid code blocks render as SVG diagrams when cursor is outside
- [x] Mermaid syntax errors show inline error message
- [x] Mermaid.js loads lazily (not in initial bundle)
- [x] Mind Map View shows heading hierarchy as interactive graph
- [x] Clicking a mind map node scrolls to that heading
- [x] Cmd+T toggles mind map on/off
- [x] YAML frontmatter renders as a styled block at document top
- [x] Frontmatter preserved on round-trip
- [x] "Copy as Beautiful Doc" produces styled rich text on clipboard
- [x] Pasting into Google Docs/Notion preserves formatting
- [x] "Copy as Markdown" with selection copies only selected range
- [x] Large files (10K+ lines) render smoothly with lazy NodeViews
- [x] All existing v1 tests pass
- [x] New tests: Mermaid rendering, frontmatter round-trip, beautiful doc export, lazy rendering

---

### M6 — Settings & Keyboard Customization (Complexity: M)

**Scope:**
- Settings panel UI (font family, content margins, max-width, line height, paragraph spacing)
- Two-column layout toggle
- Saveable presets for editor templates
- Custom keyboard shortcut assignment panel
- Shortcut conflict detection (within LiveMark, OS-level)
- Shortcut conflict awareness in command palette (visual indicator)
- Apply editor template settings to export output (HTML/PDF)

**Dependencies:** M2 (settings panel must work with multi-tab), M5 (settings apply to new features like Mermaid).

**Definition of Done:**
- [ ] Settings panel opens with Cmd+, or command palette
- [ ] All editor template settings (font, margins, width, line height, spacing) apply live
- [ ] Two-column layout toggle works
- [ ] Presets can be saved and loaded
- [ ] Custom shortcut assignment works for all commands
- [ ] Conflict detection warns on OS-level and app-level conflicts
- [ ] Command palette shows conflict badges
- [ ] Export HTML/PDF respects editor template settings
- [ ] All preferences persisted via Tauri IPC
- [ ] All existing v1 tests pass
- [ ] New tests for preferences, shortcut customization

---

### M7 — Auto-Update & Release (Complexity: S)

**Scope:**
- Tauri updater plugin integration
- Update check on launch (silent, non-blocking)
- Update banner UI (notification + install progress)
- Restart prompt with unsaved-document handling
- Release signing (macOS notarization, Windows code signing)
- End-to-end release pipeline verification

**Dependencies:** M1 (CI/CD — release workflow must be in place), M6 (all features complete).

**Definition of Done:**
- [ ] App checks for updates on launch
- [ ] Update banner appears when a new version is available
- [ ] User can download and install update from within the app
- [ ] Unsaved documents prompt save before restart
- [ ] macOS build is notarized
- [ ] Windows build is code-signed
- [ ] Full release pipeline tested end-to-end (tag → build → publish → update notification)
- [ ] All v2 features complete and stable

---

## Milestone Dependency Graph

```
        ┌──────────────────────────────────────────────────┐
        │                                                  │
        ▼                                                  │
  ┌─────────┐                                              │
  │  M1     │   (parallel — no blockers)                   │
  │  CI/CD  │────────────────────────────────────────┐     │
  └─────────┘                                        │     │
                                                     │     │
  ┌─────────┐    ┌─────────┐    ┌─────────┐         │     │
  │  M2     │───→│  M3     │───→│  M5     │         │     │
  │  Multi  │    │  File   │    │  Rich   │         │     │
  │  Tab    │    │  Tree   │    │  Feats  │         │     │
  └────┬────┘    └─────────┘    └────┬────┘         │     │
       │                              │              │     │
       │         ┌─────────┐          │              │     │
       └────────→│  M4     │──────────┘              │     │
                 │  Block  │                         │     │
                 │  Handles│                         │     │
                 └─────────┘                         │     │
                                                     │     │
                              ┌─────────┐            │     │
                              │  M6     │◄───────────┘     │
                              │  Settings│                  │
                              │  & Keys  │                  │
                              └────┬─────┘                  │
                                   │                        │
                                   ▼                        │
                              ┌─────────┐                   │
                              │  M7     │◄──────────────────┘
                              │  Auto-  │
                              │  Update │
                              └─────────┘
```

**Parallel tracks:**
- M1 (CI/CD) runs alongside everything
- M4 (Block Handles) can start after M2, in parallel with M3
- M3 and M4 can run concurrently once M2 is done

---

## Risk Mitigation

### M2 — Multi-Tab (L)

| Risk | Fallback |
|---|---|
| EditorView state swap is slow (> 50ms) for large docs | Keep a pool of 2-3 EditorViews instead of swapping states on a single one. Extra DOM cost is bounded. |
| Undo/redo history leaks between tabs | Each EditorState carries its own history plugin instance. If leaks occur, explicitly create isolated history configs per tab. |
| Tab state serialization for session persistence is complex | Defer session persistence to M6 or post-v2. Tabs start fresh on each launch initially. |

### M4 — Block Handles (L)

| Risk | Fallback |
|---|---|
| ProseMirror native drag is unreliable for complex blocks (tables, nested lists) | Disable drag for complex blocks; only allow Move Up/Down via context menu and keyboard shortcut. |
| Heading collapse breaks undo history | Implement collapse as visual-only (CSS + decorations) rather than document mutations. Content is always in the doc, just hidden. |
| Block ID comments (`<!-- id: ... -->`) break round-trip for some parsers | Make block IDs opt-in per the ideas spec. Only generate when user explicitly clicks "Copy Link". |

### M5 — Rich Features (L)

| Risk | Fallback |
|---|---|
| Mermaid.js lazy load is too slow (> 3s on first use) | Ship Mermaid as a pre-bundled asset in the Tauri binary, loaded from disk instead of network. |
| Mermaid rendering is a security risk (XSS via SVG) | Use `securityLevel: 'strict'` and sanitize SVG output. If issues persist, render in a sandboxed iframe. |
| YAML frontmatter breaks existing documents | Frontmatter parsing is opt-in: only triggered by `---` at line 1. If edge cases arise, add a preference to disable. |
| Large file lazy rendering causes visible pop-in | Use placeholder decorations with correct height estimates. Pre-render first 50 blocks eagerly, lazy-render the rest. |
