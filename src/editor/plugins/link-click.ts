import { Plugin } from "prosemirror-state";
import { open } from "@tauri-apps/plugin-shell";

/** URL schemes that must never be opened. */
const DANGEROUS_SCHEMES = /^(javascript|data|vbscript):/i;

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
          // Block dangerous URL schemes
          if (DANGEROUS_SCHEMES.test(href.trim())) {
            event.preventDefault();
            return true;
          }

          event.preventDefault();
          open(href).catch((err) => {
            import("@tauri-apps/plugin-dialog").then(({ message }) => {
              message(`Could not open link:\n${href}\n\n${err}`, {
                title: "Link Error",
                kind: "error",
              });
            });
          });
        }
        return true;
      },
    },
  });
}
