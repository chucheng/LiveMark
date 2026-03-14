# TODO

Comprehensive repo audit — 2026-03-14. Findings from 7 parallel agents covering docs, dead code, CSS, architecture, config, README/CHANGELOG, and TODO synthesis.

---

## P0 — Critical (fix now)

### 1. Auto-updater removed but frontend code still references it
The Rust `tauri-plugin-updater` was removed (commit `e1ebb20`) but `@tauri-apps/plugin-updater` is still imported in 3 frontend files. The "Check for Updates" command and `UpdateBanner.tsx` will crash at runtime.
- Files: `src/commands/all-commands.ts:248-260`, `src/ui/UpdateBanner.tsx:18`, `src/ui/App.tsx:603`
- Action: Remove all frontend updater imports, the `app.checkForUpdates` command, and `UpdateBanner.tsx` — or restore the Rust plugin with proper config.

### 2. Roadmap M6 checkboxes out of sync with shipped code
7 of 11 M6 DoD items are unchecked, but most are implemented (font family, content width, line height, paragraph spacing, two-column layout, presets, custom shortcuts). Roadmap misrepresents M6 as mostly incomplete.
- Files: `docs/v2/roadmap-v2.md:181-190`
- Action: Check off implemented items. Only "content margins", "export respects template settings", and "command palette conflict badges" may remain.

### 3. Roadmap M7 checked items are non-functional
M7 auto-update items (check, banner, download, unsaved prompt) are checked but the plugin was removed.
- Files: `docs/v2/roadmap-v2.md:207-214`
- Action: Uncheck or annotate that the updater was removed pending proper config.

### 4. CHANGELOG.md missing v1.4.0 entry
Version is 1.4.0 across package.json/Cargo.toml/tauri.conf.json but CHANGELOG stops at v1.3.12.
- Files: `CHANGELOG.md`
- Action: Add v1.4.0 entry. Also add missing entries for v1.2.0, v1.3.0, v1.3.2.

---

## P1 — Should Fix

### 5. Cmd+Shift+C shortcut conflict
Both ProseMirror keymap (`toCodeBlock`) and command registry (`copyAsHTML`) bind `Cmd+Shift+C`. ProseMirror fires first when editor is focused, so "Copy as HTML" never triggers while editing.
- Files: `src/editor/keymaps.ts:297`, `src/commands/all-commands.ts:93`
- Action: Rebind one of the two.

### 6. Custom shortcuts stored but never applied to ProseMirror
`customShortcuts` signal in preferences stores user-defined shortcuts, but `buildKeymaps()` only uses hardcoded bindings. Custom shortcuts only affect command palette display, not actual keyboard behavior.
- Files: `src/state/preferences.ts:17`, `src/editor/keymaps.ts`, `src/commands/registry.ts`
- Action: Wire custom shortcuts into ProseMirror keymap, or document this as a known limitation.

### 7. Duplicate insertLink logic
`keymaps.ts` inserts raw `[text](url)` text; `all-commands.ts` creates a proper ProseMirror link mark. They could diverge.
- Files: `src/editor/keymaps.ts:231-264`, `src/commands/all-commands.ts:291-320`
- Action: Have keymaps delegate to the command registry version.

### 8. Dead `get_home_dir` Tauri command
Registered in Rust but never invoked from TypeScript.
- Files: `src-tauri/src/main.rs:21-30`
- Action: Remove.

### 9. Dead exports: `getCommandById` and `loadFile`
`getCommandById` is never called. `loadFile` appears superseded by `openFileInTab`.
- Files: `src/commands/registry.ts:39`, `src/commands/file-commands.ts:145`
- Action: Remove both.

### 10. CSS: Duplicate table rules
Table styles declared in both `editor.css` and `live-render.css` with conflicting margins.
- Files: `src/styles/editor.css:141-157`, `src/styles/live-render.css:437-453`
- Action: Remove duplicates from `editor.css`, keep `live-render.css` as canonical.

### 11. CSS: Orphaned `data-task` selectors
Schema uses class-based `li.lm-task-item`, not `data-task` attributes. Three rule blocks are dead code.
- Files: `src/styles/editor.css:112-125`
- Action: Remove.

### 12. Docs: `ideas.md` lists already-shipped features
Font family, content width, line height, paragraph spacing, two-column layout, custom hotkey assignment, and shortcut conflict awareness are all implemented.
- Files: `docs/future/ideas.md:19-26, 37-43`
- Action: Remove shipped items.

### 13. Docs: UX spec has stale keyboard shortcuts
`Cmd+B` for sidebar (should be `Cmd+\`), `Cmd+Shift+M` for Copy as Markdown (should be `Cmd+Alt+C`).
- Files: `docs/v2/ux-v2.md:124, 320, 352, 377`
- Action: Update to match actual bindings.

### 14. Docs: Architecture doc references removed updater plugin
Section 2.9 and section 5 dependency list reference `tauri-plugin-updater`.
- Files: `docs/v2/architecture-v2.md:273, 332, 601`
- Action: Update to reflect removal.

### 15. Docs: Test plan references non-functional auto-update
AU-01 through AU-07 test a feature whose backend was removed.
- Files: `docs/v2/testing-v2.md:158-168`
- Action: Annotate as blocked pending updater re-integration.

### 16. Docs: Test plan MT-15 wrong shortcut range
Says Cmd+1-9 switch tabs; actually Cmd+1-6 are headings, only Cmd+7-9 switch tabs.
- Files: `docs/v2/testing-v2.md:81`
- Action: Correct.

### 17. CI: `macos-13` runner deprecated
GitHub is removing Intel Mac runners. Both CI and release workflows use `macos-13`.
- Files: `.github/workflows/ci.yml:57`, `.github/workflows/release.yml:49`
- Action: Migrate to `macos-14` (ARM64) with appropriate target.

### 18. README: Auto-update feature claim is false
README line 43 claims auto-update works via `tauri-plugin-updater` but the plugin was removed.
- Files: `README.md:43`
- Action: Remove or mark as disabled.

### 19. CSP: Mermaid may need `script-src` in production
No explicit `script-src` in CSP; falls back to `default-src 'self'`. Mermaid strict mode should work but some versions need `'unsafe-eval'`.
- Files: `src-tauri/tauri.conf.json:47`
- Action: Test mermaid in a production build. Add `script-src 'self' 'unsafe-eval'` if needed.

---

## P2 — Nice to Have

### 20. CodeBlockView and MathBlockView missing `selectNode`/`deselectNode`
Other block NodeViews (heading, blockquote, frontmatter) implement these for visual selection feedback.
- Files: `src/editor/nodeviews/code-block.ts`, `src/editor/nodeviews/math-block.ts`

### 21. ReviewPanel dispatch monkey-patch uses fragile module-scoped variables
`patchedView`/`origDispatch` should be inside the `createEffect` callback.
- Files: `src/ui/ReviewPanel.tsx:36-75`

### 22. Block drag auto-scroll may not work if editor is inside a scroll wrapper
`view.dom.scrollTop` assumes the editor DOM is the scroll container.
- Files: `src/editor/plugins/block-handles.ts` (`startAutoScroll`)

### 23. CSS: Hardcoded mermaid dark-mode colors
~12 hex values that could use existing design tokens (`--lm-text`, `--lm-bg-elevated`, etc.).
- Files: `src/styles/live-render.css:546-581`

### 24. CSS: Settings validation error uses mismatched fallback hex
`var(--lm-severity-issue, #e53935)` — fallback doesn't match actual token value.
- Files: `src/styles/settings.css:485, 489, 494`

### 25. CSS: Settings `!important` could be replaced by higher specificity
`.lm-settings-input-error` uses `!important` unnecessarily.
- Files: `src/styles/settings.css:485, 489`

### 26. CSS: Duplicate `.lm-code-block-wrapper pre` rule in live-render.css
Declared at lines 80 and 315 — should be merged.
- Files: `src/styles/live-render.css:80, 315`

### 27. Unnecessary public exports (14 items)
Functions/types exported but only used within their own file: `markdownParser`, `getMermaid`, `blockHandlesKey`, `headingCollapseKey`, `generateSlug`, `generateBlockId`, `readBlockAnchor`, `CursorPosition`, `EditorOptions`, `NodeViewConstructor`, `SyncEntry`, `CloseTabResult`, `FileEntry`, `APP_VERSION`.
- Action: Remove `export` keyword from each.

### 28. Docs: Move `v2-audit.md` to `docs/v2/`
Misplaced at docs root.
- Files: `docs/v2-audit.md`

### 29. Docs: Archive `cross-review.md` and `design-system-light-theme.md`
Planning artifacts with no ongoing purpose; recommendations were implemented.
- Files: `docs/v2/cross-review.md`, `docs/v2/design-system-light-theme.md`

### 30. Docs: UX spec keyboard shortcuts table duplicates tutorial
Section 4 of ux-v2.md overlaps with tutorial and is out of date.
- Files: `docs/v2/ux-v2.md:370-408`

### 31. README: Missing keyboard shortcuts
Undocumented: `Cmd+W`, `Cmd+\`, `Cmd+,`, `Cmd+K`, `Cmd+Shift+H`, chord commands, `Cmd+Shift+X`.
- Files: `README.md`

### 32. README: Project structure section incomplete
Missing: `SettingsPanel.tsx`, `inline-decorations.ts`, `lazy-render.ts`, `file-watch.ts`, `shortcuts.ts`, `filetree.rs`.
- Files: `README.md:165-178`

### 33. CHANGELOG: Missing entries for v1.2.0, v1.3.0, v1.3.2, post-v1.4.0 fixes
- Files: `CHANGELOG.md`

### 34. `.gitignore` missing `.env*` pattern
Risk of accidentally committing secrets.
- Files: `.gitignore`

### 35. No "Open Recent" / welcome screen
Recent files only accessible via command palette. PRD specifies a launch screen.

### 36. `closeAll` command doesn't check if individual close was cancelled
Rapid iteration over tabs could race with cleanup side effects.
- Files: `src/commands/all-commands.ts:226-233`

---

## P3 — Low Priority

### 37. CSS: highlight.js token colors use raw hex (not CSS variables)
Acceptable since they're syntax theme colors with no reuse, but extracting to tokens would enable user-customizable syntax themes.
- Files: `src/styles/live-render.css:353-379`

### 38. CSS: 21 hardcoded `border-radius` values not using tokens
Consider adding `--lm-radius-xs` and `--lm-radius-pill` tokens.

### 39. CSS: No font-size token scale
~50 instances of hardcoded font sizes. Consider a type scale (`--lm-text-xs`, `--lm-text-sm`, etc.).

### 40. CSS: `--z-overlay: 900` defined but never used
- Files: `src/styles/variables.css:90`

### 41. NodeView `destroy()` inconsistency
FrontmatterView and MermaidView don't null out `view`/`getPos` references, unlike TaskListItemView.

### 42. `contentWidth` has no upper bound constant
`setContentWidth()` only enforces a minimum. A user editing preferences JSON could set an absurd value.
- Files: `src/state/preferences.ts:297`

### 43. Rust error message leaks "temp file" implementation detail
`write_file` error says "Failed to rename temp file" instead of user-facing "Failed to save file".
- Files: `src-tauri/src/commands/file.rs:39`

### 44. `console.error` in image-drop-paste.ts
Should be a user-facing status message instead.
- Files: `src/editor/plugins/image-drop-paste.ts:105`

---

## Future Work (not bugs)

### macOS notarization & Windows code signing
Required for production distribution. Without notarization, macOS Gatekeeper blocks the app.
- Priority: P0 for distribution

### Restore auto-updater
Needs proper Tauri updater endpoint + config before re-enabling.

### Large file performance verification
Lazy rendering plugin exists but should be tested with 10K+ line files.

### Additional export formats
DOCX, LaTeX — PRD P2, deferred to v3.

### Plugin/Extension API
PRD P2, deferred to v3.
