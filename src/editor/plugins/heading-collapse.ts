import { Plugin, PluginKey, EditorState, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Node } from "prosemirror-model";

const headingCollapseKey = new PluginKey("headingCollapse");

interface CollapseState {
  /** Set of heading positions that are collapsed */
  collapsed: Set<number>;
}

/**
 * Find the range of nodes that should be hidden when a heading is collapsed.
 * A collapsed heading hides all content until the next heading of the same
 * level or higher (lower number).
 */
function getCollapseRange(doc: Node, headingPos: number): { from: number; to: number } | null {
  let headingIdx = -1;
  let headingLevel = 0;
  let offset = 0;

  // Find the heading at the given pos
  for (let i = 0; i < doc.childCount; i++) {
    if (offset === headingPos) {
      headingIdx = i;
      const child = doc.child(i);
      if (child.type.name === "heading") {
        headingLevel = child.attrs.level;
      }
      break;
    }
    offset += doc.child(i).nodeSize;
  }

  if (headingIdx < 0 || headingLevel === 0) return null;

  // Find the end of the collapsed range
  const startPos = headingPos + doc.child(headingIdx).nodeSize;
  let endPos = startPos;

  for (let i = headingIdx + 1; i < doc.childCount; i++) {
    const child = doc.child(i);
    if (child.type.name === "heading" && child.attrs.level <= headingLevel) {
      break;
    }
    endPos += child.nodeSize;
  }

  if (endPos <= startPos) return null;
  return { from: startPos, to: endPos };
}

/**
 * Toggle collapse for a heading at the given position.
 */
export function toggleHeadingCollapse(state: EditorState, dispatch?: (tr: Transaction) => void, headingPos?: number): boolean {
  if (headingPos === undefined) {
    // Find heading at cursor
    const { $head } = state.selection;
    if ($head.depth < 1) return false;
    const parent = state.doc.nodeAt($head.before(1));
    if (!parent || parent.type.name !== "heading") return false;
    headingPos = $head.before(1);
  }

  const pluginState = headingCollapseKey.getState(state);
  if (!pluginState) return false;

  if (dispatch) {
    const newCollapsed = new Set(pluginState.collapsed);
    if (newCollapsed.has(headingPos)) {
      newCollapsed.delete(headingPos);
    } else {
      newCollapsed.add(headingPos);
    }
    dispatch(state.tr.setMeta(headingCollapseKey, { collapsed: newCollapsed }));
  }
  return true;
}

/**
 * Check if a heading at the given position is collapsed.
 */
export function isHeadingCollapsed(state: EditorState, pos: number): boolean {
  const pluginState = headingCollapseKey.getState(state);
  return pluginState?.collapsed.has(pos) ?? false;
}

export function headingCollapsePlugin(): Plugin<CollapseState> {
  return new Plugin<CollapseState>({
    key: headingCollapseKey,
    state: {
      init(): CollapseState {
        return { collapsed: new Set() };
      },
      apply(tr, value): CollapseState {
        const meta = tr.getMeta(headingCollapseKey);
        if (meta) return meta;

        if (tr.docChanged && value.collapsed.size > 0) {
          // Full doc replacement (e.g. tab switch via updateState) — clear collapse state
          if (tr.steps.length === 0) {
            return { collapsed: new Set() };
          }
          // Map collapsed positions through the transaction
          const newCollapsed = new Set<number>();
          for (const pos of value.collapsed) {
            const mapped = tr.mapping.map(pos);
            // Verify it's still a heading
            const node = tr.doc.nodeAt(mapped);
            if (node && node.type.name === "heading") {
              newCollapsed.add(mapped);
            }
          }
          return { collapsed: newCollapsed };
        }
        return value;
      },
    },
    props: {
      decorations(state) {
        const pluginState = headingCollapseKey.getState(state);
        if (!pluginState || pluginState.collapsed.size === 0) return DecorationSet.empty;

        const decorations: Decoration[] = [];

        for (const headingPos of pluginState.collapsed) {
          const range = getCollapseRange(state.doc, headingPos);
          if (range) {
            // Add a widget showing the collapse indicator on the heading
            decorations.push(
              Decoration.widget(headingPos + state.doc.nodeAt(headingPos)!.nodeSize - 1, () => {
                const indicator = document.createElement("span");
                indicator.className = "lm-collapse-indicator";
                indicator.textContent = " ⋯";
                indicator.title = "Click to expand";
                return indicator;
              }, { side: 1 })
            );

            // Hide the collapsed content with a node decoration
            // We need to add decorations on each node in the range
            let pos = range.from;
            while (pos < range.to) {
              const node = state.doc.nodeAt(pos);
              if (node) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: "lm-collapsed",
                    style: "display: none",
                  })
                );
                pos += node.nodeSize;
              } else {
                break;
              }
            }
          }
        }

        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
}
