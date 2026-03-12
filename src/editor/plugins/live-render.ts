import { Plugin, PluginKey, EditorState } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { NodeSelection } from "prosemirror-state";

export const liveRenderKey = new PluginKey<LiveRenderState>("liveRender");

interface LiveRenderState {
  activeNodePos: number | null;
  decorations: DecorationSet;
}

function getActiveBlockPos(state: EditorState): number | null {
  const { selection } = state;

  // NodeSelection — use the position of the selected node's parent at depth 1
  if (selection instanceof NodeSelection) {
    const $pos = state.doc.resolve(selection.from);
    // If the selected node itself is at depth 1 (e.g. horizontal_rule)
    if ($pos.depth === 0) {
      // selection.from points to before the node
      return selection.from;
    }
    return $pos.before(1);
  }

  const { $head } = selection;
  if ($head.depth === 0) return null;
  return $head.before(1);
}

function buildDecorations(state: EditorState, activePos: number | null): DecorationSet {
  if (activePos === null) return DecorationSet.empty;

  const node = state.doc.nodeAt(activePos);
  if (!node) return DecorationSet.empty;

  const deco = Decoration.node(activePos, activePos + node.nodeSize, {
    class: "lm-active",
  });
  return DecorationSet.create(state.doc, [deco]);
}

export function liveRenderPlugin(): Plugin<LiveRenderState> {
  return new Plugin<LiveRenderState>({
    key: liveRenderKey,

    state: {
      init(_, state) {
        const activeNodePos = getActiveBlockPos(state);
        return {
          activeNodePos,
          decorations: buildDecorations(state, activeNodePos),
        };
      },

      apply(tr, prev, _oldState, newState) {
        // Only recompute when selection or doc changes
        if (!tr.selectionSet && !tr.docChanged) return prev;

        const activeNodePos = getActiveBlockPos(newState);

        // If position unchanged and doc didn't change, reuse
        if (activeNodePos === prev.activeNodePos && !tr.docChanged) {
          return prev;
        }

        return {
          activeNodePos,
          decorations: buildDecorations(newState, activeNodePos),
        };
      },
    },

    props: {
      decorations(state) {
        return liveRenderKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
  });
}
