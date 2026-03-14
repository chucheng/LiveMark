# LiveMark v2 — UX Specification

## 1. Information Architecture

### v1 Layout (Single Document)

```
┌─────────────────────────────────────────────┐
│  Title Bar  [filename.md]  (● modified)      │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│              Editor (ProseMirror)           │
│              Single document, full width    │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│  Status Bar  [Ln 42, Col 8 | 1,234 words]  │
└─────────────────────────────────────────────┘
```

### v2 Layout (Multi-File with Sidebar and Tabs)

```
┌──────────────────────────────────────────────────────────────┐
│  Title Bar  [project-name — filename.md]  (● modified)       │
├──────┬──────────────────────────────────────────────────────┤
│      │  Tab Bar  [ doc1.md ● ] [ doc2.md ] [ notes.md ] [+] │
│      ├──────────────────────────────────────────────────────┤
│ File │                                                      │
│ Tree │                                                      │
│      │               Editor (ProseMirror)                   │
│ Side │               Active tab's document                  │
│ bar  │                                                      │
│      │    ⋮⋮ [block handle on hover]                        │
│ 240px│                                                      │
│      │                                                      │
│      ├──────────────────────────────────────────────────────┤
│      │  Status Bar  [Ln 42, Col 8 | 1,234 words | Auto ✓]  │
├──────┴──────────────────────────────────────────────────────┤
│  (optional) Find/Replace Bar                                 │
└──────────────────────────────────────────────────────────────┘
```

**Key layout changes from v1:**
- **Sidebar** (left, 240px default, collapsible) — file tree when a folder is open; hidden when editing a single file
- **Tab bar** (below title bar) — one tab per open document; appears when ≥2 files are open; hidden for single file
- **Block handles** — hover-only affordance on the left edge of each top-level block
- **Editor area** — same inline live-preview experience, but now scoped to the active tab
- **Single-file mode preserved** — opening a single file with no folder looks exactly like v1 (no sidebar, no tab bar)

### Mind Map Overlay (Toggle)

```
┌──────────────────────────────────────────────────────────────┐
│  Title Bar  [filename.md — Mind Map]                         │
├──────┬──────────────────────────────────────────────────────┤
│      │  Tab Bar  [ doc1.md ] [ doc2.md ● ] [+]              │
│      ├──────────────────────────────────────────────────────┤
│ Side │                                                      │
│ bar  │   ┌─────────────────────────────────┐                │
│      │   │                                 │                │
│      │   │     [Mermaid Mind Map SVG]       │                │
│      │   │     Heading hierarchy as         │                │
│      │   │     interactive node graph       │                │
│      │   │                                 │                │
│      │   └─────────────────────────────────┘                │
│      │                                                      │
│      │  [Press Cmd+T or Esc to return to editor]            │
│      ├──────────────────────────────────────────────────────┤
│      │  Status Bar  [Mind Map View]                          │
└──────┴──────────────────────────────────────────────────────┘
```

---

## 2. Interaction Flows

### 2.1 Multi-Tab Editing (P0)

**Opening a new tab:**
1. User presses `Cmd+O` → native file dialog opens
2. User selects a file → file loads in a new tab (to the right of current tab)
3. Tab bar appears (if previously hidden, i.e. going from 1 to 2 tabs)
4. New tab becomes active; editor shows the new document
5. Previous tab retains its editor state (cursor position, undo history, scroll position)

**Switching tabs:**
1. User clicks a tab → editor swaps to that tab's document instantly
2. Or: `Cmd+Shift+[` / `Cmd+Shift+]` to move left/right
3. Or: `Cmd+1` through `Cmd+9` to jump to tab by position
4. Transition: no animation, instant swap. Status bar updates (line/col, word count).

**Closing a tab:**
1. User clicks the `×` on a tab, or presses `Cmd+W`
2. If document is modified → confirmation dialog: "Save changes to {filename}?" [Save] [Don't Save] [Cancel]
3. If saved or "Don't Save" → tab closes, adjacent tab becomes active
4. If last tab closes → back to empty state (new untitled document, single-file mode)

**Tab overflow:**
1. When tabs exceed available width → scroll arrows appear at edges of tab bar
2. A dropdown menu (▾) at the right edge lists all open tabs

**Edge cases:**
- Opening an already-open file → switch to existing tab (don't duplicate)
- Opening a file that was deleted on disk → show error banner in that tab, offer to save elsewhere
- Memory pressure with many tabs → addressed by Large File Performance (lazy NodeView rendering)

### 2.2 File Tree Sidebar (P0)

**Opening a folder:**
1. User selects "Open Folder" from command palette or `Cmd+Shift+O`
2. Native folder dialog opens → user selects a folder
3. Sidebar appears (slides in from left, 240px) with directory tree
4. Tree shows `.md` and `.txt` files, plus directories (collapsed by default)
5. If files were already open, they remain in their tabs

**Navigating the tree:**
1. Click a file → opens in a new tab (or switches to existing tab)
2. Click a directory → expand/collapse toggle
3. Keyboard navigation: `↑`/`↓` to move, `→` to expand, `←` to collapse, `Enter` to open

**Toggling the sidebar:**
1. `Cmd+\` toggles sidebar visibility
2. When hidden, editor takes full width
3. Sidebar state (open/closed, width) persisted in preferences

**Drag resize:**
1. Drag the sidebar's right edge to resize (min 180px, max 400px)

**Edge cases:**
- Empty folder → show "No Markdown files found" placeholder
- Deeply nested directories → tree scrolls; indent guides for nesting
- File created/deleted externally → watch filesystem, update tree (debounced 500ms)
- No folder open → sidebar hidden, no toggle affordance unless "Open Folder" is invoked

### 2.3 Block Handles (P0)

**Hover to reveal:**
1. User hovers mouse over any top-level block (heading, paragraph, code block, quote, list, image, math block, horizontal rule, table)
2. A subtle grip icon (`⋮⋮`) fades in at the left edge of the block, outside the content area
3. Handle appears within 100ms of hover; fades out 300ms after mouse leaves

**Context menu:**
1. Click the handle → context menu appears anchored to the handle:
   - Move Up (↑)
   - Move Down (↓)
   - Duplicate
   - Copy Link to Block
   - Delete
   - (For headings only) Collapse / Expand
2. Click a menu item → action executes, menu closes
3. Click outside or press `Esc` → menu closes

**Drag to reorder:**
1. Mouse down on handle → block lifts with a subtle shadow, ghost preview shows drop position
2. Drag vertically → drop indicator (horizontal line) appears between blocks
3. Release → block moves to new position as a ProseMirror transaction (undoable)
4. If dragged to same position → no-op

**Heading collapse:**
1. Headings show a disclosure triangle (▸/▾) to the left of the grip handle
2. Click ▸ → heading's child content (everything until the next heading of same or higher level) collapses into a single line showing "N blocks hidden"
3. Click ▾ → content expands back
4. Collapsed state is visual only — Markdown is preserved, serialization includes all content

**Copy Link to Block:**
1. For headings: copies `file:///path/to/doc.md#heading-slug`
2. For other blocks: generates `<!-- id: a3f8c2 -->` comment above the block (if not already present), then copies `file:///path/to/doc.md#block-a3f8c2`
3. Status bar shows "Link copied" confirmation for 2 seconds

**Edge cases:**
- Block handles do not appear when cursor is inside the block (editing mode) — only on hover from outside
- In narrow windows, handles overlap the content margin rather than extending beyond it
- Keyboard alternative: `Cmd+Shift+↑` / `Cmd+Shift+↓` to move current block up/down without mouse

### 2.4 Copy as Beautiful Doc (P0)

**Trigger:**
1. User invokes "Copy as Beautiful Doc" from command palette (`Cmd+Shift+C`) or menu
2. (Optional) If text is selected, copy only the selection; if nothing is selected, copy the whole document

**What happens:**
1. Frontend serializes the ProseMirror document to HTML with full styling
2. HTML includes inline CSS: typography, heading sizes, code block syntax highlighting, table styling, KaTeX math rendering, image references
3. HTML is placed on clipboard as rich text (`text/html` MIME type)
4. Status bar shows "Copied as styled document" for 2 seconds

**Feedback:**
- If the document is empty → status bar shows "Nothing to copy"
- If images reference local files → images embedded as base64 data URIs (with size warning if > 5MB total)

### 2.5 Auto-Update Mechanism (P0)

**Check for updates:**
1. On app launch, check for updates silently (Tauri updater plugin)
2. If update available → show a subtle banner below the tab bar: "LiveMark {version} is available. [Update Now] [Later]"
3. Banner is non-intrusive, dismissible

**Installing update:**
1. User clicks "Update Now" → progress bar appears in the banner
2. Download completes → "Restart to finish updating. [Restart Now] [Later]"
3. If user has unsaved documents → prompt to save before restart

**Edge cases:**
- No internet → no banner, fail silently
- Update check fails → no banner, retry on next launch
- User clicks "Later" → reminder on next launch

### 2.6 CI/CD Pipeline (P0)

*No user-facing UX — internal infrastructure.*

### 2.7 Mind Map View (P1)

**Toggle to mind map:**
1. User presses `Cmd+T` or selects "Toggle Mind Map" from command palette
2. Editor area transitions to mind map overlay (fades in, 200ms)
3. Heading hierarchy rendered as a Mermaid `graph TD` diagram
4. Status bar shows "Mind Map View"

**Interacting with the map:**
1. Hover a node → node highlights
2. Click a node → stores the heading position, exits mind map, scrolls editor to that heading
3. Scroll/zoom → standard pan and zoom on the SVG (scroll to zoom, drag to pan)

**Return to editor:**
1. Press `Cmd+T` again, or `Esc`
2. Editor reappears with cursor at same position as before

**Edge cases:**
- Document has no headings → show message: "Add headings to see your document's structure as a mind map"
- Document has only H1 → single root node, no children
- Very deep heading nesting (H1→H2→H3→H4→H5→H6) → map supports all levels
- Long heading text → truncated at 40 characters with ellipsis in node label

### 2.8 Mermaid Diagram Rendering (P1)

**Writing a Mermaid block:**
1. User types ````mermaid` → code block created with language "mermaid"
2. While cursor is inside: shows raw Mermaid source (editing mode, like any code block)
3. When cursor leaves: renders the Mermaid diagram as an inline SVG (rendered mode)

**Rendering feedback:**
1. If Mermaid syntax is valid → diagram renders in place of the code block
2. If syntax is invalid → show a subtle error message below the block: "Diagram syntax error" with the Mermaid error message
3. Rendering is debounced (300ms after last edit) to avoid flicker

**Edge cases:**
- Very complex diagrams → render timeout of 5 seconds, show "Diagram too complex to render" fallback
- Mermaid.js not yet loaded (lazy load) → show loading spinner, then render once loaded

### 2.9 Recent Files List (P1)

**Accessing recent files:**
1. Command palette → "Open Recent" → shows list of last 20 files, most recent first
2. On app launch with no file argument → show a welcome screen with recent files list
3. Each entry shows: file name, parent directory, last opened date

**Selecting a recent file:**
1. Click or Enter → opens the file (in new tab if multi-tab is active)
2. If file no longer exists → show "(missing)" label, grey out entry. Selecting it shows error: "File not found. Remove from recent files?" [Remove] [Cancel]

### 2.10 YAML Frontmatter Support (P1)

**Editing frontmatter:**
1. If a document starts with `---`, the frontmatter block is parsed and displayed as a styled block
2. In rendered mode: frontmatter appears as a subtle card at the top (key-value pairs in a compact layout)
3. In editing mode (cursor enters): raw YAML source visible with monospace styling
4. Frontmatter is preserved verbatim on round-trip

**Edge cases:**
- Invalid YAML → show raw text with a subtle "Invalid frontmatter" warning
- No frontmatter → no block shown

### 2.11 User-Configurable Editor Template (P1)

**Settings panel:**
1. Accessed via command palette → "Editor Settings" or `Cmd+,`
2. A modal panel (not a new window) appears with sections:
   - **Font family** — dropdown + preview
   - **Content margins** — slider (16px–96px)
   - **Content max-width** — slider (500px–1200px) + "Full width" toggle
   - **Line height** — slider (1.2–2.4)
   - **Paragraph spacing** — slider (0.5em–2em)
3. Changes apply live as the user adjusts sliders
4. "Save as Preset" button → name the preset, saved to preferences
5. "Reset to Default" button

**Two-column layout:**
1. Toggle via command palette → "Toggle Two-Column Layout"
2. Content reflows into two newspaper-style columns
3. Still fully editable — columns are CSS-only (`column-count: 2`)

### 2.12 Shortcut Conflict Awareness (P1)

**In command palette:**
1. Each command shows its shortcut (existing behavior)
2. If a shortcut conflicts with a known OS shortcut → show a ⚠️ badge next to it
3. Tooltip on hover: "This shortcut may conflict with {OS shortcut name}"

### 2.13 Custom Hotkey Assignment (P1)

**Reassigning a shortcut:**
1. Command palette → "Keyboard Shortcuts" → opens shortcuts panel
2. Each command listed with its current shortcut
3. Click the shortcut cell → "Press new shortcut..." capture mode
4. User presses keys → shortcut captured
5. If conflict → warning: "This shortcut is already assigned to {command}. Override?" [Override] [Cancel]
6. Overriding clears the old binding
7. "Reset All to Defaults" button at the bottom

### 2.14 Large File Performance (P1)

*No new UX — this is an invisible performance improvement. Files > 5K lines should feel as smooth as small files.*

### 2.15 Selection-Aware Copy as Markdown (P1)

**Trigger:**
1. User selects text → "Copy as Markdown" (Cmd+Alt+C or command palette)
2. Only the selected range is serialized to Markdown and placed on clipboard
3. If nothing is selected → copies entire document (existing behavior preserved)

### 2.16 Cross-Platform Testing (P1)

*No user-facing UX — internal infrastructure.*

### 2.17 Schema Extensibility (P1)

*No user-facing UX — internal architecture.*

### 2.18 Drag-and-Drop File Open (P1)

**Trigger:**
1. User drags a `.md` or `.txt` file from Finder/Explorer onto the LiveMark window
2. Drop zone highlights (subtle blue border around the editor area)
3. On drop → file opens in a new tab

**Edge cases:**
- Dropping a non-Markdown file → show status bar warning: "Only .md and .txt files can be opened"
- Dropping multiple files → open each in a new tab

---

## 3. New UI Components

| Component | Location | Trigger | Dismiss |
|---|---|---|---|
| **Tab Bar** | Below title bar | Appears when ≥2 files are open | Hidden when only 1 file open |
| **Tab** | Within tab bar | Click to switch, Cmd+W to close | Close button (×) on hover |
| **Tab overflow dropdown** | Right edge of tab bar | Click ▾ icon | Click outside |
| **File Tree Sidebar** | Left side of window | "Open Folder" command, Cmd+\ toggle | Cmd+\ toggle, or close folder |
| **Sidebar resize handle** | Right edge of sidebar | Drag horizontally | Release mouse |
| **Block handle** | Left edge of each top-level block | Mouse hover over block | Mouse leaves block (300ms fade) |
| **Block context menu** | Anchored to block handle | Click handle | Click outside, Esc |
| **Heading collapse triangle** | Left of heading, beside handle | Click triangle | Click again to expand |
| **Collapsed heading placeholder** | In place of collapsed content | Heading collapse | Click to expand |
| **Mind map overlay** | Replaces editor area | Cmd+T | Cmd+T, Esc, or click a node |
| **Mermaid rendered diagram** | In place of mermaid code block | Cursor leaves mermaid block | Cursor enters block |
| **Mermaid error message** | Below invalid mermaid block | Invalid Mermaid syntax | Fix syntax |
| **Settings panel** | Modal overlay | Cmd+, or command palette | Esc, click outside |
| **Keyboard shortcuts panel** | Modal overlay | Command palette | Esc, click outside |
| **Update banner** | Below tab bar | Update available on launch | "Later" or after update |
| **Welcome screen / Recent files** | Editor area on empty launch | App launch with no file | Open a file |
| **Drop zone highlight** | Border around editor area | Drag file over window | Drop or drag away |
| **Frontmatter block** | Top of document | Document has YAML frontmatter | N/A — persistent |

---

## 4. Keyboard Shortcuts

See `docs/tutorial.md` for the complete keyboard shortcuts reference.

---

## 5. Design Principles

### Carried Forward from v1

1. **Invisible until needed** — Chrome, controls, and UI affordances stay hidden until the user needs them. The document is the focus.
2. **Markdown-native** — Every action maps cleanly to Markdown syntax. No proprietary formats, no lock-in.
3. **Cursor-aware rendering** — Show raw syntax only where the user is editing. Everything else renders as the final document.
4. **Keyboard-first** — Every action has a keyboard shortcut. Mouse is optional.
5. **No data loss** — Atomic writes, confirmation dialogs, undo history. The user's content is sacred.
6. **Fast by default** — Sub-200ms startup, 60fps typing, instant tab switching. Performance is a feature.

### New Principles for v2

7. **Blocks are first-class citizens** — Every top-level element is a manipulable block. Users can see, grab, move, collapse, and link to individual blocks. But block handles must not clutter the writing experience — they appear on hover only.
8. **Progressive disclosure of complexity** — Single-file editing looks and feels exactly like v1. Tabs appear when you open a second file. Sidebar appears when you open a folder. Complexity is revealed only when needed.
9. **Visualize structure on demand** — Mind Map View gives users a bird's-eye view of their document's structure. It's a toggle overlay, not a permanent panel — writing mode remains primary.
10. **Portable output** — "Copy as Beautiful Doc" means your Markdown renders beautifully everywhere — not just in LiveMark, but in Google Docs, Notion, email, and Slack.
