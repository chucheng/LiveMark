# LiveMark v2 — Product Requirements Document

## 1. v2 Vision

LiveMark v1 is a polished single-document Markdown editor with inline live rendering. **v2 transforms LiveMark from a single-file editor into a block-based, multi-file writing environment.** Users will work across multiple documents in tabs, navigate projects via a file tree sidebar, manipulate content at the block level with drag-and-drop handles, visualize document structure as mind maps, and render diagrams inline — all while preserving the clean, distraction-free inline rendering that defines LiveMark. v2 also lays the groundwork for extensibility (schema extension points, theme formalization) and production distribution (auto-update, CI/CD).

---

## 2. Feature Set

### 2.1 Features

| Feature | Description | Priority | Category |
|---|---|---|---|
| Multi-Tab / Multi-File Editing | Open multiple files in tabs within a single window. Per-tab editor state, tab management UI, keyboard navigation between tabs (Cmd+1-9, Cmd+Shift+[ / ]), memory-safe tab lifecycle. | P0 | Features |
| File Tree Sidebar | Collapsible directory tree alongside the editor. Quick file switching within a project. Open files in new tabs. | P0 | Features |
| Block Handles | Hover handle on every top-level block (heading, paragraph, code block, quote, list, image). Provides: drag to reorder, collapse headings, move up/down, copy link to block, duplicate, delete via context menu. | P0 | Features |
| Mind Map View | Toggle the document into a read-only mind map derived from heading hierarchy. Renders as Mermaid diagram in a full-editor overlay. Clicking a node scrolls to that heading. Cmd+T to toggle. | P1 | Features |
| Mermaid Diagram Rendering | Render Mermaid diagrams inline in fenced code blocks (```mermaid). Lazy-loaded to avoid bundle impact. NodeView with rendered/editing dual mode. | P1 | Features |
| Recent Files List | Track recently opened files. Quick-open from launch screen or command palette. Persisted via Tauri preferences. | P1 | Features |
| YAML Frontmatter Support | Parse and display YAML frontmatter blocks. Render as a styled, collapsible block at doc top. Preserve verbatim on round-trip. | P1 | Features |
| User-Configurable Editor Template | Customize font family, content margins, content max-width, line height, paragraph spacing. Two-column layout toggle. Saveable/shareable presets. Applies to editor and export. | P1 | Features |
| Drag-and-Drop File Open | Drop a .md file onto the window to open it (in a new tab if multi-tab is active). | P1 | Features |
| Spell Checking | Integrate spell checking beyond OS-level WebView spell check. Underline misspelled words, suggest corrections. | P2 | Features |
| Plugin / Extension API | Public API for third-party plugins. Stable API surface for schema extensions, ProseMirror plugins, NodeView registry, command registry, theme system, export pipelines. Plugin distribution mechanism. | P2 | Features |

### 2.2 Command Palette & Keyboard Shortcuts

| Feature | Description | Priority | Category |
|---|---|---|---|
| Shortcut Conflict Awareness | In Cmd+Shift+P, visually indicate shortcuts conflicting with OS or other apps (strikethrough, greyed, or "conflict" badge). | P1 | Command Palette |
| Custom Hotkey Assignment | Allow users to reassign keyboard shortcuts for any command. Conflict detection within LiveMark, with OS, and with common apps. Warning on conflict but allow override. | P1 | Command Palette |

### 2.3 Editor Improvements

| Feature | Description | Priority | Category |
|---|---|---|---|
| Large File Performance | Viewport-based rendering — only render NodeViews near the visible area. IntersectionObserver on block-level NodeViews for lazy rendering. | P1 | Editor Improvements |
| Selection-Aware Copy as Markdown | Copy only the selected range as Markdown (currently copies full document). | P1 | Editor Improvements |
| Typewriter Mode | Keep the current line vertically centered while typing. Toggle via command palette / preferences. | P2 | Editor Improvements |
| Line Numbers | Optional line numbers in the editor gutter (off by default). Toggle via preferences. | P2 | Editor Improvements |

### 2.4 Export Improvements

| Feature | Description | Priority | Category |
|---|---|---|---|
| Copy as Beautiful Doc | Copy document to clipboard as rich text (HTML) with full styling. Paste into Google Docs, Notion, Email, Slack with LiveMark's rendered appearance. Includes headings, bold/italic, code blocks with syntax highlighting, tables, math, images. | P0 | Export |
| Additional Export Formats | DOCX export, LaTeX export, pluggable export pipeline for custom formats. | P2 | Export |

### 2.5 Infrastructure & Distribution

| Feature | Description | Priority | Category |
|---|---|---|---|
| Auto-Update Mechanism | In-app update notifications and installation via Tauri updater plugin. | P0 | Infrastructure |
| CI/CD Pipeline | Automated builds for macOS, Windows, Linux. Automated test runs on PRs. Release automation with changelog generation. | P0 | Infrastructure |
| Version History / Local Snapshots | Track document revisions locally. Browse and restore previous versions. Timestamped snapshot approach. | P2 | Infrastructure |
| Cross-Platform Testing | Expand automated testing across macOS, Windows, Linux. WebView rendering difference verification. | P1 | Infrastructure |

### 2.6 Architecture Improvements

| Feature | Description | Priority | Category |
|---|---|---|---|
| State Management Scaling | Per-tab signal isolation for multi-tab support. Shared app-level state vs. per-tab editor state design. | P0 | Architecture |
| Schema Extensibility | Formalize schema extension mechanism. Define how custom node types interact with the serializer. Foundation for plugin API. | P1 | Architecture |
| Theme System Formalization | Document all `--lm-*` CSS custom properties. Create theme specification for third-party themes. | P2 | Architecture |

### 2.7 Editor Improvements (from v1 PRD deferred)

| Feature | Description | Priority | Category |
|---|---|---|---|
| Incremental Markdown Parsing | Move parsing to Rust backend using pulldown-cmark for very large files. Send token stream to frontend via IPC. | P2 | Editor Improvements |

---

## 3. Feature Dependencies

```
State Management Scaling ──→ Multi-Tab ──→ File Tree Sidebar
                                │              │
                                ▼              ▼
                          Drag-and-Drop    Recent Files
                          File Open        (enhanced with tabs)

Mermaid Diagram Rendering ──→ Mind Map View
                               (reuses Mermaid infrastructure)

Block Handles ──→ Copy Link to Block
              ──→ Heading Collapse

Schema Extensibility ──→ Plugin / Extension API
                     ──→ YAML Frontmatter Support
                     ──→ Mermaid Diagram Rendering

CI/CD Pipeline ──→ Auto-Update Mechanism
               ──→ Cross-Platform Testing

User-Configurable Editor Template ──→ Two-Column Layout
                                  ──→ Export with custom styles

Large File Performance ──→ Incremental Markdown Parsing (if needed)
```

**Key dependency chains:**
1. **Multi-tab chain**: State Management Scaling → Multi-Tab → File Tree Sidebar → Recent Files
2. **Mermaid chain**: Mermaid Diagram Rendering → Mind Map View
3. **Extension chain**: Schema Extensibility → Plugin API
4. **Infrastructure chain**: CI/CD → Auto-Update → Cross-Platform Testing

---

## 4. What's NOT in v2

| Feature | Reason |
|---|---|
| Plugin / Extension API (full public API) | P2 — schema extensibility groundwork ships in v2, but a stable public plugin API with distribution mechanism is v3 scope. Too much API surface to stabilize alongside major feature work. |
| Additional Export Formats (DOCX, LaTeX) | P2 — requires significant new dependencies (e.g. docx library, LaTeX engine). "Copy as Beautiful Doc" covers the most common export-to-other-app use case. |
| Version History / Local Snapshots | P2 — complex UX (browsing, diffing, restoring). Better suited for v3 when multi-tab and file tree are stable. |
| Incremental Markdown Parsing (Rust) | P2 — markdown-it is fast enough for typical files. Only needed after Large File Performance proves insufficient. |
| Typewriter Mode | P2 — nice-to-have writing comfort feature, not core to v2 value prop. |
| Line Numbers | P2 — small feature, not core to v2. Can ship as a point release. |
| Theme System Formalization | P2 — useful for community themes but not blocking any v2 feature. |
| Spell Checking | P2 — OS-level WebView spell check works. A proper integration requires dictionary management, custom dictionary support, and potentially grammar checking. Better as a focused v3 feature. |

**Note**: All P2 items are tracked and may be pulled into v2 if time allows, or ship as v2.x point releases.

---

## 5. Success Metrics

| Metric | Target |
|---|---|
| Multi-file workflow | User can open a project folder, navigate files in the sidebar, and edit across tabs without losing state |
| Block manipulation | User can reorder any block via drag-and-drop in under 2 seconds, with no rendering glitches |
| Mind map utility | User can toggle to mind map, understand document structure, click a node, and land on that heading |
| Copy as Beautiful Doc | Pasting into Google Docs/Notion/Slack preserves headings, code blocks, tables, and math rendering |
| Auto-update | User receives update notification and can install without leaving the app |
| Zero v1 regressions | All existing v1 functionality works identically — no rendering, editing, or file I/O regressions |
| Performance | Opening 10 tabs simultaneously uses < 200MB memory. Tab switching is < 100ms. Large files (10K+ lines) remain smooth with viewport rendering. |
| CI/CD reliability | All PRs are automatically built and tested on macOS, Windows, Linux before merge |
