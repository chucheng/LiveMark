import type MarkdownIt from "markdown-it";

/**
 * markdown-it plugin that detects `<img ...>` in html_inline tokens
 * and converts them to proper image tokens with src, alt, title, width attrs.
 *
 * Required because the parser uses `html: false`, so raw HTML img tags
 * aren't parsed by default. We selectively handle just <img> tags.
 */
export function htmlImagePlugin(md: MarkdownIt): void {
  md.core.ruler.push("html_image", (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== "inline" || !blockToken.children) continue;

      const newChildren: typeof blockToken.children = [];
      for (const tok of blockToken.children) {
        // Check both html_inline tokens AND text tokens that contain <img
        if (
          (tok.type === "html_inline" || tok.type === "text") &&
          tok.content.match(/<img\s/)
        ) {
          const imgMatch = tok.content.match(
            /<img\s+([^>]*)>/
          );
          if (imgMatch) {
            const attrStr = imgMatch[1];
            const src = extractAttr(attrStr, "src");
            const alt = extractAttr(attrStr, "alt");
            const title = extractAttr(attrStr, "title");
            const width = extractAttr(attrStr, "width");

            if (src) {
              const imgToken = new state.Token("image", "img", 0);
              imgToken.attrSet("src", src);
              if (alt) imgToken.attrSet("alt", alt);
              if (title) imgToken.attrSet("title", title);
              if (width) imgToken.attrSet("width", width);
              // Set children with alt text for the prosemirror-markdown parser
              if (alt) {
                const textToken = new state.Token("text", "", 0);
                textToken.content = alt;
                imgToken.children = [textToken];
              } else {
                imgToken.children = [];
              }
              newChildren.push(imgToken);
              continue;
            }
          }
        }
        newChildren.push(tok);
      }
      blockToken.children = newChildren;
    }
  });
}

function extractAttr(attrStr: string, name: string): string | null {
  // Match both single and double quoted attribute values
  const re = new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`);
  const match = attrStr.match(re);
  if (!match) return null;
  return match[1] ?? match[2] ?? null;
}
