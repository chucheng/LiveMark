import { MarkdownSerializer, MarkdownSerializerState } from "prosemirror-markdown";
import { Node, Mark } from "prosemirror-model";

/**
 * Serialize a ProseMirror document back to a Markdown string.
 *
 * Goal: round-trip fidelity. Opening a file and saving without edits
 * should produce an identical (or very close) Markdown string.
 */
export const markdownSerializer = new MarkdownSerializer(
  {
    blockquote(state, node) {
      state.wrapBlock("> ", null, node, () => state.renderContent(node));
    },

    code_block(state, node) {
      const lang = node.attrs.language || "";
      state.write(`\`\`\`${lang}\n`);
      state.text(node.textContent, false);
      state.ensureNewLine();
      state.write("```");
      state.closeBlock(node);
    },

    math_block(state, node) {
      state.write("$$\n");
      state.text(node.textContent, false);
      state.ensureNewLine();
      state.write("$$");
      state.closeBlock(node);
    },

    math_inline(state, node) {
      state.write(`$${node.attrs.tex}$`);
    },

    heading(state, node) {
      state.write(`${"#".repeat(node.attrs.level)} `);
      state.renderInline(node);
      state.closeBlock(node);
    },

    horizontal_rule(state, node) {
      state.write("---");
      state.closeBlock(node);
    },

    bullet_list(state, node) {
      state.renderList(node, "  ", () => "- ");
    },

    ordered_list(state, node) {
      const start: number = node.attrs.start || 1;
      const maxW = String(start + node.childCount - 1).length;
      const space = " ".repeat(maxW + 2);
      state.renderList(node, space, (i: number) => {
        const nStr = String(start + i);
        return `${" ".repeat(maxW - nStr.length)}${nStr}. `;
      });
    },

    list_item(state, node) {
      state.renderContent(node);
    },

    task_list(state, node) {
      state.renderList(node, "  ", () => {
        // Prefix is handled in task_list_item
        return "";
      });
    },

    task_list_item(state, node) {
      const prefix = node.attrs.checked ? "[x] " : "[ ] ";
      state.write("- " + prefix);
      state.renderContent(node);
    },

    table(state, node) {
      function serializeCell(cell: Node): string {
        // Cell contains a paragraph; get its text content
        // For simple cells, use textContent. For cells with marks,
        // use a temporary serializer to preserve formatting.
        const paragraph = cell.firstChild;
        if (!paragraph || paragraph.childCount === 0) return "";
        const temp = markdownSerializer.serialize(
          cell.type.schema.node("doc", null, [paragraph])
        );
        return temp.trim().replace(/\|/g, "\\|");
      }

      const rows: string[][] = [];
      node.forEach((row) => {
        const cells: string[] = [];
        row.forEach((cell) => {
          cells.push(serializeCell(cell));
        });
        rows.push(cells);
      });

      // Write header row
      if (rows.length > 0) {
        state.write("| " + rows[0].join(" | ") + " |");
        state.ensureNewLine();
        state.write("| " + rows[0].map(() => "---").join(" | ") + " |");
        state.ensureNewLine();
      }
      // Write body rows
      for (let i = 1; i < rows.length; i++) {
        state.write("| " + rows[i].join(" | ") + " |");
        state.ensureNewLine();
      }
      state.closeBlock(node);
    },

    table_row() {
      // Handled by table serializer
    },

    table_header() {
      // Handled by table serializer
    },

    table_cell() {
      // Handled by table serializer
    },

    paragraph(state, node) {
      state.renderInline(node);
      state.closeBlock(node);
    },

    image(state, node) {
      const alt = state.esc(node.attrs.alt || "");
      const src = node.attrs.src;
      const title = node.attrs.title;
      state.write(
        `![${alt}](${src}${title ? ` "${title}"` : ""})`
      );
    },

    hard_break(state, node, parent, index) {
      for (let i = index - 1; i >= 0; i--) {
        if (parent.child(i).type !== node.type) {
          state.write("  \n");
          return;
        }
      }
    },

    text(state, node) {
      state.text(node.text || "");
    },
  },
  {
    em: {
      open: "*",
      close: "*",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    strong: {
      open: "**",
      close: "**",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    code: {
      open(_state: MarkdownSerializerState, _mark: Mark, parent: Node, index: number) {
        return backticksFor(parent.child(index), -1);
      },
      close(_state: MarkdownSerializerState, _mark: Mark, parent: Node, index: number) {
        return backticksFor(parent.child(index - 1), 1);
      },
      escape: false,
    },
    link: {
      open: "[",
      close(state: MarkdownSerializerState, mark: Mark) {
        const title = mark.attrs.title;
        return `](${mark.attrs.href}${title ? ` "${title}"` : ""})`;
      },
    },
    strikethrough: {
      open: "~~",
      close: "~~",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
  }
);

function backticksFor(textNode: Node, side: number): string {
  const ticks = /`+/g;
  let m: RegExpExecArray | null;
  let len = 0;
  if (textNode.isText) {
    while ((m = ticks.exec(textNode.text!))) {
      len = Math.max(len, m[0].length);
    }
  }
  let result = len > 0 && side > 0 ? " `" : "`";
  for (let i = 0; i < len; i++) result += "`";
  if (len > 0 && side < 0) result += " ";
  return result;
}

/**
 * Serialize a ProseMirror document node to a Markdown string.
 */
export function serializeMarkdown(doc: Node): string {
  return markdownSerializer.serialize(doc);
}
