# LiveMark — UX Principles

## Principle 1: The Editor Is the Preview

There is no "source mode" vs "preview mode." There is one view. Markdown syntax transforms inline as the user types. The rendered document IS the editing surface.

**Implication:** When the cursor is away from a Markdown element, it renders visually. When the cursor enters the element, the raw syntax is revealed for editing. This transition must be instantaneous and smooth — no layout shift, no flicker.

## Principle 2: Never Break Flow

The user's typing flow is sacred. Nothing should interrupt it.

- No modal dialogs during editing
- No loading spinners visible during normal operation
- No unexpected cursor jumps
- No layout shifts when elements render/unrender
- Keyboard shortcuts should be discoverable but never required

**Implication:** Every rendering transition must preserve the cursor's visual position. If the user is typing at character 42 on line 10, they should still be at the same visual location after any rendering update.

## Principle 3: Progressive Disclosure

The UI starts minimal. Advanced features are available but not visible until needed.

- Default view: just the document, a title bar, and a status bar
- Command palette: all features accessible via Cmd/Ctrl+Shift+P
- Right-click context menus for contextual actions
- Settings accessible but not prominent

**Implication:** A first-time user sees a blank page and a blinking cursor. Nothing else needs explanation. Power users discover features through the command palette.

## Principle 4: Speed Is a Feature

Performance is not a technical concern — it is a UX feature. Users should feel that LiveMark is the fastest editor they've ever used.

- App launch: instant (< 200ms)
- Keystroke response: imperceptible (< 16ms)
- File open: immediate for files under 1MB
- Rendering: never blocks the main thread

**Implication:** Architectural decisions must prioritize perceived performance. Use lazy rendering, incremental parsing, and background threads aggressively.

## Principle 5: Respect the File

LiveMark edits standard Markdown files. It does not add proprietary metadata, hidden frontmatter, or non-standard syntax.

- Files opened in LiveMark should be identical when opened in any other editor
- No hidden state stored alongside the file
- Line endings, encoding, and whitespace are preserved

**Implication:** The data model must be the Markdown text itself. Editor state (cursor position, scroll position) is stored separately from the document.

## Principle 6: Sensible Defaults, Full Control

Every setting should have a default that works for 90% of users. The remaining 10% should be able to customize it.

- Default theme follows system light/dark mode
- Default font is a high-quality proportional serif/sans-serif
- Default line spacing and margins optimized for readability
- All defaults overridable in settings

## Principle 7: Visual Hierarchy Through Typography

The editor should feel like a well-typeset document, not a code editor.

- Headings have clear size and weight differentiation
- Body text is comfortable to read for long sessions
- Code blocks are visually distinct but not jarring
- Blockquotes are elegant, not just indented
- Lists have proper spacing and alignment

**Implication:** Typography choices are a core product decision, not an afterthought. Ship with carefully chosen default fonts and spacing.

## Principle 8: Graceful Degradation

When something goes wrong (corrupt file, unsupported syntax, rendering error), fail gracefully.

- Show raw Markdown rather than broken rendering
- Never lose user data
- Never crash on malformed input
- Provide clear, actionable error messages

## Visual Design Guidelines

### Color Palette (Light Theme)
- Background: warm white (#FAFAFA)
- Text: soft black (#1A1A2E)
- Accent: muted blue (#4A90D9)
- Code background: light gray (#F0F0F5)
- Blockquote border: subtle blue-gray (#C0C8D8)

### Color Palette (Dark Theme)
- Background: deep charcoal (#1E1E2E)
- Text: soft white (#CDD6F4)
- Accent: muted lavender (#89B4FA)
- Code background: slightly lighter (#2A2A3E)
- Blockquote border: muted (#45475A)

### Spacing
- Editor padding: 48-80px horizontal (responsive)
- Line height: 1.6-1.8 for body text
- Paragraph spacing: 0.8em
- Maximum content width: 720px (centered)

### Animation
- Element render/unrender: 80-120ms ease-out
- Theme transitions: 200ms
- No bouncing, no spring physics, no gratuitous motion
