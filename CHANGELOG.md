# Changelog

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
