import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * Shows a placeholder message when the document is empty.
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
          const placeholder = document.createElement("span");
          placeholder.className = "placeholder";
          placeholder.textContent = text;
          return DecorationSet.create(doc, [
            Decoration.widget(1, placeholder),
          ]);
        }
        return DecorationSet.empty;
      },
    },
  });
}
