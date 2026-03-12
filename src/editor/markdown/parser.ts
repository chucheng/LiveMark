import MarkdownIt from "markdown-it";
import { MarkdownParser } from "prosemirror-markdown";
import { schema } from "../schema";

const md = MarkdownIt("commonmark", { html: false })
  .enable("strikethrough")
  .enable("table");

/**
 * Parse a Markdown string into a ProseMirror document.
 *
 * Uses markdown-it for tokenization and prosemirror-markdown
 * for mapping tokens to the ProseMirror schema.
 */
export const markdownParser = new MarkdownParser(schema, md, {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  bullet_list: { block: "bullet_list" },
  ordered_list: {
    block: "ordered_list",
    getAttrs: (tok) => ({ start: +(tok.attrGet("start") || 1) }),
  },
  heading: {
    block: "heading",
    getAttrs: (tok) => ({ level: +tok.tag.slice(1) }),
  },
  code_block: {
    block: "code_block",
    noCloseToken: true,
  },
  fence: {
    block: "code_block",
    getAttrs: (tok) => ({ language: tok.info || "" }),
    noCloseToken: true,
  },
  hr: {
    node: "horizontal_rule",
  },
  image: {
    node: "image",
    getAttrs: (tok) => ({
      src: tok.attrGet("src"),
      title: tok.attrGet("title") || null,
      alt: tok.children?.[0]?.content || null,
    }),
  },
  hardbreak: {
    node: "hard_break",
  },
  em: { mark: "em" },
  strong: { mark: "strong" },
  link: {
    mark: "link",
    getAttrs: (tok) => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") || null,
    }),
  },
  code_inline: { mark: "code" },
  s: { mark: "strikethrough" },
});

/**
 * Parse a Markdown string into a ProseMirror document node.
 */
export function parseMarkdown(content: string) {
  return markdownParser.parse(content);
}
