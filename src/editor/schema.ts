import { Schema, NodeSpec, MarkSpec } from "prosemirror-model";
import { tableNodes as createTableNodes } from "prosemirror-tables";

/**
 * Minimal schema for Milestone 1.
 * Supports: doc, paragraph, text, headings, blockquote,
 * code_block, horizontal_rule, bullet_list, ordered_list, list_item,
 * image, hard_break.
 * Marks: strong, em, code, link, strikethrough.
 *
 * This will be extended in later milestones for tables, task lists, etc.
 */

const nodes: Record<string, NodeSpec> = {
  doc: {
    content: "block+",
  },

  paragraph: {
    content: "inline*",
    group: "block",
    parseDOM: [{ tag: "p" }],
    toDOM() {
      return ["p", 0];
    },
  },

  heading: {
    attrs: { level: { default: 1 } },
    content: "inline*",
    group: "block",
    defining: true,
    parseDOM: [
      { tag: "h1", attrs: { level: 1 } },
      { tag: "h2", attrs: { level: 2 } },
      { tag: "h3", attrs: { level: 3 } },
      { tag: "h4", attrs: { level: 4 } },
      { tag: "h5", attrs: { level: 5 } },
      { tag: "h6", attrs: { level: 6 } },
    ],
    toDOM(node) {
      return [`h${node.attrs.level}`, 0];
    },
  },

  blockquote: {
    content: "block+",
    group: "block",
    defining: true,
    parseDOM: [{ tag: "blockquote" }],
    toDOM() {
      return ["blockquote", 0];
    },
  },

  code_block: {
    content: "text*",
    marks: "",
    group: "block",
    code: true,
    defining: true,
    attrs: { language: { default: "" } },
    parseDOM: [
      {
        tag: "pre",
        preserveWhitespace: "full" as const,
        getAttrs(node) {
          const el = node as HTMLElement;
          const code = el.querySelector("code");
          const className = code?.className || "";
          const match = className.match(/language-(\w+)/);
          return { language: match ? match[1] : "" };
        },
      },
    ],
    toDOM(node) {
      const lang = node.attrs.language;
      return [
        "pre",
        lang ? { "data-language": lang } : {},
        ["code", lang ? { class: `language-${lang}` } : {}, 0],
      ];
    },
  },

  math_block: {
    content: "text*",
    marks: "",
    group: "block",
    code: true,
    defining: true,
    parseDOM: [
      {
        tag: "div.math-block",
        preserveWhitespace: "full" as const,
      },
    ],
    toDOM() {
      return ["div", { class: "math-block" }, 0];
    },
  },

  horizontal_rule: {
    group: "block",
    parseDOM: [{ tag: "hr" }],
    toDOM() {
      return ["hr"];
    },
  },

  bullet_list: {
    content: "list_item+",
    group: "block",
    parseDOM: [{ tag: "ul" }],
    toDOM() {
      return ["ul", 0];
    },
  },

  ordered_list: {
    content: "list_item+",
    group: "block",
    attrs: { start: { default: 1 } },
    parseDOM: [
      {
        tag: "ol",
        getAttrs(node) {
          const el = node as HTMLElement;
          return { start: el.hasAttribute("start") ? +el.getAttribute("start")! : 1 };
        },
      },
    ],
    toDOM(node) {
      return node.attrs.start === 1
        ? ["ol", 0]
        : ["ol", { start: node.attrs.start }, 0];
    },
  },

  list_item: {
    content: "paragraph block*",
    parseDOM: [{ tag: "li" }],
    toDOM() {
      return ["li", 0];
    },
    defining: true,
  },

  task_list: {
    content: "task_list_item+",
    group: "block",
    parseDOM: [{ tag: "ul.task-list" }],
    toDOM() {
      return ["ul", { class: "task-list" }, 0];
    },
  },

  task_list_item: {
    content: "paragraph block*",
    defining: true,
    attrs: { checked: { default: false } },
    parseDOM: [
      {
        tag: "li.lm-task-item",
        getAttrs(node) {
          const el = node as HTMLElement;
          const checkbox = el.querySelector("input[type=checkbox]");
          return { checked: checkbox ? (checkbox as HTMLInputElement).checked : false };
        },
      },
    ],
    toDOM(node) {
      return ["li", { class: `lm-task-item${node.attrs.checked ? " checked" : ""}` }, 0];
    },
  },

  math_inline: {
    inline: true,
    atom: true,
    group: "inline",
    attrs: { tex: { default: "" } },
    parseDOM: [
      {
        tag: "span.math-inline",
        getAttrs(node) {
          return { tex: (node as HTMLElement).getAttribute("data-tex") || "" };
        },
      },
    ],
    toDOM(node) {
      return ["span", { class: "math-inline", "data-tex": node.attrs.tex }];
    },
  },

  image: {
    inline: true,
    attrs: {
      src: {},
      alt: { default: null },
      title: { default: null },
    },
    group: "inline",
    draggable: true,
    parseDOM: [
      {
        tag: "img[src]",
        getAttrs(node) {
          const el = node as HTMLElement;
          return {
            src: el.getAttribute("src"),
            alt: el.getAttribute("alt"),
            title: el.getAttribute("title"),
          };
        },
      },
    ],
    toDOM(node) {
      const { src, alt, title } = node.attrs;
      return ["img", { src, alt, title }];
    },
  },

  hard_break: {
    inline: true,
    group: "inline",
    selectable: false,
    parseDOM: [{ tag: "br" }],
    toDOM() {
      return ["br"];
    },
  },

  text: {
    group: "inline",
  },
};

// Generate table nodes from prosemirror-tables
const tableNodeSpecs = createTableNodes({
  tableGroup: "block",
  cellContent: "paragraph",
  cellAttributes: {},
});

// Merge table nodes into our nodes
Object.assign(nodes, {
  table: tableNodeSpecs.table,
  table_row: tableNodeSpecs.table_row,
  table_header: tableNodeSpecs.table_header,
  table_cell: tableNodeSpecs.table_cell,
});

const marks: Record<string, MarkSpec> = {
  strong: {
    parseDOM: [
      { tag: "strong" },
      { tag: "b", getAttrs: (node) => (node as HTMLElement).style.fontWeight !== "normal" && null },
      { style: "font-weight=bold" },
      {
        style: "font-weight",
        getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
      },
    ],
    toDOM() {
      return ["strong", 0];
    },
  },

  em: {
    parseDOM: [
      { tag: "i" },
      { tag: "em" },
      { style: "font-style=italic" },
    ],
    toDOM() {
      return ["em", 0];
    },
  },

  code: {
    parseDOM: [{ tag: "code" }],
    toDOM() {
      return ["code", 0];
    },
  },

  link: {
    attrs: {
      href: {},
      title: { default: null },
    },
    inclusive: false,
    parseDOM: [
      {
        tag: "a[href]",
        getAttrs(node) {
          const el = node as HTMLElement;
          return {
            href: el.getAttribute("href"),
            title: el.getAttribute("title"),
          };
        },
      },
    ],
    toDOM(node) {
      const { href, title } = node.attrs;
      return ["a", { href, title, rel: "noopener noreferrer" }, 0];
    },
  },

  strikethrough: {
    parseDOM: [
      { tag: "s" },
      { tag: "del" },
      { style: "text-decoration=line-through" },
    ],
    toDOM() {
      return ["del", 0];
    },
  },
};

export const schema = new Schema({ nodes, marks });
