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
