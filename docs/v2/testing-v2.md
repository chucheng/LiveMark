# LiveMark v2 — Test Plan

## 1. Test Strategy

### 1.1 Unit Tests (Vitest)

Pure logic that doesn't require DOM or Tauri runtime:
- Tab state management (create, close, switch, reorder, derived signals)
- File tree state (expansion, filtering, path resolution)
- Heading tree extraction (for Mind Map)
- Mermaid source generation
- Block operations (move, duplicate, delete as PM commands)
- Frontmatter parsing/serialization round-trip
- Beautiful Doc HTML generation (inline CSS injection)
- Selection-aware Markdown serialization
- Custom shortcut conflict detection
- Preference validation and defaults
- Recent files list management

### 1.2 Integration Tests (Vitest + ProseMirror)

ProseMirror editor interactions that require a live EditorState:
- Block handle plugin (hover detection, decoration creation)
- Heading collapse plugin (fold/unfold, position mapping through edits)
- Block drag-and-drop (node selection, move transactions)
- Mermaid NodeView rendering trigger (cursor enter/leave)
- Frontmatter NodeView (schema validation, dual render/edit mode)
- Tab state swap (EditorView.updateState with state restore)
- Large file lazy rendering (IntersectionObserver mock)

### 1.3 E2E Tests (Recommended: Playwright + Tauri)

Full user flows requiring a running Tauri application:
- Multi-tab workflow (open, switch, close, save)
- File tree sidebar (open folder, navigate, open file)
- Block drag-and-drop (visual drag, drop indicator, reorder)
- Mind Map toggle (render, click node, scroll to heading)
- Copy as Beautiful Doc (clipboard content verification)
- Auto-update banner (mock update server)
- Settings panel (change preferences, verify live application)
- Drag-and-drop file open

**Tool recommendation:** Use `@playwright/test` with `@tauri-apps/api/test` bindings, or WebdriverIO with `wdio-tauri-service`. Playwright is preferred for its reliability and cross-platform support.

### 1.4 Manual Test Checklist

Visual and interaction tests that resist automation:
- Block handle positioning and animation (hover, fade in/out)
- Drag ghost appearance during block reorder
- Mind Map layout aesthetics for various heading structures
- Mermaid diagram rendering quality (SVG appearance)
- Settings panel live preview (font, margins, spacing)
- Two-column layout reflow
- Tab overflow scrolling behavior
- Sidebar resize drag feel
- Theme consistency across all new components
- Keyboard shortcut capture UX (settings panel)

---

## 2. Test Cases by Feature

### 2.1 Multi-Tab Editing (P0)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| MT-01 | Happy path | Open two files → both appear as tabs | unit | P0 |
| MT-02 | Happy path | Switch between tabs → editor shows correct document | unit | P0 |
| MT-03 | Happy path | Close a tab → adjacent tab becomes active | unit | P0 |
| MT-04 | Happy path | Close last tab → new untitled document, tab bar hidden | unit | P0 |
| MT-05 | State | Switch tabs → cursor position restored correctly | integration | P0 |
| MT-06 | State | Switch tabs → scroll position restored correctly | integration | P0 |
| MT-07 | State | Switch tabs → undo history is per-tab (undo in tab B doesn't affect tab A) | integration | P0 |
| MT-08 | State | Modified indicator (●) shows on tab with unsaved changes | unit | P0 |
| MT-09 | State | Save a file → modified indicator clears on that tab only | unit | P0 |
| MT-10 | Edge case | Open an already-open file → switches to existing tab (no duplicate) | unit | P0 |
| MT-11 | Edge case | Close modified tab → save confirmation dialog appears | e2e | P0 |
| MT-12 | Edge case | Close modified tab → "Cancel" keeps tab open | e2e | P1 |
| MT-13 | Edge case | Close modified tab → "Don't Save" closes without saving | e2e | P1 |
| MT-14 | Keyboard | Cmd+W closes active tab | integration | P0 |
| MT-15 | Keyboard | Cmd+7 through Cmd+9 switch to correct tab (Cmd+1-6 reserved for headings) | unit | P0 |
| MT-16 | Keyboard | Cmd+Shift+[ / ] cycle through tabs | unit | P0 |
| MT-17 | Overflow | More tabs than width → scroll arrows appear | manual | P1 |
| MT-18 | Overflow | Tab dropdown (▾) lists all open tabs | manual | P1 |
| MT-19 | Performance | Opening 20 tabs → memory stays under 200MB | integration | P1 |
| MT-20 | Performance | Tab switch time < 100ms for 5K-line document | integration | P1 |
| MT-21 | Regression | Single-file mode (1 tab) → no tab bar visible | unit | P0 |
| MT-22 | Regression | All v1 file commands (save, save-as, new, open) work in multi-tab context | e2e | P0 |

### 2.2 File Tree Sidebar (P0)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| FT-01 | Happy path | Open folder → sidebar shows directory tree | e2e | P0 |
| FT-02 | Happy path | Click a file → opens in new tab | e2e | P0 |
| FT-03 | Happy path | Click a directory → expand/collapse toggle | e2e | P0 |
| FT-04 | Happy path | Cmd+\ toggles sidebar visibility | integration | P0 |
| FT-05 | State | Sidebar width persisted across sessions | unit | P1 |
| FT-06 | State | Expanded directories persisted while folder is open | unit | P1 |
| FT-07 | Edge case | Open empty folder → "No Markdown files found" placeholder | e2e | P1 |
| FT-08 | Edge case | File created externally → appears in tree within 1s | e2e | P1 |
| FT-09 | Edge case | File deleted externally → removed from tree within 1s | e2e | P1 |
| FT-10 | Edge case | File renamed externally → tree updates correctly | e2e | P1 |
| FT-11 | Edge case | No folder open → sidebar hidden, Cmd+\ is no-op | unit | P0 |
| FT-12 | Keyboard | ↑/↓ navigate tree, → expand, ← collapse, Enter opens file | e2e | P1 |
| FT-13 | Rust | list_directory returns correct file entries | unit | P0 |
| FT-14 | Rust | list_directory handles permission errors gracefully | unit | P1 |
| FT-15 | Rust | watch_directory sends events on file changes | integration | P1 |
| FT-16 | Resize | Sidebar drag-to-resize works (min 180px, max 400px) | manual | P1 |
| FT-17 | Regression | Opening a file from sidebar with already-open file → switches to existing tab | unit | P0 |

### 2.3 Block Handles (P0)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| BH-01 | Happy path | Hover over paragraph → handle (⋮⋮) appears at left edge | integration | P0 |
| BH-02 | Happy path | Hover over heading → handle + collapse triangle appear | integration | P0 |
| BH-03 | Happy path | Click handle → context menu opens | integration | P0 |
| BH-04 | Happy path | Move Up on second block → block moves to first position | integration | P0 |
| BH-05 | Happy path | Move Down on first block → block moves to second position | integration | P0 |
| BH-06 | Happy path | Duplicate → identical block appears below | integration | P0 |
| BH-07 | Happy path | Delete → block removed from document | integration | P0 |
| BH-08 | Happy path | All block operations are undoable (Cmd+Z) | integration | P0 |
| BH-09 | Collapse | Collapse H2 → content until next H2 or H1 is hidden | integration | P0 |
| BH-10 | Collapse | Expand collapsed H2 → content reappears | integration | P0 |
| BH-11 | Collapse | Edit above collapsed heading → collapsed state preserved | integration | P1 |
| BH-12 | Collapse | Edit below collapsed heading → collapsed state preserved | integration | P1 |
| BH-13 | Collapse | Collapse nested headings (H2 with H3 children) → all children hidden | integration | P1 |
| BH-14 | Copy Link | Copy Link on heading → clipboard contains file URL with heading slug | integration | P1 |
| BH-15 | Copy Link | Copy Link on paragraph → `<!-- id: ... -->` comment inserted above block | integration | P1 |
| BH-16 | Copy Link | Block ID comment stripped on Markdown export by default | unit | P1 |
| BH-17 | Drag | Drag block down two positions → block moves, drop indicator shown | e2e | P1 |
| BH-18 | Drag | Drag to same position → no-op (no transaction dispatched) | integration | P1 |
| BH-19 | Edge case | Move Up on first block → no-op | integration | P0 |
| BH-20 | Edge case | Move Down on last block → no-op | integration | P0 |
| BH-21 | Edge case | Handle does not appear when cursor is inside the block | integration | P0 |
| BH-22 | Edge case | Handle appears on all block types (paragraph, heading, code, quote, list, image, table, math, HR) | integration | P1 |
| BH-23 | Keyboard | Cmd+Shift+↑ moves current block up | integration | P0 |
| BH-24 | Keyboard | Cmd+Shift+↓ moves current block down | integration | P0 |
| BH-25 | Regression | Block operations do not break inline live-preview behavior | integration | P0 |

### 2.4 Copy as Beautiful Doc (P0)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| BD-01 | Happy path | Invoke on document with headings, bold, italic → clipboard contains styled HTML | integration | P0 |
| BD-02 | Happy path | Paste into Google Docs → formatting preserved (headings, bold, italic) | manual | P0 |
| BD-03 | Happy path | Code blocks include syntax highlighting colors in pasted output | integration | P0 |
| BD-04 | Happy path | Tables render as styled HTML tables in pasted output | integration | P0 |
| BD-05 | Happy path | Math (KaTeX) renders in pasted output | integration | P1 |
| BD-06 | Happy path | Images embedded as base64 data URIs | integration | P1 |
| BD-07 | Selection | With text selected → only selection is copied | integration | P0 |
| BD-08 | Selection | With no selection → full document copied | integration | P0 |
| BD-09 | Edge case | Empty document → status bar shows "Nothing to copy" | unit | P1 |
| BD-10 | Edge case | Document with only images (large base64) → size warning if > 5MB | unit | P1 |
| BD-11 | Regression | Existing "Copy as HTML" still copies raw HTML markup (not styled) | integration | P0 |

### 2.5 Auto-Update Mechanism (P0)

> **Blocked:** Auto-update tests are blocked pending `tauri-plugin-updater` re-integration (removed in commit e1ebb20 due to missing endpoint config).

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| AU-01 | Happy path | Update available → banner appears below tab bar | e2e | P0 |
| AU-02 | Happy path | Click "Update Now" → download progress shown | e2e | P0 |
| AU-03 | Happy path | Download complete → "Restart to finish updating" prompt | e2e | P0 |
| AU-04 | Edge case | No internet → no banner, no error | e2e | P1 |
| AU-05 | Edge case | Update check fails → silent failure, retry next launch | e2e | P1 |
| AU-06 | Edge case | "Later" → banner dismissed, reminder next launch | e2e | P1 |
| AU-07 | Edge case | Unsaved documents + restart → prompt to save first | e2e | P0 |

### 2.6 CI/CD Pipeline (P0)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| CI-01 | Build | macOS build succeeds | manual | P0 |
| CI-02 | Build | Windows build succeeds | manual | P0 |
| CI-03 | Build | Linux build succeeds | manual | P0 |
| CI-04 | Test | All Vitest tests pass on macOS | manual | P0 |
| CI-05 | Test | All Vitest tests pass on Windows | manual | P0 |
| CI-06 | Test | All Vitest tests pass on Linux | manual | P0 |
| CI-07 | Release | Tag push triggers release build | manual | P0 |
| CI-08 | Release | Release artifacts published correctly | manual | P0 |

### 2.7 Mind Map View (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| MM-01 | Happy path | Cmd+T on document with headings → mind map overlay appears | integration | P0 |
| MM-02 | Happy path | Map shows correct heading hierarchy (H1→H2→H3) | unit | P0 |
| MM-03 | Happy path | Click a node → overlay closes, editor scrolls to that heading | e2e | P0 |
| MM-04 | Happy path | Cmd+T again (or Esc) → overlay closes, editor restored | integration | P0 |
| MM-05 | Edge case | Document with no headings → message: "Add headings..." | unit | P0 |
| MM-06 | Edge case | Document with only H1 → single root node | unit | P1 |
| MM-07 | Edge case | Long heading text (> 40 chars) → truncated with ellipsis | unit | P1 |
| MM-08 | Edge case | Deep nesting (H1→H2→H3→H4→H5→H6) → all levels rendered | unit | P1 |
| MM-09 | Performance | Document with 100+ headings → map renders in < 2s | integration | P1 |

### 2.8 Mermaid Diagram Rendering (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| MR-01 | Happy path | ```mermaid block → SVG diagram when cursor outside | integration | P0 |
| MR-02 | Happy path | Cursor enters mermaid block → raw source shown for editing | integration | P0 |
| MR-03 | Happy path | Edit mermaid source → diagram re-renders (debounced 300ms) | integration | P1 |
| MR-04 | Lazy load | First mermaid block triggers lazy load of Mermaid.js | integration | P0 |
| MR-05 | Lazy load | Spinner shown while Mermaid.js loads | manual | P1 |
| MR-06 | Error | Invalid Mermaid syntax → error message shown below block | integration | P0 |
| MR-07 | Error | Very complex diagram → timeout after 5s, fallback message | integration | P1 |
| MR-08 | Security | Mermaid renders with securityLevel: 'strict' | unit | P0 |
| MR-09 | Round-trip | Mermaid code block preserved on Markdown round-trip | unit | P0 |

### 2.9 YAML Frontmatter (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| YF-01 | Happy path | Document starting with `---` → frontmatter block parsed | unit | P0 |
| YF-02 | Happy path | Cursor outside frontmatter → rendered as styled card | integration | P0 |
| YF-03 | Happy path | Cursor inside frontmatter → raw YAML shown | integration | P0 |
| YF-04 | Round-trip | Frontmatter preserved verbatim on parse → serialize cycle | unit | P0 |
| YF-05 | Edge case | Invalid YAML → shown as raw text with warning | integration | P1 |
| YF-06 | Edge case | Document without frontmatter → no frontmatter block | unit | P0 |
| YF-07 | Edge case | Frontmatter with only `---\n---` (empty) → empty block rendered | unit | P1 |
| YF-08 | Regression | Existing documents without frontmatter parse identically to v1 | unit | P0 |

### 2.10 User-Configurable Editor Template (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| ET-01 | Happy path | Change font family → editor updates live | e2e | P0 |
| ET-02 | Happy path | Adjust content margins → editor padding changes live | e2e | P0 |
| ET-03 | Happy path | Adjust max-width → writing column resizes live | e2e | P0 |
| ET-04 | Happy path | Adjust line height → text spacing changes live | e2e | P0 |
| ET-06 | Persistence | Settings persisted and restored on next launch | unit | P0 |
| ET-07 | Presets | Save preset → appears in preset list | unit | P1 |
| ET-08 | Presets | Load preset → all settings apply | unit | P1 |
| ET-09 | Reset | "Reset to Default" restores factory settings | unit | P1 |
| ET-10 | Export | Export HTML respects editor template settings | integration | P1 |

### 2.11 Custom Hotkey Assignment (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| KS-01 | Happy path | Reassign a command's shortcut → new shortcut works | integration | P0 |
| KS-02 | Happy path | Old shortcut no longer triggers the command | integration | P0 |
| KS-03 | Conflict | Assign duplicate shortcut → warning shown | unit | P0 |
| KS-04 | Conflict | Override duplicate → old command unbound | unit | P0 |
| KS-05 | Persistence | Custom shortcuts persisted across sessions | unit | P0 |
| KS-06 | Reset | "Reset All to Defaults" restores default shortcuts | unit | P1 |
| KS-07 | Display | Command palette shows updated shortcut labels | integration | P1 |

### 2.12 Selection-Aware Copy as Markdown (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| SM-01 | Happy path | Select two paragraphs → copy as Markdown → only those paragraphs | unit | P0 |
| SM-02 | Happy path | Select part of a heading → heading Markdown included | unit | P0 |
| SM-03 | Happy path | No selection → full document copied (v1 behavior) | unit | P0 |
| SM-04 | Edge case | Selection spanning code block → code block included | unit | P1 |
| SM-05 | Edge case | Selection spanning table → full table included | unit | P1 |

### 2.13 Large File Performance (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| LP-01 | Performance | 10K-line document: initial render < 1s | integration | P0 |
| LP-02 | Performance | 10K-line document: typing latency < 16ms | integration | P0 |
| LP-03 | Performance | 10K-line document: scroll is smooth (60fps) | manual | P0 |
| LP-04 | Lazy render | Off-screen blocks use placeholder NodeViews | integration | P1 |
| LP-05 | Lazy render | Scrolling into view triggers full render | integration | P1 |
| LP-06 | Regression | Small documents (< 1K lines) render identically to v1 | integration | P0 |

### 2.14 Recent Files List (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| RF-01 | Happy path | Open a file → appears at top of recent files list | unit | P0 |
| RF-02 | Happy path | Command palette "Open Recent" shows recent files | integration | P0 |
| RF-03 | Happy path | Select recent file → opens in new tab | integration | P0 |
| RF-04 | Edge case | Recent file deleted → shows "(missing)" label | unit | P1 |
| RF-05 | Edge case | List capped at 20 entries (oldest dropped) | unit | P1 |
| RF-06 | Persistence | Recent files persisted across sessions | unit | P0 |

### 2.15 Shortcut Conflict Awareness (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| SC-01 | Happy path | Command palette shows ⚠️ next to conflicting shortcut | integration | P0 |
| SC-02 | Happy path | Tooltip explains the conflict | manual | P1 |
| SC-03 | Edge case | No conflicts → no badges shown | unit | P0 |

### 2.16 Drag-and-Drop File Open (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| DD-01 | Happy path | Drop .md file → opens in new tab | e2e | P0 |
| DD-02 | Happy path | Drop zone highlight appears during drag | manual | P1 |
| DD-03 | Edge case | Drop non-Markdown file → warning in status bar | e2e | P1 |
| DD-04 | Edge case | Drop multiple files → each opens in new tab | e2e | P1 |

### 2.17 Cross-Platform Testing (P1)

| ID | Category | Description | Type | Priority |
|---|---|---|---|---|
| XP-01 | Compat | All Vitest tests pass on macOS | manual | P0 |
| XP-02 | Compat | All Vitest tests pass on Windows | manual | P0 |
| XP-03 | Compat | All Vitest tests pass on Linux | manual | P0 |
| XP-04 | Rendering | Editor rendering consistent across WebView engines | manual | P1 |
| XP-05 | Keyboard | Platform-specific shortcuts (Cmd vs Ctrl) work correctly | manual | P0 |

---

## 3. Cross-Feature Interaction Tests

| ID | Features | Description | Type | Priority |
|---|---|---|---|---|
| XF-01 | Block handles + Multi-tab | Block operations work correctly after switching tabs | integration | P0 |
| XF-02 | Block handles + Multi-tab | Collapsed headings in tab A are preserved when switching to tab B and back | integration | P1 |
| XF-03 | Mind map + Heading collapse | Mind map shows all headings regardless of collapse state | unit | P0 |
| XF-04 | Mind map + Multi-tab | Mind map shows headings for the active tab's document | integration | P0 |
| XF-05 | Copy Beautiful Doc + Math | KaTeX math renders correctly in pasted output | integration | P1 |
| XF-06 | Copy Beautiful Doc + Code blocks | Syntax highlighting preserved in pasted output | integration | P1 |
| XF-07 | Copy Beautiful Doc + Mermaid | Mermaid diagrams included as SVG in pasted output | integration | P1 |
| XF-08 | Copy Beautiful Doc + Tables | Tables with alignment render correctly in pasted output | integration | P1 |
| XF-09 | File tree + Multi-tab | Opening a file from sidebar creates a new tab | e2e | P0 |
| XF-10 | File tree + Recent files | Opening a file from sidebar adds it to recent files | unit | P0 |
| XF-11 | Block handles + Frontmatter | Block handle does not appear on frontmatter block (or appears but drag is disabled) | integration | P1 |
| XF-12 | Editor template + Export | HTML export respects custom font, margins, max-width | integration | P1 |
| XF-13 | Editor template + Two-column | Two-column layout works with all block types (code, tables, images, math) | manual | P1 |
| XF-14 | Custom shortcuts + Command palette | Command palette displays updated custom shortcuts | integration | P0 |
| XF-15 | Large file + Block handles | Block handles work on 10K-line document without lag | integration | P1 |
| XF-16 | Large file + Mind map | Mind map renders correctly for document with 200+ headings | integration | P1 |
| XF-17 | Mermaid + Heading collapse | Collapsing a heading that contains a mermaid block → mermaid re-renders on expand | integration | P1 |
| XF-18 | Auto-update + Multi-tab | "Restart to update" prompts save for all modified tabs | e2e | P0 |
| XF-19 | Drag-drop file + Multi-tab | Dropping a file opens it in a new tab (not replace current) | e2e | P0 |
| XF-20 | Frontmatter + Copy Beautiful Doc | Frontmatter excluded from beautiful doc output (or rendered as metadata) | integration | P1 |

---

## 4. Performance Test Cases

| ID | Scenario | Metric | Target | Type |
|---|---|---|---|---|
| PF-01 | Open 10K-line document | Time to interactive | < 1s | integration |
| PF-02 | 10K-line document, type a character | Input-to-render latency | < 16ms (60fps) | integration |
| PF-03 | Open 20 tabs of 1K-line documents | Total memory usage | < 200MB | integration |
| PF-04 | Switch between tabs (5K-line doc) | State swap time | < 100ms | integration |
| PF-05 | Rapid tab switching (10 switches in 2s) | No crash, no stale state | Stable | integration |
| PF-06 | Mermaid diagram with 50 nodes | Render time | < 2s | integration |
| PF-07 | Mermaid diagram with 200 nodes | Render time | < 5s (or timeout) | integration |
| PF-08 | Mind map for doc with 100 headings | Render time | < 2s | integration |
| PF-09 | File tree for folder with 1000 files | Initial load time | < 1s | integration |
| PF-10 | File tree for folder with 1000 files | Tree expansion time | < 200ms | integration |
| PF-11 | Copy as Beautiful Doc for 5K-line doc | Clipboard write time | < 3s | integration |
| PF-12 | Block drag on 5K-line document | Drag response time | < 16ms (60fps) | manual |

---

## 5. Regression Guard

Critical v1 behaviors that must be preserved in v2:

| ID | v1 Behavior | Test Approach |
|---|---|---|
| RG-01 | Markdown round-trip fidelity (open → save unchanged → identical file) | Run all 37 existing round-trip tests |
| RG-02 | Inline live rendering (cursor enter → raw syntax; cursor leave → rendered) | Existing NodeView tests + manual verification |
| RG-03 | Input rules (# heading, **bold**, etc.) fire correctly | All 17 existing input rule tests |
| RG-04 | Find/Replace highlights at correct positions | All 18 existing find/replace tests |
| RG-05 | Export to HTML produces valid, styled output | Manual verification of existing export |
| RG-06 | Export to PDF works via print dialog | Manual verification |
| RG-07 | Copy as HTML copies raw HTML markup | Unit test |
| RG-08 | Copy as Markdown copies full document | Unit test |
| RG-09 | Undo/redo works for all edit types | Existing command/keymap tests |
| RG-10 | Theme switching (light/dark/system) works | Manual verification |
| RG-11 | Command palette fuzzy search returns correct results | Existing registry tests |
| RG-12 | Source View (Cmd+/) shows raw Markdown | Manual verification |
| RG-13 | Auto-save fires after 30s of inactivity | Manual verification |
| RG-14 | Image drag-drop/paste creates image file and renders preview | Manual verification |
| RG-15 | Table editing (cell navigation, Tab key, selection) works | Manual verification |
| RG-16 | Math rendering (KaTeX) for $inline$ and $$block$$ | Manual verification |
| RG-17 | Status bar shows correct line/col, word count, encoding | Manual verification |
| RG-18 | Font size zoom (Cmd+=/-/0) works | Manual verification |
| RG-19 | Scroll sync between editor and source view | Manual verification |
| RG-20 | Single-file mode (no folder, 1 tab) looks and feels identical to v1 | Manual verification |

---

## 6. Test Infrastructure Needs

### 6.1 New Test Utilities

| Utility | Purpose | Notes |
|---|---|---|
| Tab state test helpers | Create/switch/close tabs programmatically in tests | Mock Tauri IPC for file reading |
| Block handle test helpers | Simulate hover, click, drag on specific block positions | Need mouse event simulation |
| Mermaid mock | Mock Mermaid.js for unit tests (avoid loading 2.5MB in test) | Return placeholder SVG |
| Filesystem mock (Rust) | Mock directory listing and file watching for sidebar tests | Use `tempdir` crate in Rust tests |
| Clipboard mock | Verify clipboard contents in tests | Mock `tauri-plugin-clipboard-manager` |
| IntersectionObserver mock | Simulate viewport-based rendering for lazy NodeView tests | jsdom doesn't support IO natively |

### 6.2 E2E Test Setup

- **Framework**: Playwright with Tauri WebDriver bindings
- **CI integration**: E2E tests run in GitHub Actions on macOS (primary), Windows, Linux
- **Test data**: `tests/fixtures/` directory with sample Markdown files:
  - `simple.md` — basic document for smoke tests
  - `large.md` — 10K-line document for performance tests
  - `complex.md` — document using all Markdown features
  - `frontmatter.md` — document with YAML frontmatter
  - `mermaid.md` — document with Mermaid diagram blocks
  - `project/` — sample folder with multiple .md files for sidebar tests

### 6.3 Performance Test Tooling

- Use Vitest `bench()` for micro-benchmarks (tab switch, parse, serialize)
- Use Playwright's `page.metrics()` for rendering performance
- Define performance budgets in CI (fail if regression detected)

### 6.4 Test Count Summary

| Category | Count |
|---|---|
| Multi-Tab Editing | 22 |
| File Tree Sidebar | 17 |
| Block Handles | 25 |
| Copy as Beautiful Doc | 11 |
| Auto-Update | 7 |
| CI/CD Pipeline | 8 |
| Mind Map View | 9 |
| Mermaid Rendering | 9 |
| YAML Frontmatter | 8 |
| Editor Template | 10 |
| Custom Hotkeys | 7 |
| Selection Copy | 5 |
| Large File Perf | 6 |
| Recent Files | 6 |
| Shortcut Awareness | 3 |
| Drag-Drop Open | 4 |
| Cross-Platform | 5 |
| Cross-Feature | 20 |
| Performance | 12 |
| Regression Guard | 20 |
| **Total** | **214** |
