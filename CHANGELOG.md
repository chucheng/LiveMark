# Changelog

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
