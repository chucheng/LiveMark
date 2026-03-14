# LiveMark — Product Spec Audit TODO

## Audit Summary (2026-03-13)

- **Total issues found:** 18
- **Critical:** 1
- **High:** 6
- **Medium:** 8
- **Low:** 3

### Flow Status

| Flow | Status |
|------|--------|
| Flow 1: First Launch | PASS |
| Flow 2: Writing with Live Rendering | PASS |
| Flow 3: Opening an Existing File | PARTIAL — missing drag-and-drop .md file open |
| Flow 4: Saving a File | PARTIAL — missing "Saved" indicator on manual save |
| Flow 5: Inserting an Image | FAILING — images saved to temp dir, no dialog, absolute paths |
| Flow 6: Working with Tables | PARTIAL — no auto-creation from typing pipe syntax |
| Flow 7: Export to HTML | PASS |
| Flow 8: Theme Switching | PARTIAL — no smooth transition animation |
| Flow 9: Find and Replace | PARTIAL — Cmd+Shift+F conflict |
| Flow 10: Keyboard-Centric Workflow | PARTIAL — Cmd+K (insert link) not implemented |
| Flow 11: Viewing and Copying Markdown Source | PARTIAL — missing [Source] title bar indicator, no "Copied" toast, no Esc exit |
| Edge: Large File | PASS (lazy-render plugin active >500 blocks) |
| Edge: Malformed Markdown | PASS (markdown-it is fault-tolerant) |
| Edge: Unsaved Changes | PASS (three-button dialog, multi-tab support) |

---

## [BUG-001] Cmd+K (Insert Link) not implemented
- Severity: Critical
- Area/Flow: Flow 10 — Keyboard-Centric Workflow
- Files/Components: `src/editor/keymaps.ts`, `src/commands/all-commands.ts`
- Expected: `Cmd+K` opens an inline link insertion UI or wraps selection in `[text](url)` syntax, per spec Flow 10.
- Actual: No `Cmd+K` binding exists anywhere in the codebase. No link insertion command is registered. Users have no keyboard shortcut to insert links.
- Repro Steps: Press `Cmd+K` in the editor. Nothing happens.
- Notes: This is the only missing shortcut from the spec's canonical keyboard workflow (11 shortcuts listed, 10 implemented). Link insertion is a core Markdown editing operation.
- Suggested Fix: Add a `Mod-k` keymap in `keymaps.ts` that either (a) wraps the selection in `[selection](url)` and places cursor in the URL portion, or (b) opens a small inline popover for URL entry. Register a corresponding command `edit.insertLink` in `all-commands.ts`.
- Status: Open

---

## [BUG-002] Images saved to temp directory instead of alongside document
- Severity: High
- Area/Flow: Flow 5 — Inserting an Image
- Files/Components: `src-tauri/src/commands/image.rs`, `src/editor/plugins/image-drop-paste.ts`
- Expected: Per spec: "Image saved alongside document" at a relative path like `./images/pasted-image.png`. Markdown syntax uses relative path.
- Actual: Images are saved to `std::env::temp_dir()/livemark-images/` (an OS temp directory). Markdown inserts an absolute path. Images will be lost when temp is cleaned, and are not portable with the document.
- Repro Steps: Open a saved .md file. Paste an image. Check the inserted Markdown syntax — it contains an absolute temp path. Close and reopen the app — image may be gone.
- Notes: This is a data loss risk. Exported HTML or shared .md files will have broken image references.
- Suggested Fix: Modify `save_image` to accept the document's directory path. Save images to `{doc_dir}/images/{filename}`. Use relative path in Markdown. Fall back to temp dir only for untitled (unsaved) documents.
- Status: Open

---

## [BUG-003] No dialog prompting user before saving pasted/dropped image
- Severity: High
- Area/Flow: Flow 5 — Inserting an Image
- Files/Components: `src/editor/plugins/image-drop-paste.ts`
- Expected: Per spec: "Dialog asks: save image to relative path?" — user should be prompted before image is saved.
- Actual: Image is saved silently to temp dir with no user confirmation or path choice.
- Repro Steps: Paste an image into the editor. No dialog appears; image is saved automatically.
- Notes: User has no control over where the image is stored or what it's named.
- Suggested Fix: After capturing the image data, show a Tauri dialog asking the user to confirm the save location (defaulting to `./images/` relative to document). Allow renaming.
- Status: Open

---

## [BUG-004] Drag-and-drop .md file onto window not supported
- Severity: High
- Area/Flow: Flow 3 — Opening an Existing File
- Files/Components: `src/editor/plugins/image-drop-paste.ts`, `src/ui/App.tsx`
- Expected: Per spec: "User drags a .md file onto the LiveMark window → same result [as Cmd+O]."
- Actual: The only drop handler is in `image-drop-paste.ts` which filters for `image/*` MIME types. Non-image files are ignored. No window-level drop handler exists for `.md`/`.txt` files.
- Repro Steps: Drag a `.md` file from Finder onto the LiveMark window. Nothing happens.
- Notes: Documented in `docs/v2/cross-review.md` as a known gap. The v2 spec describes the needed architecture (check extension first, fall through to image handler).
- Suggested Fix: Add a window-level `dragover`/`drop` listener in `App.tsx` (or modify `image-drop-paste.ts` to check file extension before MIME type). If a `.md`/`.txt` file is dropped, call `openFileInTab(path)`.
- Status: Open

---

## [BUG-005] No "Saved" indicator in status bar after manual Cmd+S save
- Severity: High
- Area/Flow: Flow 4 — Saving a File
- Files/Components: `src/commands/file-commands.ts`, `src/ui/StatusBar.tsx`, `src/ui/App.tsx`
- Expected: Per spec: "Brief 'Saved' indicator in status bar (fades after 1s)" after saving an existing file.
- Actual: Manual save via `Cmd+S` saves the file and clears the dirty indicator, but shows no "Saved" feedback in the status bar. Only auto-save shows "Auto-saved" (via `autoSaveStatus` signal in `App.tsx:112-114`).
- Repro Steps: Open an existing file, make a change, press `Cmd+S`. File saves but status bar shows no confirmation.
- Notes: The auto-save path already has this pattern (App.tsx lines 112-114 set "Auto-saved" then fade after 2000ms). The same mechanism could be reused.
- Suggested Fix: After successful `saveFile()`, set a "Saved" status signal that the status bar displays with a 1-2s fade timeout. Could reuse the `autoSaveStatus` signal or add a parallel `saveStatus` signal.
- Status: Open

---

## [BUG-006] No "Copied" indicator in status bar after Copy as Markdown / Copy as HTML
- Severity: Medium
- Area/Flow: Flow 11 — Viewing and Copying Markdown Source
- Files/Components: `src/commands/export-commands.ts`, `src/ui/StatusBar.tsx`
- Expected: Per spec: "Brief 'Copied' indicator in status bar (fades after 1s)" after copying.
- Actual: Copy succeeds silently. No visual feedback that content was copied to clipboard.
- Repro Steps: Open command palette, select "Copy as Markdown". Clipboard receives content but no indicator appears.
- Notes: Same pattern as BUG-005 — needs a transient status bar message.
- Suggested Fix: Add a callback or event that `StatusBar` listens to, showing "Copied" for 1-2s after clipboard write.
- Status: Open

---

## [BUG-007] Title bar does not show "[Source]" indicator in source view mode
- Severity: Medium
- Area/Flow: Flow 11 — Viewing and Copying Markdown Source (Scenario B)
- Files/Components: `src/ui/App.tsx` (lines 574-577)
- Expected: Per spec: "Title bar shows '[Source]' indicator" when in source view mode.
- Actual: Title bar always shows `displayPath()` + modified dot. No "[Source]" prefix or suffix when source view is active.
- Repro Steps: Press `Cmd+/` to enter source view. Title bar shows the same filename as before, no "[Source]" indication.
- Notes: `uiState.isSourceView()` signal is available and could be used in the title bar rendering.
- Suggested Fix: In App.tsx title bar JSX, conditionally prepend "[Source] " when `uiState.isSourceView()` is true.
- Status: Open

---

## [BUG-008] Esc does not exit source view
- Severity: Medium
- Area/Flow: Flow 11 — Viewing and Copying Markdown Source (Scenario B)
- Files/Components: `src/ui/App.tsx` (handleKeydown), `src/ui/SourceView.tsx`
- Expected: Per spec: "Press Cmd+/ again (or Esc) to return to rendered editing view."
- Actual: Only `Cmd+/` toggles source view. Pressing `Esc` while in source view does not return to the editor. The `handleKeydown` in App.tsx has no `Escape` → `toggleSourceView` path. In ProseMirror, `Escape` is bound to `selectParentNode` which only fires when the editor has focus (and source view replaces the editor).
- Repro Steps: Press `Cmd+/` to enter source view. Press `Esc`. Source view remains.
- Notes: SourceView has no keydown handler. The App-level keydown handler doesn't check for Esc + source view state.
- Suggested Fix: In `handleKeydown`, add an early check: if `uiState.isSourceView()` and `e.key === "Escape"`, call `uiState.toggleSourceView()` and restore editor sync line.
- Status: Open

---

## [BUG-009] No smooth 200ms transition on theme switch
- Severity: Medium
- Area/Flow: Flow 8 — Theme Switching
- Files/Components: `src/state/theme.ts`, `src/styles/variables.css`
- Expected: Per spec: "Theme transitions smoothly (200ms). All elements re-render in new theme."
- Actual: Theme switch is instant — CSS variables change via `[data-theme]` attribute swap with no transition. Individual components have transitions on hover/interaction states, but there is no global color transition on theme toggle.
- Repro Steps: Toggle theme via `Cmd+Shift+T`. Colors change instantly, no fade or transition.
- Notes: Adding `transition: color 200ms, background-color 200ms` to `*` or `:root` would create a global smooth transition, but may have performance implications. A more targeted approach could transition only on `.lm-app` and major containers.
- Suggested Fix: Add a temporary class (e.g., `.lm-theme-transitioning`) to the root element during theme switch that applies `transition: background-color 200ms, color 200ms` to key elements, then remove the class after 200ms.
- Status: Open

---

## [BUG-010] Table auto-creation from typing pipe syntax not implemented
- Severity: Medium
- Area/Flow: Flow 6 — Working with Tables
- Files/Components: `src/editor/input-rules.ts`
- Expected: Per spec: "User types '| Name | Age |' + Enter → Table structure recognized. User continues with separator row '| --- | --- |' → Table renders visually."
- Actual: No input rule exists for table creation. Tables can only be created by parsing existing Markdown (e.g., opening a file with a table) or pasting table syntax. Typing pipe syntax in the editor produces plain text.
- Repro Steps: In an empty document, type `| Name | Age |` and press Enter. Continue with `| --- | --- |` and press Enter. Result is plain text paragraphs, not a table.
- Notes: This is a complex input rule because it requires detecting a two-line pattern (header + separator). May need a plugin rather than a simple input rule. prosemirror-tables handles editing once a table exists, but doesn't help with creation.
- Suggested Fix: Implement a custom ProseMirror plugin or input rule that detects the `| --- | --- |` separator line and converts the preceding header line + separator into a proper table node.
- Status: Open

---

## [BUG-011] Cmd+Shift+F bound to Focus Mode, not Find & Replace expansion
- Severity: Low
- Area/Flow: Flow 9 — Find and Replace
- Files/Components: `src/commands/all-commands.ts` (line 128), `src/ui/App.tsx` (line 374)
- Expected: Per spec: "Cmd/Ctrl+Shift+F or click to expand to Replace" — Cmd+Shift+F should expand the find bar to show the replace row.
- Actual: `Cmd+Shift+F` is bound to "Toggle Focus Mode" (a separate feature). The replace row can only be expanded by clicking the ⇄ toggle button in the find bar.
- Repro Steps: Press `Cmd+F` to open find bar. Press `Cmd+Shift+F`. Focus mode toggles instead of showing replace fields.
- Notes: This is a shortcut conflict. The spec assigns `Cmd+Shift+F` to replace expansion, but the implementation uses it for focus mode. Either the spec should be updated or focus mode should use a different shortcut.
- Suggested Fix: Reassign Focus Mode to a different shortcut (e.g., `Cmd+Shift+M` or a chord like `Cmd+J F`), and bind `Cmd+Shift+F` to expand replace in the find bar.
- Status: Open

---

## [BUG-012] Source view has no syntax highlighting
- Severity: Medium
- Area/Flow: Flow 11 — Viewing and Copying Markdown Source (Scenario B)
- Files/Components: `src/ui/SourceView.tsx`
- Expected: Per spec: "Full raw Markdown is displayed (syntax highlighted as plain text)."
- Actual: SourceView renders raw Markdown in a `<pre><code>` block with no syntax highlighting. It's plain monospace text with no color differentiation for headings, bold, code blocks, etc.
- Repro Steps: Press `Cmd+/` to enter source view. All text is the same color — no syntax highlighting applied.
- Notes: Could use highlight.js with a "markdown" language mode, or a lightweight custom highlighter for Markdown syntax.
- Suggested Fix: Apply highlight.js with `language: "markdown"` to the source view content, or add CSS-based highlighting for common Markdown patterns.
- Status: Open

---

## [BUG-013] Cmd+W closes tab, not window — spec says "Close window"
- Severity: Low
- Area/Flow: Flow 10 — Keyboard-Centric Workflow
- Files/Components: `src/ui/App.tsx` (line 329), `src/commands/all-commands.ts` (line 52)
- Expected: Per spec Flow 10: "Cmd/Ctrl+W → Close window."
- Actual: `Cmd+W` closes the current tab (via `closeActiveTab()`), not the window. If multiple tabs are open, it closes only the active tab.
- Repro Steps: Open multiple tabs. Press `Cmd+W`. Only the active tab closes; the window remains open.
- Notes: The current behavior (close tab) is arguably better UX for a tabbed editor and matches other editors (VS Code, Sublime). This may be a spec ambiguity rather than a bug — the spec was written before tabs existed. However, the command is registered as "Close Tab" which is more accurate. The spec should be updated.
- Suggested Fix: Update the spec to say "Cmd+W → Close tab" since tabbed behavior is the standard. Window close is handled by the OS window close button + unsaved changes protection.
- Status: Open

---

## [BUG-014] Pasted/dropped images use absolute paths in Markdown syntax
- Severity: High
- Area/Flow: Flow 5 — Inserting an Image
- Files/Components: `src/editor/plugins/image-drop-paste.ts` (line 88-92), `src-tauri/src/commands/image.rs`
- Expected: Per spec: Markdown image syntax should use relative path like `![](./images/pasted-image.png)`.
- Actual: The `save_image` Rust command returns an absolute path (e.g., `/tmp/livemark-images/image.png`) which is inserted directly into the Markdown. This makes the document non-portable.
- Repro Steps: Paste an image. Check the generated Markdown. It will contain an absolute temp path.
- Notes: Related to BUG-002. Even if the save location is fixed, the path calculation needs to produce a relative path from the document's directory.
- Suggested Fix: Compute relative path from document directory to image save location. If document is untitled, use absolute path temporarily and convert to relative on first save.
- Status: Open

---

## [BUG-015] Two test suites fail due to missing window in test environment
- Severity: Medium
- Area/Flow: Test infrastructure
- Files/Components: `src/editor/markdown/__tests__/preferences-template.test.ts`, `src/editor/markdown/__tests__/shortcut-customization.test.ts`, `src/state/theme.ts` (line 7)
- Expected: All test suites pass.
- Actual: Two test suites fail with `ReferenceError: window is not defined` because `src/state/theme.ts` line 7 calls `window.matchMedia()` at module load time, which fails in Node/vitest without a DOM environment.
- Repro Steps: Run `pnpm test`. Two suites fail.
- Notes: The issue is that `theme.ts` runs `window.matchMedia` at import time (module-level side effect). Tests that transitively import this module crash. 392 tests in other suites still pass.
- Suggested Fix: Guard the `matchMedia` call with `typeof window !== "undefined"` or configure those test files to use a `jsdom` environment via vitest config.
- Status: Open

---

## [BUG-016] No table NodeView for dual render/edit mode
- Severity: Low
- Area/Flow: Flow 6 — Working with Tables
- Files/Components: `src/editor/nodeviews/`
- Expected: Tables follow the same cursor-aware dual render/edit pattern as other block types (headings, code blocks, blockquotes, etc.) — clean rendered view when cursor is outside, raw syntax when inside.
- Actual: No custom table NodeView exists. Tables use prosemirror-tables default rendering. Unlike headings/code blocks, tables don't switch between rendered and raw-syntax modes. They are always in "edit" mode showing cell borders and structure.
- Repro Steps: Create a table and move cursor in/out. The table appearance doesn't change — it always shows the structured cell layout.
- Notes: This is a design choice that works fine in practice — prosemirror-tables provides good in-place editing UX. However, it's inconsistent with the spec's language about "clean rendered table view" when cursor is outside. Not a regression.
- Suggested Fix: Consider adding a lightweight table NodeView that hides cell borders and shows a cleaner rendered view when cursor is outside the table. Low priority — current behavior is functional.
- Status: Open

---

## [BUG-017] Cursor position not fully preserved when switching back from source view
- Severity: Medium
- Area/Flow: Flow 11 — Viewing and Copying Markdown Source (Scenario B)
- Files/Components: `src/ui/App.tsx` (lines 353-368), `src/ui/SourceView.tsx`
- Expected: Per spec: "Cursor position is preserved when switching back."
- Actual: Scroll sync is preserved via `syncLine` signal (line-level sync between editor scroll position and source view scroll position). However, the actual cursor/selection position in the ProseMirror editor is not saved and restored — only the viewport scroll position is synced. If the user had selected text at line 50 but scrolled to line 100 before toggling source view, the cursor remains at line 50 but the viewport scrolls to line 100's equivalent.
- Repro Steps: Place cursor at a specific position in the editor. Scroll away from that position. Toggle source view and back. The scroll position syncs but the cursor selection may not match the visible viewport.
- Notes: The scroll sync mechanism is well-implemented for viewport preservation. True cursor position preservation would require mapping ProseMirror position to source line/column and back.
- Suggested Fix: This is acceptable behavior for most users. For full spec compliance, could save `view.state.selection` before entering source view and restore it on return.
- Status: Open

---

## [BUG-018] Cmd+1 through Cmd+6 conflict between headings and tab switching
- Severity: High
- Area/Flow: Flow 10 — Keyboard-Centric Workflow
- Files/Components: `src/editor/keymaps.ts` (lines 162-164), `src/ui/App.tsx` (lines 409-420)
- Expected: Consistent behavior — either `Cmd+1-6` sets heading level (standard Markdown editor behavior) or switches tabs (browser/VS Code behavior), not both depending on focus state.
- Actual: `Cmd+1-6` is bound in BOTH ProseMirror keymaps (heading level) AND the App.tsx keydown handler (tab switching). The ProseMirror handler fires first when the editor is focused, setting the heading level. The App.tsx handler fires when focus is elsewhere (or after ProseMirror doesn't handle it). Additionally, `Cmd+1-9` in App.tsx (line 409) overlaps with `Cmd+1-6` headings and `Cmd+0` paragraph reset. This means `Cmd+7`, `Cmd+8`, `Cmd+9` switch tabs, but `Cmd+1-6` set headings when editor is focused.
- Repro Steps: With editor focused, press `Cmd+3`. Heading level 3 is applied (not tab switch). Press `Cmd+7` — switches to tab 7 if it exists.
- Notes: This inconsistency is confusing. Most Markdown editors use `Cmd+1-6` for headings. Tab switching via number keys is a secondary expectation. The behavior silently differs based on whether ProseMirror consumes the event.
- Suggested Fix: Remove `Cmd+1-6` from the tab-switching handler in App.tsx (only allow `Cmd+7-9` for tabs), OR move heading shortcuts to a different binding (e.g., `Ctrl+1-6` on Mac). Document the chosen behavior.
- Status: Open
