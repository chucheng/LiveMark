# Welcome to LiveMark

Hi, I'm Chucheng.

I write everything in Markdown — notes, drafts, docs, READMEs. And like everyone else, I started using AI to help me revise. Fix the grammar. Tighten a paragraph. Translate something. But the workflow was miserable: select text, copy, switch to Claude, paste, type a prompt, wait, copy the result, switch back, paste over the original. For every paragraph. Every time.

I kept thinking — *why can't I just do this where I'm already writing?*

So I built LiveMark. Select any text, press `Cmd+J R`, and the AI revision appears as an inline diff — right on top of your document. Deletions struck through in red, additions in green. Press Enter to accept, Escape to reject. Done. No tab-switching. No copy-paste loop. No breaking your flow.

You bring your own API key — [Anthropic](https://www.anthropic.com/) (Claude) or [MiniMax](https://www.minimaxi.com/) — pick your model, and customize the prompt to whatever you need. Your text goes directly from your machine to the API. No middleman. No data collection.

Set it up once in **Settings → AI Revision** (`Cmd+,`), and it just works.

---

## And Underneath — The Markdown Editor I Always Wanted

Once I was building an editor anyway, I made it the one I'd been searching for.

I loved Typora — true inline preview, no split panes, beautifully minimal. But it's not free. And over time it stopped evolving. When I looked around, there were surprisingly few good, free Markdown editors that let you write and see the result right there, inline.

So LiveMark renders Markdown **as you type**. Headings become headings. Bold becomes bold. Links become clickable. There's no preview pane — the editor *is* the preview. Click into any element to see the raw syntax; click away and it renders instantly.

It's free. It's fast. And it's built to keep getting better.

---

## Focus Mode — Write Without Distractions

The feature you didn't know you needed. Press **`Cmd+T`** to toggle:

| Mode | What it does |
| --- | --- |
| **Block focus** | Dims every block except the one you're writing in |
| **Off** | Back to normal |

Block focus is great for long documents. Everything else melts away — just you and your words.

---

## Fullscreen — True Distraction-Free Writing

Go fullscreen (the green button, or `Ctrl+Cmd+F` on macOS) and LiveMark gets out of your way completely. The titlebar, status bar, and sidebar **auto-hide** after a moment of writing. Move your mouse to the edge to bring them back.

Combine fullscreen with **Focus Mode** and **Typewriter Mode** (keeps your cursor vertically centered) for the ultimate distraction-free writing setup.

---

## Source View — See the Raw Markdown Anytime

Press **`Cmd+/`** to instantly toggle between the live preview and the raw Markdown source. Your cursor position is preserved — switch back and forth without losing your place.

Perfect for when you need to check or fine-tune the exact syntax, then flip back to the beautiful rendered view.

---

## CJK-Native — Write in Any Language

Most Markdown editors were built for English. Their formatting shortcuts assume words are separated by spaces — so when you type `中文**粗體**` or `日本語*斜体*`, nothing happens. You have to add an awkward space before the `**` or give up and use keyboard shortcuts instead of the natural Markdown syntax.

LiveMark doesn't have that problem. Inline marks — **bold**, *italic*, `code`, ~~strikethrough~~ — trigger seamlessly after Chinese, Japanese, and Korean characters. No spaces needed. No workarounds. Just type Markdown the way it was meant to be typed, in any language.

If you write in Chinese, Japanese, or Korean (or mix CJK with English), LiveMark is one of the few editors that gets this right.

---

## More Things to Love

- **Command Palette** (`Cmd+Shift+P`) — Every action in one search bar
- **Math** — Write LaTeX inline with `$E=mc^2$` or in display blocks with `$$`
- **Mermaid Diagrams** — Fenced code blocks with `mermaid` render as live diagrams
- **Find & Replace** (`Cmd+F`) — Jumps to nearest match, pre-fills from selection, regex support, replace all
- **Multi-tab** — Open several files at once, each with its own editor state
- **Sidebar File Tree** (`Cmd+\`) — Navigate your project without leaving the editor
- **Document Outline** (`Cmd+Shift+O`) — Heading tree for quick navigation within your document
- **Smart paste** — Paste Markdown text and it auto-renders as headings, lists, tables, and more
- **Export** — Word (.docx), HTML, PDF, copy as styled HTML, copy as Markdown
- **Auto-save** — Your work is saved automatically, toggleable from the status bar
- **Themes** — Light, dark, or follow your system (`Cmd+Shift+T`)

---

## Learn More

To explore every Markdown feature LiveMark supports — headings, tables, task lists, code blocks, images, and more — open the full tutorial:

**[Open the Tutorial](tutorial.md)** — or use the command palette (`Cmd+Shift+P` → "Show Tutorial")

---

That said — it's still a beta. So please, [send me your feedback](mailto:chase.livemark@gmail.com): bugs you hit, things that annoy you, features you wish existed. I read every single one, and I fix them as fast as I can.

---

<sub>\[Privacy Policy\]\[^1\]</sub>

\[^1\]: LiveMark respects your privacy. All your documents stay on your machine — we don't collect, store, or transmit any of your content. See the full [Privacy Policy](privacy-policy.md) for details
