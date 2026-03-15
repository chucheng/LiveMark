import { Plugin, PluginKey } from "prosemirror-state";
import { schema } from "../schema";

interface UpgradeState {
  from: number;
  to: number;
}

const italicBoldUpgradeKey = new PluginKey<UpgradeState | null>(
  "italic-bold-upgrade"
);

export { italicBoldUpgradeKey };

/**
 * Plugin that upgrades *italic* to **bold** when the user types an extra `*`
 * immediately after the italic input rule fires.
 *
 * Flow: user types `*hello*` → italic rule fires → user types `*` → this
 * plugin intercepts, removes em, applies strong.
 */
export function italicBoldUpgradePlugin() {
  return new Plugin<UpgradeState | null>({
    key: italicBoldUpgradeKey,

    state: {
      init() {
        return null;
      },
      apply(tr, prev) {
        const meta = tr.getMeta("italic-star-applied");
        if (meta) {
          return { from: meta.from, to: meta.to };
        }
        // Clear on any doc change (the upgrade window is only the very next input)
        if (tr.docChanged) {
          return null;
        }
        return prev;
      },
    },

    props: {
      handleTextInput(view, from, _to, text) {
        if (text !== "*") return false;

        const state = italicBoldUpgradeKey.getState(view.state);
        if (!state) return false;

        // Only upgrade if the `*` is typed right at the end of the italic range
        if (from !== state.to) return false;

        const { tr } = view.state;
        const emMark = schema.marks.em;
        const strongMark = schema.marks.strong;

        // Remove italic, apply bold over the same range
        tr.removeMark(state.from, state.to, emMark);
        tr.addMark(state.from, state.to, strongMark.create());
        tr.removeStoredMark(strongMark);

        view.dispatch(tr);
        return true;
      },
    },
  });
}
