# LiveMark — Product Requirements Document

## 1. Overview

LiveMark is a desktop Markdown editor with seamless inline rendering. Markdown syntax is visually transformed as the user types, producing a live-rendered document without a separate preview pane.

## 2. Goals for v1

- Deliver a fully functional single-document Markdown editor
- Achieve inline live rendering for all CommonMark syntax
- Support file open/save operations
- Provide a clean, minimal UI with light and dark themes
- Target macOS, Windows, and Linux
- Achieve sub-200ms cold start time

## 3. v1 Feature Set

### 3.1 Core Editor

| Feature | Description | Priority |
|---|---|---|
| Inline live rendering | Markdown transforms visually as the user types | P0 |
| CommonMark support | Full CommonMark spec compliance | P0 |
| GFM extensions | Tables, task lists, strikethrough, autolinks | P0 |
| Syntax highlighting | Fenced code blocks with language-aware highlighting | P0 |
| Undo/redo | Full history with Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z | P0 |
| Find and replace | Cmd/Ctrl+F with regex support | P1 |
| Word count | Live word/character/line count in status bar | P1 |
| Line numbers | Optional line numbers in the gutter | P2 |

### 3.2 File Operations

| Feature | Description | Priority |
|---|---|---|
| Open file | Open .md and .txt files from disk | P0 |
| Save file | Save with Cmd/Ctrl+S, auto-detect encoding | P0 |
| Save As | Save to a new path | P0 |
| Auto-save | Optional auto-save on a configurable interval | P1 |
| Recent files | Track and display recently opened files | P1 |
| New file | Create new untitled document | P0 |
| Drag-and-drop open | Drop a .md file onto the window to open it | P1 |

### 3.3 Markdown Elements — Inline Rendering Behavior

| Element | Typing experience |
|---|---|
| `# Heading` | Text enlarges and bolds; `#` fades or hides |
| `**bold**` | Text becomes bold; `**` markers hide |
| `*italic*` | Text becomes italic; `*` markers hide |
| `~~strike~~` | Text gets strikethrough; `~~` markers hide |
| `` `code` `` | Text renders in monospace with subtle background |
| `[text](url)` | Shows rendered link; raw syntax visible on focus |
| `![alt](src)` | Shows inline image preview; raw syntax on focus |
| `> blockquote` | Indented with left border; `>` fades |
| `- list item` | Bullet appears; `-` replaced with bullet glyph |
| `1. ordered` | Number formatted; syntax simplified |
| `- [ ] task` | Checkbox appears; clickable to toggle |
| `---` | Horizontal rule rendered |
| Fenced code block | Syntax-highlighted block with language label |
| Table | Rendered as visual table; editable cells on focus |
| Math (optional) | KaTeX rendering for `$...$` and `$$...$$` |

**Key behavior:** When the cursor is inside a Markdown element, the raw syntax is shown so the user can edit it. When the cursor moves away, the element renders visually.

### 3.4 UI / Chrome

| Feature | Description | Priority |
|---|---|---|
| Minimal title bar | File name + modified indicator | P0 |
| Status bar | Word count, line/column, encoding | P1 |
| Command palette | Cmd/Ctrl+Shift+P for all actions | P1 |
| Theme support | Light and dark mode, system-follow | P0 |
| Typography | Configurable font, font size, line height | P1 |
| View Source toggle | Cmd/Ctrl+/ to toggle full-document raw Markdown source view | P1 |
| Focus mode | Dim all paragraphs except current | P2 |
| Typewriter mode | Keep current line vertically centered | P2 |

### 3.5 Export

| Feature | Description | Priority |
|---|---|---|
| Export to HTML | Standalone HTML with embedded styles | P1 |
| Export to PDF | Via HTML-to-PDF rendering | P2 |
| Copy as HTML | Copy rendered HTML to clipboard | P1 |
| Copy as Markdown | Copy raw Markdown source to clipboard | P1 |

## 4. Features Explicitly NOT in v1

| Feature | Reason |
|---|---|
| Multi-tab / multi-file editing | Adds significant UI complexity; ship single-doc first |
| Plugin/extension system | Architecture should support it, but no public API in v1 |
| Cloud sync | Out of scope; files live on disk |
| Collaboration | Requires server infrastructure |
| Vim/Emacs keybindings | Niche; defer to post-v1 |
| YAML frontmatter rendering | Low priority for core editing |
| Mermaid diagrams | Requires heavy dependency; defer |
| Folder/file tree sidebar | LiveMark v1 is single-document focused |
| Spell check | Rely on OS-level spell check for now |
| Version history | Defer to post-v1 |

## 5. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Cold start time | < 200ms |
| Typing latency | < 16ms (60fps) |
| Memory usage (idle) | < 80MB |
| Binary size | < 30MB |
| Large file support | Smooth editing up to 50,000 lines |
| Accessibility | Keyboard-navigable; screen reader friendly |

## 6. Success Metrics

- User can open LiveMark, create a document, and start writing rendered Markdown in under 3 seconds
- Zero rendering glitches during normal typing flow
- Cursor position never jumps unexpectedly during rendering
- Export produces valid, well-styled HTML

## 7. Competitive Landscape

| Editor | Strength | LiveMark advantage |
|---|---|---|
| Typora | Inline rendering pioneer | Open-source, faster, modern stack |
| Obsidian | Plugin ecosystem, knowledge graph | Simpler, faster for pure editing |
| Mark Text | Open-source, inline rendering | Better performance, cleaner architecture |
| VS Code + ext | Extensible | Dedicated UX, no configuration needed |
| iA Writer | Beautiful writing UX | Markdown-native, free/open |
