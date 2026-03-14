import type MarkdownIt from "markdown-it";

/**
 * markdown-it core rule that detects GitHub-style callouts inside blockquotes:
 *   > [!NOTE]
 *   > Content here
 *
 * Sets `calloutType` attr on the blockquote_open token and strips the [!TYPE] prefix.
 */
const CALLOUT_RE = /^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*/i;

export function calloutPlugin(md: MarkdownIt): void {
  md.core.ruler.after("block", "callout", (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "blockquote_open") continue;

      // Find the first inline token inside this blockquote
      let depth = 1;
      for (let j = i + 1; j < tokens.length && depth > 0; j++) {
        if (tokens[j].type === "blockquote_open") depth++;
        if (tokens[j].type === "blockquote_close") depth--;

        if (tokens[j].type === "inline" && depth === 1) {
          const content = tokens[j].content;
          const match = content.match(CALLOUT_RE);
          if (match) {
            // Set callout type on the blockquote_open token
            tokens[i].attrSet("calloutType", match[1].toUpperCase());

            // Strip the [!TYPE] prefix from the inline content
            const remaining = content.slice(match[0].length);
            if (remaining.trim() === "") {
              // The callout type line is its own paragraph — remove the paragraph
              // Find paragraph_open before this inline and paragraph_close after
              let pOpen = j - 1;
              while (pOpen > i && tokens[pOpen].type !== "paragraph_open") pOpen--;
              let pClose = j + 1;
              while (pClose < tokens.length && tokens[pClose].type !== "paragraph_close") pClose++;

              // Check if this is the only paragraph inside the blockquote.
              // If so, keep an empty paragraph to satisfy block+ content requirement.
              let hasOtherContent = false;
              let bqDepth = 1;
              for (let k = i + 1; k < tokens.length && bqDepth > 0; k++) {
                if (tokens[k].type === "blockquote_open") bqDepth++;
                if (tokens[k].type === "blockquote_close") bqDepth--;
                if (bqDepth === 1 && k !== j &&
                    (tokens[k].type === "paragraph_open" || tokens[k].type === "heading_open" ||
                     tokens[k].type === "fence" || tokens[k].type === "code_block" ||
                     tokens[k].type === "bullet_list_open" || tokens[k].type === "ordered_list_open" ||
                     tokens[k].type === "blockquote_open" || tokens[k].type === "hr" ||
                     tokens[k].type === "table_open")) {
                  hasOtherContent = true;
                  break;
                }
              }

              if (hasOtherContent) {
                // Safe to remove — other content exists
                tokens.splice(pOpen, pClose - pOpen + 1);
              } else {
                // Only content — keep paragraph but clear its text
                tokens[j].content = "";
              }
            } else {
              tokens[j].content = remaining;
            }
          }
          break; // Only check first inline
        }
      }
    }
  });
}
