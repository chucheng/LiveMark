# LiveMark Tutorial

Welcome to **LiveMark** — a desktop Markdown editor with seamless inline live-preview. What you type is what you see, no split panes or preview toggles needed.

This document showcases every feature LiveMark supports. Open it in LiveMark to see the live rendering in action!

---

## Headings

Markdown supports six levels of headings. Type `#` followed by a space to create one:

# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

---

## Text Formatting

LiveMark supports all standard inline formatting. These render live as you type:

- **Bold** — wrap text with `**double asterisks**`
- *Italic* — wrap text with `*single asterisks*`
- ~~Strikethrough~~ — wrap text with `~~double tildes~~`
- `Inline code` — wrap text with `` `backticks` ``

You can also **combine *formatting* together** for **~~bold strikethrough~~** and other combinations.

---

## Links

Create links with `[text](url)` syntax:

- [LiveMark on GitHub](https://github.com/user/livemark)
- [Markdown Guide](https://www.markdownguide.org "The Markdown Guide")

**Tip:** Hold `Cmd` (or `Ctrl`) and click a link to open it in your default browser.

---

## Images

Insert images with `![alt text](url)` syntax:

You can also **drag and drop** images directly into the editor, or **paste** them from your clipboard. LiveMark will automatically save the image alongside your document.

---

## Lists

### Unordered Lists

Type `-`, `+`, or `*` followed by a space to start a bullet list:

- First item
- Second item
  - Nested item A
  - Nested item B
- Third item

### Ordered Lists

Type a number followed by `.` and a space:

1. First step
2. Second step
3. Third step

### Task Lists

Type `- [ ]` for unchecked or `- [x]` for checked items:

- [x] Design the feature
- [ ] Implement the parser
- [ ] Write tests
- [ ] Update documentation

Click the checkbox in live-preview mode to toggle the task state!

---

## Blockquotes

Type `>` followed by a space:

> "Markdown is intended to be as easy-to-read and easy-to-write as is feasible."
>
> — John Gruber

Blockquotes can contain other elements:

> ### Quote with a heading
>
> - And a list inside
> - With multiple items
>
> And a regular paragraph too.

---

## Code Blocks

Type three backticks (```` ``` ````) followed by a language name and press space:

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return { greeting: `Welcome to LiveMark` };
}
```

```python
def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(10)))
```

```rust
fn main() {
    let message = String::from("Hello from Rust!");
    println!("{}", message);
}
```

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #1a1a2e;
  --accent: #4a9eff;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
}
```

LiveMark supports syntax highlighting for many languages including JavaScript, TypeScript, Python, Rust, Go, Java, C, C++, CSS, HTML, JSON, YAML, Bash, and SQL.

---

## Tables

Create tables using pipe `|` and dash `-` syntax:

| Feature | Status | Priority |
| --- | --- | --- |
| Live Preview | Done | P0 |
| File Operations | Done | P0 |
| Export | Done | P1 |
| Themes | Done | P1 |
| Tables | Done | P1 |

### Alignment

Use colons in the separator row to control column alignment:

| Left-aligned | Centered | Right-aligned |
| --- | --- | --- |
| Apple | Red | $1.20 |
| Banana | Yellow | $0.50 |
| Grape | Purple | $2.00 |

**Tip:** Press `Tab` to navigate between table cells, `Shift+Tab` to go back.

---

## Horizontal Rules

Create a horizontal divider by typing `---`, `***`, or `___` followed by a space:

---

Use them to separate major sections of your document.

---

## Math

### Inline Math

Wrap LaTeX expressions with single dollar signs: $E = mc^2$

Other examples: $\alpha + \beta = \gamma$, $\sum_{i=1}^{n} x_i$

### Block Math

Type `$$` followed by a space to create a display math block:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}
$$

---

## Keyboard Shortcuts

LiveMark supports a full set of keyboard shortcuts for power users:

| Shortcut | Action |
| --- | --- |
| `Cmd+B` | Toggle **bold** |
| `Cmd+I` | Toggle *italic* |
| `Cmd+Shift+X` | Toggle ~~strikethrough~~ |
| `` Cmd+` `` | Toggle `inline code` |
| `Cmd+1` through `Cmd+6` | Set heading level |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+O` | Open file |
| `Cmd+S` | Save file |
| `Cmd+Shift+S` | Save as |
| `Cmd+N` | New file |
| `Cmd+F` | Find & replace |
| `Cmd+Shift+P` | Command palette |
| `Cmd+/` | Toggle source view |
| `Cmd+Shift+R` | Toggle review panel |
| `Cmd+Shift+F` | Toggle focus mode |
| `Cmd+Shift+T` | Cycle theme |
| `Cmd+Shift+E` | Export as HTML |
| `Cmd+P` | Print / Export PDF |
| `Cmd+Shift+C` | Copy as HTML |
| `Cmd+Alt+C` | Copy as Markdown |

---

## Command Palette

Press `Cmd+Shift+P` to open the command palette. From there you can access every action in LiveMark — file operations, formatting, export, theme switching, and more. Just start typing to fuzzy-search for commands.

---

## Export

LiveMark can export your documents in multiple formats:

- **HTML** — standalone HTML file with embedded styles
- **PDF** — via the system print dialog
- **Copy as HTML** — copy rendered HTML to clipboard
- **Copy as Markdown** — copy raw Markdown to clipboard

Access export options through the command palette (`Cmd+Shift+P`) or the menu.

---

## Themes

LiveMark supports **Light** and **Dark** themes, plus a **System** option that follows your OS preference. Toggle with `Cmd+Shift+T`, from the status bar, or the command palette.

---

## Review Panel

Press `Cmd+Shift+R` to open the review panel. It analyzes your document for quality issues:

- **Empty headings** — headings with no content
- **Heading hierarchy skips** — jumping from h1 to h3 without h2
- **Duplicate headings** — identical heading text
- **Missing image alt text** — images without descriptive alt text
- **Empty links** — links with no URL
- **Code blocks without language** — fenced blocks missing a language tag
- **Long paragraphs** — paragraphs over 300 words
- **Missing document title** — no h1 heading in the document

Click any item in the panel to jump to that location in the editor. The panel updates live as you type.

---

## Focus Mode

Press `Cmd+Shift+F` to toggle focus mode. In focus mode, only the paragraph you're currently editing is fully visible — surrounding blocks are dimmed. This helps you concentrate on the content you're actively writing.

---

## Source View

Press `Cmd+/` to toggle source view. This shows the raw Markdown source of your document in a read-only view. Toggle back to return to the live-preview editor.

---

## Auto-Save

LiveMark automatically saves your file 30 seconds after your last edit (when the file has a path on disk). You can toggle auto-save on or off from the status bar button at the bottom-right. When auto-save triggers, a brief "Auto-saved" indicator appears in the status bar.

---

## Tips & Tricks

1. **Click below the last block** to create a new paragraph at the end of the document
2. **Press Enter at the end of a code block** to exit and create a new paragraph
3. **Drag and drop images** from Finder directly into the editor
4. **Paste images** from your clipboard — they auto-save next to your file
5. **Use the status bar** at the bottom to see word count, line/column, and toggle themes
6. **Open files from the terminal** with `livemark path/to/file.md`

---

*Happy writing with LiveMark!*