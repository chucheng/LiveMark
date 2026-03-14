import { Plugin } from "prosemirror-state";
import { Slice } from "prosemirror-model";
import { parseMarkdown } from "../markdown/parser";

/**
 * Strong block-level indicators — a single match is enough to
 * treat the pasted text as Markdown.
 * NOTE: patterns run against raw lines (no trimStart) to avoid
 * false-positive on indented code like "    # comment".
 */
const STRONG_PATTERNS = [
  /^#{1,6}\s/,           // heading (must be at column 0)
  /^```/,                // code fence
  /^>\s/,                // blockquote (column 0 only)
  /^\|.+\|.+\|/,         // table row (require 2+ cells to avoid `|err|`)
  /^- \[[ x]\]/i,        // task list item
];

/**
 * Soft indicators — require 2+ line matches to avoid false positives
 * (e.g. "well - actually" or "3. I went to the store").
 */
const SOFT_PATTERNS = [
  /^[-*+]\s/,            // unordered list item
  /^\d+\.\s/,            // ordered list item
];

/**
 * Detect whether a plain-text string contains Markdown syntax
 * that would benefit from being parsed as structured content.
 */
function hasMarkdownSyntax(text: string): boolean {
  const lines = text.split("\n");

  // Strong indicators: one match suffices
  // No trimStart — indented text should NOT trigger (it's code in MD)
  for (const line of lines) {
    for (const pat of STRONG_PATTERNS) {
      if (pat.test(line)) return true;
    }
  }

  // Soft indicators: need 2+ matching lines (no trimStart)
  for (const pat of SOFT_PATTERNS) {
    let count = 0;
    for (const line of lines) {
      if (pat.test(line)) count++;
      if (count >= 2) return true;
    }
  }

  // Inline Markdown in multi-line text
  if (lines.length > 1) {
    if (/\[.+?\]\(.+?\)/.test(text)) return true;   // link
    if (/!\[.*?\]\(.+?\)/.test(text)) return true;   // image
  }

  return false;
}

/**
 * Check whether the current selection is entirely inside a code-like
 * node (code_block, math_block, frontmatter) where pasted text must
 * remain as literal characters.
 */
function cursorInCodeNode(view: import("prosemirror-view").EditorView): boolean {
  const { $from, $to } = view.state.selection;
  // Check both endpoints — if either is in a code node, don't parse
  for (const $pos of [$from, $to]) {
    for (let d = $pos.depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.spec.code) return true;
    }
  }
  return false;
}

/**
 * Returns true when the HTML in the clipboard contains meaningful
 * structural content (not just wrapper boilerplate from apps like
 * VS Code or terminals that set trivial text/html).
 */
function hasStructuralHTML(html: string): boolean {
  // Strip meta/style/head tags and whitespace — check if anything remains
  const stripped = html
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(?:html|head|body)[^>]*>/gi, "")
    .trim();

  // Look for actual structural tags
  return /<(?:p|h[1-6]|ul|ol|li|blockquote|pre|table|div|a|img)\b/i.test(stripped);
}

/**
 * Plugin that intercepts plain-text paste containing Markdown syntax
 * and parses it through the Markdown pipeline so it renders as
 * structured content instead of literal syntax characters.
 *
 * Conditions for activation:
 *   1. Cursor is NOT inside a code node (code_block, math_block, frontmatter).
 *   2. No structural text/html in clipboard (rich pastes from web/apps go
 *      through ProseMirror's default HTML→parseDOM pipeline).
 *   3. Plain text contains recognisable Markdown syntax.
 *
 * Plain text without Markdown falls through to ProseMirror's default.
 */
export function markdownPastePlugin(): Plugin {
  return new Plugin({
    props: {
      handlePaste(view, event) {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // B1: Never parse Markdown when cursor is inside a code node
        if (cursorInCodeNode(view)) return false;

        // W1: Only skip if HTML has real structural content
        const html = clipboardData.getData("text/html");
        if (html && hasStructuralHTML(html)) return false;

        const text = clipboardData.getData("text/plain");
        if (!text || !hasMarkdownSyntax(text)) return false;

        const doc = parseMarkdown(text);
        // B3: Guard against empty parse results
        if (!doc || doc.content.childCount === 0) return false;

        event.preventDefault();

        // Single-paragraph result → open the slice so inline content
        // merges into the current block instead of splitting it.
        const first = doc.content.firstChild;
        const singleParagraph =
          doc.content.childCount === 1 &&
          first?.type.name === "paragraph";

        const slice = singleParagraph
          ? new Slice(doc.content, 1, 1)
          : new Slice(doc.content, 0, 0);

        const tr = view.state.tr.replaceSelection(slice);
        view.dispatch(tr.scrollIntoView());
        return true;
      },
    },
  });
}
