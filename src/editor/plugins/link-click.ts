import { Plugin } from "prosemirror-state";
import { open } from "@tauri-apps/plugin-shell";

/**
 * Plugin that opens links in the default browser on Cmd/Ctrl+click.
 */
export function linkClickPlugin(): Plugin {
  return new Plugin({
    props: {
      handleClick(view, pos, event) {
        if (!event.metaKey && !event.ctrlKey) return false;

        const $pos = view.state.doc.resolve(pos);
        const marks = $pos.marks();
        const linkMark = marks.find((m) => m.type.name === "link");
        if (!linkMark) return false;

        const href = linkMark.attrs.href;
        if (href) {
          open(href).catch(console.error);
        }
        return true;
      },
    },
  });
}
