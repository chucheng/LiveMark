import katexCSS from "katex/dist/katex.min.css?inline";

/**
 * Bundled CSS for HTML export.
 * Includes typography, headings, lists, code blocks, blockquotes,
 * tables, images, links, task lists, syntax highlighting tokens,
 * and KaTeX math rendering styles.
 * Strips editor-specific rules (cursor, ProseMirror internals).
 */
export function getExportCSS(): string {
  return `
:root {
  --lm-bg: #fafafa;
  --lm-text: #1a1a2e;
  --lm-text-muted: #6b7280;
  --lm-accent: #4a90d9;
  --lm-border: #e5e7eb;
  --lm-code-bg: #f0f0f5;
  --lm-code-text: #d63384;
  --lm-blockquote-border: #c0c8d8;
  --lm-font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --lm-font-mono: "JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", monospace;
  --lm-font-size: 16px;
  --lm-line-height: 1.7;
  --lm-content-width: 720px;
  --lm-heading-1: 2em;
  --lm-heading-2: 1.5em;
  --lm-heading-3: 1.25em;
  --lm-heading-4: 1.1em;
  --lm-heading-5: 1em;
  --lm-heading-6: 0.9em;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--lm-bg);
  color: var(--lm-text);
  font-family: var(--lm-font-body);
  font-size: var(--lm-font-size);
  line-height: var(--lm-line-height);
  display: flex;
  justify-content: center;
  padding: 2em 1em;
}

.livemark-export {
  width: 100%;
  max-width: var(--lm-content-width);
}

p { margin-bottom: var(--lm-paragraph-spacing, 0.8em); }

h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
  margin-top: 1.2em;
  margin-bottom: 0.4em;
  line-height: 1.3;
}

h1 { font-size: var(--lm-heading-1); }
h2 { font-size: var(--lm-heading-2); }
h3 { font-size: var(--lm-heading-3); }
h4 { font-size: var(--lm-heading-4); }
h5 { font-size: var(--lm-heading-5); }
h6 { font-size: var(--lm-heading-6); }

strong { font-weight: 700; }
em { font-style: italic; }

code {
  font-family: var(--lm-font-mono);
  font-size: 0.9em;
  background-color: var(--lm-code-bg);
  color: var(--lm-code-text);
  padding: 0.15em 0.35em;
  border-radius: 3px;
}

pre {
  background-color: var(--lm-code-bg);
  border-radius: 6px;
  padding: 1em;
  margin-bottom: 0.8em;
  overflow-x: auto;
}

pre.frontmatter {
  border-left: 3px solid var(--lm-border);
  background-color: var(--lm-code-bg);
  color: var(--lm-text-muted);
  font-size: 0.875em;
}

pre code {
  background: none;
  padding: 0;
  color: var(--lm-text);
  font-size: 0.875em;
}

blockquote {
  border-left: 3px solid var(--lm-blockquote-border);
  padding-left: 1em;
  margin-left: 0;
  margin-bottom: 0.8em;
  color: var(--lm-text-muted);
}

ul, ol {
  padding-left: 1.5em;
  margin-bottom: 0.8em;
}

li { margin-bottom: 0.2em; }

hr {
  border: none;
  border-top: 1px solid var(--lm-border);
  margin: 1.5em 0;
}

a {
  color: var(--lm-accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

img {
  max-width: 100%;
  border-radius: 4px;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 0.8em;
}

th, td {
  border: 1px solid var(--lm-border);
  padding: 0.5em 0.75em;
  text-align: left;
}

th {
  font-weight: 700;
  background-color: var(--lm-code-bg);
}

/* Task lists */
ul.contains-task-list {
  list-style: none;
  padding-left: 0;
}

li.task-list-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
}

li.task-list-item input[type="checkbox"] {
  margin-top: 0.35em;
}

/* highlight.js tokens */
.hljs-keyword { color: #d73a49; }
.hljs-string { color: #032f62; }
.hljs-comment { color: #6a737d; font-style: italic; }
.hljs-number { color: #005cc5; }
.hljs-built_in { color: #e36209; }
.hljs-function .hljs-title,
.hljs-title.function_ { color: #6f42c1; }
.hljs-type { color: #d73a49; }
.hljs-attr { color: #005cc5; }
.hljs-literal { color: #005cc5; }
.hljs-meta { color: #6a737d; }
.hljs-variable { color: #e36209; }

/* Math block */
.math-block {
  text-align: center;
  margin: 1em 0;
}

.math-error {
  color: #dc3545;
  font-family: var(--lm-font-mono);
  font-size: 0.9em;
}

@media print {
  body {
    max-width: 100%;
    padding: 0;
  }
  .livemark-export {
    max-width: 100%;
  }
}
` + katexCSS;
}
