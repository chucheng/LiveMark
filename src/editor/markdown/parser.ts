import MarkdownIt from "markdown-it";
import type MarkdownItType from "markdown-it";
import { MarkdownParser } from "prosemirror-markdown";
import { schema } from "../schema";
import { taskListPlugin } from "./task-list-plugin";

const md = MarkdownIt("commonmark", { html: false })
  .enable("strikethrough")
  .enable("table")
  .use(taskListPlugin)
  .use(stripTheadTbody);

/**
 * markdown-it plugin that:
 * 1. Strips thead_open/close and tbody_open/close tokens (no PM equivalent)
 * 2. Wraps inline content inside td/th with paragraph tokens
 *    (prosemirror-tables cells expect paragraph content)
 */
function stripTheadTbody(md: MarkdownItType): void {
  md.core.ruler.push("fix_table_tokens", (state) => {
    const result: typeof state.tokens = [];
    for (const tok of state.tokens) {
      // Strip thead/tbody wrappers
      if (
        tok.type === "thead_open" ||
        tok.type === "thead_close" ||
        tok.type === "tbody_open" ||
        tok.type === "tbody_close"
      ) {
        continue;
      }

      // Wrap inline tokens inside td/th with paragraph open/close
      if (tok.type === "inline") {
        const prev = result[result.length - 1];
        if (prev && (prev.type === "td_open" || prev.type === "th_open")) {
          const pOpen = new state.Token("paragraph_open", "p", 1);
          pOpen.level = tok.level;
          result.push(pOpen);
          result.push(tok);
          const pClose = new state.Token("paragraph_close", "p", -1);
          pClose.level = tok.level;
          result.push(pClose);
          continue;
        }
      }

      result.push(tok);
    }
    state.tokens = result;
  });
}

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

  // Task lists
  task_list: { block: "task_list" },
  task_list_item: {
    block: "task_list_item",
    getAttrs: (tok) => ({ checked: tok.meta?.checked ?? false }),
  },

  // Tables (thead/tbody stripped by stripTheadTbody plugin)
  table: { block: "table" },
  tr: { block: "table_row" },
  th: { block: "table_header" },
  td: { block: "table_cell" },
});

/**
 * Parse a Markdown string into a ProseMirror document node.
 */
export function parseMarkdown(content: string) {
  return markdownParser.parse(content);
}
