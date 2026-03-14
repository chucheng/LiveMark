import { Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { preferencesState } from "../../state/preferences";

const typewriterKey = new PluginKey("typewriter");

export function typewriterPlugin(): Plugin {
  return new Plugin({
    key: typewriterKey,
    view() {
      return {
        update(view: EditorView, prevState) {
          if (!preferencesState.typewriterMode()) return;
          if (view.state.selection.eq(prevState.selection) && view.state.doc.eq(prevState.doc)) return;

          const { head } = view.state.selection;
          try {
            const coords = view.coordsAtPos(head);
            const wrapper = view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
            if (!wrapper) return;

            const wrapperRect = wrapper.getBoundingClientRect();
            const center = wrapperRect.top + wrapperRect.height / 2;
            const delta = coords.top - center;

            if (Math.abs(delta) > 5) {
              wrapper.scrollBy({ top: delta, behavior: "smooth" });
            }
          } catch {
            // ignore — pos may be invalid during large doc changes
          }
        },
      };
    },
  });
}
