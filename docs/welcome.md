# Welcome to LiveMark

Hi, I'm Chase.

I've been writing in Markdown for years. I love it — it's clean, portable, and gets out of your way. But the editors? They always made me compromise.

MacDown was my first love, but I got tired of staring at a split screen — writing on the left, previewing on the right, never quite feeling like I was in *one* place. Typora came close — true inline preview, no split pane, beautifully minimal. But it's not free. And over time, it started to feel... *finished*. Not in a good way — in a "this is all you're going to get" way. A closed app that stopped evolving.

And when I looked around, there were surprisingly few good, free Markdown editors that just let you write and see the result — right there, inline, no split pane.

One day I copied a beautifully formatted document from my editor, pasted it into Google Docs, and watched every heading, every bold word, every table collapse into plain text. That was the moment I thought: *why doesn't this just work?*

So I built LiveMark.

**I wanted a free Markdown editor that just works.** Not "works with workarounds." Not "works if you don't need X." Just — *works*. You write, it renders. You copy, the formatting follows. You paste an image, it stays. You export, it looks exactly like what you see. No friction. No compromise. No paywall.

That's LiveMark. And now it's yours.

---

## AI Revise — Stop Switching Between Your Editor and ChatGPT

I got tired of the copy-paste loop. Select text in my editor, switch to ChatGPT or Claude, paste it in, ask for a revision, copy the result back, paste it over the original. Over and over. For every paragraph, every email, every draft.

So I built native AI revision right into the editor. Select text, press `Cmd+J R`, and get an inline diff — original text struck through, revised text highlighted in green. Press Enter to accept, Esc to reject. Your original is never touched until you say so.

You bring your own API key (Anthropic, MiniMax, or any Anthropic-compatible endpoint) and pick your model — Haiku for speed, Sonnet for balance, Opus for quality. Your text goes straight from your machine to the API — no middleman, no proxy, no data collection. And you can customize the prompt to anything: "fix grammar", "make it concise", "translate to Japanese", "rewrite for a 5-year-old".

Set it up once in **Settings → AI Revision** (`Cmd+,`), and it just works. No more alt-tabbing.

---

That said — it's still a beta. So please, [send me your feedback](mailto:chase.livemark@gmail.com): bugs you hit, things that annoy you, features you wish existed. I read every single one, and I fix them as fast as I can.

---

## What You See Is What You Mean

LiveMark is a Markdown editor where **the editor *is* the preview**. There are no split panes, no preview toggles — just your words, rendered beautifully as you type.

When your cursor enters a Markdown element, the raw syntax appears for editing. Move away, and it renders instantly. It feels like writing in a rich text editor, but the file on disk is always clean, portable Markdown.

Try it now — click on this heading, or the bold text above, and watch the syntax appear.

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

<sub>\[Privacy Policy\]\[^1\]</sub>

\[^1\]: LiveMark respects your privacy. All your documents stay on your machine — we don't collect, store, or transmit any of your content. See the full [Privacy Policy](https://chaselivemark.github.io/policy/livemark-privacy-policy.html) for details