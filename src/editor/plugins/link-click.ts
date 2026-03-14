import { Plugin } from "prosemirror-state";
import { open } from "@tauri-apps/plugin-shell";
import { DANGEROUS_SCHEMES, isLocalFile, resolveRelativePath } from "./link-helpers";
import { tabsState } from "@/state/tabs";
import { openFileInTab } from "@/commands/file-commands";

/**
 * Plugin that opens links on Cmd/Ctrl+click.
 * Local file links open in a tab; external URLs open in the browser.
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
          if (DANGEROUS_SCHEMES.test(href.trim())) {
            event.preventDefault();
            return true;
          }

          event.preventDefault();

          if (isLocalFile(href)) {
            const currentPath = tabsState.filePath();
            if (currentPath) {
              const resolved = resolveRelativePath(currentPath, href);
              openFileInTab(resolved);
              return true;
            }
          }

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
