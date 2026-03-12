# LiveMark — User Flows

## Flow 1: First Launch

```
User opens LiveMark
  → Window appears (< 200ms)
  → Empty document with blinking cursor
  → Title bar shows "Untitled"
  → User starts typing immediately
```

No onboarding wizard. No tutorial. No "What's New" dialog. The empty page IS the invitation to write.

## Flow 2: Writing with Live Rendering

```
User types: "# My Document"
  → As soon as user types "#" + space, line is recognized as heading
  → On pressing Enter or moving cursor away:
      → "#" marker fades/hides
      → Text renders as large, bold heading
  → User clicks back into heading:
      → Raw "# My Document" syntax reappears for editing

User types: "This is **important** text"
  → While cursor is within **important**:
      → Full syntax visible: **important**
  → When cursor moves away:
      → "important" renders as bold
      → ** markers disappear

User types: "```javascript" + Enter
  → Code block container appears
  → User types code inside
  → Syntax highlighting applies in real-time
  → User types "```" to close
  → Block renders with language label and styled background
```

## Flow 3: Opening an Existing File

```
User presses Cmd/Ctrl+O
  → Native file picker appears (filtered to .md, .txt, .markdown)
  → User selects a file
  → File opens instantly
  → Full document renders with all Markdown elements styled
  → Cursor placed at beginning of document
  → Title bar shows filename
```

Alternative: User drags a .md file onto the LiveMark window → same result.

Alternative: User opens LiveMark from terminal with `livemark path/to/file.md`.

## Flow 4: Saving a File

```
New document: User presses Cmd/Ctrl+S
  → "Save As" dialog appears (first save)
  → User chooses location and filename
  → File saved
  → Title bar updates to show filename
  → Modified indicator clears

Existing document: User presses Cmd/Ctrl+S
  → File saved immediately (no dialog)
  → Brief "Saved" indicator in status bar (fades after 1s)
  → Modified indicator clears
```

## Flow 5: Inserting an Image

```
Method A — Paste
  User copies an image and pastes (Cmd/Ctrl+V)
  → Dialog asks: save image to relative path?
  → Image saved alongside document
  → Markdown image syntax inserted: ![](./images/pasted-image.png)
  → Image preview renders inline

Method B — Drag and drop
  User drags image file into editor
  → Same behavior as paste

Method C — Type syntax
  User types ![alt](path/to/image.png)
  → When cursor leaves, image renders inline
  → When cursor enters, raw syntax shown for editing
```

## Flow 6: Working with Tables

```
User types: "| Name | Age |" + Enter
  → Table structure recognized
  → User continues with separator row: "| --- | --- |"
  → Table renders visually
  → User can Tab between cells to add data
  → When cursor is inside table:
      → Cell-based editing with Tab navigation
  → When cursor is outside table:
      → Clean rendered table view
```

## Flow 7: Export to HTML

```
User opens command palette (Cmd/Ctrl+Shift+P)
  → Types "export"
  → Selects "Export to HTML"
  → Save dialog for HTML file
  → Standalone HTML generated with embedded CSS
  → File saved
```

## Flow 8: Theme Switching

```
User opens command palette
  → Types "theme"
  → Selects "Toggle Dark/Light Theme"
  → Theme transitions smoothly (200ms)
  → All elements re-render in new theme
```

Or: theme follows system preference automatically.

## Flow 9: Find and Replace

```
User presses Cmd/Ctrl+F
  → Find bar slides in at top of editor
  → User types search term
  → Matches highlighted in document
  → Enter to jump to next match
  → Cmd/Ctrl+Shift+F or click to expand to Replace
  → Replace one or Replace All
  → Esc to dismiss find bar
```

## Flow 10: Keyboard-Centric Workflow

```
Full session without touching the mouse:

Cmd/Ctrl+N          → New document
Type content         → Live rendered as typed
Cmd/Ctrl+S          → Save
Cmd/Ctrl+Shift+P    → Command palette for any action
Cmd/Ctrl+F          → Find
Cmd/Ctrl+Z          → Undo
Cmd/Ctrl+Shift+Z    → Redo
Cmd/Ctrl+B          → Toggle bold on selection
Cmd/Ctrl+I          → Toggle italic on selection
Cmd/Ctrl+K          → Insert link
Cmd/Ctrl+W          → Close window
```

## Edge Cases

### Large File
```
User opens a 20,000-line Markdown file
  → File loads progressively (visible content first)
  → Scrolling is smooth (virtual rendering)
  → Editing at any position is responsive
  → Rendering only applies to visible viewport + buffer
```

### Malformed Markdown
```
User types incomplete syntax: "[broken link(no close"
  → Raw text shown as-is (no broken rendering)
  → When syntax is completed, element renders correctly
  → Never crashes or shows error for malformed input
```

### Unsaved Changes
```
User tries to close with unsaved changes
  → Dialog: "Save changes to [filename]?"
  → [Save] [Don't Save] [Cancel]
  → No data loss possible
```
