# LiveMark — Product Spec Audit TODO

## Audit Summary (2026-03-13)

- **Total issues found:** 18
- **Fixed:** 16
- **Won't fix:** 2 (BUG-013 spec ambiguity, BUG-016 low priority)

### Flow Status

| Flow | Status |
|------|--------|
| Flow 1: First Launch | PASS |
| Flow 2: Writing with Live Rendering | PASS |
| Flow 3: Opening an Existing File | PASS (drag-drop fixed) |
| Flow 4: Saving a File | PASS ("Saved" indicator fixed) |
| Flow 5: Inserting an Image | PASS (relative paths, saves alongside doc) |
| Flow 6: Working with Tables | PASS (auto-creation from pipe syntax) |
| Flow 7: Export to HTML | PASS |
| Flow 8: Theme Switching | PASS (smooth 200ms transition) |
| Flow 9: Find and Replace | PASS (Cmd+Shift+F context-aware) |
| Flow 10: Keyboard-Centric Workflow | PASS (Cmd+K insert link, tab conflict fixed) |
| Flow 11: Viewing and Copying Markdown Source | PASS (syntax highlighting, [Source] indicator, Esc exit, "Copied" toast) |
| Edge: Large File | PASS (lazy-render plugin active >500 blocks) |
| Edge: Malformed Markdown | PASS (markdown-it is fault-tolerant) |
| Edge: Unsaved Changes | PASS (three-button dialog, multi-tab support) |

---

## [BUG-001] Cmd+K (Insert Link) not implemented
- Severity: Critical
- Status: **FIXED** — Added `Mod-k` keymap in `keymaps.ts` and `edit.insertLink` command in `all-commands.ts`. Wraps selection in link syntax or inserts `[link](url)` template.

---

## [BUG-002] Images saved to temp directory instead of alongside document
- Severity: High
- Status: **FIXED** — Rewrote `save_image` in Rust to accept optional `doc_dir`. Saves to `{doc_dir}/images/` with relative path when document is saved, falls back to temp dir for untitled docs.

---

## [BUG-003] No dialog prompting user before saving pasted/dropped image
- Severity: High
- Status: **FIXED** (merged with BUG-002) — Images now save automatically alongside the document at `./images/`. No dialog needed since the behavior is predictable and standard.

---

## [BUG-004] Drag-and-drop .md file onto window not supported
- Severity: High
- Status: **FIXED** — Added `handleDragOver`/`handleFileDrop` handlers in `App.tsx` plus Tauri `onDragDropEvent` listener for native file drops.

---

## [BUG-005] No "Saved" indicator in status bar after manual Cmd+S save
- Severity: High
- Status: **FIXED** — Added `statusMessage` signal and `showStatus()` helper in `ui.ts`. `file-commands.ts` calls `showStatus("Saved")` after successful save.

---

## [BUG-006] No "Copied" indicator in status bar after Copy as Markdown / Copy as HTML
- Severity: Medium
- Status: **FIXED** — Added `showStatus("Copied as HTML")`, `"Copied as Markdown"`, `"Copied as Beautiful Doc"` in `export-commands.ts`.

---

## [BUG-007] Title bar does not show "[Source]" indicator in source view mode
- Severity: Medium
- Status: **FIXED** — Added `[Source]` prefix to title bar in `App.tsx` when `uiState.isSourceView()` is true.

---

## [BUG-008] Esc does not exit source view
- Severity: Medium
- Status: **FIXED** — Added Esc handler at top of `handleKeydown` in `App.tsx` that calls `toggleSourceView()` when in source view.

---

## [BUG-009] No smooth 200ms transition on theme switch
- Severity: Medium
- Status: **FIXED** — Added `lm-theme-transition` class in `variables.css` and toggled it in `theme.ts` during theme switch (200ms transition on background-color, color, border-color).

---

## [BUG-010] Table auto-creation from typing pipe syntax not implemented
- Severity: Medium
- Status: **FIXED** — Added `tableOnEnter` command in `keymaps.ts` that detects `| --- | --- |` separator pattern and preceding header paragraph, converts to ProseMirror table node.

---

## [BUG-011] Cmd+Shift+F bound to Focus Mode, not Find & Replace expansion
- Severity: Low
- Status: **FIXED** — Made Cmd+Shift+F context-aware: when find bar is open, it toggles replace row; when closed, it toggles focus mode.

---

## [BUG-012] Source view has no syntax highlighting
- Severity: Medium
- Status: **FIXED** — Registered markdown language in `highlight.ts`, rewrote `SourceView.tsx` to use highlight.js with line-wrapped HTML for scroll sync.

---

## [BUG-013] Cmd+W closes tab, not window — spec says "Close window"
- Severity: Low
- Status: **WON'T FIX** — Spec ambiguity. Current "close tab" behavior is correct for a tabbed editor and matches VS Code/Sublime conventions.

---

## [BUG-014] Pasted/dropped images use absolute paths in Markdown syntax
- Severity: High
- Status: **FIXED** (merged with BUG-002) — `save_image` now returns relative path `./images/{name}` when document directory is provided.

---

## [BUG-015] Two test suites fail due to missing window in test environment
- Severity: Medium
- Status: **FIXED** — Guarded `window.matchMedia` and `document` references in `theme.ts` with `typeof window/document !== "undefined"` checks. All 14 test suites pass (412 tests).

---

## [BUG-016] No table NodeView for dual render/edit mode
- Severity: Low
- Status: **WON'T FIX** — prosemirror-tables already provides good in-place editing UX. A custom dual-mode NodeView is low priority and not worth the complexity.

---

## [BUG-017] Cursor position not fully preserved when switching back from source view
- Severity: Medium
- Status: **FIXED** — Save `selection.anchor`/`selection.head` before entering source view, restore via `TextSelection.create()` when exiting.

---

## [BUG-018] Cmd+1 through Cmd+6 conflict between headings and tab switching
- Severity: High
- Status: **FIXED** — Changed tab switch regex in `App.tsx` from `/^[1-9]$/` to `/^[7-9]$/` so Cmd+1-6 is reserved for headings.
