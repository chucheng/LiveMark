import { onMount, onCleanup, createSignal } from "solid-js";
import { createEditor, type EditorInstance } from "../editor/editor";

const SAMPLE_MARKDOWN = `# Welcome to LiveMark

A fast, distraction-free Markdown editor.

## Features

- **Bold text** and *italic text*
- ~~Strikethrough~~ support
- \`Inline code\` highlighting

### Code Blocks

\`\`\`javascript
function hello() {
  console.log("Hello, LiveMark!");
}
\`\`\`

> Blockquotes look great too.

### Lists

1. First item
2. Second item
3. Third item

---

Try typing \`# \` at the start of a line to create a heading!
`;

export default function App() {
  let editorRef!: HTMLDivElement;
  let editor: EditorInstance | undefined;
  const [isModified, setIsModified] = createSignal(false);
  const [wordCount, setWordCount] = createSignal(0);

  function countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }

  onMount(() => {
    editor = createEditor(editorRef, {
      content: SAMPLE_MARKDOWN,
      onChange(doc) {
        setIsModified(true);
        const text = doc.textContent;
        setWordCount(countWords(text));
      },
    });

    // Initial word count
    const text = editor.getDoc().textContent;
    setWordCount(countWords(text));
    editor.view.focus();
  });

  onCleanup(() => {
    editor?.destroy();
  });

  return (
    <div class="lm-app">
      <div class="lm-titlebar">
        <span class="lm-titlebar-title">
          LiveMark — Untitled{isModified() ? " ●" : ""}
        </span>
      </div>
      <div class="lm-editor-wrapper">
        <div ref={editorRef} />
      </div>
      <div class="lm-statusbar">
        <span>{wordCount()} words</span>
      </div>
    </div>
  );
}
