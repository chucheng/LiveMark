# LiveMark UX Audit — Staff PM & Architect Review

**Role:** You are a Staff Product Manager and Software Architect with 10+ years of experience shipping desktop productivity tools (Notion, Obsidian, Typora, VS Code). You have high standards for polish, responsiveness, and coherence. You're evaluating LiveMark — a Typora-style inline live-preview Markdown editor built with Tauri + SolidJS + ProseMirror.

**Goal:** Systematically test every user-facing interaction and identify anything that feels wrong, broken, slow, inconsistent, or confusing. Rate each area Pass / Needs Work / Fail.

---

## 1. First Launch & Empty State

- [ ] App launches within 2 seconds
- [ ] Empty editor shows a helpful placeholder (not a blank void)
- [ ] Titlebar shows appropriate text for untitled document
- [ ] Status bar shows meaningful defaults (Ln 1, Col 1, 0 words)
- [ ] Window is properly sized and centered on screen
- [ ] No console errors or flash of unstyled content

## 2. Core Typing & Live Preview

- [ ] Type `# Heading` — renders immediately as heading when cursor leaves
- [ ] Re-enter the heading — raw `#` syntax reappears for editing
- [ ] Transition between rendered/raw is smooth (no flicker, no layout jump)
- [ ] Type `**bold**`, `*italic*`, `` `code` ``, `~~strike~~` — each renders inline
- [ ] Cursor position is never lost or jumped during syntax transforms
- [ ] Undo (`Cmd+Z`) cleanly reverses each transform step-by-step
- [ ] Redo (`Cmd+Shift+Z`) restores correctly
- [ ] Rapid typing (60+ WPM) shows no lag, dropped characters, or misfire of input rules
- [ ] Typing at the end of a formatted region doesn't inherit unwanted marks

## 3. Block Elements

- [ ] `- ` creates bullet list; nested with Tab, un-nested with Shift+Tab
- [ ] `1. ` creates ordered list; numbering updates correctly
- [ ] `- [ ] ` creates task list; checkbox is clickable in preview mode
- [ ] `> ` creates blockquote; nested content works
- [ ] ` ```js ` creates code block with syntax highlighting
- [ ] `---` followed by space creates horizontal rule
- [ ] `$$` followed by space creates math block; KaTeX renders correctly
- [ ] Enter at end of empty list item exits the list (doesn't create infinite items)
- [ ] Enter at end of code block exits to a new paragraph
- [ ] Backspace at start of a block element unwraps it correctly

## 4. Tables

- [ ] Pipe syntax creates a rendered table
- [ ] Tab navigates between cells forward; Shift+Tab goes backward
- [ ] Tab at last cell creates a new row
- [ ] Cell content with bold/italic/links renders correctly
- [ ] Column alignment (`:---`, `:---:`, `---:`) works visually
- [ ] Table doesn't break when a cell is emptied
- [ ] Cursor entering/leaving table feels natural

## 5. Images

- [ ] `![alt](path)` renders inline preview
- [ ] Drag-and-drop image from Finder into editor works
- [ ] Paste image from clipboard works
- [ ] Image saves to correct location relative to document
- [ ] Broken image path shows meaningful fallback (not blank space)
- [ ] Large images don't blow out the layout

## 6. Links

- [ ] `[text](url)` renders as clickable link in preview
- [ ] `Cmd+Click` opens link in default browser
- [ ] Link with title `[text](url "title")` preserves title
- [ ] Editing a link re-reveals raw syntax naturally

## 7. Math (KaTeX)

- [ ] Inline `$E=mc^2$` renders inline
- [ ] Block `$$...\n...\n$$` renders as display math
- [ ] Invalid LaTeX shows error state (not crash or blank)
- [ ] Cursor entering math block reveals raw LaTeX for editing

## 8. Mermaid Diagrams

- [ ] ` ```mermaid ` block renders as interactive diagram
- [ ] Diagram updates when code is edited
- [ ] Invalid mermaid syntax shows error (not crash)
- [ ] Lazy-loading doesn't cause visible layout shift

## 9. File Operations

- [ ] `Cmd+N` — new untitled tab opens
- [ ] `Cmd+O` — native open dialog, file loads correctly
- [ ] `Cmd+S` — saves; title bar clears modified indicator
- [ ] `Cmd+Shift+S` — save as with native dialog
- [ ] `Cmd+W` — close tab; prompts to save if modified
- [ ] Opening a `.md` file from terminal (`livemark file.md`) works
- [ ] Round-trip: open a complex .md file → save without edits → `diff` shows zero changes
- [ ] Opening a very large file (1MB+) doesn't freeze the UI
- [ ] File with unusual encoding or BOM handles gracefully

## 10. Auto-Save

- [ ] Auto-save triggers ~30s after last edit (not during active typing)
- [ ] Status bar shows "Auto-saved" indicator briefly
- [ ] Auto-save toggle in status bar works
- [ ] Auto-save preference persists across app restarts
- [ ] Auto-save doesn't fire for untitled (unsaved) documents
- [ ] No data loss if app crashes mid-auto-save (atomic writes)

## 11. Tabs

- [ ] Multiple files open in separate tabs
- [ ] Each tab preserves its own cursor, scroll position, undo history
- [ ] Switching tabs is instantaneous
- [ ] Tab shows file name; modified tab shows dot/indicator
- [ ] Close button on tab works; middle-click closes tab (if supported)
- [ ] Tab overflow (10+ tabs) is handled with scroll or shrink
- [ ] `Cmd+W` closes active tab; if last tab, shows empty state or new tab

## 12. Sidebar (File Tree)

- [ ] `Cmd+\` toggles sidebar smoothly (no layout jump)
- [ ] Sidebar shows files in current directory
- [ ] Clicking a file opens it in a new tab (or switches to existing tab)
- [ ] Active file is highlighted in sidebar
- [ ] Sidebar handles large directories without freezing
- [ ] Sidebar handles directories with no `.md` files gracefully

## 13. Command Palette

- [ ] `Cmd+Shift+P` opens instantly
- [ ] Fuzzy search works: typing "exp" finds "Export as HTML"
- [ ] Every registered command appears in the list
- [ ] Keyboard shortcuts shown next to each command
- [ ] Arrow keys navigate; Enter executes; Escape closes
- [ ] Executing a command closes the palette and performs the action
- [ ] No duplicate or orphan commands

## 14. Find & Replace

- [ ] `Cmd+F` opens find bar; focus goes to search input
- [ ] Matches highlight in real-time as you type
- [ ] Match count shown (e.g., "3 of 12")
- [ ] Next/Previous cycles through matches with scroll-to
- [ ] Replace single works; Replace All works
- [ ] Case-sensitive toggle works
- [ ] Regex toggle works; invalid regex doesn't crash
- [ ] Escape closes the bar; focus returns to editor
- [ ] Find works across headings, code blocks, table cells, math

## 15. Source View

- [ ] `Cmd+/` toggles to raw Markdown view
- [ ] Source view is read-only (no accidental edits)
- [ ] Scroll position is preserved when toggling back
- [ ] Syntax is readable (monospace, proper line breaks)
- [ ] Toggling back returns to live-preview with no state corruption

## 16. Focus Mode

- [ ] `Cmd+Shift+F` toggles focus mode
- [ ] Active paragraph is fully visible; others are dimmed
- [ ] Moving cursor updates the focused paragraph smoothly
- [ ] Focus mode works with all block types (headings, lists, code, tables)
- [ ] Exiting focus mode restores full visibility instantly

## 17. Block Handles

- [ ] Hovering any block reveals grip handle on the left
- [ ] Drag-to-reorder works for paragraphs, headings, lists, code blocks
- [ ] Right-click handle shows context menu (move up/down, duplicate, delete, copy link)
- [ ] Each context menu action works correctly
- [ ] `+` button opens block type picker
- [ ] Block type picker inserts the correct block above
- [ ] Handles don't appear in source view or interfere with typing

## 18. Mind Map

- [ ] `Cmd+T` opens mind map view
- [ ] Mind map reflects current document's heading structure
- [ ] Changing headings updates the mind map
- [ ] Mind map is readable for documents with deep heading nesting
- [ ] Closing mind map returns focus to editor

## 19. Review Panel

- [ ] `Cmd+Shift+R` opens review panel
- [ ] Panel detects: empty headings, heading hierarchy skips, duplicate headings, missing alt text, empty links, code blocks without language, long paragraphs, missing h1
- [ ] Clicking an issue scrolls to that location in the editor
- [ ] Panel updates live as you fix issues
- [ ] Clean document shows "no issues" state

## 20. Export

- [ ] Export HTML — produces standalone file with embedded CSS
- [ ] Export PDF — opens system print dialog
- [ ] Copy as HTML — clipboard contains rendered HTML
- [ ] Copy as Markdown — clipboard contains raw markdown
- [ ] Copy as Markdown with selection — copies only selected range
- [ ] Copy as Beautiful Doc — styled HTML clipboard copy for pasting into Google Docs / Notion
- [ ] Exported HTML renders correctly in Chrome, Safari, Firefox
- [ ] Export preserves math, code highlighting, tables, images

## 21. Themes

- [ ] `Cmd+Shift+T` cycles Light → Dark → System
- [ ] Theme switch is instant (no flash or FOUC)
- [ ] All UI elements respect theme (editor, sidebar, tabs, status bar, command palette, find bar, review panel, mind map, block handles, context menus)
- [ ] System theme follows OS preference and updates live
- [ ] Theme preference persists across restarts
- [ ] Syntax highlighting in code blocks adapts to theme
- [ ] Exported HTML uses its own embedded styles (not current theme)

## 22. Status Bar

- [ ] Shows line number, column number, word count — all update live
- [ ] Theme toggle button works
- [ ] Auto-save toggle works
- [ ] Zoom controls (`Cmd+=`, `Cmd+-`, `Cmd+0`) work and level is shown
- [ ] Status bar doesn't overflow or overlap on narrow windows

## 23. YAML Frontmatter

- [ ] Frontmatter at document top renders as styled card
- [ ] Editing frontmatter reveals raw YAML
- [ ] Frontmatter is preserved on save (no corruption or duplication)
- [ ] Document without frontmatter works normally

## 24. Keyboard Shortcuts (Comprehensive)

- [ ] Every shortcut listed in the tutorial works
- [ ] No shortcut conflicts with macOS system shortcuts
- [ ] Shortcuts work regardless of focus (except when in input fields like find bar)
- [ ] Formatting shortcuts (`Cmd+B/I`) toggle correctly (on→off→on)

## 25. Edge Cases & Stress Tests

- [ ] Paste 10,000 lines of Markdown — app remains responsive
- [ ] Rapidly toggle between 5+ open tabs — no state corruption
- [ ] Open the same file in two tabs — handles gracefully (prevent or sync)
- [ ] External modification of open file — app detects and offers reload
- [ ] Close app with unsaved changes in 3 tabs — all prompted individually
- [ ] Paste rich HTML from web — converts to Markdown cleanly
- [ ] Paste plain text with Markdown syntax — renders correctly
- [ ] Window resize to very small — no layout breakage, scrollbars appear
- [ ] Full-screen mode works correctly

## 26. Performance Benchmarks

- [ ] App cold start < 2s
- [ ] File open (100KB .md) < 500ms
- [ ] Keystroke-to-render latency < 50ms
- [ ] Theme switch < 100ms
- [ ] Command palette open < 100ms
- [ ] Find in 10,000-line document < 200ms

## 27. Accessibility & Polish

- [ ] All interactive elements are keyboard-navigable
- [ ] Focus rings visible on interactive elements
- [ ] Scrollbar styling matches theme
- [ ] No orphaned tooltips, phantom overlays, or z-index issues
- [ ] Window title updates correctly on file open/save/rename
- [ ] Modified indicator (dot) in titlebar and tab matches actual state
- [ ] Cursor changes appropriately (pointer on links, grab on handles, text in editor)

---

## Scoring

Rate each of the 27 sections **Pass** / **Needs Work** / **Fail**.

For any "Needs Work" or "Fail," describe:
1. **Exact reproduction steps**
2. **Severity:** P0 critical / P1 major / P2 minor / P3 cosmetic
3. **Expected vs actual behavior**

**Ship criteria:** 0 Fails, ≤ 3 Needs Work items (all P2 or below).

---

## TODO List — Action Items from Audit

For every checkbox marked ✗ (failed) or scored "Needs Work" / "Fail," add an entry below. Group by priority, include a concrete fix plan. This section is the output artifact of the audit — it becomes the sprint backlog.

### P0 — Critical (blocks shipping)

| # | Section | Issue | Root Cause | Fix Plan | Effort |
|---|---------|-------|------------|----------|--------|
| | | | | | |

_Example: `P0-1 | §9 File Ops | Round-trip corrupts nested blockquote markers | Serializer doesn't track quote depth on empty lines | Fix serializeBlockquote() to emit > on blank lines within nested quotes | S`_

### P1 — Major (degrades core experience)

| # | Section | Issue | Root Cause | Fix Plan | Effort |
|---|---------|-------|------------|----------|--------|
| | | | | | |

### P2 — Minor (noticeable but not blocking)

| # | Section | Issue | Root Cause | Fix Plan | Effort |
|---|---------|-------|------------|----------|--------|
| | | | | | |

### P3 — Cosmetic (polish pass)

| # | Section | Issue | Root Cause | Fix Plan | Effort |
|---|---------|-------|------------|----------|--------|
| | | | | | |

### How to Fill This Table

For each failed checkbox:

1. **Section** — Reference the audit section number and name (e.g., `§2 Core Typing`)
2. **Issue** — One-line description of what went wrong
3. **Root Cause** — Your best hypothesis on why (inspect code if needed)
4. **Fix Plan** — Concrete steps: which file(s) to change, what logic to add/modify, any dependencies
5. **Effort** — T-shirt size: `XS` (<30min), `S` (<2hr), `M` (<half day), `L` (<1 day), `XL` (>1 day)

### Prioritization Rules

- **P0**: Data loss, crash, or corruption. Cannot ship.
- **P1**: Core workflow broken or seriously degraded. Users will complain immediately.
- **P2**: Feature works but with friction. Users will notice but can work around it.
- **P3**: Visual glitch, misalignment, or minor inconsistency. Fix in polish pass.

### After Completing the Audit

1. Sort P0 items by effort (smallest first) and fix all before any other work
2. Fix P1 items in priority order — these are your sprint goals
3. Bundle P2 + P3 items into a "polish" task for the end of the sprint
4. For any item marked `XL`, create a design doc or spike task before committing to a fix
5. Re-run the failed checkboxes after fixes to verify — update this table with ✓ when resolved
