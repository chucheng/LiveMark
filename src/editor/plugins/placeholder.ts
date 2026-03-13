import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * Shows a placeholder message when the document is empty.
 * Uses a CSS class + ::before pseudo-element to avoid DOM interference.
 */
export function placeholderPlugin(text = "Start writing...") {
  return new Plugin({
    props: {
      decorations(state) {
        const doc = state.doc;
        if (
          doc.childCount === 1 &&
          doc.firstChild?.isTextblock &&
          doc.firstChild.content.size === 0
        ) {
          const firstChild = doc.firstChild!;
          return DecorationSet.create(doc, [
            Decoration.node(0, firstChild.nodeSize, {
              class: "lm-placeholder",
              "data-placeholder": text,
            }),
          ]);
        }
        return DecorationSet.empty;
      },
    },
  });
}
