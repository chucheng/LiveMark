import MarkdownIt from "markdown-it";
import type MarkdownItType from "markdown-it";
import { MarkdownParser } from "prosemirror-markdown";
import { schema } from "../schema";
import { taskListPlugin } from "./task-list-plugin";
import { mathPlugin } from "./math-plugin";
import { tightListPlugin } from "./tight-list-plugin";
import { frontmatterPlugin } from "./frontmatter-plugin";

export const md = MarkdownIt("commonmark", { html: false })
  .enable("strikethrough")
  .enable("table")
  .use(frontmatterPlugin)
  .use(taskListPlugin)
  .use(mathPlugin)
  .use(tightListPlugin)
  .use(stripTheadTbody)
  .use(trimCodeBlockTrailingNewline);

/**
 * markdown-it plugin that strips trailing newlines from fence/code_block
 * token content, preventing an empty last line in the editor.
 */
function trimCodeBlockTrailingNewline(md: MarkdownItType): void {
  md.core.ruler.push("trim_code_trailing_newline", (state) => {
    for (const tok of state.tokens) {
      if (
        (tok.type === "fence" || tok.type === "code_block") &&
        tok.content.endsWith("\n")
      ) {
        tok.content = tok.content.slice(0, -1);
      }
    }
  });
}

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
const markdownParser = new MarkdownParser(schema, md, {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  bullet_list: {
    block: "bullet_list",
    getAttrs: (tok) => ({ tight: tok.attrGet("tight") === "true" }),
  },
  ordered_list: {
    block: "ordered_list",
    getAttrs: (tok) => ({
      start: +(tok.attrGet("start") || 1),
      tight: tok.attrGet("tight") === "true",
    }),
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

  // Frontmatter
  frontmatter: {
    block: "frontmatter",
    noCloseToken: true,
  },

  // Math
  math_inline: {
    node: "math_inline",
    getAttrs: (tok) => ({ tex: tok.content }),
  },
  math_block: {
    block: "math_block",
    noCloseToken: true,
  },

  // Task lists
  task_list: {
    block: "task_list",
    getAttrs: (tok) => ({ tight: tok.attrGet("tight") === "true" }),
  },
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

const BLOCK_ID_RE = /^<!-- id: (\w+) -->\s*$/;

/**
 * Parse a Markdown string into a ProseMirror document node.
 * Handles `<!-- id: xxx -->` comments by stripping them and
 * attaching the ID as a `blockId` attr to the following block.
 */
export function parseMarkdown(content: string) {
  // Extract blockId comments and strip them from source
  const pendingIds: string[] = [];
  const lines = content.split("\n");
  const cleanLines: string[] = [];
  const idForLineIndex: Map<number, string> = new Map();
  let pendingId: string | null = null;

  for (const line of lines) {
    const match = line.match(BLOCK_ID_RE);
    if (match) {
      pendingId = match[1];
      continue;
    }
    if (pendingId !== null) {
      idForLineIndex.set(cleanLines.length, pendingId);
      pendingId = null;
    }
    cleanLines.push(line);
  }

  const doc = markdownParser.parse(cleanLines.join("\n"));
  if (!doc || idForLineIndex.size === 0) return doc;

  // Map line numbers to token positions is complex; instead use a simpler
  // approach: apply blockIds in document order to the blocks that had them
  // We parse the cleaned content, then re-parse original to get token map.
  // Simpler: just set blockIds on the N-th top-level block.
  // The comments appear before specific blocks, so track which block index.
  const tokenLines = md.parse(cleanLines.join("\n"), {});
  let blockIdx = -1;
  let depth = 0;
  const blockIdMap = new Map<number, string>();

  for (const tok of tokenLines) {
    if (depth === 0 && (tok.nesting === 1 || (tok.nesting === 0 && tok.type !== "inline"))) {
      blockIdx++;
      if (tok.map && idForLineIndex.has(tok.map[0])) {
        blockIdMap.set(blockIdx, idForLineIndex.get(tok.map[0])!);
      }
    }
    depth += tok.nesting;
  }

  if (blockIdMap.size === 0) return doc;

  // Apply blockIds to the parsed document
  // Count top-level blocks (skip frontmatter at index 0 if present)
  const hasFrontmatter = doc.firstChild?.type.name === "frontmatter";
  const fragments: import("prosemirror-model").Node[] = [];
  let topIdx = 0;
  doc.forEach((node) => {
    if (hasFrontmatter && topIdx === 0) {
      fragments.push(node);
      topIdx++;
      return;
    }
    const mappedIdx = hasFrontmatter ? topIdx - 1 : topIdx;
    const id = blockIdMap.get(mappedIdx);
    if (id && node.type.spec.attrs && "blockId" in node.type.spec.attrs) {
      fragments.push(node.type.create({ ...node.attrs, blockId: id }, node.content, node.marks));
    } else {
      fragments.push(node);
    }
    topIdx++;
  });

  return schema.node("doc", doc.attrs, fragments);
}
