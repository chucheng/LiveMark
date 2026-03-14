# Changelog

## v1.4.0

- **Settings panel** — editor customization with font family, content max-width, line height, paragraph spacing, and two-column layout toggle
- **Saveable presets** — save, load, and delete editor template presets
- **Custom keyboard shortcuts** — reassign shortcuts for any command with conflict detection (OS-level and app-level)
- **Chord keybindings** — Cmd+J prefix for two-keystroke shortcuts
- **Auto-update banner** — added then removed; `tauri-plugin-updater` reverted due to missing endpoint configuration (commit e1ebb20)
- **Bug fixes** — 18 fixes across editor, file I/O, and UI layers from v2 audit

## v1.3.12

- **Version sync script** — `pnpm version:sync [version]` updates package.json, tauri.conf.json, and Cargo.toml in one command
- **Roadmap update** — marked all M1–M5 milestones as complete in v2 roadmap
- **Ideas cleanup** — removed 8 implemented features from ideas backlog (block handles, mind map, multi-tab, file tree, mermaid, frontmatter, beautiful doc, selection copy)

## v1.3.11

- **Multi-tab support** — open multiple files in tabs with editor state preservation per tab
- **Sidebar file tree** — navigate and open files from a sidebar with drag-and-drop
- **Block handles** — hover any block for a grip handle (drag-to-move, context menu with move/duplicate/delete/copy-link) and a plus button (insert new block by type)
- **Mermaid diagrams** — fenced code blocks with `mermaid` language render as diagrams (lazy-loaded)
- **YAML frontmatter** — parse, edit, and serialize YAML frontmatter blocks
- **Mind map view** — Cmd+T opens document structure as an interactive mind map via Mermaid
- **Copy as Beautiful Doc** — styled HTML clipboard copy for pasting into rich editors
- **Selection-aware Copy as Markdown** — copies only selected range as Markdown
- **Large file lazy rendering** — IntersectionObserver-based viewport rendering for long documents
- **CI/CD pipeline** — GitHub Actions for CI (cross-platform tests + typecheck) and release (auto-changelog, multi-platform builds)

## v1.3.10

- **CLAUDE.md** — added project guidance file for Claude Code
- Updated `.gitignore` and `Cargo.lock`

## v1.3.9

- **Font size zoom** — Cmd+=/Cmd+-/Cmd+0 to increase, decrease, reset editor font size (12–28px range, persisted)
- **Scroll sync fix** — improved editor-to-source-view scroll synchronization
- **Tutorial update** — refreshed docs/tutorial.md with latest features

## v1.3.8

- **Rust edition 2024** — upgraded from edition 2021 to 2024 (Rust 1.85+)
- **Docs reorganization** — promoted `tutorial.md` to top-level `docs/` for easier discovery

## v1.3.7

- **Codebase review** — 8 fixes from a deep technical review
  - **ImageView error handling** — fixed DOM leak where duplicate error spans accumulated on repeated image load failures; `update()` now properly clears stale error UI
  - **PDF export race condition** — `onload` and fallback timer could both fire `print()`, causing double print dialogs; unified into a single guarded `printAndCleanup()`
  - **ReviewPanel dispatch safety** — wrapped `runAnalysis()` in try-catch inside the monkey-patched `dispatch` to prevent analysis errors from breaking the editor dispatch chain
  - **save_image filename sanitization** — filenames with path separators (`../`) could escape the temp directory; now extracts only the file name component via `Path::file_name()`
  - **save_image counter bound** — dedup filename counter loop was unbounded; capped at 10,000 iterations
  - **Preferences JSON validation** — `write_preferences` now validates JSON with `serde_json` before writing, preventing corrupted preference files
  - **Find-replace ReDoS protection** — added 10,000 match limit to prevent catastrophic backtracking from user-supplied regex patterns
  - **SyncLine reset on file change** — source view scroll position now resets when opening or creating a new file
- **Scroll sync refactor** — extracted `buildSyncMap`, `pmPosToMdLine`, `mdLineToPmPos` into `src/ui/scroll-sync.ts` with 16 unit tests
- **Docs reorganization** — restructured `docs/` into `v1/`, `archive/`, and `future/` subdirectories
- **Cargo.toml version sync** — fixed version mismatch (was 1.1.0, now tracks package.json)

## v1.3.6

- **Inline mark decoration fix** — fixed render/edit/blur corruption for bold, italic, strikethrough, and inline code
  - Root cause 1: `buildInlineDecorations` used `descendants()` which skips the node itself — paragraphs and headings (top-level textblocks) never received syntax marker decorations
  - Root cause 2: off-by-one in position calculation for nested structures (blockquotes) — `activeNodePos + pos` missing +1 to enter the active node, placing markers at wrong positions (e.g. `Bol**d` instead of `**Bold**`)
  - Added 17 tests covering paragraphs, headings, blockquotes, position correctness, focus/blur cycles, and no-corruption guarantees
- **Code block highlight overlay fix (cont.)** — two remaining issues from v1.3.5
  - Removed `color: var(--lm-text)` from base code rule — the `:not()` selector bumped specificity to (0,3,2), overriding the `color: transparent` toggle and making both layers visible simultaneously
  - Changed overlay `padding: 0.75em 1em` → `padding: inherit` — `em` units computed at the overlay's 14px font-size (10.5px) instead of the pre's 16px (12px), causing a 1.5px vertical offset
- **Scroll sync simplification** — replaced document-position mapping with simple scroll-percentage sync between editor and source view

## v1.3.5

- **Code block highlight overlay alignment fix** — fixed CSS specificity bug where the `pre code` rule (specificity 0,2,2) overrode the highlight overlay's padding to 0, causing text misalignment between view and edit modes
  - Excluded `.lm-code-highlight` from the editable-code rule via `:not()` selector
  - Bumped highlight overlay selector to `.ProseMirror .lm-code-block-wrapper .lm-code-highlight` (specificity 0,3,0) to beat both the `pre code` rule and the inline-code rule from editor.css
  - Overlay text now renders at the correct (0.75em, 1em) offset matching the `pre` padding

## v1.3.4

- **Code block layout fix** — resolved vertical text offset and extra bottom space when toggling between view and edit modes
  - Root cause: ProseMirror sets `white-space: pre-wrap` on `<pre>` elements, but the syntax highlight overlay used `white-space: pre`, causing text position divergence
  - Both code elements now share identical typography: font-family, font-size, line-height, white-space, and word-wrap
  - Cursor position now matches rendered text exactly when entering edit mode

## v1.3.3

- **UI polish** — refined design system for a more premium, modern feel
  - Deep graphite dark mode with layered surfaces (#121417, #181b20, #1e2128)
  - New design tokens: surface layering, shadow system, transition timing, border radius
  - Review panel: pill-style severity badges, wider layout, softer dividers
  - Status bar: ghost-style buttons, calmer tertiary text
  - Command palette & modals: backdrop blur, elevated surfaces, refined shadows
  - Tighter heading scale, editorial letter-spacing, precise Inter font weights
  - Dedicated dark mode syntax highlighting colors for code blocks
  - Consistent transition timing and hover states across all interactive elements

## v1.3.1

- **Task list checkbox fix** — clicking checkboxes now properly toggles the checked state (moved toggle to mousedown to avoid WebKit event suppression)
- **Window close fix** — macOS traffic light buttons (close/minimize/zoom) were blocked by the drag region; added a no-drag spacer so native controls are clickable

## v1.3.2

- **Titlebar polish** — refined titlebar appearance and behavior

## v1.3.0

- **Auto-save** — 30-second debounce with preference toggle and status bar indicator

## v1.2.0

- **Review panel** — document quality checks (readability, structure, style analysis)

## v1.1.1

- **Code block exit fix** — pressing Enter on an empty last line in a code block now exits to a new paragraph below
- **Gap cursor** — clicking below code blocks, blockquotes, and tables now places the cursor correctly
- **Trailing paragraph** — document always ends with a paragraph so users can click below the last block to continue typing

## v1.1.0

- **Math rendering** — inline `$...$` and block `$$...$$` with KaTeX
  - Custom markdown-it plugin for parsing math syntax
  - MathBlockView with dual-layer rendering (source/rendered, like code blocks)
  - MathInlineView as atom node with KaTeX rendering
  - Input rules: `$$ ` creates math block, `$content$` creates inline math
  - KaTeX CSS embedded in HTML/PDF export
  - 6 new round-trip tests for math

## v1.0.0

- Initial release — all 8 milestones complete
- Inline live rendering, cursor-aware editing
- CommonMark + GFM support (headings, bold, italic, strikethrough, code, blockquotes, lists, links, images, tables, task lists, horizontal rules)
- Syntax highlighting (14 languages)
- File operations (open, save, save-as, new)
- Find & replace with regex
- Export (HTML, PDF, copy as HTML/Markdown)
- Light/dark themes with system follow
- Command palette, source view, focus mode
- Status bar with word count
