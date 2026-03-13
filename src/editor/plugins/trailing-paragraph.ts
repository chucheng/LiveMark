import { Plugin, PluginKey } from "prosemirror-state";
import { schema } from "../schema";

const trailingKey = new PluginKey("trailingParagraph");

/**
 * Ensures the document always ends with a paragraph node.
 * This allows users to click below block elements like code blocks,
 * blockquotes, and tables to place their cursor and continue typing.
 */
export function trailingParagraphPlugin(): Plugin {
  return new Plugin({
    key: trailingKey,
    appendTransaction(_transactions, _oldState, newState) {
      const { doc, tr } = newState;
      const lastChild = doc.lastChild;
      if (!lastChild || lastChild.type !== schema.nodes.paragraph) {
        tr.insert(doc.content.size, schema.nodes.paragraph.create());
        return tr;
      }
      return null;
    },
  });
}
