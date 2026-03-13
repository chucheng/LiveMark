import type MarkdownIt from "markdown-it";

/**
 * Custom markdown-it plugin that detects tight lists (no blank lines between items)
 * and sets a `tight` attribute on bullet_list_open and ordered_list_open tokens.
 *
 * markdown-it already tracks this via the `markup` property on list tokens,
 * but we need it as an explicit attr for ProseMirror schema mapping.
 */
export function tightListPlugin(md: MarkdownIt): void {
  md.core.ruler.after("inline", "tight_list", (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (
        tok.type === "bullet_list_open" ||
        tok.type === "ordered_list_open" ||
        tok.type === "task_list_open"
      ) {
        // markdown-it sets markup="" for tight, and "\n" for loose in list_item tokens
        // But the simplest check: look at paragraph_open inside list_items —
        // tight lists have `hidden: true` on paragraph_open
        const isTight = checkTight(tokens, i);
        tok.attrSet("tight", isTight ? "true" : "false");
      }
    }
  });
}

function checkTight(tokens: { type: string; hidden?: boolean }[], start: number): boolean {
  let depth = 0;
  for (let i = start; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type.endsWith("_list_open")) depth++;
    if (tok.type.endsWith("_list_close")) {
      depth--;
      if (depth === 0) break;
    }
    // Only check at depth 1 (direct children)
    if (depth === 1 && tok.type === "paragraph_open" && tok.hidden) {
      return true;
    }
  }
  return false;
}
