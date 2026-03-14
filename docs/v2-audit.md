# LiveMark v2 Comprehensive Bug Audit Report

**Date:** 2026-03-14
**Scope:** Full codebase audit across 7 areas — Settings, Multi-Tab, Editor Core, Source View/Theme, File Ops, Commands, CSS

---

## Critical Bugs (2)

### [CMD-001] Shortcut Conflict: Cmd+0 (Reset Zoom vs. Convert to Paragraph)
- **File(s):** `src/editor/keymaps.ts:288`, `src/commands/all-commands.ts:157`
- **Issue:** ProseMirror keymap `Mod-0` = toParagraph intercepts before reset zoom can execute
- **Effort:** S

### [CSS-001] Toggle Switch Knob Hardcoded White — Invisible in Dark Mode
- **File(s):** `src/styles/settings.css:228`
- **Issue:** `.lm-settings-toggle-track::after` uses hardcoded `background: white` — knob invisible against light track in dark mode
- **Effort:** S

---

## High Severity Bugs (7)

### [TAB-001] Missing Tab State Snapshot in saveAsFile()
- **File(s):** `src/commands/file-commands.ts:230-253`
- **Issue:** After Save As, no `snapshotActiveTab()` call — editor state may be lost on tab switch
- **Effort:** S

### [TAB-005] File Watch Can Crash on Background Tab Without EditorState
- **File(s):** `src/state/file-watch.ts:90-100`
- **Issue:** `EditorState.create({ doc, plugins: tab.editorState.plugins })` — if `tab.editorState` is null, accessing `.plugins` throws
- **Effort:** S

### [CMD-002] Cmd+Shift+F Dual Behavior Not Discoverable
- **File(s):** `src/commands/all-commands.ts:128`, `src/ui/App.tsx:433-440`
- **Issue:** Toggles replace row if find bar open, otherwise toggles focus mode — confusing and command registry only shows focus mode
- **Effort:** M

### [FILE-001] Exported HTML Breaks Relative Image Paths
- **File(s):** `src/commands/export-commands.ts`, `src/export/html-template.ts`
- **Issue:** When exporting to a different directory, relative image paths (e.g., `./images/photo.png`) point to wrong location
- **Effort:** M

### [CSS-002] Update Banner Hardcoded White Text
- **File(s):** `src/styles/update-banner.css`
- **Issue:** All text/borders use hardcoded `#fff` — not theme-aware
- **Effort:** S

### [CSS-003] Missing Focus Rings on Critical Interactive Elements
- **File(s):** Multiple: find-replace.css, tab-bar.css, mind-map.css, block-handles.css, settings.css, sidebar.css, review-panel.css
- **Issue:** 10+ button classes (`.lm-find-btn`, `.lm-tab-close`, `.lm-tabbar-arrow`, `.lm-mindmap-close`, `.lm-block-plus`, `.lm-block-grip`, `.lm-settings-stepper-btn`, `.lm-settings-btn`, `.lm-sidebar-open-btn`, `.lm-review-close`, `.lm-settings-close`) lack `:focus-visible` styles — WCAG 2.1 Level AA violation
- **Effort:** M

### [CSS-004] Z-Index Collisions — Multiple Overlays at z-index 1000
- **File(s):** settings.css, command-palette.css, block-handles.css
- **Issue:** Settings, command palette, block context menu, and block type picker all share z-index 1000; mind map at 100
- **Effort:** S

---

## Medium Severity Bugs (12)

### [SETTINGS-001] Custom Font Input State Not Synced on Preset Switch
- **File(s):** `src/ui/SettingsPanel.tsx:187-203`
- **Issue:** `customFont` signal not synced with `preferencesState.fontFamily()` — switching Custom→preset→Custom loses entered value
- **Effort:** S

### [SETTINGS-004] "custom" Stored as fontFamily Without Actual Font Value
- **File(s):** `src/ui/SettingsPanel.tsx:196-200`
- **Issue:** If user selects "Custom" but leaves input empty, `"custom"` is stored as CSS font-family (invalid)
- **Effort:** S

### [SETTINGS-005] Settings Overlay Keydown May Not Capture Events from Nested Inputs
- **File(s):** `src/ui/SettingsPanel.tsx:152`, `src/ui/App.tsx:283-488`
- **Issue:** Overlay onKeyDown may not fire if focus is on a nested input element
- **Effort:** S

### [TAB-002] Tab Restoration Race with File Watch
- **File(s):** `src/ui/App.tsx:193-204`, `src/state/file-watch.ts:68-104`
- **Issue:** Rapid tab switching (A→B→A) while file-watch reloads tab A can overwrite pending state
- **Effort:** M

### [TAB-003] Cmd+1-6 Tab Switching Not Available (Heading Conflict)
- **File(s):** `src/ui/App.tsx:475-487`
- **Issue:** Cmd+1-6 reserved for heading levels; only Cmd+7-9 switch tabs
- **Effort:** M (design decision needed)

### [TAB-004] Missing Dirty Flag Snapshot After saveFile()
- **File(s):** `src/commands/file-commands.ts:162-203`
- **Issue:** `saveFile()` clears dirty flag but doesn't snapshot editor state
- **Effort:** S

### [EDITOR-001] HeadingView/BlockquoteView Missing selectNode/deselectNode
- **File(s):** `src/editor/nodeviews/heading.ts`, `src/editor/nodeviews/blockquote.ts`
- **Issue:** No selectNode/deselectNode methods — `.lm-active` class not applied on node selection via keyboard
- **Effort:** S

### [EDITOR-002] insertLink Template Creates Misleading Placeholder
- **File(s):** `src/editor/keymaps.ts:231-265`
- **Issue:** Inserts "link" with href="url" — user must manually edit both text and URL with no guidance
- **Effort:** S

### [EDITOR-008] Task List Input Rule Position Mapping Risk
- **File(s):** `src/editor/input-rules.ts:69-96`
- **Issue:** After `tr.delete()`, position mapping may be incorrect for subsequent `blockRange` resolution
- **Effort:** M

### [CMD-003] Custom Shortcut Persistence Risk on Re-registration
- **File(s):** `src/commands/registry.ts:54-62`
- **Issue:** If a command is unregistered and re-registered, defaultShortcut overwrites custom shortcut
- **Effort:** S

### [CSS-005] Missing Scrollbar Dark Mode Styling in Review Panel
- **File(s):** `src/styles/review-panel.css:115-122`
- **Issue:** Scrollbar thumb uses `--lm-border` which is very dark in dark mode — nearly invisible
- **Effort:** S

### [SETTINGS-006] No Preset Name Uniqueness Validation
- **File(s):** `src/state/preferences.ts:162`
- **Issue:** Duplicate preset names silently overwrite
- **Effort:** S

---

## Low Severity Bugs (6)

### [EDITOR-003] MermaidView renderGeneration Race
- **File(s):** `src/editor/mermaid.ts:106-122`
- **Effort:** S

### [EDITOR-004] TaskListItemView Checkbox Listener Not Explicitly Removed
- **File(s):** `src/editor/nodeviews/task-list-item.ts:24-40`
- **Effort:** S

### [EDITOR-005] ImageView onerror May Fire After Destroy
- **File(s):** `src/editor/nodeviews/image.ts:23-25`
- **Effort:** S

### [EDITOR-009] Block Drag-Drop Position Validation Incomplete
- **File(s):** `src/editor/plugins/block-handles.ts:455-512`
- **Effort:** S

### [TAB-006] No Current File Highlight in Sidebar
- **File(s):** `src/ui/Sidebar.tsx:11-52`
- **Effort:** S

### [CMD-004] Fuzzy Search Scoring Too Basic
- **File(s):** `src/commands/registry.ts:33-48`
- **Effort:** M

---

## UX Improvements (16)

| ID | Title | Impact | Effort |
|----|-------|--------|--------|
| UX-001 | Mermaid diagram flicker on theme change (300ms gap) | Medium | M |
| UX-002 | Chord keybinding timeout lacks visual feedback | Medium | S |
| UX-003 | insertLink cursor placed incorrectly after mark | Low | S |
| UX-004 | Settings: no visual feedback for empty custom font | Medium | S |
| UX-005 | Settings: no duplicate preset name warning in UI | Low | S |
| UX-006 | Zoom % only shown when non-100% | Medium | S |
| UX-007 | Status bar hardcodes "UTF-8" | Low | S |
| UX-008 | Chord status message formatting awkward | Low | S |
| UX-009 | Settings: no focus trap on open | Medium | M |
| UX-010 | Sidebar doesn't auto-expand to current file | Medium | M |
| UX-011 | Dirty indicator (●) may flicker during rapid edits | Medium | S |
| UX-012 | Find/Replace focus style inconsistent with settings | Low | S |
| UX-013 | Sidebar resize handle barely visible | Low | S |
| UX-014 | Disabled button opacity too low in dark mode | Medium | S |
| UX-015 | Settings toggle input missing focus state | Medium | S |
| UX-016 | Source view code block lacks background distinction | Low | S |

---

## Previously Fixed Bugs — VERIFIED

All previously-reported bugs from TODO.md are **confirmed fixed**:

- BUG-002 (image save location)
- BUG-003 (dialog before save)
- BUG-004 (drag-drop .md files)
- BUG-005 ("Saved" indicator)
- BUG-006 ("Copied" indicator)
- BUG-007 ("[Source]" title bar)
- BUG-008 (Esc exits source view)
- BUG-009 (theme transition)
- BUG-011 (Cmd+Shift+F conflict)
- BUG-012 (source view highlighting)
- BUG-014 (relative image paths)
- BUG-015 (matchMedia guard)
- BUG-017 (cursor position preservation)

---

## Consolidated TODO — Sorted by Priority

| # | ID | Title | Severity | Effort | Status |
|---|----|-------|----------|--------|--------|
| 1 | CMD-001 | Fix Cmd+0 shortcut conflict (zoom vs paragraph) | Critical | S | FIXED |
| 2 | CSS-001 | Fix toggle knob color for dark mode | Critical | S | FIXED |
| 3 | TAB-001 | Add snapshotActiveTab() after Save As | High | S | FIXED |
| 4 | TAB-005 | Guard null editorState in file-watch reload | High | S | FIXED |
| 5 | FILE-001 | Convert relative image paths to absolute in export | High | M | FIXED |
| 6 | CSS-004 | Establish z-index hierarchy for overlays | High | S | |
| 7 | CSS-003 | Add :focus-visible to all interactive elements | High | M | |
| 8 | CSS-002 | Make update banner theme-aware | High | S | |
| 9 | CMD-002 | Split Cmd+Shift+F dual behavior or document it | High | M | |
| 10 | SETTINGS-004 | Validate custom font before persisting | Medium | S | |
| 11 | SETTINGS-001 | Sync customFont signal with preferences | Medium | S | |
| 12 | TAB-004 | Snapshot editor state after saveFile() | Medium | S | |
| 13 | EDITOR-001 | Add selectNode/deselectNode to heading/blockquote | Medium | S | |
| 14 | CSS-005 | Fix review panel scrollbar in dark mode | Medium | S | |
| 15 | EDITOR-002 | Improve link insertion UX | Medium | S | |
| 16 | TAB-002 | Guard file-watch during tab switch | Medium | M | |
| 17 | SETTINGS-006 | Add preset name uniqueness check | Medium | S | |
| 18 | EDITOR-008 | Fix task list input rule position mapping | Medium | M | |
| 19 | CMD-003 | Protect custom shortcuts from re-registration | Medium | S | |
| 20 | SETTINGS-005 | Fix settings overlay keyboard event capture | Medium | S | |
| 21 | TAB-003 | Design solution for Cmd+1-6 tab vs heading | Medium | M | |
| 22 | TAB-006 | Add current file highlight in sidebar | Low | S | |
| 23 | CMD-004 | Improve fuzzy search scoring | Low | M | |
| 24 | EDITOR-003-009 | Minor NodeView cleanup (4 items) | Low | S | |

---

## Fix Plan for Remaining Issues

### Sprint 1: High Severity (4 items, ~2 sessions)

**[CSS-004] Z-index hierarchy** (S)
- Add z-index CSS custom properties in `variables.css`: `--z-overlay: 100`, `--z-modal: 1000`, `--z-popover: 1050`, `--z-about: 1100`
- Update: mind-map.css (100→var), settings.css, command-palette.css, block-handles.css (1000→correct tier)
- Block context menu/type picker → `--z-popover` (above palette)

**[CSS-003] Focus rings** (M)
- Add a shared `:focus-visible` rule in `reset.css` for all `.lm-*-btn, .lm-*-close, .lm-*-arrow` selectors
- Pattern: `box-shadow: 0 0 0 2px var(--lm-focus-ring)` (already defined in variables.css)
- Touch files: find-replace.css, tab-bar.css, mind-map.css, block-handles.css, settings.css, sidebar.css, review-panel.css

**[CSS-002] Update banner theme** (S)
- Replace hardcoded `#fff` in `update-banner.css` with `var(--lm-text)`, `var(--lm-border)`, `var(--lm-accent)`
- Add dark mode override block if needed

**[CMD-002] Cmd+Shift+F clarity** (M)
- Option A: Register find-replace toggle as a separate command with its own shortcut (Cmd+Shift+H for replace)
- Option B: Keep dual behavior but update command registry to show context note
- Recommendation: Option A — cleaner separation

### Sprint 2: Medium Severity — Settings & Tab Fixes (8 items, ~2 sessions)

**[SETTINGS-004] Validate custom font** (S)
- In `SettingsPanel.tsx`, when font select changes to "Custom", don't set `fontFamily("custom")` — only set when input has a non-empty value
- On blur with empty input, revert to previous font family

**[SETTINGS-001] Sync customFont signal** (S)
- Add `createEffect` in SettingsPanel that initializes `customFont` from current `preferencesState.fontFamily()` when the panel opens (if it's not a known preset value)

**[TAB-004] Snapshot after saveFile()** (S)
- Same pattern as TAB-001 fix: add `tabsState.snapshotActiveTab(editorRef.view, scroller)` after `documentState.setClean()` in `saveFile()`

**[EDITOR-001] selectNode/deselectNode** (S)
- Add `selectNode()` / `deselectNode()` to `HeadingView` and `BlockquoteView` that toggle `.lm-active` CSS class
- Follow same pattern used in code-block and mermaid NodeViews

**[CSS-005] Review panel scrollbar** (S)
- Add dark theme scrollbar thumb: `var(--lm-border-emphasis)` instead of `var(--lm-border)`

**[SETTINGS-006] Preset name uniqueness** (S)
- In `savePreset()`, check if name already exists; if so, show confirm dialog before overwriting

**[SETTINGS-005] Settings keyboard events** (S)
- Add a `document.addEventListener("keydown", ...)` in the settings panel's `onMount` instead of relying on overlay div `onKeyDown`
- Remove in `onCleanup`

**[CMD-003] Custom shortcut persistence** (S)
- In `registerCommand`, check if a custom shortcut already exists in preferences before setting `defaultShortcut`

### Sprint 3: Medium Severity — Editor & Tab Logic (4 items, ~1 session)

**[EDITOR-002] Link insertion UX** (S)
- After Cmd+K with no selection, show a simple prompt-style input in the status bar area for entering the URL
- Or: insert `[text](url)` as raw Markdown text and select the "url" portion for replacement

**[TAB-002] File-watch guard during tab switch** (M)
- Add a `tabSwitching` check in `checkForChanges()` — skip if tab switching is in progress
- Or pause file-watch polling during `handleTabSwitch()` execution

**[EDITOR-008] Task list position mapping** (M)
- Use `tr.mapping.map()` consistently after delete operation
- Add null check on `blockRange` result before proceeding with wrap

**[TAB-003] Cmd+1-6 design** (M)
- Recommendation: Keep headings on Cmd+1-6 (matches Typora convention). Add Ctrl+Tab / Ctrl+Shift+Tab for tab cycling. Document that Cmd+7-9 switch to tabs 7-9.

### Sprint 4: Low Severity + UX Polish (~1 session)

**[TAB-006] Sidebar file highlight** (S)
- In `Sidebar.tsx TreeNode`, compare `node.path === documentState.filePath()` → add `.lm-sidebar-active` class

**[CMD-004] Fuzzy search scoring** (M)
- Implement start-of-word bonus and consecutive character matching
- Tiebreak by command label length (shorter = more specific)

**[EDITOR-003-009] NodeView cleanup** (S)
- EDITOR-004: Explicitly remove checkbox mousedown listener in `destroy()`
- EDITOR-005: Add `isConnected` guard in onerror callback
- EDITOR-009: Add block boundary validation in drop handler
- EDITOR-003: Add cleanup guard for in-flight renders

### Sprint 5: UX Improvements (~2 sessions)

**Batch 1: Accessibility** (UX-002, UX-009, UX-014, UX-015)
- Focus trap for settings panel
- `:focus-visible` on toggle inputs
- Better disabled button contrast in dark mode

**Batch 2: Visual Polish** (UX-001, UX-006, UX-011, UX-013, UX-016)
- Mermaid theme-change transition smoothing
- Always show zoom percentage
- Dirty indicator debounce
- Sidebar resize handle visibility
- Source view code background

**Batch 3: Feedback & Discoverability** (UX-003, UX-004, UX-005, UX-007, UX-008, UX-010, UX-012)
- Chord timeout status bar message
- Custom font empty validation feedback
- Preset duplicate warning
- Status bar encoding display
- Chord key hint format
- Sidebar auto-expand to current file
- Consistent focus styles across inputs
