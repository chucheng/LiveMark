import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import katex from "katex";

/**
 * Custom markdown-it plugin for math rendering.
 *
 * Block: `$$\n...\n$$` — renders as display math
 * Inline: `$...$` — renders as inline math
 *
 * Constraints:
 * - `\$` is treated as escaped dollar (skipped)
 * - `$...$` content must be non-empty and not start/end with space
 * - `$$` block only at line start
 */
export function mathPlugin(md: MarkdownIt): void {
  md.block.ruler.before("fence", "math_block", mathBlockRule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });

  md.inline.ruler.after("escape", "math_inline", mathInlineRule);

  md.renderer.rules.math_inline = (tokens, idx) => {
    const tex = tokens[idx].content;
    try {
      return katex.renderToString(tex, { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="math-error">${md.utils.escapeHtml(tex)}</span>`;
    }
  };

  md.renderer.rules.math_block = (tokens, idx) => {
    const tex = tokens[idx].content;
    try {
      return `<div class="math-block">${katex.renderToString(tex, { displayMode: true, throwOnError: false })}</div>\n`;
    } catch {
      return `<div class="math-block math-error">${md.utils.escapeHtml(tex)}</div>\n`;
    }
  };
}

function mathBlockRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean
): boolean {
  const startPos = state.bMarks[startLine] + state.tShift[startLine];
  const maxPos = state.eMarks[startLine];

  // Must start with $$ and nothing else on the line (except optional whitespace)
  if (maxPos - startPos < 2) return false;
  if (state.src.charCodeAt(startPos) !== 0x24 /* $ */ ||
      state.src.charCodeAt(startPos + 1) !== 0x24 /* $ */) return false;

  const restOfLine = state.src.slice(startPos + 2, maxPos).trim();
  if (restOfLine.length > 0) return false;

  if (silent) return true;

  // Find closing $$
  let nextLine = startLine + 1;
  let found = false;

  while (nextLine < endLine) {
    const pos = state.bMarks[nextLine] + state.tShift[nextLine];
    const max = state.eMarks[nextLine];
    const lineText = state.src.slice(pos, max).trim();

    if (lineText === "$$") {
      found = true;
      break;
    }
    nextLine++;
  }

  if (!found) return false;

  // Extract content between $$ markers
  const contentStart = state.bMarks[startLine + 1];
  const contentEnd = state.eMarks[nextLine - 1];
  const content = state.src.slice(contentStart, contentEnd);

  const token = state.push("math_block", "div", 0);
  token.content = content;
  token.map = [startLine, nextLine + 1];
  token.markup = "$$";

  state.line = nextLine + 1;
  return true;
}

function mathInlineRule(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  const start = state.pos;

  // Must start with $, not $$
  if (src.charCodeAt(start) !== 0x24 /* $ */) return false;
  if (src.charCodeAt(start + 1) === 0x24 /* $ */) return false;

  // Check for escape
  if (start > 0 && src.charCodeAt(start - 1) === 0x5c /* \ */) return false;

  // Content must not start with space
  if (start + 1 >= state.posMax) return false;
  const afterOpen = src.charCodeAt(start + 1);
  if (afterOpen === 0x20 /* space */ || afterOpen === 0x0a /* newline */) return false;

  // Find closing $
  let pos = start + 1;
  while (pos < state.posMax) {
    const ch = src.charCodeAt(pos);
    if (ch === 0x5c /* \ */) {
      pos += 2; // Skip escaped char
      continue;
    }
    if (ch === 0x24 /* $ */) {
      // Content must not end with space
      if (src.charCodeAt(pos - 1) === 0x20 /* space */) {
        pos++;
        continue;
      }
      break;
    }
    pos++;
  }

  if (pos >= state.posMax) return false;

  const content = src.slice(start + 1, pos);
  if (!content) return false;

  if (!silent) {
    const token = state.push("math_inline", "span", 0);
    token.content = content;
    token.markup = "$";
  }

  state.pos = pos + 1;
  return true;
}
